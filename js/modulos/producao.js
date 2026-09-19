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
            if (snapshot.empty) {
                lista.innerHTML = '<p class="texto-placeholder">Nenhuma OP gerada ainda.</p>';
                return;
            }

            let html = '<table class="tabela-estoque"><thead><tr><th>Lote</th><th>Modelo</th><th>Descrição</th><th>Qtd</th><th>Status</th><th>Ações</th></tr></thead><tbody>';
            snapshot.forEach(function(doc) {
                const d = doc.data();
                const statusLabel = {
                    'aguardando_fluxograma': '🧠 Aguardando Fluxograma',
                    'em_producao': '⚙️ Em Produção',
                    'aguardando_expedicao': '📦 Aguardando Expedição',
                    'finalizado': '✅ Finalizado'
                }[d.status] || d.status;

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
            html += '</tbody></table>';
            lista.innerHTML = html;
        });
    };

    if (window.location.pathname.includes('producao')) {
        carregarOPs();
    }
});
