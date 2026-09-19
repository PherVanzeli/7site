// ==========================================
// SITE - noticias.js
// Carrossel de notícias com autoplay
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    let slideAtual = 0;
    window.irParaSlide = function(i) {
        const slides = document.querySelectorAll('.carrossel-slide');
        const bolinhas = document.querySelectorAll('.bolinha');
        if (!slides.length) return;
        slides.forEach(s => s.classList.remove('ativo'));
        bolinhas.forEach(b => b.classList.remove('ativa'));
        slideAtual = i;
        if (slideAtual >= slides.length) slideAtual = 0;
        if (slideAtual < 0) slideAtual = slides.length - 1;
        slides[slideAtual].classList.add('ativo');
        bolinhas[slideAtual].classList.add('ativa');
    };
    window.mudarSlide = function(d) { window.irParaSlide(slideAtual + d); };
    const carrossel = document.getElementById('carrossel');
    if (carrossel) setInterval(function() { window.mudarSlide(1); }, 5000);
});
