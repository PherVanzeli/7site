// ==========================================
// MÓDULO - expedicao.js
// Autorizar Saída: OPs concluídas aguardando despacho
// Depende de: firebase.js (db)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    window.carregarExpedicao = function() {
        const lista = document.getElementById('lista-expedicao');
        if (!lista) return;

        lista.innerHTML = '<p class="texto-placeholder">Carregando...</p>';

        db.collection('producao').get().then(function(snapshot) {
            let prontas = 0, despachadas = 0;
            const ops = [];
            snapshot.forEach(function(doc) {
                const d = doc.data();
                if (d.status === 'aguardando_expedicao') {
                    prontas++;
                    ops.push({ id: doc.id, ...d });
                } else if (d.status === 'finalizado') {
                    despachadas++;
                }
            });

            document.getElementById('exp-total-prontas').textContent = prontas;
            document.getElementById('exp-total-despachadas').textContent = despachadas;

            if (ops.length === 0) {
                lista.innerHTML = '<p class="texto-placeholder">Nenhuma OP pronta para expedição no momento.</p>';
                return;
            }

            let html = '<table class="tabela-estoque"><thead><tr><th>Lote</th><th>Modelo</th><th>Descrição</th><th>Qtd</th><th>Saída Produção</th><th>Ações</th></tr></thead><tbody>';
            ops.forEach(function(op) {
                const dataSaida = op.data_saida_producao && op.data_saida_producao.toDate
                    ? new Date(op.data_saida_producao.toDate()).toLocaleString('pt-BR')
                    : '—';
                html += `<tr>
                    <td>${op.lote}</td>
                    <td>${op.modelo || '—'}</td>
                    <td>${op.descricao}</td>
                    <td>${op.quantidade_total}</td>
                    <td>${dataSaida}</td>
                    <td>
                        <button type="button" class="btn-acao-op" onclick="autorizarSaida('${op.id}')">🚚 Autorizar Saída</button>
                    </td>
                </tr>`;
            });
            html += '</tbody></table>';
            lista.innerHTML = html;
        });
    };

    window.autorizarSaida = function(opId) {
        if (!confirm('Confirmar a saída desta OP? O produto será despachado.')) return;
        db.collection('producao').doc(opId).update({
            status: 'finalizado',
            data_despacho: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(function() {
            alert('✅ Saída autorizada! OP despachada.');
            window.carregarExpedicao();
        })
        .catch(function(erro) {
            console.error('Erro ao autorizar saída:', erro);
            alert('❌ Erro ao autorizar saída.');
        });
    };

    if (window.location.pathname.includes('expedicao')) {
        window.carregarExpedicao();
    }
});
