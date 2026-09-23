// ==========================================
// MÓDULO - producao.js
// Listagem de OPs (Produção)
// Depende de: firebase.js (db)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    window.carregarOPs = function() {
        const lista = document.getElementById('lista-ops');
        if (!lista) return;

        lista.innerHTML = '<p class="texto-placeholder">Carregando OPs...</p>';

        db.collection('producao').orderBy('data_entrada_producao', 'desc').get().then(function(snapshot) {
            let total = 0, emProducao = 0, finalizadas = 0;
            let html = '';

            snapshot.forEach(function(doc) {
                const d = doc.data();
                total++;
                if (d.status === 'em_producao') emProducao++;
                else if (d.status === 'aguardando_expedicao' || d.status === 'finalizado') finalizadas++;

                const statusLabel = {
                    'aguardando_fluxograma': '🧠 Aguardando Fluxograma',
                    'em_producao': '⚙️ Em Produção',
                    'aguardando_expedicao': '📦 Aguardando Expedição',
                    'finalizado': '✅ Finalizado'
                }[d.status] || d.status;

                if (total === 1) {
                    html = '<table class="tabela-estoque"><thead><tr><th>Lote</th><th>Modelo</th><th>Descrição</th><th>Qtd</th><th>Status</th><th>Ações</th></tr></thead><tbody>';
                }

                html += `<tr>
                    <td>${d.lote}</td>
                    <td>${d.modelo || '—'}</td>
                    <td>${d.descricao}</td>
                    <td>${d.quantidade_total}</td>
                    <td>${statusLabel}</td>
                    <td>
                        <a href="op.html?id=${doc.id}" class="btn-acao-op">📄 Ver</a>
                    </td>
                </tr>`;
            });

            if (total === 0) {
                html = '<p class="texto-placeholder">Nenhuma OP gerada ainda.</p>';
            } else {
                html += '</tbody></table>';
            }
            lista.innerHTML = html;

            document.getElementById('total-ops').textContent = total;
            document.getElementById('ops-em-producao').textContent = emProducao;
            document.getElementById('ops-finalizadas').textContent = finalizadas;
        });
    };

    if (window.location.pathname.includes('producao')) {
        carregarOPs();
    }
});
