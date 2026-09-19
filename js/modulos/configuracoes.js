// ==========================================
// MÓDULO - configuracoes.js
// Configurações da empresa + preferências + jornada de trabalho
// Depende de: firebase.js (db), core/utils.js (maiusculo)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const formEmpresa = document.getElementById('form-empresa');
    if (formEmpresa) {
        db.collection('configuracoes').doc('empresa').get().then(function(doc) {
            if (doc.exists) {
                const d = doc.data();
                document.getElementById('config-nome').value = d.nome || '';
                document.getElementById('config-cnpj').value = d.cnpj || '';
                document.getElementById('config-telefone').value = d.telefone || '';
                document.getElementById('config-email').value = d.email || '';
                document.getElementById('config-endereco').value = d.endereco || '';
            }
        });

        formEmpresa.addEventListener('submit', function(e) {
            e.preventDefault();
            const dados = {
                nome: maiusculo(document.getElementById('config-nome').value),
                cnpj: document.getElementById('config-cnpj').value,
                telefone: document.getElementById('config-telefone').value,
                email: (document.getElementById('config-email').value || '').toLowerCase(),
                endereco: maiusculo(document.getElementById('config-endereco').value),
                data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
            };
            db.collection('configuracoes').doc('empresa').set(dados, { merge: true })
                .then(function() { alert('✅ Dados salvos!'); })
                .catch(function(erro) { console.error(erro); });
        });
    }

    const formPreferencias = document.getElementById('form-preferencias');
    if (formPreferencias) {
        db.collection('configuracoes').doc('preferencias').get().then(function(doc) {
            if (doc.exists) {
                const d = doc.data();
                document.getElementById('config-maiusculo').checked = d.maiusculo || false;
                document.getElementById('config-notificacoes').checked = d.notificacoes || false;
                document.getElementById('config-fuso').value = d.fuso || 'America/Sao_Paulo';
            }
        });

        formPreferencias.addEventListener('submit', function(e) {
            e.preventDefault();
            const dados = {
                maiusculo: document.getElementById('config-maiusculo').checked,
                notificacoes: document.getElementById('config-notificacoes').checked,
                fuso: document.getElementById('config-fuso').value,
                data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
            };
            db.collection('configuracoes').doc('preferencias').set(dados, { merge: true })
                .then(function() { alert('✅ Preferências salvas!'); })
                .catch(function(erro) { console.error(erro); });
        });
    }
    const DIAS_SEMANA = ['segunda', 'terca', 'quarta', 'quinta', 'sexta', 'sabado', 'domingo'];

    const formJornada = document.getElementById('form-jornada');
    if (formJornada) {
        // Carrega jornada existente
        db.collection('configuracoes').doc('jornada').get().then(function(doc) {
            if (doc.exists) {
                const dados = doc.data();

                DIAS_SEMANA.forEach(function(dia) {
                    const aberto = dados[dia] && dados[dia].aberto;
                    const checkbox = document.getElementById(dia + '-aberto');
                    if (checkbox) {
                        checkbox.checked = !!aberto;
                    }

                    if (dados[dia]) {
                        const campos = ['inicio1', 'fim1', 'inicio2', 'fim2'];
                        campos.forEach(function(campo) {
                            const input = document.getElementById(dia + '-' + campo);
                            if (input) {
                                input.value = dados[dia][campo] || '';
                            }
                        });
                    }
                });

                aplicarEstadoDias();
            }
        });

        // Salvar
        formJornada.addEventListener('submit', function(e) {
            e.preventDefault();

            const dados = {};

            DIAS_SEMANA.forEach(function(dia) {
                const aberto = document.getElementById(dia + '-aberto').checked;
                dados[dia] = {
                    aberto: aberto,
                    inicio1: document.getElementById(dia + '-inicio1').value,
                    fim1: document.getElementById(dia + '-fim1').value,
                    inicio2: document.getElementById(dia + '-inicio2').value,
                    fim2: document.getElementById(dia + '-fim2').value
                };
            });

            db.collection('configuracoes').doc('jornada').set({
                ...dados,
                data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(function() {
                alert('✅ Jornada de trabalho salva!');
            })
            .catch(function(erro) {
                console.error('Erro ao salvar jornada:', erro);
                alert('❌ Erro ao salvar jornada.');
            });
        });

        // Ativa/desativa campos conforme o checkbox
        DIAS_SEMANA.forEach(function(dia) {
            const checkbox = document.getElementById(dia + '-aberto');
            if (checkbox) {
                checkbox.addEventListener('change', aplicarEstadoDias);
            }
        });
    }

    function aplicarEstadoDias() {
        DIAS_SEMANA.forEach(function(dia) {
            const checkbox = document.getElementById(dia + '-aberto');
            if (!checkbox) return;

            const aberto = checkbox.checked;
            const campos = ['inicio1', 'fim1', 'inicio2', 'fim2'];

            campos.forEach(function(campo) {
                const input = document.getElementById(dia + '-' + campo);
                if (input) {
                    input.disabled = !aberto;
                }
            });
        });
    }
});
