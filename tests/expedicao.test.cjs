const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const codigo = fs.readFileSync(path.join(__dirname, '../js/modulos/expedicao.js'), 'utf8');
const regras = fs.readFileSync(path.join(__dirname, '../js/core/conferencia-expedicao.js'), 'utf8');

function ambiente() {
    class Elemento {
        constructor(tag) {
            this.tag = tag;
            this.children = [];
            this.textContent = '';
            this.listeners = {};
            this.value = '';
            this.hidden = false;
        }
        appendChild(child) { this.children.push(child); return child; }
        replaceChildren() { this.children = []; this.textContent = ''; }
        addEventListener(evento, callback) { this.listeners[evento] = callback; }
        reset() { this.value = ''; }
        scrollIntoView() {}
    }

    const elementos = {
        'lista-expedicao': new Elemento('div'),
        'exp-total-prontas': new Elemento('span'),
        'exp-total-conferencia': new Elemento('span'),
        'exp-total-devolvidas': new Elemento('span'),
        'exp-total-despachadas': new Elemento('span'),
        'exp-aviso': new Elemento('p'),
        'exp-conferencia': new Elemento('section'),
        'exp-conferencia-form': new Elemento('form'),
        'exp-conferencia-titulo': new Elemento('h2'),
        'exp-conferencia-resumo': new Elemento('p'),
        'exp-conferencia-calculo': new Elemento('p'),
        'exp-conferencia-erro': new Elemento('p'),
        'exp-salvar': new Elemento('button'),
        'exp-aprovar': new Elemento('button'),
        'exp-devolver': new Elemento('button'),
        'exp-fechar': new Elemento('button'),
        'exp-prevista': new Elemento('input'),
        'exp-recebida': new Elemento('input'),
        'exp-aprovada': new Elemento('input'),
        'exp-refugada': new Elemento('input'),
        'exp-observacoes': new Elemento('textarea'),
        'exp-motivo-devolucao': new Elemento('textarea')
    };
    elementos['exp-conferencia'].hidden = true;
    let autenticar;
    let atualizar;
    let falhar;
    let ocultarPagina;
    let mostrarPagina;
    let consultas = 0;
    let cancelamentos = 0;
    const atualizacoes = [];
    const confirmacoes = [];
    const documentos = new Map();
    function documento(id) {
        const dados = documentos.get(id);
        return { id, exists: !!dados, data: () => dados };
    }
    const colecao = {
        where(campo, operador, valores) {
            assert.equal(campo, 'status');
            assert.equal(operador, 'in');
            assert.deepEqual(Array.from(valores),
                ['aguardando_expedicao', 'em_conferencia', 'devolvido_cdf', 'finalizado']);
            return this;
        },
        onSnapshot(sucesso, erro) {
            consultas++;
            atualizar = sucesso;
            falhar = erro;
            return () => { cancelamentos++; };
        },
        doc(id) {
            return { id, get: () => Promise.resolve(documento(id)), update: dados => {
                atualizacoes.push({ id, dados });
                documentos.set(id, { ...documentos.get(id), ...dados });
                return Promise.resolve();
            } };
        }
    };
    const window = {
        addEventListener(evento, callback) {
            if (evento === 'pagehide') ocultarPagina = callback;
            if (evento === 'pageshow') mostrarPagina = callback;
        }
    };
    const contexto = {
        window,
        document: {
            addEventListener(evento, callback) {
                if (evento === 'DOMContentLoaded') callback();
            },
            getElementById(id) { return elementos[id]; },
            createElement(tag) { return new Elemento(tag); }
        },
        db: {
            collection(nome) {
                if (nome === 'usuarios') {
                    return { doc: () => ({ get: () => Promise.resolve({
                        exists: true,
                        data: () => ({ nome: 'MARIA', setor: 'Administrativo' })
                    }) }) };
                }
                assert.equal(nome, 'producao');
                return colecao;
            },
            runTransaction(callback) {
                return Promise.resolve(callback({
                    get: ref => Promise.resolve(documento(ref.id)),
                    update: (ref, dados) => {
                        atualizacoes.push({ id: ref.id, dados });
                        documentos.set(ref.id, { ...documentos.get(ref.id), ...dados });
                    }
                }));
            }
        },
        auth: { onAuthStateChanged(callback) { autenticar = callback; } },
        firebase: { firestore: { FieldValue: { serverTimestamp: () => 'timestamp' } } },
        confirm: mensagem => { confirmacoes.push(mensagem); return true; },
        alert: () => {},
        console: { error: () => {} }
    };
    vm.runInNewContext(regras, contexto);
    vm.runInNewContext(codigo, contexto);
    return {
        elementos, window, atualizacoes, confirmacoes,
        autenticar: usuario => { contexto.auth.currentUser = usuario; autenticar(usuario); },
        atualizar: docs => {
            docs.forEach(doc => documentos.set(doc.id, doc));
            atualizar({ forEach: callback => docs.forEach(doc => callback({
                id: doc.id, data: () => doc
            })) });
        },
        documento: id => documentos.get(id),
        emitir: () => atualizar({ forEach: callback => {
            documentos.forEach((dados, id) => callback({
                id, data: () => dados
            }));
        } }),
        falhar: erro => falhar(erro),
        ocultarPagina: () => ocultarPagina(),
        mostrarPagina: () => mostrarPagina(),
        consultas: () => consultas,
        cancelamentos: () => cancelamentos
    };
}

