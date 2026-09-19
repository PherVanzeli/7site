// ==========================================
// MÓDULO - operacoes.js
// Biblioteca de operações (CDF)
// Depende de: firebase.js (db), core/utils.js (maiusculo)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const formOperacao = document.getElementById('form-operacao');
    if (formOperacao) {
        formOperacao.addEventListener('submit', function(e) {
            e.preventDefault();
            const codigoInput = document.getElementById('codigo-operacao').value.trim();
            const nome = document.getElementById('nome-operacao').value.trim();
            if (!nome) { alert('Digite o nome da operação.'); return; }

            const codigo = codigoInput || 'OP-' + Date.now().toString().slice(-6);
            const botao = formOperacao.querySelector('.btn-producao');
            botao.textContent = 'Cadastrando...';
            botao.disabled = true;

            db.collection('operacoes').add({
                codigo: maiusculo(codigo),
                nome: maiusculo(nome),
                data_cadastro: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(function() {
                alert('✅ Operação cadastrada!');
                formOperacao.reset();
                botao.textContent = 'Cadastrar Operação';
                botao.disabled = false;
                listarOperacoes();
            })
            .catch(function(erro) {
                console.error('Erro:', erro);
                alert('❌ Erro ao cadastrar.');
                botao.textContent = 'Cadastrar Operação';
                botao.disabled = false;
            });
        });
    }

    window.listarOperacoes = function() {
        const lista = document.getElementById('lista-operacoes');
        if (!lista) return;
        lista.innerHTML = '<p class="texto-placeholder">Carregando operações...</p>';

        db.collection('operacoes').orderBy('nome').get().then(function(snapshot) {
            if (snapshot.empty) {
                lista.innerHTML = '<p class="texto-placeholder">Nenhuma operação cadastrada.</p>';
                return;
            }
            let html = '<table class="tabela-estoque"><thead><tr><th>Código</th><th>Nome</th><th>Ações</th></tr></thead><tbody>';
            snapshot.forEach(function(doc) {
                const d = doc.data();
                html += `<tr>
                    <td>${d.codigo}</td>
                    <td>${d.nome}</td>
                    <td><button class="btn-excluir" onclick="excluirOperacao('${doc.id}')">🗑️</button></td>
                </tr>`;
            });
            html += '</tbody></table>';
            lista.innerHTML = html;
        });
    };

    window.excluirOperacao = function(id) {
        if (!confirm('Tem certeza que deseja excluir esta operação?')) return;
        db.collection('operacoes').doc(id).delete()
            .then(function() { alert('✅ Operação excluída!'); listarOperacoes(); })
            .catch(function(erro) { console.error(erro); });
    };

    if (window.location.pathname.includes('operacoes')) {
        listarOperacoes();
    }
});
