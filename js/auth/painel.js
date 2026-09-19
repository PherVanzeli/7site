// ==========================================
// AUTH - painel.js
// Painel pessoal do funcionário (nome + acesso ao ERP)
// Depende de: firebase.js (auth, db)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const paginaPainel = document.querySelector('.painel-container');
    if (paginaPainel) {
        auth.onAuthStateChanged(function(user) {
            if (user) {
                const nomeTitulo = document.getElementById('nome-usuario');
                const cpf = user.email.split('@')[0];
                db.collection('usuarios').doc(cpf).get().then(function(doc) {
                    if (doc.exists) {
                        const d = doc.data();
                        nomeTitulo.textContent = d.nome;
                        let tipo = d.tipo_usuario;
                        if (!tipo && d.nivel) {
                            const nivel = parseInt(d.nivel, 10);
                            tipo = nivel >= 2 ? 'subordinado' : 'funcionario';
                        }
                        if (tipo === 'subordinado' || tipo === 'superior' || d.setor === 'todos') {
                            const cardErp = document.getElementById('card-erp');
                            if (cardErp) cardErp.style.display = 'block';
                        }
                    } else {
                        nomeTitulo.textContent = cpf;
                    }
                });
            } else {
                window.location.href = 'login.html';
            }
        });
    }
});
