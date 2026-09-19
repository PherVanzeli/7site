// ==========================================
// MÓDULO - estoque.js
// Estoque unificado (itens internos e externos)
// Depende de: firebase.js (db), core/utils.js (maiusculo)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const categoriaEstoque = document.getElementById('categoria-estoque');
    if (categoriaEstoque) {
        categoriaEstoque.addEventListener('change', function() {
            const camposInternos = document.getElementById('campos-internos');
            if (this.value === 'interno') {
                camposInternos.style.display = 'block';
            } else {
                camposInternos.style.display = 'none';
            }
        });
    }

    const formEstoque = document.getElementById('form-estoque');
    if (formEstoque) {
        formEstoque.addEventListener('submit', function(e) {
            e.preventDefault();

            const categoria = document.getElementById('categoria-estoque').value;
            const nome = document.getElementById('nome-estoque').value;
            const material = document.getElementById('material-estoque').value;
            const cor = document.getElementById('cor-estoque').value;
            const tamanho = document.getElementById('tamanho-estoque').value;
            const unidade = document.getElementById('unidade-estoque').value;
            const observacoes = document.getElementById('observacoes-estoque').value;

            let quantidadeAtual = 0;
            let quantidadeMinima = 0;
            let precoCusto = 0;
            let fornecedorHabitual = '';

            if (categoria === 'interno') {
                quantidadeAtual = parseFloat(document.getElementById('quantidade-estoque').value) || 0;
                quantidadeMinima = parseFloat(document.getElementById('quantidade-minima-estoque').value) || 0;
                precoCusto = parseFloat(document.getElementById('preco-custo-estoque').value) || 0;
                fornecedorHabitual = document.getElementById('fornecedor-habitual-estoque').value || '';
            }

            if (!nome) { alert('Digite o nome do item.'); return; }

            const botao = formEstoque.querySelector('.btn-producao');
            botao.textContent = 'Cadastrando...';
            botao.disabled = true;

            const codigo = 'EST-' + Date.now().toString().slice(-6);

            const item = {
                codigo: codigo,
                categoria: categoria,
                nome: maiusculo(nome),
                material: maiusculo(material) || 'N/A',
                cor: maiusculo(cor) || 'N/A',
                tamanho: maiusculo(tamanho) || 'N/A',
                unidade: unidade,
                observacoes: maiusculo(observacoes) || '',
                data_cadastro: firebase.firestore.FieldValue.serverTimestamp(),
                data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
            };

            if (categoria === 'interno') {
                item.quantidade_atual = quantidadeAtual;
                item.quantidade_minima = quantidadeMinima;
                item.preco_custo_atual = precoCusto;
                item.fornecedor_habitual = maiusculo(fornecedorHabitual) || '';
            }

            db.collection('estoque').add(item)
                .then(function() {
                    alert('✅ Item cadastrado no estoque!');
                    formEstoque.reset();
                    document.getElementById('campos-internos').style.display = 'none';
                    botao.textContent = 'Cadastrar Item';
                    botao.disabled = false;
                    listarEstoque();
                })
                .catch(function(erro) {
                    console.error('Erro:', erro);
                    alert('❌ Erro ao cadastrar.');
                    botao.textContent = 'Cadastrar Item';
                    botao.disabled = false;
                });
        });
    }
    window.listarEstoque = function() {
        const lista = document.getElementById('lista-estoque');
        if (!lista) return;

        lista.innerHTML = '<p class="texto-placeholder">Carregando estoque...</p>';

        const filtro = document.getElementById('filtro-categoria-estoque').value;

        db.collection('estoque').get()
            .then(function(snapshot) {
                const itens = [];
                let totalInterno = 0;
                let totalExterno = 0;

                snapshot.forEach(function(doc) {
                    const d = doc.data();
                    if (!d.categoria) return;

                    if (d.categoria === 'interno') totalInterno++;
                    else if (d.categoria === 'externo') totalExterno++;

                    if (filtro !== 'todos' && d.categoria !== filtro) return;

                    itens.push({ id: doc.id, ...d });
                });

                itens.sort(function(a, b) {
                    return (a.nome || '').localeCompare(b.nome || '');
                });

                if (itens.length === 0) {
                    lista.innerHTML = '<p class="texto-placeholder">Nenhum item encontrado.</p>';
                    document.getElementById('total-itens-estoque').textContent = 0;
                    document.getElementById('total-internos').textContent = totalInterno;
                    document.getElementById('total-externos').textContent = totalExterno;
                    return;
                }

                let html = '<table class="tabela-estoque"><thead><tr><th>Código</th><th>Nome</th><th>Categoria</th><th>Unidade</th><th>Saldo</th><th>Preço Custo</th><th>Ações</th></tr></thead><tbody>';

                itens.forEach(function(d) {
                    const badge = `<span class="badge-categoria ${d.categoria}">${d.categoria === 'interno' ? 'Interno' : 'Externo'}</span>`;

                    let saldoHTML = '—';
                    let precoHTML = '—';

                    if (d.categoria === 'interno') {
                        const saldo = d.quantidade_atual || 0;
                        const minima = d.quantidade_minima || 0;

                        if (minima > 0 && saldo <= minima) {
                            saldoHTML = `<span class="alerta-estoque-baixo">⚠️ ${saldo} ${d.unidade}</span>`;
                        } else {
                            saldoHTML = `${saldo} ${d.unidade}`;
                        }

                        precoHTML = d.preco_custo_atual
                            ? `R$ ${d.preco_custo_atual.toFixed(2)}`
                            : '—';
                    } else if (d.categoria === 'externo') {
                        const saldo = d.quantidade_atual || 0;
                        saldoHTML = `${saldo} ${d.unidade}`;
                    }

                    html += `<tr>
                        <td>${d.codigo || '—'}</td>
                        <td>${d.nome}</td>
                        <td>${badge}</td>
                        <td>${d.unidade}</td>
                        <td>${saldoHTML}</td>
                        <td>${precoHTML}</td>
                        <td><button class="btn-excluir" onclick="excluirEstoque('${d.id}')">🗑️</button></td>
                    </tr>`;
                });

                html += '</tbody></table>';
                lista.innerHTML = html;

                document.getElementById('total-itens-estoque').textContent = itens.length;
                document.getElementById('total-internos').textContent = totalInterno;
                document.getElementById('total-externos').textContent = totalExterno;
            })
            .catch(function(erro) {
                console.error('Erro:', erro);
                lista.innerHTML = '<p class="texto-placeholder">Erro ao carregar.</p>';
            });
    };

    window.excluirEstoque = function(id) {
        if (!confirm('Tem certeza que deseja excluir este item?')) return;
        db.collection('estoque').doc(id).delete()
            .then(function() {
                alert('✅ Item excluído!');
                listarEstoque();
            })
            .catch(function(erro) { console.error(erro); });
    };

    if (window.location.pathname.includes('estoque')) {
        listarEstoque();
    }
});
