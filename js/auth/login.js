// ==========================================
// AUTH - login.js
// Autenticação por CPF via Firebase Authentication
// Depende de: firebase.js (auth, db)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const formLogin = document.getElementById('form-login');
    if (formLogin) {
        formLogin.addEventListener('submit', function(e) {
            e.preventDefault();
            const cpf = document.getElementById('cpf').value.trim();
            const senha = document.getElementById('senha').value;
            const msgErro = document.getElementById('msg-erro');
            let email = cpf.includes('@') ? cpf : `${cpf.replace(/\D/g, '')}@7site.com.br`;

            auth.signInWithEmailAndPassword(email, senha)
                .then(function(cred) {
                    const cpfLogado = cred.user.email.split('@')[0];
                    db.collection('usuarios').doc(cpfLogado).get().then(function(doc) {
                        let tipo = 'funcionario';
                        if (doc.exists) {
                            const d = doc.data();
                            tipo = d.tipo_usuario;
                            if (!tipo && d.nivel) {
                                const nivel = parseInt(d.nivel, 10);
                                if (nivel >= 3) tipo = 'superior';
                                else if (nivel === 2) tipo = 'subordinado';
                                else tipo = 'funcionario';
                            }
                        }
                        window.location.href = tipo === 'funcionario' ? 'painel.html' : 'dashboard.html';
                    });
                })
                .catch(function(err) {
                    console.error(err);
                    msgErro.style.display = 'block';
                });
        });
    }
});
