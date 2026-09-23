// ==========================================
// MÓDULO - entrada-corte.js
// Entrada de corte: fornecedor, recortes, aviamentos e geração de OP
// Depende de: firebase.js (db), core/utils.js (maiusculo)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    window.fornecedorSelecionado = null;

    window.configurarBuscaFornecedorPorCNPJ = function() {
        const input = document.getElementById('fornecedor-cnpj');
        if (!input) return;
        
        input.addEventListener('blur', function() {
            const cnpj = this.value.replace(/\D/g, '');
            
            if (cnpj.length === 0) {
                document.getElementById('info-fornecedor').innerHTML = '';
                window.fornecedorSelecionado = null;
                return;
            }
            
            if (cnpj.length !== 14) { alert('CNPJ incompleto.'); return; }
            
            db.collection('pessoas').where('documento', '==', cnpj).get()
                .then(function(snapshot) {
                    if (snapshot.empty) {
                        abrirModalFornecedor(cnpj);
                    } else {
                        const doc = snapshot.docs[0];
                        const d = doc.data();
                        window.fornecedorSelecionado = { id: doc.id, ...d };
                        mostrarResumoFornecedor(d);
                    }
                })
                .catch(function(erro) { console.error('Erro:', erro); });
        });
    };

    window.mostrarResumoFornecedor = function(d) {
        const info = document.getElementById('info-fornecedor');
        if (!info) return;
        
        const telefone = d.telefones && d.telefones.length > 0 ? d.telefones[0] : 'N/A';
        const cidade = d.endereco ? `${d.endereco.cidade}/${d.endereco.estado}` : 'N/A';
        const ie = d.inscricao_estadual && d.inscricao_estadual !== 'N/A' ? d.inscricao_estadual : 'N/A';
        
        info.innerHTML = `
            <strong>✅ Fornecedor identificado:</strong><br>
            <strong>Razão Social:</strong> ${d.nome}<br>
            <strong>Cidade:</strong> ${cidade}<br>
            <strong>Telefone:</strong> ${telefone}<br>
            <strong>E-mail:</strong> ${d.email}<br>
            <strong>Inscrição Estadual:</strong> ${ie}
        `;
    };

    window.abrirModalFornecedor = function(cnpj) {
        document.getElementById('modal-forn-cnpj').value = cnpj;
        document.getElementById('modal-forn-nome').value = '';
        document.getElementById('modal-forn-ie').value = '';
        document.getElementById('modal-forn-telefone').value = '';
        document.getElementById('modal-forn-email').value = '';
        document.getElementById('modal-forn-cep').value = '';
        document.getElementById('modal-forn-logradouro').value = '';
        document.getElementById('modal-forn-numero').value = '';
        document.getElementById('modal-forn-complemento').value = '';
        document.getElementById('modal-forn-bairro').value = '';
        document.getElementById('modal-forn-cidade').value = '';
        document.getElementById('modal-forn-estado').value = '';
        
        document.getElementById('modal-novo-fornecedor').style.display = 'flex';
        buscarCNPJModal();
    };

    window.fecharModalFornecedor = function() {
        document.getElementById('modal-novo-fornecedor').style.display = 'none';
        document.getElementById('fornecedor-cnpj').value = '';
        document.getElementById('info-fornecedor').innerHTML = '';
        window.fornecedorSelecionado = null;
    };

    window.buscarCNPJModal = function() {
        const cnpj = document.getElementById('modal-forn-cnpj').value.replace(/\D/g, '');
        if (cnpj.length !== 14) { alert('CNPJ inválido.'); return; }
        
        const botao = document.querySelector('#modal-novo-fornecedor .btn-buscar-cnpj');
        if (botao) { botao.textContent = '⏳'; botao.disabled = true; }
        
        fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`)
            .then(function(resposta) {
                if (!resposta.ok) throw new Error('CNPJ não encontrado');
                return resposta.json();
            })
            .then(function(dados) {
                document.getElementById('modal-forn-nome').value = maiusculo(dados.razao_social || '');
                document.getElementById('modal-forn-ie').value = dados.inscricao_estadual || '';
                document.getElementById('modal-forn-email').value = (dados.email || '').toLowerCase();
                document.getElementById('modal-forn-cep').value = dados.cep || '';
                document.getElementById('modal-forn-logradouro').value = maiusculo(dados.logradouro || '');
                document.getElementById('modal-forn-numero').value = dados.numero || '';
                document.getElementById('modal-forn-complemento').value = maiusculo(dados.complemento || '');
                document.getElementById('modal-forn-bairro').value = maiusculo(dados.bairro || '');
                document.getElementById('modal-forn-cidade').value = maiusculo(dados.municipio || '');
                document.getElementById('modal-forn-estado').value = maiusculo(dados.uf || '');
                
                if (dados.ddd_telefone_1 && dados.telefone_1) {
                    document.getElementById('modal-forn-telefone').value = `(${dados.ddd_telefone_1}) ${dados.telefone_1}`;
                }
            })
            .catch(function(erro) { console.error('Erro:', erro); })
            .finally(function() {
                if (botao) { botao.textContent = '🔍'; botao.disabled = false; }
            });
    };

    window.salvarNovoFornecedor = function() {
        const nome = document.getElementById('modal-forn-nome').value;
        const cnpj = document.getElementById('modal-forn-cnpj').value.replace(/\D/g, '');
        const ie = document.getElementById('modal-forn-ie').value;
        const telefone = document.getElementById('modal-forn-telefone').value;
        const email = document.getElementById('modal-forn-email').value;
        const cep = document.getElementById('modal-forn-cep').value;
        const logradouro = document.getElementById('modal-forn-logradouro').value;
        const numero = document.getElementById('modal-forn-numero').value;
        const complemento = document.getElementById('modal-forn-complemento').value;
        const bairro = document.getElementById('modal-forn-bairro').value;
        const cidade = document.getElementById('modal-forn-cidade').value;
        const estado = document.getElementById('modal-forn-estado').value;
        
        if (!nome || !cnpj || !telefone) { alert('Preencha Razão Social, CNPJ e Telefone.'); return; }
        if (cnpj.length !== 14) { alert('CNPJ inválido.'); return; }
        
        db.collection('pessoas').where('documento', '==', cnpj).get()
            .then(function(snapshot) {
                if (!snapshot.empty) {
                    alert('⚠️ Este CNPJ já está cadastrado.');
                    throw new Error('duplicado');
                }
                return db.collection('pessoas').add({
                    tipo: 'juridica',
                    nome: maiusculo(nome),
                    documento: cnpj,
                    inscricao_estadual: maiusculo(ie) || 'N/A',
                    telefones: [telefone],
                    email: email.toLowerCase() || 'N/A',
                    data: 'N/A',
                    endereco: {
                        cep: cep,
                        logradouro: maiusculo(logradouro),
                        numero: numero,
                        complemento: maiusculo(complemento) || 'N/A',
                        bairro: maiusculo(bairro),
                        cidade: maiusculo(cidade),
                        estado: maiusculo(estado)
                    },
                    data_cadastro: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(function() {
                alert('✅ Fornecedor cadastrado!');
                document.getElementById('modal-novo-fornecedor').style.display = 'none';
                setTimeout(function() {
                    document.getElementById('fornecedor-cnpj').dispatchEvent(new Event('blur'));
                }, 500);
            })
            .catch(function(erro) {
                if (erro.message !== 'duplicado') {
                    console.error('Erro:', erro);
                    alert('❌ Erro ao cadastrar fornecedor.');
                }
            });
    };

    // ==========================================
    // 22. ENTRADA DE CORTE — RECORTES E AVIAMENTOS
    // ==========================================
    window.recortesEntrada = [];
    window.avExternosEntrada = [];

    window.carregarRecortesSugestoes = function() {
        const datalist = document.getElementById('lista-recortes-sugestoes');
        if (!datalist) return;
        
        db.collection('recortes').orderBy('nome').get()
            .then(function(snapshot) {
                datalist.innerHTML = '';
                snapshot.forEach(function(doc) {
                    const d = doc.data();
                    const option = document.createElement('option');
                    option.value = d.nome;
                    datalist.appendChild(option);
                });
            })
            .catch(function(erro) { console.error('Erro:', erro); });
    };

    window.adicionarRecorte = function() {
        const nomeInput = document.getElementById('recorte-nome');
        const qtdPecaInput = document.getElementById('recorte-qtd-peca');
        const nome = nomeInput.value.trim();
        const qtdPeca = parseInt(qtdPecaInput.value);
        
        if (!nome) { alert('Digite o nome do recorte.'); return; }
        if (!qtdPeca || qtdPeca < 1) { alert('Informe a quantidade por peça.'); return; }
        
        const nomeMaiusculo = maiusculo(nome);
        if (window.recortesEntrada.find(r => r.nome === nomeMaiusculo)) {
            alert('Este recorte já foi adicionado.');
            return;
        }
        
        db.collection('recortes').where('nome', '==', nomeMaiusculo).get()
            .then(function(snapshot) {
                if (snapshot.empty) {
                    abrirModalNovoRecorte(nomeMaiusculo, qtdPeca);
                } else {
                    adicionarRecorteLista(nomeMaiusculo, qtdPeca);
                }
            })
            .catch(function(erro) { console.error('Erro:', erro); });
    };

    function adicionarRecorteLista(nome, qtdPeca) {
        window.recortesEntrada.push({ nome: nome, qtd_por_peca: qtdPeca });
        document.getElementById('recorte-nome').value = '';
        document.getElementById('recorte-qtd-peca').value = 1;
        document.getElementById('recorte-nome').focus();
        renderizarRecortes();
    }

    window.renderizarRecortes = function() {
        const lista = document.getElementById('lista-recortes');
        if (!lista) return;
        
        if (window.recortesEntrada.length === 0) {
            lista.innerHTML = '<p class="texto-placeholder">Nenhum recorte adicionado ainda.</p>';
            return;
        }
        
        let html = '';
        window.recortesEntrada.forEach(function(recorte, index) {
            html += `
                <div class="item-lista-entrada">
                    <span>${recorte.nome} <span class="qtd-destaque">(${recorte.qtd_por_peca}x por peça)</span></span>
                    <button type="button" onclick="removerRecorte(${index})">Remover</button>
                </div>
            `;
        });
        lista.innerHTML = html;
    };

    window.removerRecorte = function(index) {
        window.recortesEntrada.splice(index, 1);
        renderizarRecortes();
    };

    window.carregarAviamentosExternos = function() {
        const datalist = document.getElementById('lista-av-externos-sugestoes');
        if (!datalist) return;
        
        db.collection('estoque').where('categoria', '==', 'externo').get()
            .then(function(snapshot) {
                const itens = [];
                snapshot.forEach(function(doc) {
                    itens.push({ id: doc.id, ...doc.data() });
                });
                itens.sort(function(a, b) {
                    return (a.nome || '').localeCompare(b.nome || '');
                });
                
                datalist.innerHTML = '';
                itens.forEach(function(d) {
                    const option = document.createElement('option');
                    option.value = d.nome;
                    option.dataset.id = d.id;
                    datalist.appendChild(option);
                });
            })
            .catch(function(erro) { console.error('Erro:', erro); });
    };

    window.adicionarAviamentoExterno = function() {
        const nome = document.getElementById('av-externo-nome').value.trim();
        const material = document.getElementById('av-externo-material').value.trim();
        const cor = document.getElementById('av-externo-cor').value.trim();
        const tamanho = document.getElementById('av-externo-tamanho').value.trim();
        const quantidade = parseInt(document.getElementById('av-externo-qtd').value);
        const unidade = document.getElementById('av-externo-unidade').value;
        
        if (!nome) { alert('Digite o nome do aviamento.'); return; }
        if (!quantidade || quantidade < 1) { alert('Informe a quantidade.'); return; }
        
        const nomeMaiusculo = maiusculo(nome);
        const materialMaiusculo = maiusculo(material) || 'N/A';
        const corMaiusculo = maiusculo(cor) || 'N/A';
        const tamanhoMaiusculo = maiusculo(tamanho) || 'N/A';
        
        const jaExiste = window.avExternosEntrada.find(a => 
            a.nome === nomeMaiusculo && a.material === materialMaiusculo &&
            a.cor === corMaiusculo && a.tamanho === tamanhoMaiusculo
        );
        if (jaExiste) { alert('Este aviamento já foi adicionado.'); return; }
        
        db.collection('estoque')
            .where('categoria', '==', 'externo')
            .where('nome', '==', nomeMaiusculo)
            .where('material', '==', materialMaiusculo)
            .where('cor', '==', corMaiusculo)
            .where('tamanho', '==', tamanhoMaiusculo)
            .get()
            .then(function(snapshot) {
                if (snapshot.empty) {
                    abrirModalNovoAviamento(nomeMaiusculo, materialMaiusculo, corMaiusculo, tamanhoMaiusculo, quantidade, unidade);
                } else {
                    const doc = snapshot.docs[0];
                    adicionarAviamentoLista(doc.id, nomeMaiusculo, materialMaiusculo, corMaiusculo, tamanhoMaiusculo, quantidade, unidade);
                }
            })
            .catch(function(erro) { console.error('Erro:', erro); });
    };

    function adicionarAviamentoLista(itemId, nome, material, cor, tamanho, quantidade, unidade) {
        window.avExternosEntrada.push({
            item_id: itemId, nome: nome, material: material, cor: cor,
            tamanho: tamanho, quantidade: quantidade, unidade: unidade
        });
        
        document.getElementById('av-externo-nome').value = '';
        document.getElementById('av-externo-material').value = '';
        document.getElementById('av-externo-cor').value = '';
        document.getElementById('av-externo-tamanho').value = '';
        document.getElementById('av-externo-qtd').value = '';
        document.getElementById('av-externo-nome').focus();
        
        renderizarAviamentosExternos();
    }

    window.renderizarAviamentosExternos = function() {
        const lista = document.getElementById('lista-av-externos');
        if (!lista) return;
        
        if (window.avExternosEntrada.length === 0) {
            lista.innerHTML = '<p class="texto-placeholder">Nenhum aviamento externo adicionado ainda.</p>';
            return;
        }
        
        let html = '';
        window.avExternosEntrada.forEach(function(av, index) {
            const caracteristicas = [av.material, av.cor, av.tamanho].filter(c => c && c !== 'N/A').join(' • ');
            html += `
                <div class="item-lista-entrada">
                    <span>
                        <strong>${av.nome}</strong>
                        ${caracteristicas ? `<br><small>${caracteristicas}</small>` : ''}
                        <span class="qtd-destaque">${av.quantidade} ${av.unidade}</span>
                    </span>
                    <button type="button" onclick="removerAviamentoExterno(${index})">Remover</button>
                </div>
            `;
        });
        lista.innerHTML = html;
    };

    window.removerAviamentoExterno = function(index) {
        window.avExternosEntrada.splice(index, 1);
        renderizarAviamentosExternos();
    };

    window.abrirModalNovoRecorte = function(nome, qtdPeca) {
        const modal = document.getElementById('modal-novo-item');
        if (!modal) { adicionarRecorteLista(nome, qtdPeca); return; }
        
        document.getElementById('modal-titulo-novo').textContent = 'Novo Recorte Detectado';
        document.getElementById('modal-descricao-novo').innerHTML = 
            `O recorte <strong>"${nome}"</strong> não está cadastrado.<br>Confirme para cadastrar.`;
        document.getElementById('modal-label-novo').textContent = 'Nome do Recorte *';
        document.getElementById('modal-input-novo').value = nome;
        
        modal.dataset.tipo = 'recorte';
        modal.dataset.qtdPeca = qtdPeca;
        modal.style.display = 'flex';
        document.getElementById('modal-input-novo').focus();
    };

    window.abrirModalNovoAviamento = function(nome, material, cor, tamanho, quantidade, unidade) {
        const modal = document.getElementById('modal-novo-item');
        if (!modal) {
            adicionarAviamentoLista(null, nome, material, cor, tamanho, quantidade, unidade);
            return;
        }
        
        const caracteristicas = [material, cor, tamanho].filter(c => c && c !== 'N/A').join(' • ');
        
        document.getElementById('modal-titulo-novo').textContent = 'Novo Aviamento Externo';
        document.getElementById('modal-descricao-novo').innerHTML = 
            `O aviamento <strong>"${nome}"</strong>${caracteristicas ? ` (${caracteristicas})` : ''} não está cadastrado.<br>Confirme para cadastrar.`;
        document.getElementById('modal-label-novo').textContent = 'Nome do Aviamento *';
        document.getElementById('modal-input-novo').value = nome;
        
        modal.dataset.tipo = 'aviamento';
        modal.dataset.material = material;
        modal.dataset.cor = cor;
        modal.dataset.tamanho = tamanho;
        modal.dataset.quantidade = quantidade;
        modal.dataset.unidade = unidade;
        modal.style.display = 'flex';
        document.getElementById('modal-input-novo').focus();
    };

    window.confirmarNovoItem = function() {
        const modal = document.getElementById('modal-novo-item');
        const tipo = modal.dataset.tipo;
        const nome = document.getElementById('modal-input-novo').value.trim();
        
        if (!nome) { alert('Digite o nome.'); return; }
        const nomeMaiusculo = maiusculo(nome);
        
        if (tipo === 'recorte') {
            const qtdPeca = parseInt(modal.dataset.qtdPeca);
            
            db.collection('recortes').add({
                nome: nomeMaiusculo,
                data_cadastro: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(function() {
                adicionarRecorteLista(nomeMaiusculo, qtdPeca);
                fecharModalNovoItem();
                carregarRecortesSugestoes();
            })
            .catch(function(erro) { console.error('Erro:', erro); });
            
        } else if (tipo === 'aviamento') {
            const material = modal.dataset.material || 'N/A';
            const cor = modal.dataset.cor || 'N/A';
            const tamanho = modal.dataset.tamanho || 'N/A';
            const quantidade = parseInt(modal.dataset.quantidade);
            const unidade = modal.dataset.unidade;
            
            db.collection('estoque').add({
                codigo: 'EST-' + Date.now().toString().slice(-6),
                categoria: 'externo',
                propriedade: 'fornecedor',
                nome: nomeMaiusculo,
                material: material,
                cor: cor,
                tamanho: tamanho,
                unidade: unidade,
                quantidade_atual: 0,
                observacoes: '',
                data_cadastro: firebase.firestore.FieldValue.serverTimestamp(),
                data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
            })
            .then(function(docRef) {
                adicionarAviamentoLista(docRef.id, nomeMaiusculo, material, cor, tamanho, quantidade, unidade);
                fecharModalNovoItem();
                carregarAviamentosExternos();
            })
            .catch(function(erro) { console.error('Erro:', erro); });
        }
    };

    window.fecharModalNovoItem = function() {
        const modal = document.getElementById('modal-novo-item');
        if (modal) {
            modal.style.display = 'none';
            delete modal.dataset.tipo;
            delete modal.dataset.qtdPeca;
            delete modal.dataset.quantidade;
            delete modal.dataset.unidade;
        }
    };

    // ==========================================
    // 23. ENTRADA DE CORTE — SALVAR + GERAR OP
    // ==========================================
    const formEntradaCorte = document.getElementById('form-entrada-corte');
    
    if (formEntradaCorte) {
        formEntradaCorte.addEventListener('submit', function(e) {
            e.preventDefault();
            
            if (!window.fornecedorSelecionado) { alert('Selecione um fornecedor válido.'); return; }
            if (window.recortesEntrada.length === 0) { alert('Adicione pelo menos um recorte.'); return; }
            if (window.avExternosEntrada.length === 0) { alert('Adicione pelo menos um aviamento externo.'); return; }
            
            const numeroNF = document.getElementById('numero-nf').value;
            const serieNF = document.getElementById('serie-nf').value;
            const dataEmissaoNF = document.getElementById('data-emissao-nf').value;
            const valorNF = parseFloat(document.getElementById('valor-nf').value) || 0;
            const chaveAcessoNF = document.getElementById('chave-acesso-nf').value;
            
            const numeroOC = document.getElementById('numero-oc').value;
            const modeloOC = document.getElementById('modelo-oc').value;
            const descricaoPeca = document.getElementById('descricao-peca').value;
            const quantidadeTotal = parseInt(document.getElementById('quantidade-total').value);
            
            if (!numeroNF || !dataEmissaoNF || !numeroOC || !descricaoPeca || !quantidadeTotal) {
                alert('Preencha todos os campos obrigatórios.');
                return;
            }
            
            const botao = formEntradaCorte.querySelector('.btn-grande');
            botao.textContent = 'Processando...';
            botao.disabled = true;
            
            const promisesAviamentos = window.avExternosEntrada.map(function(av) {
                if (av.item_id) {
                    return db.collection('estoque').doc(av.item_id).get()
                        .then(function(doc) {
                            if (doc.exists) {
                                const atual = doc.data().quantidade_atual || 0;
                                return doc.ref.update({
                                    quantidade_atual: atual + av.quantidade,
                                    quantidade_reservada: doc.data().quantidade_reservada || 0,
                                    propriedade: doc.data().propriedade || 'fornecedor',
                                    data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            }
                        });
                } else {
                    return db.collection('estoque').add({
                        codigo: 'EST-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100),
                        categoria: 'externo',
                        propriedade: 'fornecedor',
                        nome: av.nome,
                        material: av.material || 'N/A',
                        cor: av.cor || 'N/A',
                        tamanho: av.tamanho || 'N/A',
                        unidade: av.unidade,
                        quantidade_atual: av.quantidade,
                        quantidade_reservada: 0,
                        observacoes: '',
                        data_cadastro: firebase.firestore.FieldValue.serverTimestamp(),
                        data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
                    }).then(function(ref) { av.item_id = ref.id; });
                }
            });
            
            let entradaRef = null;
            
            Promise.all(promisesAviamentos)
                .then(function() {
                    const entrada = {
                        numero_nf: maiusculo(numeroNF),
                        serie_nf: serieNF || '',
                        data_emissao_nf: dataEmissaoNF,
                        valor_nf: valorNF,
                        chave_acesso_nf: chaveAcessoNF || '',
                        fornecedor_id: window.fornecedorSelecionado.id,
                        fornecedor_nome: window.fornecedorSelecionado.nome,
                        fornecedor_documento: window.fornecedorSelecionado.documento,
                        numero_ordem_corte: maiusculo(numeroOC),
                        modelo: maiusculo(modeloOC) || '',
                        descricao_peca: maiusculo(descricaoPeca),
                        quantidade_total: quantidadeTotal,
                        recortes: window.recortesEntrada,
                        aviamentos_externos: window.avExternosEntrada,
                        status: 'recebido',
                        registrado_por_cpf: null,
                        data_entrada: firebase.firestore.FieldValue.serverTimestamp()
                    };
                    
                    const user = firebase.auth().currentUser;
                    if (user) entrada.registrado_por_cpf = user.email.split('@')[0];
                    
                    return db.collection('entradas_corte').add(entrada);
                })
                .then(function(ref) {
                    entradaRef = ref;
                    
                    const op = {
                        entrada_id: entradaRef.id,
                        lote: maiusculo(numeroOC),
                        descricao: maiusculo(descricaoPeca),
                        modelo: maiusculo(modeloOC) || '',
                        quantidade_total: quantidadeTotal,
                        recortes: window.recortesEntrada,
                        aviamentos_externos: window.avExternosEntrada,
                        aviamentos_internos_reservados: [],
                        fluxograma_id: null,
                        operacoes_executadas: [],
                        encarregado: '',
                        status: 'aguardando_fluxograma',
                        quantidade_finalizada: 0,
                        quantidade_refugada: 0,
                        quantidade_sobra: 0,
                        data_entrada_producao: null,
                        data_saida_producao: null
                    };
                    
                    return db.collection('producao').add(op);
                })
                .then(function(opRef) {
                    return db.collection('entradas_corte').doc(entradaRef.id).update({
                        op_id: opRef.id
                    });
                })
                .then(function() {
                    alert('✅ Entrada registrada e OP gerada com sucesso!');
                    
                    formEntradaCorte.reset();
                    document.getElementById('info-fornecedor').innerHTML = '';
                    window.fornecedorSelecionado = null;
                    window.recortesEntrada = [];
                    window.avExternosEntrada = [];
                    renderizarRecortes();
                    renderizarAviamentosExternos();
                    
                    botao.textContent = '✅ Registrar Entrada e Gerar OP';
                    botao.disabled = false;
                    
                    setTimeout(function() {
                        window.location.href = 'producao.html#ops';
                    }, 1500);
                })
                .catch(function(erro) {
                    console.error('Erro ao processar entrada:', erro);
                    alert('❌ Erro ao processar a entrada.');
                    botao.textContent = '✅ Registrar Entrada e Gerar OP';
                    botao.disabled = false;
                });
        });
    }
    if (window.location.pathname.includes('entrada-corte')) {
        configurarBuscaFornecedorPorCNPJ();
        carregarRecortesSugestoes();
        carregarAviamentosExternos();
    }
});
