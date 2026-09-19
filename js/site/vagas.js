// ==========================================
// SITE - vagas.js
// Formulário de vagas em etapas (Trabalhe Conosco)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const formVagas = document.getElementById('form-vagas');
    if (formVagas) {
        window.irParaEtapa = function(num) {
            const etapas = formVagas.querySelectorAll('.etapa-form');
            etapas.forEach(function(et) { et.classList.remove('ativa'); });
            const alvo = document.getElementById('etapa-' + num);
            if (alvo) alvo.classList.add('ativa');
        };
        formVagas.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('✅ Cadastro enviado!');
            formVagas.reset();
            window.irParaEtapa(1);
        });
    }
});
