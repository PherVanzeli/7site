const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const codigoOP = fs.readFileSync(path.join(__dirname, '../js/modulos/op.js'), 'utf8');
const regras = fs.readFileSync(path.join(__dirname, '../js/core/conferencia-expedicao.js'), 'utf8');

async function ambiente(setor = 'CDF') {
    const op = {
        status: 'devolvido_cdf',
        lote: 'L1',
        quantidade_total: 12,
        recortes: [],
        aviamentos_externos: [],
        modulos_fluxograma: [],
        devolucao_cdf: { motivo: '<script>FALTAM PEÇAS</script>' },
        conferencias_expedicao: [{ resultado: 'devolvido_cdf' }],
        historico: []
    };
    const alertas = [];
    const usuario = { email: '123@7site.com.br' };
    let recarregamentos = 0;
    const documentoOP = { innerHTML: '' };
    const opRef = {
        id: 'op1',
        get: () => Promise.resolve({ id: 'op1', exists: true, data: () => op })
    };
    const contexto = {
        window: {
            location: {
                pathname: '/op.html',
                search: '?id=op1',
                reload: () => { recarregamentos++; }
            }
        },
        document: {
            addEventListener(evento, callback) {
                if (evento === 'DOMContentLoaded') callback();
            },
            getElementById(id) {
                if (id === 'op-documento') return documentoOP;
                if (id === 'op-acoes-edicao') return { style: {} };
                return null;
            }
        },
        URLSearchParams,
        auth: {
            currentUser: usuario,
            onAuthStateChanged(callback) { callback(usuario); }
        },
        db: {
            collection(nome) {
                if (nome === 'usuarios') {
                    return { doc: () => ({ get: () => Promise.resolve({
                        exists: true,
                        data: () => ({ cpf: '123', nome: 'MARIA', setor, ativo: true })
                    }) }) };
                }
                assert.equal(nome, 'producao');
                return { doc: id => {
                    assert.equal(id, 'op1');
                    return opRef;
                } };
            },
            runTransaction(callback) {
                return Promise.resolve(callback({
                    get: () => opRef.get(),
                    update: (ref, dados) => Object.assign(op, dados)
                }));
            }
        },
        firebase: {
            firestore: { FieldValue: { serverTimestamp: () => 'timestamp' } }
        },
        maiusculo: texto => texto,
        prompt: () => '  Peças entregues  ',
        alert: mensagem => alertas.push(mensagem),
        console: { error: () => {} }
    };
    vm.runInNewContext(regras, contexto);
    vm.runInNewContext(codigoOP, contexto);
    await new Promise(resolve => setImmediate(resolve));
    return {
        op, alertas, documentoOP, window: contexto.window,
        recarregamentos: () => recarregamentos
    };
}

test('CDF vê o motivo, registra a correção e reenvia a OP', async () => {
    const app = await ambiente();
    assert.match(app.documentoOP.innerHTML, /&lt;script&gt;/);
    assert.doesNotMatch(app.documentoOP.innerHTML, /<script>FALTAM/);
    await app.window.reenviarOPExpedicao();
    assert.equal(app.op.status, 'aguardando_expedicao');
    assert.equal(app.op.devolucao_cdf.resolucao, 'Peças entregues');
    assert.equal(app.op.conferencias_expedicao.length, 1);
    assert.equal(app.op.historico[0].acao, 'cdf_reenviou_expedicao');
    assert.equal(app.recarregamentos(), 1);
});

test('outro setor não consegue reenviar a OP', async () => {
    const app = await ambiente('Financeiro');
    await app.window.reenviarOPExpedicao();
    assert.equal(app.op.status, 'devolvido_cdf');
    assert.equal(app.op.historico.length, 0);
    assert.match(app.alertas[0], /não pode reenviar/);
});
