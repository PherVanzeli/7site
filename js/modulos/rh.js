// ==========================================
// MÓDULO - rh.js
// Sala do RH: cadastro e listagem de funcionários
// Depende de: firebase.js (auth, db), core/utils.js (maiusculo, validarCPF)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const tipoUsuarioSelect = document.getElementById('tipo-usuario');
    if (tipoUsuarioSelect) {
        tipoUsuarioSelect.addEventListener('change', function() {
            const campoSetor = document.getElementById('campo-setor');
            if (this.value === 'funcionario') {
                campoSetor.style.display = 'none';
                document.getElementById('setor-funcionario').required = false;
            } else {
                campoSetor.style.display = 'block';
                document.getElementById('setor-funcionario').required = true;
            }
        });
    }

    const formCadastro = document.getElementById('form-cadastro');
    if (formCadastro) {
        auth.onAuthStateChanged(function(user) {
            if (!user) { window.location.href = 'login.html'; return; }
            const cpfLogado = user.email.split('@')[0];
            db.collection('usuarios').doc(cpfLogado).get().then(function(doc) {
                if (!doc.exists) { window.location.href = 'painel.html'; return; }
                const usuarioLogado = doc.data();
                let tipo = usuarioLogado.tipo_usuario;
                let setor = usuarioLogado.setor;
                if (!tipo && usuarioLogado.nivel) {
                    const nivelAntigo = parseInt(usuarioLogado.nivel, 10);
                    if (nivelAntigo >= 4) { tipo = 'superior'; setor = 'todos'; }
                    else if (nivelAntigo === 3) { tipo = 'superior'; setor = 'RH'; }
                    else { tipo = 'funcionario'; setor = null; }
                }
                if (!tipo) tipo = 'funcionario';
                if (setor !== 'todos' && setor !== 'RH') {
                    alert('Acesso negado.');
                    window.location.href = 'painel.html';
                    return;
                }
                if (setor === 'RH' && tipo === 'superior') {
                    const selectSetor = document.getElementById('setor-funcionario');
                    selectSetor.value = 'RH';
                    selectSetor.disabled = true;
                    const optionSuperior = document.querySelector('#tipo-usuario option[value="superior"]');
                    if (optionSuperior) optionSuperior.remove();
                }
                window.usuarioLogado = usuarioLogado;
                listarFuncionarios();
            });
        });

        formCadastro.addEventListener('submit', function(e) {
            e.preventDefault();
            const nome = document.getElementById('nome-funcionario').value;
            const cpf = document.getElementById('cpf-funcionario').value.replace(/\D/g, '');
            const senha = document.getElementById('senha-funcionario').value;
            const cargo = document.getElementById('cargo-funcionario').value;
            const tipo = document.getElementById('tipo-usuario').value;
            const setor = document.getElementById('setor-funcionario').value || null;

            if (!validarCPF(cpf)) { alert('CPF inválido.'); return; }
            if (tipo !== 'funcionario' && !setor) { alert('Selecione um setor.'); return; }

            const botao = formCadastro.querySelector('.btn-producao');
            botao.textContent = 'Criando...';
            botao.disabled = true;

            // Uma instância secundária mantém a sessão do gestor durante o cadastro.
            const appCadastro = firebase.initializeApp(
                firebase.app().options,
                'cadastro-rh-' + Date.now() + '-' + Math.random().toString(36).slice(2)
            );
            const authCadastro = appCadastro.auth();
            const cpfGestor = auth.currentUser.email.split('@')[0];
            let novoUsuario = null;
            let perfilCriado = false;

            authCadastro.createUserWithEmailAndPassword(`${cpf}@7site.com.br`, senha)
                .then(function(credencial) {
                    novoUsuario = credencial.user;
                    return db.collection('usuarios').doc(cpf).set({
                        nome: maiusculo(nome),
                        cpf: cpf,
                        cargo: maiusculo(cargo),
                        tipo_usuario: tipo,
                        setor: setor,
                        ativo: true,
                        criado_por: cpfGestor,
                        data_cadastro: firebase.firestore.FieldValue.serverTimestamp()
                    });
                })
                .then(function() {
                    perfilCriado = true;
                    alert(`✅ Acesso criado para ${nome}!`);
                    formCadastro.reset();
                    document.getElementById('campo-setor').style.display = 'none';
                    botao.textContent = 'Criar Acesso';
                    botao.disabled = false;
                    listarFuncionarios();
                })
                .catch(function(erro) {
                    // Se o perfil não foi salvo, remove a conta Auth recém-criada.
                    const desfazer = novoUsuario && !perfilCriado
                        ? novoUsuario.delete().catch(function(erroRemocao) {
                            console.error('Não foi possível remover a conta sem perfil:', erroRemocao);
                            throw new Error(erro.message +
                                ' A conta de autenticação foi criada, mas precisa ser removida manualmente.');
                        })
                        : Promise.resolve();
                    return desfazer.then(function() { throw erro; });
                })
                .catch(function(erro) {
                    console.error('Erro no cadastro:', erro);
                    alert('❌ ' + erro.message);
                })
                .finally(function() {
                    botao.textContent = 'Criar Acesso';
                    botao.disabled = false;
                    return authCadastro.signOut().catch(function() {
                        // A conta pode já ter sido removida no tratamento de erro.
                    }).then(function() { return appCadastro.delete(); });
                });
        });
    }
    window.listarFuncionarios = function() {
        const lista = document.getElementById('lista-funcionarios');
        if (!lista) return;
        lista.innerHTML = '<p class="texto-placeholder">Carregando lista...</p>';

        const filtroSetor = document.getElementById('filtro-setor-lista').value;
        const filtroTipo = document.getElementById('filtro-tipo-lista').value;
        const usuarioLogado = window.usuarioLogado;
        if (!usuarioLogado) return;

        const setorLogado = usuarioLogado.setor;
        const ehMestre = setorLogado === 'todos';

        db.collection('usuarios').get().then(function(snapshot) {
            const usuarios = [];
            snapshot.forEach(function(doc) {
                const d = doc.data();
                if (!ehMestre && d.setor !== setorLogado) return;
                if (filtroSetor !== 'todos' && d.setor !== filtroSetor) return;
                if (filtroTipo !== 'todos' && d.tipo_usuario !== filtroTipo) return;
                usuarios.push({ id: doc.id, ...d });
            });

            if (usuarios.length === 0) {
                lista.innerHTML = '<p class="texto-placeholder">Nenhum usuário encontrado.</p>';
                return;
            }

            let html = '<table class="tabela-estoque"><thead><tr><th>Nome</th><th>CPF</th><th>Cargo</th><th>Tipo</th><th>Setor</th></tr></thead><tbody>';
            usuarios.forEach(function(u) {
                const tipoLabel = {
                    'funcionario': 'Funcionário',
                    'subordinado': 'Subordinado',
                    'superior': 'Superior'
                }[u.tipo_usuario] || 'Funcionário';
                html += `<tr>
                    <td>${u.nome}</td>
                    <td>${u.cpf}</td>
                    <td>${u.cargo}</td>
                    <td><span class="badge-tipo ${u.tipo_usuario}">${tipoLabel}</span></td>
                    <td><span class="badge-setor">${u.setor || '—'}</span></td>
                </tr>`;
            });
            html += '</tbody></table>';
            lista.innerHTML = html;
        });
    };
});