test('abre uma única escuta para a fila e encerra ao sair da página', () => {
    const app = ambiente();
    app.autenticar({ uid: 'usuario' });
    app.window.carregarExpedicao();
    assert.equal(app.consultas(), 1);
    app.ocultarPagina();
    assert.equal(app.cancelamentos(), 1);
});

test('atualiza fila e indicadores quando a OP chega e é despachada', () => {
    const app = ambiente();
    app.autenticar({ uid: 'usuario' });
    const pronta = {
        id: 'op1', status: 'aguardando_expedicao', lote: 'L1',
        descricao: 'Camisa', quantidade_total: 12,
        data_saida_producao: { toMillis: () => 10, toDate: () => new Date(0) }
    };
    app.atualizar([pronta]);
    assert.equal(app.elementos['exp-total-prontas'].textContent, '1');
    assert.equal(app.elementos['lista-expedicao'].children[0].tag, 'table');
    app.atualizar([{ ...pronta, status: 'finalizado' }]);
    assert.equal(app.elementos['exp-total-prontas'].textContent, '0');
    assert.equal(app.elementos['exp-total-despachadas'].textContent, '1');
    assert.match(app.elementos['lista-expedicao'].textContent, /Nenhuma OP/);
});

test('ordena por data e coloca dados da OP como texto', () => {
    const app = ambiente();
    app.autenticar({ uid: 'usuario' });
    app.atualizar([
        { id: 'nova', status: 'aguardando_expedicao', lote: '<img src=x>',
            data_saida_producao: { toMillis: () => 20, toDate: () => new Date(20) } },
        { id: 'antiga', status: 'aguardando_expedicao', lote: 'ANTIGA',
            data_saida_producao: { toMillis: () => 10, toDate: () => new Date(10) } }
    ]);
    const tabela = app.elementos['lista-expedicao'].children[0];
    const linhas = tabela.children[1].children;
    assert.equal(linhas[0].children[0].textContent, 'ANTIGA');
    assert.equal(linhas[1].children[0].textContent, '<img src=x>');
    assert.equal(linhas[1].children[0].children.length, 0);
});

test('mostra erro de escuta e permite nova tentativa', () => {
    const app = ambiente();
    app.autenticar({ uid: 'usuario' });
    app.falhar(new Error('sem conexão'));
    assert.match(app.elementos['lista-expedicao'].textContent, /Erro ao carregar/);
    app.window.carregarExpedicao();
    assert.equal(app.consultas(), 2);
});


