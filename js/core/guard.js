// ==========================================
// CORE - guard.js
// Proteção de páginas do ERP (RBAC)
// Depende de: firebase.js (auth, db)
// ==========================================
window.SITE = window.SITE || {};
window.SITE.guard = window.SITE.guard || {};

window.SITE.guard.PERMISSOES = {
    'producao.html': ['CDF', 'todos'],
    'operacoes.html': ['CDF', 'todos'],
    'fluxo.html': ['CDF', 'todos'],
    'estoque.html': ['Administrativo', 'todos'],
    'entrada-corte.html': ['Administrativo', 'todos'],
    'expedicao.html': ['Administrativo', 'todos'],
    'financeiro.html': ['Financeiro', 'todos'],
    'admin.html': ['RH', 'todos'],
    'pessoas.html': ['todos'],
    'configuracoes.html': ['todos'],
    'op.html': ['CDF', 'Administrativo', 'Financeiro', 'todos']
};
window.SITE.guard.PAGINAS_LIVRES = ['painel.html', 'dashboard.html'];

window.SITE.guard.verificarPermissaoPagina = function() {
    const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';
    if (window.SITE.guard.PAGINAS_LIVRES.includes(paginaAtual)) return;
    if (!window.SITE.guard.PERMISSOES[paginaAtual]) return;

    const setoresPermitidos = window.SITE.guard.PERMISSOES[paginaAtual];

    auth.onAuthStateChanged(function(user) {
        if (!user) { window.location.href = 'login.html'; return; }
        const cpfLogado = user.email.split('@')[0];
        db.collection('usuarios').doc(cpfLogado).get().then(function(doc) {
            if (!doc.exists) { window.location.href = 'login.html'; return; }
            const d = doc.data();
            let setor = d.setor;
            let tipo = d.tipo_usuario;
            if (!tipo && d.nivel) {
                const nivelAntigo = parseInt(d.nivel, 10);
                if (nivelAntigo >= 4) { tipo = 'superior'; setor = 'todos'; }
                else if (nivelAntigo === 3) { tipo = 'superior'; setor = 'RH'; }
                else { tipo = 'funcionario'; setor = null; }
            }
            if (setoresPermitidos.includes(setor)) return;
            alert('Acesso negado.');
            window.location.href = 'painel.html';
        });
    });
};

window.SITE.guard.verificarPermissaoPagina();
