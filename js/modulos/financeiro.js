// ==========================================
// MÓDULO - financeiro.js
// Lançamentos financeiros (contas a pagar/receber)
// Depende de: firebase.js (db), core/utils.js (maiusculo)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const formFinanceiro = document.getElementById('form-financeiro');
    if (formFinanceiro) {
        formFinanceiro.addEventListener('submit', function(e) {
            e.preventDefault();
            const tipo = document.getElementById('tipo-lancamento').value;
            const categoria = document.getElementById('categoria-lancamento').value;
            const descricao = document.getElementById('descricao-lancamento').value;
            const valor = parseFloat(document.getElementById('valor-lancamento').value);
            const vencimento = document.getElementById('vencimento-lancamento').value;
            const pago = document.getElementById('pago-check').checked;

            db.collection('financeiro').add({
                tipo: tipo,
                categoria: maiusculo(categoria),
                descricao: maiusculo(descricao),
                valor: valor,
                data_vencimento: vencimento,
                data_pagamento: pago ? new Date().toISOString().split('T')[0] : null,
                status: pago ? 'pago' : 'pendente',
                data_cadastro: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(function() {
                alert('✅ Lançamento registrado!');
                formFinanceiro.reset();
                listarLancamentos();
            })
            .catch(function(erro) { console.error(erro); });
        });
    }

    window.listarLancamentos = function() {
        const lista = document.getElementById('lista-lancamentos');
        if (!lista) return;
        lista.innerHTML = '<p class="texto-placeholder">Carregando...</p>';

        const filtroStatus = document.getElementById('filtro-status').value;
        const filtroTipo = document.getElementById('filtro-tipo').value;

        db.collection('financeiro').orderBy('data_vencimento', 'desc').get()
            .then(function(snapshot) {
                let html = '';
                let saldo = 0, aPagar = 0, aReceber = 0, resultadoMes = 0, contador = 0;
                const mesAtual = new Date().toISOString().slice(0, 7);

                snapshot.forEach(function(doc) {
                    const d = doc.data();
                    if (filtroStatus !== 'todos' && d.status !== filtroStatus) return;
                    if (filtroTipo !== 'todos' && d.tipo !== filtroTipo) return;

                    if (d.status === 'pago') {
                        if (d.tipo === 'entrada') saldo += d.valor; else saldo -= d.valor;
                    } else {
                        if (d.tipo === 'entrada') aReceber += d.valor; else aPagar += d.valor;
                    }

                    if (d.status === 'pago' && d.data_vencimento && d.data_vencimento.startsWith(mesAtual)) {
                        if (d.tipo === 'entrada') resultadoMes += d.valor; else resultadoMes -= d.valor;
                    }

                    if (contador === 0) {
                        html = '<table class="tabela-estoque"><thead><tr><th>Vencimento</th><th>Tipo</th><th>Categoria</th><th>Descrição</th><th>Valor</th><th>Status</th><th>Ações</th></tr></thead><tbody>';
                    }
                    contador++;

                    const valorFormatado = d.valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                    const tipoClasse = d.tipo === 'entrada' ? 'tipo-entrada' : 'tipo-saida';
                    const tipoLabel = d.tipo === 'entrada' ? '📥 Entrada' : '📤 Saída';
                    const statusClasse = d.status === 'pago' ? 'status-pago' : 'status-pendente';
                    const statusLabel = d.status === 'pago' ? '✅ Pago' : '⏳ Pendente';

                    html += `<tr>
                        <td>${d.data_vencimento || 'N/A'}</td>
                        <td class="${tipoClasse}">${tipoLabel}</td>
                        <td>${d.categoria}</td>
                        <td>${d.descricao}</td>
                        <td class="${tipoClasse}">${valorFormatado}</td>
                        <td class="${statusClasse}">${statusLabel}</td>
                        <td>
                            ${d.status === 'pendente' ? `<button class="btn-pagar" onclick="marcarComoPago('${doc.id}')">Marcar Pago</button>` : ''}
                            <button class="btn-excluir-financeiro" onclick="excluirLancamento('${doc.id}')">🗑️</button>
                        </td>
                    </tr>`;
                });

                if (contador > 0) {
                    html += '</tbody></table>';
                    lista.innerHTML = html;
                } else {
                    lista.innerHTML = '<p class="texto-placeholder">Nenhum lançamento encontrado.</p>';
                }

                document.getElementById('total-saldo').textContent = saldo.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                document.getElementById('total-pagar').textContent = aPagar.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                document.getElementById('total-receber').textContent = aReceber.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
                document.getElementById('total-resultado').textContent = resultadoMes.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            })
            .catch(function(erro) { console.error(erro); });
    };
    window.marcarComoPago = function(id) {
        db.collection('financeiro').doc(id).update({
            status: 'pago',
            data_pagamento: new Date().toISOString().split('T')[0]
        })
        .then(function() { listarLancamentos(); })
        .catch(function(erro) { console.error(erro); });
    };

    window.excluirLancamento = function(id) {
        if (!confirm('Tem certeza que deseja excluir este lançamento?')) return;
        db.collection('financeiro').doc(id).delete()
            .then(function() { listarLancamentos(); })
            .catch(function(erro) { console.error(erro); });
    };

    if (window.location.pathname.includes('financeiro')) {
        listarLancamentos();
    }
});