test('retoma a escuta ao voltar para a página em cache', () => {
    const app = ambiente();
    app.autenticar({ uid: 'usuario' });
    app.ocultarPagina();
    app.mostrarPagina();
    assert.equal(app.consultas(), 2);
});

test('inicia uma conferência com transação e impede segunda tomada da mesma OP', async () => {
    const app = ambiente();
    app.autenticar({ email: '123@7site.com.br' });
    app.atualizar([{
        id: 'op1', status: 'aguardando_expedicao', lote: 'L1',
        descricao: 'CAMISA', quantidade_total: 12
    }]);
    await app.window.iniciarConferencia('op1');
    assert.equal(app.documento('op1').status, 'em_conferencia');
    assert.equal(app.documento('op1').conferencia_expedicao.conferido_por_cpf, '123');
    assert.equal(app.elementos['exp-conferencia'].hidden, false);

    await app.window.iniciarConferencia('op1');
    assert.match(app.elementos['exp-aviso'].textContent, /já foi assumida/);
});

test('salva rascunho parcial e o recupera ao retomar', async () => {
    const app = ambiente();
    app.autenticar({ email: '123@7site.com.br' });
    app.atualizar([{
        id: 'op1', status: 'aguardando_expedicao', lote: 'L1',
        descricao: 'CAMISA', quantidade_total: 12
    }]);
    await app.window.iniciarConferencia('op1');
    app.elementos['exp-recebida'].value = '10';
    await app.window.salvarRascunhoConferencia();
    assert.equal(app.documento('op1').conferencia_expedicao.quantidade_recebida, 10);
    assert.equal(app.documento('op1').conferencia_expedicao.quantidade_faltante, 2);
    app.elementos['exp-fechar'].listeners.click();
    assert.equal(app.elementos['exp-conferencia'].hidden, true);
    await app.window.retomarConferencia('op1');
    assert.equal(app.elementos['exp-recebida'].value, 10);
    assert.equal(app.elementos['exp-conferencia'].hidden, false);
});

test('não retoma conferência de outra pessoa', async () => {
    const app = ambiente();
    app.autenticar({ email: '123@7site.com.br' });
    app.atualizar([{
        id: 'op1', status: 'em_conferencia', lote: 'L1', quantidade_total: 12,
        conferencia_expedicao: {
            quantidade_prevista: 12, conferido_por_cpf: '456',
            conferido_por_nome: 'OUTRA PESSOA'
        }
    }]);
    const tabela = app.elementos['lista-expedicao'].children[0];
    const botao = tabela.children[1].children[0].children[6].children[0];
    assert.equal(botao.disabled, true);
    await app.window.retomarConferencia('op1');
    assert.equal(app.elementos['exp-conferencia'].hidden, true);
    assert.match(app.elementos['exp-aviso'].textContent, /não está disponível/);
});

test('impede salvar quando o responsável muda antes da gravação', async () => {
    const app = ambiente();
    app.autenticar({ email: '123@7site.com.br' });
    app.atualizar([{
        id: 'op1', status: 'aguardando_expedicao', lote: 'L1',
        descricao: 'CAMISA', quantidade_total: 12
    }]);
    await app.window.iniciarConferencia('op1');
    app.elementos['exp-recebida'].value = '10';
    app.documento('op1').conferencia_expedicao.conferido_por_cpf = '456';
    await app.window.salvarRascunhoConferencia();
    assert.equal(app.documento('op1').conferencia_expedicao.quantidade_recebida, null);
    assert.match(app.elementos['exp-conferencia-erro'].textContent, /outro responsável/);
});

