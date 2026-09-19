// script.js - 7Site (Versão 9.0 - Consolidada com Jornada)

document.addEventListener('DOMContentLoaded', function() {


    // ==========================================
    // REFERÊNCIAS GLOBAIS DO DOM
    // ==========================================
    const opDocumento = document.getElementById('op-documento');













       // ==========================================
    // 19. DOCUMENTO DA OP + EDIÇÃO DE MATERIAL
    // ==========================================
    
    let opAtual = null;
    
    window.abrirEdicaoMaterial = function() {
        if (!opAtual) return;
        document.getElementById('modal-editar-material').style.display = 'flex';
        carregarEdicaoAviamentos();
        carregarEdicaoRecortes();
        carregarDatalistsEdicao();
    };

    window.fecharModalEdicao = function() {
        document.getElementById('modal-editar-material').style.display = 'none';
    };

    window.trocarAbaEdicao = function(aba, botao) {
        document.querySelectorAll('.abas-modal .aba').forEach(a => a.classList.remove('ativa'));
        botao.classList.add('ativa');
        document.querySelectorAll('.aba-conteudo').forEach(c => c.classList.remove('ativa'));
        document.getElementById('aba-' + aba).classList.add('ativa');
    };

    window.carregarDatalistsEdicao = function() {
        db.collection('estoque').where('categoria', '==', 'externo').get()
            .then(function(snapshot) {
                const datalist = document.getElementById('lista-av-sugestoes');
                if (!datalist) return;
                datalist.innerHTML = '';
                snapshot.forEach(function(doc) {
                    const d = doc.data();
                    const opt = document.createElement('option');
                    opt.value = d.nome;
                    datalist.appendChild(opt);
                });
            });

        db.collection('recortes').get()
            .then(function(snapshot) {
                const datalist = document.getElementById('lista-rec-sugestoes');
                if (!datalist) return;
                datalist.innerHTML = '';
                snapshot.forEach(function(doc) {
                    const d = doc.data();
                    const opt = document.createElement('option');
                    opt.value = d.nome;
                    datalist.appendChild(opt);
                });
            });
    };

    window.carregarEdicaoAviamentos = function() {
        const lista = document.getElementById('lista-aviamentos-edicao');
        if (!lista || !opAtual) return;

        const aviamentos = opAtual.aviamentos_externos || [];
        if (aviamentos.length === 0) {
            lista.innerHTML = '<p class="texto-placeholder">Nenhum aviamento registrado.</p>';
            return;
        }

        let html = '';
        aviamentos.forEach(function(av, index) {
            const caracteristicas = [av.material, av.cor, av.tamanho].filter(c => c && c !== 'N/A').join(' • ');
            html += `
                <div class="item-lista-edicao">
                    <div class="item-info">
                        <strong>${av.nome}</strong>
                        ${caracteristicas ? `<small>${caracteristicas}</small><br>` : ''}
                        <small>${av.quantidade} ${av.unidade}</small>
                    </div>
                    <button type="button" onclick="pedirRemocaoAviamento(${index})">Remover</button>
                </div>
            `;
        });
        lista.innerHTML = html;
    };

    window.carregarEdicaoRecortes = function() {
        const lista = document.getElementById('lista-recortes-edicao');
        if (!lista || !opAtual) return;

        const recortes = opAtual.recortes || [];
        if (recortes.length === 0) {
            lista.innerHTML = '<p class="texto-placeholder">Nenhum recorte registrado.</p>';
            return;
        }

        let html = '';
        recortes.forEach(function(rec, index) {
            html += `
                <div class="item-lista-edicao">
                    <div class="item-info">
                        <strong>${rec.nome}</strong>
                        <small>${rec.qtd_por_peca}x por peça</small>
                    </div>
                    <button type="button" onclick="pedirRemocaoRecorte(${index})">Remover</button>
                </div>
            `;
        });
        lista.innerHTML = html;
    };

    window.edicaoAdicionarAviamento = function() {
        if (!opAtual) return;
        
        const nome = document.getElementById('edit-av-nome').value.trim();
        const material = document.getElementById('edit-av-material').value.trim() || 'N/A';
        const cor = document.getElementById('edit-av-cor').value.trim() || 'N/A';
        const tamanho = document.getElementById('edit-av-tamanho').value.trim() || 'N/A';
        const quantidade = parseInt(document.getElementById('edit-av-qtd').value);
        const unidade = document.getElementById('edit-av-unidade').value;

        if (!nome || !quantidade) { alert('Preencha nome e quantidade.'); return; }

        if (!opAtual.aviamentos_externos) opAtual.aviamentos_externos = [];

        opAtual.aviamentos_externos.push({
            item_id: null,
            nome: maiusculo(nome),
            material: maiusculo(material),
            cor: maiusculo(cor),
            tamanho: maiusculo(tamanho),
            quantidade: quantidade,
            unidade: unidade,
            _acao: 'adicionar'
        });

        document.getElementById('edit-av-nome').value = '';
        document.getElementById('edit-av-material').value = '';
        document.getElementById('edit-av-cor').value = '';
        document.getElementById('edit-av-tamanho').value = '';
        document.getElementById('edit-av-qtd').value = '';

        carregarEdicaoAviamentos();
    };

    window.edicaoAdicionarRecorte = function() {
        if (!opAtual) return;

        const nome = document.getElementById('edit-rec-nome').value.trim();
        const qtd = parseInt(document.getElementById('edit-rec-qtd').value);

        if (!nome || !qtd) { alert('Preencha nome e quantidade por peça.'); return; }

        if (!opAtual.recortes) opAtual.recortes = [];

        opAtual.recortes.push({
            nome: maiusculo(nome),
            qtd_por_peca: qtd,
            _acao: 'adicionar'
        });

        document.getElementById('edit-rec-nome').value = '';
        document.getElementById('edit-rec-qtd').value = 1;

        carregarEdicaoRecortes();
    };

    let remocaoTarget = null;

    window.pedirRemocaoAviamento = function(index) {
        const av = opAtual.aviamentos_externos[index];
        remocaoTarget = { tipo: 'aviamento', index: index, item: av };
        document.getElementById('motivo-item-info').innerHTML =
            `<strong>${av.nome}</strong> — ${av.quantidade} ${av.unidade}`;
        document.getElementById('modal-motivo-remocao').style.display = 'flex';
    };

    window.pedirRemocaoRecorte = function(index) {
        const rec = opAtual.recortes[index];
        remocaoTarget = { tipo: 'recorte', index: index, item: rec };
        document.getElementById('motivo-item-info').innerHTML =
            `<strong>${rec.nome}</strong> — ${rec.qtd_por_peca}x por peça`;
        document.getElementById('modal-motivo-remocao').style.display = 'flex';
    };

    window.fecharModalMotivo = function() {
        document.getElementById('modal-motivo-remocao').style.display = 'none';
        remocaoTarget = null;
    };

    window.confirmarRemocao = function() {
        if (!remocaoTarget) return;

        const motivo = document.querySelector('input[name="motivo-remocao"]:checked').value;
        const observacao = document.getElementById('motivo-observacao').value.trim();

        if (motivo === 'erro') {
            const user = firebase.auth().currentUser;
            if (!user) { alert('Nenhum usuário logado.'); return; }

            const cpfLogado = user.email.split('@')[0];

            db.collection('usuarios').doc(cpfLogado).get().then(function(doc) {
                if (!doc.exists) {
                    document.getElementById('modal-motivo-remocao').style.display = 'none';
                    document.getElementById('modal-autorizacao').style.display = 'flex';
                    document.getElementById('aut-erro').style.display = 'none';
                    return;
                }

                const u = doc.data();
                const tipo = u.tipo_usuario;
                const setor = u.setor;
                const nivel = parseInt(u.nivel) || 0;

                const ehSuperior = (tipo === 'superior' || nivel >= 3);
                const setorOK = (setor === 'CDF' || setor === 'Administrativo' || setor === 'todos');

                if (ehSuperior && setorOK) {
                    executarRemocao('erro', observacao, {
                        cpf: cpfLogado,
                        nome: u.nome,
                        automatico: true
                    });
                } else {
                    document.getElementById('modal-motivo-remocao').style.display = 'none';
                    document.getElementById('modal-autorizacao').style.display = 'flex';
                    document.getElementById('aut-erro').style.display = 'none';
                }
            }).catch(function(erro) {
                console.error('Erro ao verificar usuário:', erro);
                document.getElementById('modal-motivo-remocao').style.display = 'none';
                document.getElementById('modal-autorizacao').style.display = 'flex';
                document.getElementById('aut-erro').style.display = 'none';
            });
            return;
        }

        executarRemocao('devolucao', observacao, null);
    };

    window.fecharModalAutorizacao = function() {
        document.getElementById('modal-autorizacao').style.display = 'none';
        document.getElementById('aut-cpf').value = '';
        document.getElementById('aut-senha').value = '';
        document.getElementById('aut-erro').style.display = 'none';
    };

    window.validarAutorizacao = function() {
        const cpf = document.getElementById('aut-cpf').value.replace(/\D/g, '');
        const senha = document.getElementById('aut-senha').value;
        const erroEl = document.getElementById('aut-erro');

        if (!cpf || !senha) {
            erroEl.textContent = 'Preencha CPF e senha.';
            erroEl.style.display = 'block';
            return;
        }

        const email = `${cpf}@7site.com.br`;

        firebase.auth().signInWithEmailAndPassword(email, senha)
            .then(function(cred) {
                const cpfSup = cred.user.email.split('@')[0];
                return db.collection('usuarios').doc(cpfSup).get();
            })
            .then(function(doc) {
                if (!doc.exists) throw new Error('Superior não encontrado.');
                
                const d = doc.data();
                const tipo = d.tipo_usuario;
                const setor = d.setor;
                const nivel = parseInt(d.nivel) || 0;
                
                const ehSuperior = (tipo === 'superior' || nivel >= 3);
                const setorOK = (setor === 'CDF' || setor === 'Administrativo' || setor === 'todos');

                if (!ehSuperior || !setorOK) {
                    throw new Error('Usuário não tem permissão para autorizar.');
                }

                const observacao = document.getElementById('motivo-observacao').value.trim();
                const dadosSuperior = {
                    cpf: cpf,
                    nome: d.nome
                };

                executarRemocao('erro', observacao, dadosSuperior);
                fecharModalAutorizacao();
            })
            .catch(function(erro) {
                console.error('Erro:', erro);
                erroEl.textContent = erro.message.includes('permission') 
                    ? 'Usuário não tem permissão.' 
                    : 'CPF ou senha inválidos.';
                erroEl.style.display = 'block';
            });
    };

    window.executarRemocao = function(motivo, observacao, autorizacao) {
        if (!remocaoTarget || !opAtual) return;

        const { tipo, index, item } = remocaoTarget;
        const agora = new Date();

        if (!opAtual.historico) opAtual.historico = [];

        const descricaoItem = tipo === 'aviamento'
            ? `${item.quantidade} ${item.unidade} de ${item.nome}`
            : `${item.qtd_por_peca}x por peça de ${item.nome}`;

        const motivoLabel = motivo === 'devolucao' 
            ? 'Devolução ao estoque' 
            : 'Exclusão por erro';

        const detalhes = `Removido ${descricaoItem} (${motivoLabel})${observacao ? ' — ' + observacao : ''}`;

        opAtual.historico.push({
            data: agora,
            usuario_cpf: firebase.auth().currentUser ? firebase.auth().currentUser.email.split('@')[0] : null,
            usuario_nome: '—',
            acao: 'remocao_material',
            detalhes: detalhes,
            autorizacao: autorizacao || null
        });

        if (tipo === 'aviamento') {
            if (motivo === 'erro' && item.item_id) {
                db.collection('estoque').doc(item.item_id).get().then(function(doc) {
                    if (doc.exists) {
                        const atual = doc.data().quantidade_atual || 0;
                        doc.ref.update({
                            quantidade_atual: Math.max(0, atual - item.quantidade),
                            data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
                        });
                    }
                });
            }
            opAtual.aviamentos_externos.splice(index, 1);
            carregarEdicaoAviamentos();
        } else {
            opAtual.recortes.splice(index, 1);
            carregarEdicaoRecortes();
        }

        fecharModalMotivo();
        document.getElementById('motivo-observacao').value = '';
    };

    window.salvarEdicaoMaterial = function() {
        if (!opAtual) return;

        (opAtual.aviamentos_externos || []).forEach(av => delete av._acao);
        (opAtual.recortes || []).forEach(rec => delete rec._acao);

        db.collection('producao').doc(opAtual.id).update({
            aviamentos_externos: opAtual.aviamentos_externos || [],
            recortes: opAtual.recortes || [],
            historico: opAtual.historico || []
        })
        .then(function() {
            alert('✅ Material atualizado!');
            fecharModalEdicao();
            window.location.reload();
        })
        .catch(function(erro) {
            console.error('Erro:', erro);
            alert('❌ Erro ao salvar.');
        });
    };

    // ==========================================
    // 19.1 RENDERIZAÇÃO DO DOCUMENTO DA OP
    // ==========================================
     

    let podeExecutarOP = false;

    function verificarPermissaoEdicao(d) {
        const statusBloqueados = ['faturado', 'recebido_parcial', 'recebido_total'];
        if (statusBloqueados.includes(d.status)) return;

        auth.onAuthStateChanged(function(user) {
            if (!user) return;
            const cpf = user.email.split('@')[0];
            db.collection('usuarios').doc(cpf).get().then(function(doc) {
                if (!doc.exists) return;
                const u = doc.data();
                const setor = u.setor;
                if (setor === 'CDF' || setor === 'Administrativo' || setor === 'todos') {
                    document.getElementById('op-acoes-edicao').style.display = 'block';
                    podeExecutarOP = true;
                    // Re-renderiza para mostrar os botões de execução
                    if (opAtual) {
                        renderizarOP(opAtual, opAtual.id);
                    }
                }
            });
        });
    }

        function renderizarOP(d, id) {
        const dataEntrada = d.data_entrada_producao ? new Date(d.data_entrada_producao.toDate()).toLocaleString('pt-BR') : 'N/A';
        const dataSaida = d.data_saida_producao ? new Date(d.data_saida_producao.toDate()).toLocaleString('pt-BR') : 'N/A';
        
        const statusLabel = {
            'aguardando_fluxograma': '🧠 Aguardando Fluxograma',
            'em_producao': '⚙️ Em Produção',
            'aguardando_expedicao': '📦 Aguardando Expedição',
            'finalizado': '✅ Finalizada',
            'faturado': '💰 Faturada'
        }[d.status] || d.status;

        let html = `
            <div class="op-cabecalho-doc">
                <h2>OP Nº ${id.slice(0, 6).toUpperCase()}</h2>
                <span class="status-op status-em-producao">${statusLabel}</span>
            </div>
            <div class="op-info-grid">
                <div class="op-info-item"><strong>Lote:</strong> ${d.lote}</div>
                <div class="op-info-item"><strong>Modelo:</strong> ${d.modelo || '—'}</div>
                <div class="op-info-item"><strong>Descrição:</strong> ${d.descricao}</div>
                <div class="op-info-item"><strong>Quantidade Total:</strong> ${d.quantidade_total} peças</div>
                <div class="op-info-item"><strong>Encarregado:</strong> ${d.encarregado || '—'}</div>
                <div class="op-info-item"><strong>Entrada:</strong> ${dataEntrada}</div>
            </div>
            
            <h3 class="op-subtitulo">Recortes</h3>
            <table class="tabela-estoque">
                <thead><tr><th>Recorte</th><th>Qtd por Peça</th></tr></thead>
                <tbody>
                    ${d.recortes && d.recortes.length > 0
                        ? d.recortes.map(r => `<tr><td>${r.nome}</td><td>${r.qtd_por_peca}</td></tr>`).join('')
                        : '<tr><td colspan="2">Nenhum recorte registrado.</td></tr>'}
                </tbody>
            </table>
            
            <h3 class="op-subtitulo">Aviamentos Vinculados</h3>
            <table class="tabela-estoque">
                <thead><tr><th>Item</th><th>Quantidade</th></tr></thead>
                <tbody>
                    ${d.aviamentos_externos && d.aviamentos_externos.length > 0
                        ? d.aviamentos_externos.map(item => `<tr><td>${item.nome}</td><td>${item.quantidade} ${item.unidade || ''}</td></tr>`).join('')
                        : '<tr><td colspan="2">Nenhum aviamento registrado.</td></tr>'}
                </tbody>
            </table>
        `;

        if (d.status === 'aguardando_fluxograma') {
            html += `
                <div class="op-escolher-fluxograma">
                    <h3>📋 Fluxograma não vinculado</h3>
                    <p>Esta OP precisa de um fluxograma de produção para avançar.</p>
                    <button type="button" onclick="abrirModalEscolherFluxograma()">📋 Escolher Fluxograma</button>
                </div>
            `;
        } else if (d.modulos_fluxograma && d.modulos_fluxograma.length > 0) {
            let jaComecou = false;
            d.modulos_fluxograma.forEach(function(mod) {
                (mod.etapas || []).forEach(function(etapa) {
                    if (etapa.status && etapa.status !== 'pendente') {
                        jaComecou = true;
                    }
                });
            });

            const podeTrocar = !jaComecou && d.status === 'em_producao';

            html += `
                <div class="op-fluxograma-section">
                    <div class="op-fluxograma-cabecalho">
                        <h3>🧩 Fluxograma de Produção — ${d.fluxograma_nome || ''}</h3>
                        ${podeTrocar ? `
                            <div class="op-fluxograma-cabecalho-acoes">
                                <button type="button" class="btn-trocar-fluxograma" onclick="abrirModalEscolherFluxograma()">🔄 Trocar</button>
                                <button type="button" class="btn-remover-fluxograma" onclick="removerFluxogramaDaOP()">🗑️ Remover</button>
                            </div>
                        ` : ''}
                    </div>
            `;

            d.modulos_fluxograma.forEach(function(mod, moduloIdx) {
                const totalModulo = (mod.etapas || []).reduce((acc, e) => acc + (e.tempo_segundos || 0), 0);

                const moduloConcluido = (mod.etapas || []).length > 0 && (mod.etapas || []).every(function(e) {
                    return e.status === 'concluida';
                });

                html += `
                    <div class="op-fluxograma-modulo${moduloConcluido ? ' concluido' : ''}">
                        <div class="op-fluxograma-modulo-cabecalho">
                            <span class="op-fluxograma-modulo-titulo">${mod.modulo_nome}</span>
                            <span class="op-fluxograma-modulo-tempo">⏱️ ${formatarTempo(totalModulo)}</span>
                        </div>
                `;

                (mod.etapas || []).forEach(function(etapa, idx) {
                    html += `
                        <div class="op-fluxograma-etapa" data-status="${etapa.status || 'pendente'}">
                            <div class="op-fluxograma-etapa-numero">${idx + 1}</div>
                            <div class="op-fluxograma-etapa-info">
                                <div class="op-fluxograma-etapa-nome">${etapa.nome_etapa || etapa.operacao || '—'}</div>
                                <div class="op-fluxograma-etapa-detalhe">
                                    <span class="recorte">${etapa.recorte || '—'}</span>
                                    <span>🔧 ${etapa.maquina || '—'}</span>
                                    <span>⏱️ ${etapa.tempo_segundos || 0}s</span>
                                </div>
                            </div>
                            <div class="op-fluxograma-etapa-acoes">
                                ${renderizarBotoesEtapa(moduloIdx, idx, etapa)}
                            </div>
                        </div>
                    `;
                });

                html += `</div>`;
            });

            html += `</div>`;
        }

        if (d.historico && d.historico.length > 0) {
            html += `
                <div class="historico-op">
                    <h3>📋 Histórico de Alterações</h3>
                    <ul class="historico-lista">
                        ${d.historico.map(h => {
                            const data = h.data && h.data.toDate ? new Date(h.data.toDate()).toLocaleString('pt-BR') : 'Data desconhecida';
                            const aut = h.autorizacao ? ` — Autorizado por ${h.autorizacao.nome}` : '';
                            return `<li><span class="historico-data">${data}</span>: ${detalhesHistorico(h)}${aut}</li>`;
                        }).join('')}
                    </ul>
                </div>
            `;
        }

        opDocumento.innerHTML = html;
    }

    function detalhesHistorico(h) {
        if (h.detalhes) return h.detalhes;
        return h.acao || 'Ação registrada';
    }

       // ==========================================
    // 19.2 EXECUÇÃO DA OP — INICIAR / CONCLUIR OPERAÇÃO
    // ==========================================

    window.iniciarOperacao = function(moduloIdx, etapaIdx) {
        if (!opAtual || !podeExecutarOP) return;

        const modulos = opAtual.modulos_fluxograma || [];
        const modulo = modulos[moduloIdx];
        const etapa = modulo && modulo.etapas ? modulo.etapas[etapaIdx] : null;
        if (!etapa) return;

        if (etapa.status === 'em_andamento' || etapa.status === 'concluida') return;

        etapa.status = 'em_andamento';
        etapa.data_inicio = new Date().toISOString();

        const updates = { modulos_fluxograma: modulos };

        // Se é a primeira operação da OP sendo iniciada, registra o marco inicial
        const jaTemInicio = modulos.some(function(m) {
            return (m.etapas || []).some(function(e) {
                return e.data_inicio && e.status !== 'pendente' && e !== etapa;
            });
        });

        if (!jaTemInicio && !opAtual.data_inicio_execucao) {
            updates.data_inicio_execucao = firebase.firestore.FieldValue.serverTimestamp();
            opAtual.data_inicio_execucao = true;
        }

        db.collection('producao').doc(opAtual.id).update(updates)
            .then(function() {
                renderizarOP(opAtual, opAtual.id);
            })
            .catch(function(erro) {
                console.error('Erro ao iniciar operação:', erro);
                alert('❌ Erro ao iniciar operação.');
            });
    };

    window.concluirOperacao = function(moduloIdx, etapaIdx) {
        if (!opAtual || !podeExecutarOP) return;

        const modulos = opAtual.modulos_fluxograma || [];
        const modulo = modulos[moduloIdx];
        const etapa = modulo && modulo.etapas ? modulo.etapas[etapaIdx] : null;
        if (!etapa) return;

        if (etapa.status === 'concluida') return;

        etapa.status = 'concluida';
        etapa.data_fim = new Date().toISOString();

        const updates = { modulos_fluxograma: modulos };

        // Verifica se TODAS as etapas de TODOS os módulos estão concluídas
        const tudoConcluido = modulos.every(function(m) {
            return (m.etapas || []).every(function(e) {
                return e.status === 'concluida';
            });
        });

        if (tudoConcluido) {
            updates.status = 'finalizado';
            updates.data_fim_execucao = firebase.firestore.FieldValue.serverTimestamp();
            updates.data_saida_producao = firebase.firestore.FieldValue.serverTimestamp();
        }

        db.collection('producao').doc(opAtual.id).update(updates)
            .then(function() {
                if (tudoConcluido) {
                    alert('✅ Todas as operações foram concluídas! A OP está finalizada.');
                    window.location.reload();
                } else {
                    renderizarOP(opAtual, opAtual.id);
                }
            })
            .catch(function(erro) {
                console.error('Erro ao concluir operação:', erro);
                alert('❌ Erro ao concluir operação.');
            });
    };

    // Helper: renderiza botões de ação da etapa conforme status
    function renderizarBotoesEtapa(moduloIdx, etapaIdx, etapa) {
        const status = etapa.status || 'pendente';

        if (status === 'concluida') {
            return '<span class="status-concluida-selo">✅ Concluída</span>';
        }

        if (status === 'em_andamento') {
            return `
                <span class="status-andamento-selo">EM ANDAMENTO</span>
                <button type="button" class="btn-concluir-operacao" onclick="concluirOperacao(${moduloIdx}, ${etapaIdx})">✅ Concluir</button>
            `;
        }

        // pendente
        if (!podeExecutarOP) return '';
        return `<button type="button" class="btn-iniciar-operacao" onclick="iniciarOperacao(${moduloIdx}, ${etapaIdx})">▶️ Iniciar</button>`;
    }


    // ==========================================
    // 21. ENTRADA DE CORTE — FORNECEDOR (VIA CNPJ)
    // ==========================================
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
                                    data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
                                });
                            }
                        });
                } else {
                    return db.collection('estoque').add({
                        codigo: 'EST-' + Date.now().toString().slice(-6) + Math.floor(Math.random() * 100),
                        categoria: 'externo',
                        nome: av.nome,
                        material: av.material || 'N/A',
                        cor: av.cor || 'N/A',
                        tamanho: av.tamanho || 'N/A',
                        unidade: av.unidade,
                        quantidade_atual: av.quantidade,
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


    // ==========================================
    // 25. VINCULAR FLUXOGRAMA À OP
    // ==========================================
    window.carregarFluxogramasParaOP = function(filtro = '') {
        const lista = document.getElementById('lista-fluxogramas-op');
        if (!lista) return;

        lista.innerHTML = '<p class="texto-placeholder">Carregando...</p>';

        db.collection('fluxogramas').orderBy('data_atualizacao', 'desc').get()
            .then(function(snapshot) {
                const fluxogramas = [];
                snapshot.forEach(function(doc) {
                    const d = doc.data();
                    d.id = doc.id;
                    fluxogramas.push(d);
                });

                const filtrados = fluxogramas.filter(function(f) {
                    return (f.nome || '').toLowerCase().includes(filtro.toLowerCase());
                });

                if (filtrados.length === 0) {
                    lista.innerHTML = '<p class="texto-placeholder">Nenhum fluxograma encontrado.</p>';
                    return;
                }

                let html = '';
                filtrados.forEach(function(f) {
                    const minutos = Math.floor((f.total_tempo_segundos || 0) / 60);
                    html += `
                        <div class="card-escolher-fluxograma">
                            <div class="card-escolher-fluxograma-info">
                                ${f.categoria ? `<span class="card-escolher-fluxograma-categoria">${f.categoria}</span>` : ''}
                                <div class="card-escolher-fluxograma-titulo">${f.nome}</div>
                                <div class="card-escolher-fluxograma-meta">
                                    <span>🧩 ${f.total_modulos || 0} módulos</span>
                                    <span>⚙️ ${f.total_operacoes || 0} etapas</span>
                                    <span>⏱️ ~${minutos}min</span>
                                </div>
                            </div>
                            <button type="button" onclick="confirmarEscolhaFluxograma('${f.id}', '${f.nome.replace(/'/g, "\\'")}')">Vincular</button>
                        </div>
                    `;
                });
                lista.innerHTML = html;
            })
            .catch(function(erro) {
                console.error('Erro ao carregar fluxogramas:', erro);
                lista.innerHTML = '<p class="texto-placeholder">Erro ao carregar.</p>';
            });
    };

    window.abrirModalEscolherFluxograma = function() {
        document.getElementById('modal-escolher-fluxograma').style.display = 'flex';
        carregarFluxogramasParaOP();
    };

    window.fecharModalEscolherFluxograma = function() {
        document.getElementById('modal-escolher-fluxograma').style.display = 'none';
    };

    window.confirmarEscolhaFluxograma = function(fluxogramaId, fluxogramaNome) {
        const opId = new URLSearchParams(window.location.search).get('id');
        if (!opId) { alert('OP não identificada.'); return; }

        db.collection('producao').doc(opId).get()
            .then(function(docOP) {
                const opData = docOP.data();
                let mensagem = `Vincular o fluxograma "${fluxogramaNome}" a esta OP?`;

                if (opData.fluxograma_id) {
                    let jaComecou = false;
                    (opData.modulos_fluxograma || []).forEach(function(mod) {
                        (mod.etapas || []).forEach(function(etapa) {
                            if (etapa.status && etapa.status !== 'pendente') {
                                jaComecou = true;
                            }
                        });
                    });

                    if (jaComecou) {
                        alert('❌ Não é possível trocar o fluxograma. A produção já começou.');
                        return;
                    }

                    mensagem = `⚠️ Substituir o fluxograma atual "${opData.fluxograma_nome || ''}" por "${fluxogramaNome}"?\n\nAs etapas atuais serão apagadas e substituídas.`;
                }

                if (!confirm(mensagem)) return;

                db.collection('fluxogramas').doc(fluxogramaId).get()
                    .then(function(doc) {
                        if (!doc.exists) throw new Error('Fluxograma não encontrado.');

                        const fluxo = doc.data();

                        const modulosOP = (fluxo.modulos || []).map(function(m) {
                            return {
                                modulo_id: m.modulo_id,
                                modulo_nome: m.modulo_nome,
                                etapas: (m.etapas || []).map(function(e) {
                                    return {
                                        nome_etapa: e.nome_etapa || '',
                                        recorte: e.recorte || '',
                                        operacao: e.operacao || '',
                                        maquina: e.maquina || '',
                                        equipamento: e.equipamento || 'NENHUM',
                                        tempo_segundos: e.tempo_segundos || 0,
                                        observacoes: e.observacoes || '',
                                        insumo_tipo: e.insumo_tipo || 'nenhum',
                                        insumo_nome: e.insumo_nome || '',
                                        insumo_quantidade: e.insumo_quantidade || 0,
                                        insumo_unidade: e.insumo_unidade || 'UN',
                                        status: 'pendente',
                                        data_inicio: null,
                                        data_fim: null
                                    };
                                })
                            };
                        });

                        const historico = opData.historico || [];
                        historico.push({
                            data: new Date(),
                            usuario_cpf: firebase.auth().currentUser ? firebase.auth().currentUser.email.split('@')[0] : null,
                            acao: 'vinculacao_fluxograma',
                            detalhes: opData.fluxograma_id 
                                ? `Fluxograma trocado: "${opData.fluxograma_nome}" → "${fluxo.nome}"`
                                : `Fluxograma vinculado: "${fluxo.nome}"`
                        });

                        return db.collection('producao').doc(opId).update({
                            fluxograma_id: fluxogramaId,
                            fluxograma_nome: fluxo.nome,
                            modulos_fluxograma: modulosOP,
                            progresso: 0,
                            status: 'em_producao',
                            data_entrada_producao: opData.data_entrada_producao || firebase.firestore.FieldValue.serverTimestamp(),
                            historico: historico
                        });
                    })
                    .then(function() {
                        alert('✅ Fluxograma vinculado com sucesso!');
                        fecharModalEscolherFluxograma();
                        window.location.reload();
                    })
                    .catch(function(erro) {
                        console.error('Erro ao vincular fluxograma:', erro);
                        alert('❌ Erro ao vincular: ' + erro.message);
                    });
            })
            .catch(function(erro) {
                console.error('Erro ao verificar OP:', erro);
                alert('❌ Erro ao processar.');
            });
    };

    // ==========================================
    // 26. REMOVER FLUXOGRAMA DA OP
    // ==========================================
    window.removerFluxogramaDaOP = function() {
        const opId = new URLSearchParams(window.location.search).get('id');
        if (!opId) { alert('OP não identificada.'); return; }

        if (!confirm('Remover o fluxograma desta OP?\n\nA OP voltará para o status "Aguardando Fluxograma" e você poderá vincular outro.')) return;

        db.collection('producao').doc(opId).get()
            .then(function(doc) {
                if (!doc.exists) throw new Error('OP não encontrada.');

                const d = doc.data();

                let jaComecou = false;
                (d.modulos_fluxograma || []).forEach(function(mod) {
                    (mod.etapas || []).forEach(function(etapa) {
                        if (etapa.status && etapa.status !== 'pendente') {
                            jaComecou = true;
                        }
                    });
                });

                if (jaComecou) {
                    alert('❌ Não é possível remover. A produção já começou.');
                    return;
                }

                const historico = d.historico || [];
                historico.push({
                    data: new Date(),
                    usuario_cpf: firebase.auth().currentUser ? firebase.auth().currentUser.email.split('@')[0] : null,
                    acao: 'remocao_fluxograma',
                    detalhes: `Fluxograma removido: "${d.fluxograma_nome || ''}"`
                });

                return db.collection('producao').doc(opId).update({
                    fluxograma_id: null,
                    fluxograma_nome: null,
                    modulos_fluxograma: [],
                    progresso: 0,
                    status: 'aguardando_fluxograma',
                    data_entrada_producao: null,
                    historico: historico
                });
            })
            .then(function() {
                alert('✅ Fluxograma removido! A OP voltou para "Aguardando Fluxograma".');
                window.location.reload();
            })
            .catch(function(erro) {
                console.error('Erro ao remover fluxograma:', erro);
                alert('❌ Erro ao remover: ' + erro.message);
            });
    };

    // ==========================================
    // 27. BUSCA NOS FLUXOGRAMAS DA OP
    // ==========================================
    const inputBuscaFluxoOP = document.getElementById('busca-fluxograma-op');
    if (inputBuscaFluxoOP) {
        inputBuscaFluxoOP.addEventListener('input', function() {
            carregarFluxogramasParaOP(this.value);
        });
    }

    // ==========================================
    // INICIALIZAÇÃO DE PÁGINAS ESPECÍFICAS
    // ==========================================
    if (window.location.pathname.includes('entrada-corte')) {
        configurarBuscaFornecedorPorCNPJ();
        carregarRecortesSugestoes();
        carregarAviamentosExternos();
    }

       // ==========================================
    // 28. PÁGINA DA OP (op.html)
    // ==========================================
    if (window.location.pathname.includes('op')) {
        if (opDocumento) {
            const opId = new URLSearchParams(window.location.search).get('id');
            
            if (!opId) {
                opDocumento.innerHTML = '<p class="texto-placeholder">OP não identificada na URL.</p>';
            } else {
                auth.onAuthStateChanged(function(user) {
                    if (!user) { window.location.href = 'login.html'; return; }
                    
                    db.collection('producao').doc(opId).get()
                        .then(function(doc) {
                            if (!doc.exists) {
                                opDocumento.innerHTML = '<p class="texto-placeholder">OP não encontrada.</p>';
                                return;
                            }
                            
                            // Popula a variável global opAtual
                            opAtual = { id: doc.id, ...doc.data() };
                            
                            // Renderiza o documento
                            renderizarOP(opAtual, doc.id);
                            
                            // Verifica permissão de edição (mostra botões de execução)
                            verificarPermissaoEdicao(opAtual);
                        })
                        .catch(function(erro) {
                            console.error('Erro ao carregar OP:', erro);
                            opDocumento.innerHTML = '<p class="texto-placeholder">Erro ao carregar a OP.</p>';
                        });
                });
            }
        }
    }

    console.log('Script 7Site (Versão 9.0 - Consolidada com Jornada) carregado com sucesso!');
});
