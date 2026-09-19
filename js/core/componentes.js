// ==========================================
// CORE - componentes.js
// Injeção de header, footer e sidebar via fetch
// Depende de: menu.js (window.SITE.menu)
// ==========================================
window.SITE = window.SITE || {};
window.SITE.componentes = window.SITE.componentes || {};

async function injetarComponente(url, elementoId) {
    const elemento = document.getElementById(elementoId);
    if (!elemento) return;
    try {
        const resposta = await fetch(url);
        if (!resposta.ok) return;
        const html = await resposta.text();
        elemento.innerHTML = html;
        if (elementoId === 'header-include') {
            window.SITE.menu.configurarMenuMobile();
            window.SITE.menu.atualizarMenuLogin();
        }
        if (elementoId === 'sidebar-include') {
            window.SITE.menu.marcarLinkAtivoSidebar();
        }
    } catch (erro) {
        console.error('Erro ao injetar componente:', erro);
    }
}
window.SITE.componentes.injetar = injetarComponente;

injetarComponente('components/header.html', 'header-include');
injetarComponente('components/footer.html', 'footer-include');
injetarComponente('components/sidebar.html', 'sidebar-include');
