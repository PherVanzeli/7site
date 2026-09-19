// ==========================================
// MÓDULO - dashboard.js
// Home do ERP (atalhos por setor)
// Depende de: firebase.js (auth, db)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const erpAtalhos = document.getElementById('erp-atalhos');
    if (erpAtalhos) {
        auth.onAuthStateChanged(function(user) {
            if (!user) { window.location.href = 'login.html'; return; }
            const cpfLogado = user.email.split('@')[0];
            db.collection('usuarios').doc(cpfLogado).get().then(function(doc) {
                if (!doc.exists) { window.location.href = 'login.html'; return; }
                const d = doc.data();
                let setor = d.setor;
                let tipo = d.tipo_usuario;

                if (!tipo && d.nivel) {
                    const n = parseInt(d.nivel, 10);
                    if (n >= 4) { tipo = 'superior'; setor = 'todos'; }
                    else if (n === 3) { tipo = 'superior'; setor = 'RH'; }
                    else { tipo = 'funcionario'; setor = null; }
                }

                document.getElementById('nome-erp').textContent = d.nome;
                let info = `${d.cargo}`;
                if (setor && setor !== 'todos') info += ` • Setor: ${setor}`;
                if (setor === 'todos') info += ` • Mestre`;
                document.getElementById('info-erp').textContent = info;

                let html = '';
                if (setor === 'todos' || setor === 'CDF') {
                    html += `<a href="producao.html" class="card-atalho"><span class="icone-atalho">⚙️</span><h3>Produção</h3><p>Gerar OPs e controlar o chão de fábrica</p></a>`;
                }
                if (setor === 'todos' || setor === 'Administrativo') {
                    html += `<a href="entrada-corte.html" class="card-atalho"><span class="icone-atalho">📥</span><h3>Entrada de Corte</h3><p>Registrar NF e gerar OP</p></a>`;
                    html += `<a href="estoque.html" class="card-atalho"><span class="icone-atalho">📦</span><h3>Estoque</h3><p>Itens internos e externos</p></a>`;
                }
                if (setor === 'todos' || setor === 'Financeiro') {
                    html += `<a href="financeiro.html" class="card-atalho"><span class="icone-atalho">💰</span><h3>Financeiro</h3><p>Contas a pagar e receber</p></a>`;
                }
                if (setor === 'todos' || setor === 'RH') {
                    html += `<a href="admin.html" class="card-atalho"><span class="icone-atalho">🔐</span><h3>Sala do RH</h3><p>Gerenciar usuários e permissões</p></a>`;
                }
                if (tipo === 'superior' || setor === 'todos') {
                    html += `<a href="pessoas.html" class="card-atalho"><span class="icone-atalho">👤</span><h3>Pessoas</h3><p>Cadastro de pessoas físicas e jurídicas</p></a>`;
                }
                html += `<a href="painel.html" class="card-atalho"><span class="icone-atalho">📄</span><h3>Meu Painel</h3><p>Holerites, atestados e avisos</p></a>`;
                if (setor === 'todos') {
                    html += `<a href="configuracoes.html" class="card-atalho"><span class="icone-atalho">⚙️</span><h3>Configurações</h3><p>Dados da empresa e preferências</p></a>`;
                }
                erpAtalhos.innerHTML = html;
            });
        });
    }
});
