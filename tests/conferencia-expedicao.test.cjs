const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const codigo = fs.readFileSync(path.join(__dirname, '../js/core/conferencia-expedicao.js'), 'utf8');
const window = {};
vm.runInNewContext(codigo, { window });
const { criarRascunho, validarConferencia, prepararRascunho, validarTransicao,
    prepararReenvioCDF } =
    window.SITE.expedicao;

function conferencia(campos = {}) {
    return {
        quantidade_prevista: 400,
        quantidade_recebida: 400,
        quantidade_aprovada: 400,
        quantidade_refugada: 0,
        observacoes: '',
        ...campos
    };
}

test('rascunho preserva autoria e deixa quantidades desconhecidas vazias', () => {
    const rascunho = criarRascunho({ quantidade_total: 400 }, { cpf: '123', nome: 'MARIA' });
    assert.equal(rascunho.quantidade_prevista, 400);
    assert.equal(rascunho.quantidade_recebida, null);
    assert.equal(rascunho.resultado, null);
    assert.equal(rascunho.conferido_por_cpf, '123');
});

test('rejeita OP sem quantidade valida e responsavel incompleto', () => {
    assert.throws(() => criarRascunho({ quantidade_total: 0 }, { cpf: '1', nome: 'A' }));
    assert.throws(() => criarRascunho({ quantidade_total: 2.5 }, { cpf: '1', nome: 'A' }));
    assert.throws(() => criarRascunho({ quantidade_total: 10 }, { cpf: '1' }));
});

test('aceita conferencia sem divergencia sem modificar a entrada', () => {
    const entrada = conferencia();
    const resultado = validarConferencia(entrada);
    assert.equal(resultado.quantidade_faltante, 0);
    assert.equal(resultado.quantidade_excedente, 0);
    assert.equal(entrada.quantidade_faltante, undefined);
});

test('calcula faltantes e exige observacao', () => {
    assert.throws(() => validarConferencia(conferencia({
        quantidade_recebida: 398, quantidade_aprovada: 398
    })), /observacao/);
    const resultado = validarConferencia(conferencia({
        quantidade_recebida: 398, quantidade_aprovada: 398,
        observacoes: '  DUAS PECAS FALTANDO  '
    }));
    assert.equal(resultado.quantidade_faltante, 2);
    assert.equal(resultado.observacoes, 'DUAS PECAS FALTANDO');
});

test('registra refugo e exige observacao', () => {
    assert.throws(() => validarConferencia(conferencia({
        quantidade_aprovada: 398, quantidade_refugada: 2
    })), /observacao/);
    const resultado = validarConferencia(conferencia({
        quantidade_aprovada: 398, quantidade_refugada: 2,
        observacoes: 'DUAS PECAS DANIFICADAS'
    }));
    assert.equal(resultado.quantidade_refugada, 2);
});

test('rejeita negativos, fracoes, texto e valores nao finitos', () => {
    [-1, 1.5, '2', NaN, Infinity].forEach(valor => {
        assert.throws(() => validarConferencia(conferencia({
            quantidade_recebida: valor
        })), /Quantidade invalida/);
    });
});

test('rejeita soma inconsistente e excesso de pecas', () => {
    assert.throws(() => validarConferencia(conferencia({
        quantidade_aprovada: 399
    })), /aprovadas mais refugadas/);
    assert.throws(() => validarConferencia(conferencia({
        quantidade_recebida: 401, quantidade_aprovada: 401
    })), /excede/);
});

test('permite salvar rascunho parcial e calcula faltantes sem alterar autoria', () => {
    const original = criarRascunho({ quantidade_total: 400 }, { cpf: '123', nome: 'MARIA' });
    const salvo = prepararRascunho(original, {
        quantidade_recebida: 398,
        quantidade_aprovada: null,
        quantidade_refugada: null,
        observacoes: ''
    });
    assert.equal(salvo.quantidade_faltante, 2);
    assert.equal(salvo.conferido_por_cpf, '123');
    assert.equal(original.quantidade_recebida, null);
});

test('rascunho rejeita quantidade negativa, fracionária ou excedente', () => {
    const base = criarRascunho({ quantidade_total: 400 }, { cpf: '123', nome: 'MARIA' });
    [-1, 1.5, '3', NaN].forEach(valor => {
        assert.throws(() => prepararRascunho(base, {
            quantidade_recebida: valor,
            quantidade_aprovada: null,
            quantidade_refugada: null,
            observacoes: ''
        }));
    });
    assert.throws(() => prepararRascunho(base, {
        quantidade_recebida: 401,
        quantidade_aprovada: null,
        quantidade_refugada: null,
        observacoes: ''
    }), /excede/);
});

test('máquina de estados aceita somente as transições previstas', () => {
    [
        ['em_producao', 'aguardando_expedicao'],
        ['aguardando_expedicao', 'em_conferencia'],
        ['em_conferencia', 'finalizado'],
        ['em_conferencia', 'devolvido_cdf'],
        ['devolvido_cdf', 'aguardando_expedicao']
    ].forEach(([origem, destino]) => {
        assert.doesNotThrow(() => validarTransicao(origem, destino));
    });
    assert.throws(() => validarTransicao('finalizado', 'em_conferencia'));
    assert.throws(() => validarTransicao('aguardando_expedicao', 'finalizado'));
    assert.throws(() => validarTransicao('devolvido_cdf', 'finalizado'));
});

test('reenvio do CDF registra correção e preserva conferências anteriores', () => {
    const anterior = { resultado: 'devolvido_cdf' };
    const op = {
        status: 'devolvido_cdf',
        conferencias_expedicao: [anterior],
        devolucao_cdf: { motivo: 'FALTAM PEÇAS' },
        historico: [{ acao: 'expedicao_devolvida' }]
    };
    const data = new Date();
    const resultado = prepararReenvioCDF(op, '123', '  PEÇAS ENTREGUES  ', data);
    assert.equal(resultado.status, 'aguardando_expedicao');
    assert.equal(resultado.devolucao_cdf.resolucao, 'PEÇAS ENTREGUES');
    assert.equal(resultado.devolucao_cdf.motivo, 'FALTAM PEÇAS');
    assert.equal(resultado.historico[1].acao, 'cdf_reenviou_expedicao');
    assert.equal(op.historico.length, 1);
    assert.equal(op.conferencias_expedicao[0], anterior);
    assert.throws(() => prepararReenvioCDF(op, '123', '  ', data));
    assert.throws(() => prepararReenvioCDF({ status: 'finalizado' }, '123', 'OK', data));
});
