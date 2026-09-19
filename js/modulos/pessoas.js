// ==========================================
// MÓDULO - pessoas.js
// Cadastro de pessoas físicas e jurídicas (BrasilAPI + ViaCEP)
// Depende de: firebase.js (db), core/utils.js (maiusculo)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    let telefoneCount = 1;
    let pessoaEmEdicao = null;
    let dadosCarregadosPorCNPJ = false;

    window.adicionarTelefone = function() {
        telefoneCount++;
        const container = document.getElementById('telefones-container');
        if (!container) return;
        const novoTelefone = document.createElement('div');
        novoTelefone.classList.add('telefone-row');
        novoTelefone.innerHTML = `
            <input type="text" id="telefone-${telefoneCount}" class="input-telefone" placeholder="(11) 99999-9999">
            <button type="button" class="btn-add-telefone" onclick="removerTelefone(this)">×</button>
        `;
        container.appendChild(novoTelefone);
    };

    window.removerTelefone = function(botao) {
        botao.parentElement.remove();
    };

    function configurarDocumento() {
        const documento = document.getElementById('documento-pessoa');
        const ieContainer = document.getElementById('inscricao-estadual-container');
        const labelData = document.getElementById('label-data');
        if (!documento) return;

        documento.addEventListener('input', function() {
            const docLimpo = this.value.replace(/\D/g, '');
            if (docLimpo.length === 11) {
                if (ieContainer) ieContainer.style.display = 'none';
                if (labelData) labelData.textContent = 'Data de Nascimento';
            } else if (docLimpo.length === 14) {
                if (ieContainer) ieContainer.style.display = 'block';
                if (labelData) labelData.textContent = 'Data de Fundação';
            } else {
                if (ieContainer) ieContainer.style.display = 'none';
                if (labelData) labelData.textContent = 'Data de Nascimento';
            }
        });
    }

    function configurarConsultaCNPJ() {
        const documento = document.getElementById('documento-pessoa');
        if (!documento) return;

        let timer;
        documento.addEventListener('input', function() {
            clearTimeout(timer);
            const cnpj = this.value.replace(/\D/g, '');
            if (cnpj.length === 14) {
                timer = setTimeout(function() {
                    consultarCNPJ();
                }, 1000);
            }
        });
    }

    window.consultarCNPJ = function() {
        const cnpj = document.getElementById('documento-pessoa').value.replace(/\D/g, '');
        if (cnpj.length !== 14) { alert('Digite um CNPJ válido.'); return; }

        const botao = document.querySelector('.btn-buscar-cnpj');
        if (botao) { botao.textContent = '⏳'; botao.disabled = true; }

        fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
            .then(function(resposta) {
                if (!resposta.ok) throw new Error('CNPJ não encontrado');
                return resposta.json();
            })
            .then(function(dados) {
                document.getElementById('nome-pessoa').value = maiusculo(dados.razao_social || '');
                document.getElementById('email-pessoa').value = (dados.email || '').toLowerCase();

                if (dados.data_inicio_atividade) {
                    document.getElementById('data-nascimento-fundacao').value = dados.data_inicio_atividade;
                }
                if (dados.inscricao_estadual) {
                    document.getElementById('inscricao-estadual').value = dados.inscricao_estadual;
                }

                document.getElementById('cep-pessoa').value = dados.cep || '';
                document.getElementById('logradouro-pessoa').value = maiusculo(dados.logradouro || '');
                document.getElementById('numero-pessoa').value = dados.numero || '';
                document.getElementById('complemento-pessoa').value = maiusculo(dados.complemento || '');
                document.getElementById('bairro-pessoa').value = maiusculo(dados.bairro || '');
                document.getElementById('cidade-pessoa').value = maiusculo(dados.municipio || '');
                document.getElementById('cidade-pessoa').readOnly = true;
                document.getElementById('estado-pessoa').value = maiusculo(dados.uf || '');

                if (dados.ddd_telefone_1 && dados.telefone_1) {
                    document.getElementById('telefone-1').value = `(${dados.ddd_telefone_1}) ${dados.telefone_1}`;
                }

                document.getElementById('label-data').textContent = 'Data de Fundação';
                dadosCarregadosPorCNPJ = true;
                setTimeout(function() { dadosCarregadosPorCNPJ = false; }, 2000);

                alert('✅ Dados do CNPJ preenchidos.');
            })
            .catch(function(erro) {
                console.error('Erro na consulta:', erro);
                alert('Erro ao consultar o CNPJ.');
            })
            .finally(function() {
                if (botao) { botao.textContent = '🔍'; botao.disabled = false; }
            });
    };
    function configurarBuscaCEP() {
        const cepInput = document.getElementById('cep-pessoa');
        if (!cepInput) return;

        cepInput.addEventListener('blur', function() {
            if (dadosCarregadosPorCNPJ) return;
            const cep = this.value.replace(/\D/g, '');
            if (cep.length !== 8) return;

            fetch(`https://viacep.com.br/ws/${cep}/json/`)
                .then(function(resposta) { return resposta.json(); })
                .then(function(dados) {
                    if (dados.erro) { alert('CEP não encontrado.'); return; }
                    document.getElementById('logradouro-pessoa').value = maiusculo(dados.logradouro || '');
                    document.getElementById('bairro-pessoa').value = maiusculo(dados.bairro || '');
                    document.getElementById('cidade-pessoa').value = maiusculo(dados.localidade || '');
                    document.getElementById('estado-pessoa').value = maiusculo(dados.uf || '');
                    document.getElementById('cidade-pessoa').readOnly = true;
                    document.getElementById('numero-pessoa').focus();
                })
                .catch(function(erro) { console.error('Erro CEP:', erro); });
        });
    }

    window.editarPessoa = function(id) {
        db.collection('pessoas').doc(id).get().then(function(doc) {
            if (!doc.exists) return;
            const d = doc.data();
            pessoaEmEdicao = id;

            document.getElementById('nome-pessoa').value = d.nome;
            document.getElementById('documento-pessoa').value = d.documento;
            document.getElementById('data-nascimento-fundacao').value = d.data !== 'N/A' ? d.data : '';
            document.getElementById('email-pessoa').value = d.email !== 'N/A' ? d.email : '';

            if (d.tipo === 'juridica') {
                document.getElementById('inscricao-estadual-container').style.display = 'block';
                document.getElementById('inscricao-estadual').value = d.inscricao_estadual || '';
                document.getElementById('label-data').textContent = 'Data de Fundação';
            } else {
                document.getElementById('label-data').textContent = 'Data de Nascimento';
            }

            document.getElementById('cep-pessoa').value = d.endereco.cep;
            document.getElementById('logradouro-pessoa').value = d.endereco.logradouro;
            document.getElementById('numero-pessoa').value = d.endereco.numero;
            document.getElementById('complemento-pessoa').value = d.endereco.complemento;
            document.getElementById('bairro-pessoa').value = d.endereco.bairro;
            document.getElementById('cidade-pessoa').value = d.endereco.cidade;
            document.getElementById('cidade-pessoa').readOnly = true;
            document.getElementById('estado-pessoa').value = d.endereco.estado;

            const container = document.getElementById('telefones-container');
            container.innerHTML = '';
            telefoneCount = 0;
            d.telefones.forEach(function(tel, index) {
                telefoneCount++;
                const div = document.createElement('div');
                div.classList.add('telefone-row');
                const botao = (index === d.telefones.length - 1)
                    ? `<button type="button" class="btn-add-telefone" onclick="adicionarTelefone()">+</button>`
                    : `<button type="button" class="btn-add-telefone" onclick="removerTelefone(this)">×</button>`;
                div.innerHTML = `<input type="text" id="telefone-${telefoneCount}" class="input-telefone" value="${tel}">${botao}`;
                container.appendChild(div);
            });
            if (telefoneCount === 0) {
                telefoneCount = 1;
                container.innerHTML = `
                    <div class="telefone-row">
                        <input type="text" id="telefone-1" class="input-telefone" placeholder="(11) 99999-9999">
                        <button type="button" class="btn-add-telefone" onclick="adicionarTelefone()">+</button>
                    </div>
                `;
            }

            const formPessoa = document.getElementById('form-pessoa');
            formPessoa.querySelector('.btn-producao').textContent = 'Salvar Alterações';
            formPessoa.scrollIntoView({ behavior: 'smooth' });
        });
    };
    const formPessoa = document.getElementById('form-pessoa');
    if (formPessoa) {
        configurarDocumento();
        configurarBuscaCEP();
        configurarConsultaCNPJ();

        formPessoa.addEventListener('submit', function(evento) {
            evento.preventDefault();

            const nome = document.getElementById('nome-pessoa').value;
            const documento = document.getElementById('documento-pessoa').value.replace(/\D/g, '');
            const data = document.getElementById('data-nascimento-fundacao').value;
            const inscricaoEstadual = document.getElementById('inscricao-estadual') ? document.getElementById('inscricao-estadual').value : 'N/A';
            const email = document.getElementById('email-pessoa').value;

            const telefones = [];
            document.querySelectorAll('.input-telefone').forEach(function(input) {
                if (input.value.trim() !== '') telefones.push(input.value.trim());
            });

            const endereco = {
                cep: document.getElementById('cep-pessoa').value,
                logradouro: document.getElementById('logradouro-pessoa').value,
                numero: document.getElementById('numero-pessoa').value,
                complemento: document.getElementById('complemento-pessoa').value || 'N/A',
                bairro: document.getElementById('bairro-pessoa').value,
                cidade: document.getElementById('cidade-pessoa').value,
                estado: document.getElementById('estado-pessoa').value
            };

            let tipo = 'desconhecido';
            if (documento.length === 11) tipo = 'fisica';
            else if (documento.length === 14) tipo = 'juridica';
            else { alert('Documento inválido.'); return; }

            const resumo = `
                Confirme os dados:

                Tipo: ${tipo === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'}
                Nome: ${nome}
                Documento: ${documento}
                Cidade: ${endereco.cidade}/${endereco.estado}
            `;
            if (!confirm(resumo)) return;

            const botao = formPessoa.querySelector('.btn-producao');
            botao.textContent = 'Salvando...';
            botao.disabled = true;

            const dadosParaSalvar = {
                tipo: tipo,
                nome: maiusculo(nome),
                documento: documento,
                data: data || 'N/A',
                inscricao_estadual: maiusculo(inscricaoEstadual),
                telefones: telefones,
                email: email.toLowerCase() || 'N/A',
                endereco: {
                    cep: endereco.cep,
                    logradouro: maiusculo(endereco.logradouro),
                    numero: endereco.numero,
                    complemento: maiusculo(endereco.complemento),
                    bairro: maiusculo(endereco.bairro),
                    cidade: maiusculo(endereco.cidade),
                    estado: maiusculo(endereco.estado)
                },
                data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
            };

            let promise;
            if (pessoaEmEdicao) {
                promise = db.collection('pessoas').doc(pessoaEmEdicao).update(dadosParaSalvar);
            } else {
                dadosParaSalvar.data_cadastro = firebase.firestore.FieldValue.serverTimestamp();
                promise = db.collection('pessoas').add(dadosParaSalvar);
            }

            promise.then(function() {
                alert(pessoaEmEdicao ? '✅ Pessoa atualizada!' : '✅ Pessoa cadastrada!');
                formPessoa.reset();
                pessoaEmEdicao = null;
                botao.textContent = 'Cadastrar Pessoa';
                botao.disabled = false;
                listarPessoas();
            })
            .catch(function(erro) {
                console.error('Erro:', erro);
                alert('❌ Erro ao salvar.');
                botao.textContent = 'Cadastrar Pessoa';
                botao.disabled = false;
            });
        });
    }
    window.listarPessoas = function() {
        const lista = document.getElementById('lista-pessoas');
        if (!lista) return;
        lista.innerHTML = '<p class="texto-placeholder">Carregando pessoas...</p>';

        db.collection('pessoas').get().then(function(snapshot) {
            if (snapshot.empty) {
                lista.innerHTML = '<p class="texto-placeholder">Nenhuma pessoa cadastrada.</p>';
                return;
            }
            let html = '<table class="tabela-estoque"><thead><tr><th>Tipo</th><th>Nome</th><th>Documento</th><th>Telefone</th><th>Cidade/UF</th><th>Ações</th></tr></thead><tbody>';
            snapshot.forEach(function(doc) {
                const d = doc.data();
                const telefoneExibicao = d.telefones && d.telefones.length > 0 ? d.telefones[0] : 'N/A';
                const cidadeUf = d.endereco ? `${d.endereco.cidade}/${d.endereco.estado}` : 'N/A';
                html += `<tr>
                    <td>${d.tipo === 'fisica' ? 'Física' : 'Jurídica'}</td>
                    <td>${d.nome}</td>
                    <td>${d.documento}</td>
                    <td>${telefoneExibicao}</td>
                    <td>${cidadeUf}</td>
                    <td><button class="btn-editar" onclick="editarPessoa('${doc.id}')">✏️ Editar</button></td>
                </tr>`;
            });
            html += '</tbody></table>';
            lista.innerHTML = html;
        });
    };

    if (window.location.pathname.includes('pessoas')) {
        listarPessoas();
    }
});


