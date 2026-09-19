// ==========================================
// SITE - contato.js
// Formulário de contato do site institucional
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const formContato = document.getElementById('form-contato');
    if (formContato) {
        formContato.addEventListener('submit', function(e) {
            e.preventDefault();
            alert('✅ Mensagem enviada com sucesso!');
            formContato.reset();
        });
    }
});
