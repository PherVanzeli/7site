const { test, before, beforeEach, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const {
    initializeTestEnvironment,
    assertFails,
    assertSucceeds
} = require('@firebase/rules-unit-testing');
const {
    doc, getDoc, setDoc, updateDoc, deleteDoc, serverTimestamp
} = require('firebase/firestore');

const cpfs = {
    cdf: '11111111111',
    administrativo: '22222222222',
    outroAdministrativo: '33333333333',
    financeiro: '44444444444',
    rh: '55555555555',
    mestre: '66666666666',
    inativo: '77777777777',
    semPerfil: '88888888888'
};
let ambiente;

function banco(cpf) {
    return ambiente.authenticatedContext(cpf, {
        email: cpf + '@7site.com.br'
    }).firestore();
}

function op(status) {
    return {
        lote: 'LOTE TESTE',
        quantidade_total: 10,
        status: status,
        conferencia_expedicao: null,
        conferencias_expedicao: [],
        historico: []
    };
}

function rascunho(cpf) {
    return {
        quantidade_prevista: 10,
        quantidade_recebida: null,
        quantidade_aprovada: null,
        quantidade_refugada: null,
        quantidade_faltante: null,
        quantidade_excedente: null,
        observacoes: '',
        motivo_devolucao: '',
        conferido_por_cpf: cpf,
        conferido_por_nome: 'CONFERENTE',
        data_inicio: serverTimestamp(),
        data_conclusao: null,
        resultado: null
    };
}

function evento(cpf, acao) {
    return {
        data: new Date(),
        usuario_cpf: cpf,
        acao: acao,
        detalhes: 'Teste da transição'
    };
}

async function criarOP(status) {
    await ambiente.withSecurityRulesDisabled(async function(contexto) {
        await setDoc(doc(contexto.firestore(), 'producao/op-teste'), op(status));
    });
}

async function iniciarConferencia() {
    const referencia = doc(banco(cpfs.administrativo), 'producao/op-teste');
    await assertSucceeds(updateDoc(referencia, {
        status: 'em_conferencia',
        conferencia_expedicao: rascunho(cpfs.administrativo)
    }));
    return (await getDoc(referencia)).data().conferencia_expedicao;
}

before(async function() {
    ambiente = await initializeTestEnvironment({
        projectId: 'demo-7site-regras',
        firestore: {
            rules: fs.readFileSync(
                path.join(__dirname, '../firestore.rules'), 'utf8'
            )
        }
    });
});

beforeEach(async function() {
    await ambiente.clearFirestore();
    await ambiente.withSecurityRulesDisabled(async function(contexto) {
        const usuarios = [
            [cpfs.cdf, 'CDF', 'funcionario', true],
            [cpfs.administrativo, 'Administrativo', 'funcionario', true],
            [cpfs.outroAdministrativo, 'Administrativo', 'funcionario', true],
            [cpfs.financeiro, 'Financeiro', 'funcionario', true],
            [cpfs.rh, 'RH', 'superior', true],
            [cpfs.mestre, 'todos', 'superior', true],
            [cpfs.inativo, 'Administrativo', 'funcionario', false]
        ];
        await Promise.all(usuarios.map(function([cpf, setor, tipo, ativo]) {
            return setDoc(doc(contexto.firestore(), 'usuarios/' + cpf), {
                cpf: cpf,
                nome: 'USUÁRIO DE TESTE',
                setor: setor,
                tipo_usuario: tipo,
                ativo: ativo
            });
        }));
    });
});

after(async function() {
    if (ambiente) await ambiente.cleanup();
});

test('nega acesso sem autenticação, perfil ou cadastro ativo', async function() {
    await criarOP('aguardando_expedicao');
    const caminho = 'producao/op-teste';
    await assertFails(getDoc(doc(ambiente.unauthenticatedContext().firestore(), caminho)));
    await assertFails(getDoc(doc(banco(cpfs.semPerfil), caminho)));
    await assertFails(getDoc(doc(banco(cpfs.inativo), caminho)));
    await assertSucceeds(getDoc(doc(banco(cpfs.administrativo), caminho)));
});

test('isola as coleções por setor e nega coleções não declaradas', async function() {
    await criarOP('aguardando_expedicao');
    await assertSucceeds(getDoc(doc(banco(cpfs.cdf), 'producao/op-teste')));
    await assertSucceeds(getDoc(doc(banco(cpfs.financeiro), 'producao/op-teste')));
    await assertFails(getDoc(doc(banco(cpfs.rh), 'producao/op-teste')));
    await assertFails(getDoc(doc(banco(cpfs.cdf), 'financeiro/lancamento')));
    await assertFails(getDoc(doc(banco(cpfs.administrativo), 'colecao_futura/doc')));
});

test('impede autoatribuição de privilégios e criação por funcionário', async function() {
    const propriaConta = doc(banco(cpfs.cdf), 'usuarios/' + cpfs.cdf);
    await assertFails(updateDoc(propriaConta, { setor: 'todos' }));
    await assertFails(deleteDoc(propriaConta));
    const novoCPF = '99999999999';
    const perfil = {
        cpf: novoCPF,
        nome: 'NOVO FUNCIONÁRIO',
        cargo: 'AUXILIAR',
        tipo_usuario: 'subordinado',
        setor: 'RH',
        ativo: true,
        criado_por: cpfs.rh,
        data_cadastro: serverTimestamp()
    };
    await assertFails(setDoc(doc(banco(cpfs.cdf), 'usuarios/' + novoCPF), perfil));
    await assertFails(setDoc(doc(banco(cpfs.rh), 'usuarios/' + novoCPF), {
        ...perfil, tipo_usuario: 'superior'
    }));
    await assertSucceeds(setDoc(doc(banco(cpfs.rh), 'usuarios/' + novoCPF), perfil));
});

test('CDF conclui produção, mas não pode despachar diretamente', async function() {
    await criarOP('em_producao');
    const referenciaCDF = doc(banco(cpfs.cdf), 'producao/op-teste');
    await assertFails(updateDoc(referenciaCDF, { status: 'finalizado' }));
    await assertFails(updateDoc(
        doc(banco(cpfs.administrativo), 'producao/op-teste'),
        { status: 'aguardando_expedicao' }
    ));
    await assertSucceeds(updateDoc(referenciaCDF, {
        status: 'aguardando_expedicao',
        modulos_fluxograma: [],
        data_fim_execucao: serverTimestamp(),
        data_saida_producao: serverTimestamp()
    }));
});

test('só o responsável salva o rascunho e aprova quantidades válidas', async function() {
    await criarOP('aguardando_expedicao');
    const referencia = doc(banco(cpfs.administrativo), 'producao/op-teste');
    await assertFails(updateDoc(referencia, { status: 'finalizado' }));
    const conferenciaInicial = await iniciarConferencia();
    await assertFails(updateDoc(
        doc(banco(cpfs.outroAdministrativo), 'producao/op-teste'),
        { conferencia_expedicao: { ...conferenciaInicial, observacoes: 'TENTATIVA' } }
    ));
    await assertSucceeds(updateDoc(referencia, {
        conferencia_expedicao: { ...conferenciaInicial, observacoes: 'EM ANDAMENTO' }
    }));
    const conferenciaSalva = (await getDoc(referencia)).data().conferencia_expedicao;
    const conferenciaFinal = {
        ...conferenciaSalva,
        observacoes: '',
        quantidade_recebida: 9,
        quantidade_aprovada: 8,
        quantidade_refugada: 1,
        quantidade_faltante: 1,
        quantidade_excedente: 0,
        data_conclusao: new Date(),
        resultado: 'aprovado'
    };
    const atualizacao = {
        status: 'finalizado',
        conferencia_expedicao: conferenciaFinal,
        conferencias_expedicao: [conferenciaFinal],
        historico: [evento(cpfs.administrativo, 'expedicao_aprovada')],
        data_despacho: serverTimestamp()
    };
    await assertFails(updateDoc(referencia, atualizacao));
    conferenciaFinal.observacoes = 'UMA PEÇA FALTANTE E UMA REFUGADA';
    await assertSucceeds(updateDoc(referencia, atualizacao));
    await assertFails(updateDoc(referencia, { status: 'aguardando_expedicao' }));
});

test('devolução preserva a rodada e exige resolução do CDF no reenvio', async function() {
    await criarOP('aguardando_expedicao');
    const conferenciaInicial = await iniciarConferencia();
    const registro = {
        ...conferenciaInicial,
        motivo_devolucao: 'PRODUTO COM DEFEITO',
        data_conclusao: new Date(),
        resultado: 'devolvido_cdf'
    };
    const referenciaAdmin = doc(banco(cpfs.administrativo), 'producao/op-teste');
    await assertSucceeds(updateDoc(referenciaAdmin, {
        status: 'devolvido_cdf',
        conferencia_expedicao: registro,
        conferencias_expedicao: [registro],
        historico: [evento(cpfs.administrativo, 'expedicao_devolvida')],
        devolucao_cdf: {
            motivo: registro.motivo_devolucao,
            solicitado_por_cpf: cpfs.administrativo,
            resolucao: null
        }
    }));
    const devolucao = (await getDoc(referenciaAdmin)).data().devolucao_cdf;
    const reenvio = {
        status: 'aguardando_expedicao',
        devolucao_cdf: {
            ...devolucao,
            resolucao: 'COSTURA CORRIGIDA',
            resolvido_por_cpf: cpfs.cdf,
            resolvido_em: new Date()
        },
        data_reenvio_expedicao: serverTimestamp(),
        historico: [
            evento(cpfs.administrativo, 'expedicao_devolvida'),
            evento(cpfs.cdf, 'cdf_reenviou_expedicao')
        ]
    };
    await assertFails(updateDoc(referenciaAdmin, reenvio));
    await assertFails(updateDoc(doc(banco(cpfs.cdf), 'producao/op-teste'), {
        ...reenvio,
        devolucao_cdf: { ...reenvio.devolucao_cdf, resolucao: '' }
    }));
    // Reutiliza o evento persistido para garantir que o histórico anterior é imutável.
    reenvio.historico[0] = (await getDoc(referenciaAdmin)).data().historico[0];
    await assertSucceeds(updateDoc(doc(banco(cpfs.cdf), 'producao/op-teste'), reenvio));

    const primeiraRodada = (await getDoc(referenciaAdmin)).data().conferencias_expedicao[0];
    const segundaRodada = await iniciarConferencia();
    const aprovada = {
        ...segundaRodada,
        quantidade_recebida: 10,
        quantidade_aprovada: 10,
        quantidade_refugada: 0,
        quantidade_faltante: 0,
        quantidade_excedente: 0,
        data_conclusao: new Date(),
        resultado: 'aprovado'
    };
    const historicoAnterior = (await getDoc(referenciaAdmin)).data().historico;
    await assertSucceeds(updateDoc(referenciaAdmin, {
        status: 'finalizado',
        conferencia_expedicao: aprovada,
        conferencias_expedicao: [primeiraRodada, aprovada],
        historico: [
            ...historicoAnterior,
            evento(cpfs.administrativo, 'expedicao_aprovada')
        ],
        data_despacho: serverTimestamp()
    }));
    const encerrada = (await getDoc(referenciaAdmin)).data();
    assert.equal(encerrada.conferencias_expedicao.length, 2);
});

test('aprovação preserva histórico extenso de uma OP existente', async function() {
    const historico = Array.from({ length: 30 }, function(_, indice) {
        return {
            data: new Date(2026, 0, indice + 1),
            usuario_cpf: cpfs.cdf,
            acao: 'operacao_concluida',
            detalhes: 'Etapa ' + indice
        };
    });
    await ambiente.withSecurityRulesDisabled(async function(contexto) {
        await setDoc(doc(contexto.firestore(), 'producao/op-teste'), {
            ...op('em_conferencia'),
            historico: historico,
            conferencia_expedicao: {
                ...rascunho(cpfs.administrativo),
                data_inicio: new Date(2026, 1, 1)
            }
        });
    });
    const referencia = doc(banco(cpfs.administrativo), 'producao/op-teste');
    const atual = (await getDoc(referencia)).data();
    const aprovada = {
        ...atual.conferencia_expedicao,
        quantidade_recebida: 10,
        quantidade_aprovada: 10,
        quantidade_refugada: 0,
        quantidade_faltante: 0,
        quantidade_excedente: 0,
        data_conclusao: new Date(),
        resultado: 'aprovado'
    };
    await assertSucceeds(updateDoc(referencia, {
        status: 'finalizado',
        conferencia_expedicao: aprovada,
        conferencias_expedicao: [aprovada],
        historico: [...atual.historico, evento(cpfs.administrativo, 'expedicao_aprovada')],
        data_despacho: serverTimestamp()
    }));
});