test('aprova saída com quantidades válidas e registra despacho uma vez', async () => {
    const app = ambiente();
    app.autenticar({ email: '123@7site.com.br' });
    app.atualizar([{
        id: 'op1', status: 'aguardando_expedicao', lote: 'L1',
        descricao: 'CAMISA', quantidade_total: 12
    }]);
    await app.window.iniciarConferencia('op1');
    app.elementos['exp-recebida'].value = '12';
    app.elementos['exp-aprovada'].value = '12';
    app.elementos['exp-refugada'].value = '0';
    await app.window.aprovarConferencia();

    const op = app.documento('op1');
    assert.equal(op.status, 'finalizado');
    assert.equal(op.data_despacho, 'timestamp');
    assert.equal(op.conferencia_expedicao.resultado, 'aprovado');
    assert.equal(op.conferencias_expedicao.length, 1);
    assert.equal(op.historico[0].acao, 'expedicao_aprovada');
    assert.equal(app.elementos['exp-conferencia'].hidden, true);
    await app.window.iniciarConferencia('op1');
    assert.equal(app.documento('op1').conferencias_expedicao.length, 1);
});

test('aprova com faltantes somente com observação e confirmação da divergência', async () => {
    const app = ambiente();
    app.autenticar({ email: '123@7site.com.br' });
    app.atualizar([{
        id: 'op1', status: 'aguardando_expedicao', quantidade_total: 12
    }]);
    await app.window.iniciarConferencia('op1');
    app.elementos['exp-recebida'].value = '10';
    app.elementos['exp-aprovada'].value = '10';
    app.elementos['exp-refugada'].value = '0';
    await app.window.aprovarConferencia();
    assert.equal(app.documento('op1').status, 'em_conferencia');
    app.elementos['exp-observacoes'].value = 'DUAS PEÇAS FALTANDO';
    await app.window.aprovarConferencia();
    assert.equal(app.documento('op1').status, 'finalizado');
    assert.equal(app.documento('op1').conferencia_expedicao.quantidade_faltante, 2);
    assert.match(app.confirmacoes[0], /faltantes ou refugos/);
});

test('não aprova dados incompletos ou inconsistentes', async () => {
    const app = ambiente();
    app.autenticar({ email: '123@7site.com.br' });
    app.atualizar([{
        id: 'op1', status: 'aguardando_expedicao', quantidade_total: 12
    }]);
    await app.window.iniciarConferencia('op1');
    await app.window.aprovarConferencia();
    assert.equal(app.documento('op1').status, 'em_conferencia');
    app.elementos['exp-recebida'].value = '10';
    app.elementos['exp-aprovada'].value = '9';
    app.elementos['exp-refugada'].value = '0';
    await app.window.aprovarConferencia();
    assert.equal(app.documento('op1').status, 'em_conferencia');
    assert.match(app.elementos['exp-conferencia-erro'].textContent,
        /aprovadas mais refugadas/);
});

test('devolve conferência parcial com motivo e preserva a rodada anterior', async () => {
    const app = ambiente();
    app.autenticar({ email: '123@7site.com.br' });
    app.atualizar([{
        id: 'op1', status: 'aguardando_expedicao', lote: 'L1',
        quantidade_total: 12
    }]);
    await app.window.iniciarConferencia('op1');
    app.elementos['exp-recebida'].value = '10';
    await app.window.devolverConferencia();
    assert.equal(app.documento('op1').status, 'em_conferencia');
    app.elementos['exp-motivo-devolucao'].value = 'Faltam duas peças';
    await app.window.devolverConferencia();
    assert.equal(app.documento('op1').status, 'devolvido_cdf');
    assert.equal(app.documento('op1').devolucao_cdf.motivo, 'Faltam duas peças');
    assert.equal(app.documento('op1').conferencias_expedicao[0].resultado,
        'devolvido_cdf');
    assert.equal(app.documento('op1').historico[0].acao, 'expedicao_devolvida');
    app.emitir();
    assert.equal(app.elementos['exp-total-devolvidas'].textContent, '1');
    assert.equal(app.elementos['lista-expedicao'].children[0].children[1]
        .children[0].children[6].children[0].disabled, true);

    app.documento('op1').status = 'aguardando_expedicao';
    app.emitir();
    await app.window.iniciarConferencia('op1');
    assert.equal(app.documento('op1').conferencias_expedicao.length, 1);
    assert.equal(app.documento('op1').conferencia_expedicao.resultado, null);
});
