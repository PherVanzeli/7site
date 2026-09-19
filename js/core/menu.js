// ==========================================
// CORE - menu.js
// Menu mobile, visibilidade por login e logout
// Depende de: firebase.js (auth)
// ==========================================
window.SITE = window.SITE || {};
window.SITE.menu = window.SITE.menu || {};

window.SITE.menu.configurarMenuMobile = function() {
    const btnMenu = document.getElementById('btn-menu');
    const menu = document.getElementById('menu');
    if (btnMenu && menu) {
        btnMenu.addEventListener('click', function() {
            menu.classList.toggle('ativo');
        });
    }
    const menuCdf = document.querySelector('.menu-cdf');
    const linkCdf = document.querySelector('.menu-cdf-link');
    if (menuCdf && linkCdf) {
        linkCdf.addEventListener('click', function(e) {
            if (window.innerWidth <= 768) {
                e.preventDefault();
                menuCdf.classList.toggle('aberto');
            }
        });
    }
    const setores = document.querySelectorAll('.sidebar-setor');
    setores.forEach(function(setor) {
        const link = setor.querySelector('.sidebar-setor-link');
        if (link) {
            link.addEventListener('click', function(e) {
                if (window.innerWidth <= 768) {
                    e.preventDefault();
                    setor.classList.toggle('aberto');
                }
            });
        }
    });
};

window.SITE.menu.atualizarMenuLogin = function() {
    const itensRestritos = document.querySelectorAll('.item-restrito');
    const menuLogin = document.getElementById('menu-login');
    if (typeof auth === 'undefined') return;
    auth.onAuthStateChanged(function(user) {
        if (user) {
            itensRestritos.forEach(function(item) {
                if (item.querySelector('a[href="dashboard.html"]')) {
                    item.style.display = 'block';
                } else {
                    item.style.display = 'none';
                }
            });
            if (menuLogin) {
                menuLogin.innerHTML = '<a href="#" class="btn-login" onclick="sairDoSistema()">Sair</a>';
            }
        } else {
            itensRestritos.forEach(function(item) { item.style.display = 'none'; });
            if (menuLogin) {
                menuLogin.innerHTML = '<a href="login.html" class="btn-login">Área do Funcionário</a>';
            }
        }
    });
};

window.SITE.menu.marcarLinkAtivoSidebar = function() {
    const paginaAtual = window.location.pathname.split('/').pop() || 'index.html';
    const links = document.querySelectorAll('.sidebar-menu a');
    links.forEach(function(link) {
        const href = link.getAttribute('href');
        if (href === paginaAtual) {
            link.classList.add('ativo');
            const submenu = link.closest('.sidebar-submenu');
            if (submenu) {
                const setor = submenu.closest('.sidebar-setor');
                if (setor) setor.classList.add('aberto');
            }
        }
    });
};

window.sairDoSistema = function() {
    auth.signOut().then(function() { window.location.href = 'login.html'; });
};
window.SITE.menu.sairDoSistema = window.sairDoSistema;
