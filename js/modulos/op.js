// ==========================================
// MÓDULO - op.js
// Documento da OP, edição de material, execução e fluxograma
// Depende de: firebase.js (auth, db), core/utils.js (maiusculo, formatarTempo)
// ==========================================
document.addEventListener('DOMContentLoaded', function() {
    const opDocumento = document.getElementById('op-documento');
    
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
                <div class="op-info-item"><strong>Saída:</strong> ${dataSaida}</div>
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
                                ${gerarInsumosHTML(normalizarInsumos(etapa))}
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
            updates.status = 'aguardando_expedicao';
            updates.data_fim_execucao = firebase.firestore.FieldValue.serverTimestamp();
            updates.data_saida_producao = firebase.firestore.FieldValue.serverTimestamp();
        }

        // Baixa de estoque dos insumos internos consumidos pela etapa
        const qtdPecas = opAtual.quantidade_total || 0;
        const baixas = normalizarInsumos(etapa)
            .filter(function(i) {
                return i.item_id && i.estoque_categoria === 'interno' && (i.quantidade || 0) > 0;
            })
            .map(function(i) {
                return { id: i.item_id, nome: i.nome, baixa: i.quantidade * qtdPecas };
            });

        Promise.all(baixas.map(function(b) {
            return db.collection('estoque').doc(b.id).get();
        })).then(function(docs) {
            const batch = db.batch();
            const avisos = [];

            docs.forEach(function(doc, idx) {
                const b = baixas[idx];
                if (!doc.exists) {
                    avisos.push(b.nome + ' (não encontrado no estoque)');
                    return;
                }
                const atual = doc.data().quantidade_atual || 0;
                if (b.baixa > atual) {
                    avisos.push(b.nome + ' (saldo insuficiente: ' + atual + ' < ' + b.baixa + ')');
                }
                batch.update(doc.ref, {
                    quantidade_atual: Math.max(0, atual - b.baixa),
                    data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
                });
            });

            batch.update(db.collection('producao').doc(opAtual.id), updates);
            return batch.commit().then(function() { return avisos; });
        }).then(function(avisos) {
            if (tudoConcluido) {
                if (avisos.length) {
                    alert('✅ OP concluída, aguardando expedição, com avisos de estoque:\n- ' + avisos.join('\n- '));
                } else {
                    alert('✅ Todas as operações foram concluídas! A OP está aguardando expedição.');
                }
                window.location.reload();
            } else {
                if (avisos.length) {
                    alert('⚠️ Etapa concluída, com avisos de estoque:\n- ' + avisos.join('\n- '));
                }
                renderizarOP(opAtual, opAtual.id);
            }
        }).catch(function(erro) {
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
                                        insumos: normalizarInsumos(e),
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
});
