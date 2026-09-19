// ==========================================
// DRAG-FLUXOGRAMA.JS
// Módulo isolado de drag and drop do fluxograma
// Depende de: SortableJS + Firestore
// ==========================================

document.addEventListener('DOMContentLoaded', function() {

    if (!document.getElementById('zona-montagem')) return;

    // ==========================================
    // VARIÁVEIS GLOBAIS
    // ==========================================
    let modulosDisponiveis = [];
    let moduloEmEdicao = null;
    let cardEmEdicao = null;
    let fluxogramaAtualId = null;
    let etapaEmEdicao = null;

    let cacheDatalists = {
        recortes: [],
        operacoes: [],
        maquinas: [],
        equipamentos: [],
        aviamentos: []
    };

    // ==========================================
    // 1. DATALISTS
    // ==========================================
    function carregarDatalists() {
        db.collection('recortes').get().then(function(snap) {
            cacheDatalists.recortes = [];
            snap.forEach(function(doc) { cacheDatalists.recortes.push(doc.data().nome); });
        });

        db.collection('operacoes').get().then(function(snap) {
            cacheDatalists.operacoes = [];
            snap.forEach(function(doc) { cacheDatalists.operacoes.push(doc.data().nome); });
        });

        db.collection('maquinas').get().then(function(snap) {
            cacheDatalists.maquinas = [];
            snap.forEach(function(doc) { cacheDatalists.maquinas.push(doc.data().nome); });
        }).catch(function() {
            cacheDatalists.maquinas = ['RETA', 'OVERLOQUE', 'GALONEIRA', 'INTERLOCK', 'ELASTIQUEIRA', 'MANUAL'];
        });

        db.collection('equipamentos').get().then(function(snap) {
            cacheDatalists.equipamentos = [];
            snap.forEach(function(doc) { cacheDatalists.equipamentos.push(doc.data().nome); });
        }).catch(function() {
            cacheDatalists.equipamentos = [];
        });

        db.collection('estoque').get()
            .then(function(snap) {
                cacheDatalists.aviamentos = [];
                snap.forEach(function(doc) {
                    const d = doc.data();
                    const nomeCompleto = [d.nome, d.material, d.cor, d.tamanho]
                        .filter(v => v && v !== 'N/A')
                        .join(' ');
                    cacheDatalists.aviamentos.push(nomeCompleto);
                });
            })
            .catch(function(erro) {
                console.error('Erro ao carregar aviamentos:', erro);
                cacheDatalists.aviamentos = [];
            });
    }

    function popularDatalist(idDatalist, valores) {
        const datalist = document.getElementById(idDatalist);
        if (!datalist) return;
        datalist.innerHTML = '';
        valores.forEach(function(v) {
            const opt = document.createElement('option');
            opt.value = v;
            datalist.appendChild(opt);
        });
    }

    // ==========================================
    // 2. RENDERIZAR BIBLIOTECA
    // ==========================================
    function renderizarBiblioteca(filtro = '') {
        const lista = document.getElementById('fluxo-lista-modulos');
        if (!lista) return;

        if (modulosDisponiveis.length === 0) {
            lista.innerHTML = '<p class="texto-placeholder">Nenhum módulo cadastrado.</p>';
            return;
        }

        const modulosFiltrados = modulosDisponiveis.filter(m =>
            (m.nome || '').toLowerCase().includes(filtro.toLowerCase())
        );

        if (modulosFiltrados.length === 0) {
            lista.innerHTML = '<p class="texto-placeholder">Nenhum módulo encontrado.</p>';
            return;
        }

        let html = '';
        modulosFiltrados.forEach(function(mod) {
            const numEtapas = (mod.etapas || []).length;
            html += `
                <div class="fluxo-card-biblioteca" data-modulo-id="${mod.id}">
                    <span class="nome">${mod.nome}</span>
                    <div class="meta">
                        <span>⚙️ ${numEtapas} etapa${numEtapas === 1 ? '' : 's'}</span>
                    </div>
                </div>
            `;
        });
        lista.innerHTML = html;
        inicializarSortable();
    }

    // ==========================================
    // 3. CRIAR CARD DE MÓDULO NA ZONA
    // ==========================================
    function criarCardModulo(moduloId, expandido = false) {
        const modulo = modulosDisponiveis.find(m => m.id === moduloId);
        if (!modulo) return null;

        const card = document.createElement('div');
        card.classList.add('fluxo-modulo');
        card.dataset.moduloId = modulo.id;
        if (expandido) card.classList.add('aberto');

        const etapas = modulo.etapas || [];
        const totalTempo = etapas.reduce((acc, et) => acc + (et.tempo_segundos || 0), 0);

        let etapasHtml = '';
        if (etapas.length === 0) {
            etapasHtml = '<p class="texto-placeholder" style="padding: 20px;">Nenhuma etapa cadastrada neste módulo.</p>';
        } else {
            etapas.forEach(function(etapa, index) {
                etapasHtml += `
                    <div class="fluxo-etapa" data-etapa-index="${index}">
                        <span class="fluxo-etapa-alca" title="Arrastar para reordenar">⋮⋮</span>
                        <div class="fluxo-etapa-numero">${index + 1}</div>
                        <div class="fluxo-etapa-info">
                            <div class="fluxo-etapa-nome">${etapa.nome_etapa || etapa.operacao || '—'}</div>
                            <div class="fluxo-etapa-recorte">${etapa.recorte || '—'}</div>
                            <div class="fluxo-etapa-meta">
                                <span>🔧 ${etapa.maquina || '—'}</span>
                                <span>⏱️ ${etapa.tempo_segundos || 0}s</span>
                            </div>
                        </div>
                        <div class="fluxo-etapa-acoes">
                            <button type="button" class="btn-editar-etapa" title="Editar etapa">✏️</button>
                            <button type="button" class="btn-remover-etapa" title="Remover etapa">🗑️</button>
                        </div>
                    </div>
                `;
            });
        }

        card.innerHTML = `
            <div class="fluxo-modulo-cabecalho">
                <div class="fluxo-modulo-titulo">
                    <h4>${modulo.nome}</h4>
                    <span class="fluxo-modulo-contador">${etapas.length} etapa${etapas.length === 1 ? '' : 's'}</span>
                </div>
                <div class="fluxo-modulo-tempo">
                    ⏱️ <strong>${formatarTempo(totalTempo)}</strong>
                </div>
                <div class="fluxo-modulo-acoes">
                    <button type="button" class="btn-remover-modulo" title="Remover módulo do fluxograma">🗑️</button>
                    <span class="fluxo-modulo-expandir">▾</span>
                </div>
            </div>
            <div class="fluxo-modulo-corpo">
                ${etapasHtml}
                <div class="fluxo-modulo-rodape">
                    <span style="font-size: 13px; color: #6c757d;">Módulo do fluxograma</span>
                    <button type="button" class="btn-adicionar-etapa">+ Adicionar Etapa</button>
                </div>
            </div>
        `;

        card.querySelector('.btn-remover-modulo').addEventListener('click', function(e) {
            e.stopPropagation();
            if (confirm(`Remover o módulo ${modulo.nome} do fluxograma?`)) {
                card.remove();
                verificarZonaVazia();
                atualizarResumo();
            }
        });

        card.querySelector('.fluxo-modulo-cabecalho').addEventListener('click', function(e) {
            if (e.target.closest('.fluxo-modulo-acoes')) return;
            card.classList.toggle('aberto');
        });

        card.querySelectorAll('.btn-remover-etapa').forEach(function(botao, index) {
            botao.addEventListener('click', function(e) {
                e.stopPropagation();
                if (confirm('Remover esta etapa do módulo? Isso afeta todos os fluxogramas que usam este módulo.')) {
                    removerEtapaDoModulo(modulo.id, index, card);
                }
            });
        });

        card.querySelectorAll('.btn-editar-etapa').forEach(function(botao, index) {
            botao.addEventListener('click', function(e) {
                e.stopPropagation();
                abrirModalEditarEtapa(modulo.id, index, card);
            });
        });

        card.querySelector('.btn-adicionar-etapa').addEventListener('click', function(e) {
            e.stopPropagation();
            abrirModalNovaEtapa(modulo.id, card);
        });

        inicializarSortableEtapas(card, modulo.id);

        return card;
    }

    // ==========================================
    // 4. SORTABLE DAS ETAPAS
    // ==========================================
    function inicializarSortableEtapas(card, moduloId) {
        if (typeof Sortable === 'undefined') return;

        const corpo = card.querySelector('.fluxo-modulo-corpo');
        if (!corpo) return;

        const etapas = corpo.querySelectorAll('.fluxo-etapa');
        if (etapas.length < 2) return;

        new Sortable(corpo, {
            animation: 150,
            handle: '.fluxo-etapa-alca',
            draggable: '.fluxo-etapa',
            filter: '.fluxo-modulo-rodape',
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            onEnd: function() {
                reordenarEtapas(card);
                salvarOrdemEtapas(moduloId, card);
            }
        });
    }

    function salvarOrdemEtapas(moduloId, card) {
        const modulo = modulosDisponiveis.find(m => m.id === moduloId);
        if (!modulo) return;

        const etapasAntigas = modulo.etapas || [];
        const etapasDoDom = card.querySelectorAll('.fluxo-etapa');

        const novasEtapas = [];
        etapasDoDom.forEach(function(etapaEl) {
            const indexAntigo = parseInt(etapaEl.dataset.etapaIndex);
            if (!isNaN(indexAntigo) && etapasAntigas[indexAntigo]) {
                novasEtapas.push(etapasAntigas[indexAntigo]);
            }
        });

        if (novasEtapas.length !== etapasAntigas.length) {
            console.warn('Ordem inconsistente, recarregando...');
            return;
        }

        etapasDoDom.forEach(function(etapaEl, index) {
            etapaEl.dataset.etapaIndex = index;
        });

        db.collection('modulos').doc(moduloId).update({
            etapas: novasEtapas,
            data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(function() {
            modulo.etapas = novasEtapas;
            console.log('✅ Ordem das etapas atualizada.');
        })
        .catch(function(erro) {
            console.error('Erro ao salvar ordem:', erro);
            alert('❌ Erro ao salvar nova ordem.');
        });
    }

    function reordenarEtapas(cardModulo) {
        const etapas = cardModulo.querySelectorAll('.fluxo-etapa');
        etapas.forEach(function(etapa, index) {
            etapa.querySelector('.fluxo-etapa-numero').textContent = index + 1;
            etapa.dataset.etapaIndex = index;
        });
    }

    // ==========================================
    // 5. REMOVER ETAPA DO MÓDULO
    // ==========================================
    function removerEtapaDoModulo(moduloId, index, card) {
        const modulo = modulosDisponiveis.find(m => m.id === moduloId);
        if (!modulo) return;

        const etapasAtualizadas = [...(modulo.etapas || [])];
        etapasAtualizadas.splice(index, 1);

        db.collection('modulos').doc(moduloId).update({
            etapas: etapasAtualizadas,
            data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(function() {
            modulo.etapas = etapasAtualizadas;
            const novoCard = criarCardModulo(moduloId, true);
            if (novoCard && card.parentNode) {
                card.replaceWith(novoCard);
            }
            atualizarResumo();
            renderizarBiblioteca();
        })
        .catch(function(erro) {
            console.error('Erro ao remover etapa:', erro);
            alert('❌ Erro ao remover etapa.');
        });
    }

    // ==========================================
    // 6. ZONA VAZIA E RESUMO
    // ==========================================
    function verificarZonaVazia() {
        const zona = document.getElementById('zona-montagem');
        if (!zona) return;
        const modulos = zona.querySelectorAll('.fluxo-modulo');
        if (modulos.length === 0) {
            zona.innerHTML = '<p class="fluxo-zona-placeholder">Nenhum módulo adicionado ainda. Arraste um módulo da biblioteca.</p>';
        }
    }

    function atualizarResumo() {
        const zona = document.getElementById('zona-montagem');
        if (!zona) return;

        const modulos = zona.querySelectorAll('.fluxo-modulo');
        let totalEtapas = 0;
        let totalTempo = 0;

        modulos.forEach(function(card) {
            const etapas = card.querySelectorAll('.fluxo-etapa');
            totalEtapas += etapas.length;
            etapas.forEach(function(etapa) {
                const tempoTexto = etapa.querySelector('.fluxo-etapa-meta')?.textContent || '';
                const match = tempoTexto.match(/(\d+)s/);
                if (match) totalTempo += parseInt(match[1]);
            });
        });

        const elTotalModulos = document.getElementById('fluxo-total-modulos');
        const elTotalOperacoes = document.getElementById('fluxo-total-operacoes');
        const elTempoTotal = document.getElementById('fluxo-tempo-total');

        if (elTotalModulos) elTotalModulos.textContent = modulos.length;
        if (elTotalOperacoes) elTotalOperacoes.textContent = totalEtapas;
        if (elTempoTotal) elTempoTotal.textContent = formatarTempo(totalTempo);
    }


    // ==========================================
    // 7. SORTABLE PRINCIPAL (MÓDULOS)
    // ==========================================
    function inicializarSortable() {
        const biblioteca = document.getElementById('fluxo-lista-modulos');
        const zona = document.getElementById('zona-montagem');

        if (!biblioteca || !zona || typeof Sortable === 'undefined') return;

        if (biblioteca.classList.contains('sortable-iniciado')) return;
        if (zona.classList.contains('sortable-iniciado')) return;

        biblioteca.classList.add('sortable-iniciado');
        zona.classList.add('sortable-iniciado');

        new Sortable(biblioteca, {
            group: { name: 'modulos', pull: 'clone', put: false },
            sort: false,
            animation: 200,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen'
        });

        new Sortable(zona, {
            group: { name: 'modulos', pull: false, put: true },
            animation: 200,
            ghostClass: 'sortable-ghost',
            chosenClass: 'sortable-chosen',
            handle: '.fluxo-modulo-cabecalho',
            onAdd: function(evt) {
                const clone = evt.item;
                const moduloId = clone.dataset.moduloId;
                const novoCard = criarCardModulo(moduloId);
                if (novoCard) clone.replaceWith(novoCard);
                verificarZonaVazia();
                atualizarResumo();
            },
            onUpdate: function() {
                atualizarResumo();
            }
        });
    }

    // ==========================================
    // 8. CARREGAR MÓDULOS
    // ==========================================
    window.carregarModulos = function() {
        const lista = document.getElementById('fluxo-lista-modulos');
        if (!lista) return;

        lista.innerHTML = '<p class="texto-placeholder">Carregando módulos...</p>';

        db.collection('modulos').orderBy('nome').get()
            .then(function(snapshot) {
                modulosDisponiveis = [];
                snapshot.forEach(function(doc) {
                    modulosDisponiveis.push({ id: doc.id, ...doc.data() });
                });

                if (modulosDisponiveis.length === 0) {
                    lista.innerHTML = '<p class="texto-placeholder">Nenhum módulo cadastrado. Clique em "+ Novo Módulo" para começar.</p>';
                } else {
                    renderizarBiblioteca();
                }
                inicializarSortable();
            })
            .catch(function(erro) {
                console.error('Erro ao carregar módulos:', erro);
                lista.innerHTML = '<p class="texto-placeholder">Erro ao carregar módulos.</p>';
            });
    };

    // ==========================================
    // 9. MODAL: NOVO MÓDULO
    // ==========================================
    window.abrirModalNovoModulo = function() {
        const modal = document.getElementById('modal-novo-modulo');
        if (!modal) return;
        document.getElementById('mod-nome').value = '';
        document.getElementById('mod-descricao').value = '';
        modal.style.display = 'flex';
        document.getElementById('mod-nome').focus();
    };

    window.fecharModalNovoModulo = function() {
        const modal = document.getElementById('modal-novo-modulo');
        if (modal) modal.style.display = 'none';
    };

    window.salvarNovoModulo = function() {
        const nome = document.getElementById('mod-nome').value.trim();
        const descricao = document.getElementById('mod-descricao').value.trim();

        if (!nome) { alert('Digite o nome do módulo.'); return; }

        const nomeMaiusculo = nome.toUpperCase();

        db.collection('modulos').where('nome', '==', nomeMaiusculo).get()
            .then(function(snapshot) {
                if (!snapshot.empty) {
                    alert('Já existe um módulo com este nome.');
                    throw new Error('duplicado');
                }
                return db.collection('modulos').add({
                    nome: nomeMaiusculo,
                    descricao: descricao.toUpperCase(),
                    etapas: [],
                    data_cadastro: firebase.firestore.FieldValue.serverTimestamp(),
                    data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(function() {
                alert('✅ Módulo criado!');
                fecharModalNovoModulo();
                window.carregarModulos();
            })
            .catch(function(erro) {
                if (erro.message !== 'duplicado') {
                    console.error('Erro ao criar módulo:', erro);
                    alert('❌ Erro ao criar módulo.');
                }
            });
    };

    // ==========================================
    // 10. MODAL: NOVA ETAPA / EDITAR ETAPA
    // ==========================================
    window.abrirModalNovaEtapa = function(moduloId, card) {
        const modulo = modulosDisponiveis.find(m => m.id === moduloId);
        if (!modulo) return;

        moduloEmEdicao = moduloId;
        cardEmEdicao = card || null;
        etapaEmEdicao = null;

        document.getElementById('modal-etapa-modulo-nome').innerHTML =
            `Adicionando etapa ao módulo: <strong>${modulo.nome}</strong>`;

        document.getElementById('etapa-nome').value = '';
        document.getElementById('etapa-recorte').value = '';
        document.getElementById('etapa-operacao').value = '';
        document.getElementById('etapa-maquina').value = '';
        document.getElementById('etapa-equipamento').value = '';
        document.getElementById('etapa-tempo').value = 30;
        document.getElementById('etapa-observacoes').value = '';
        renderizarInsumosModal([]);

        popularDatalist('lista-recortes-etapa', cacheDatalists.recortes);
        popularDatalist('lista-operacoes-etapa', cacheDatalists.operacoes);
        popularDatalist('lista-maquinas-etapa', cacheDatalists.maquinas);
        popularDatalist('lista-equipamentos-etapa', cacheDatalists.equipamentos);

        // Restaura o botão para "Adicionar Etapa"
        const botaoSalvar = document.querySelector('#modal-nova-etapa .btn-primario');
        if (botaoSalvar) {
            botaoSalvar.textContent = 'Adicionar Etapa';
            botaoSalvar.setAttribute('onclick', 'salvarNovaEtapa()');
        }

        document.getElementById('modal-nova-etapa').style.display = 'flex';
        document.getElementById('etapa-nome').focus();
    };

    window.abrirModalEditarEtapa = function(moduloId, index, card) {
        const modulo = modulosDisponiveis.find(m => m.id === moduloId);
        if (!modulo) return;

        const etapa = (modulo.etapas || [])[index];
        if (!etapa) return;

        etapaEmEdicao = { moduloId: moduloId, index: index, card: card };
        moduloEmEdicao = moduloId;
        cardEmEdicao = card;

        document.getElementById('modal-etapa-modulo-nome').innerHTML =
            `Editando etapa ${index + 1} do módulo: <strong>${modulo.nome}</strong>`;

        document.getElementById('etapa-nome').value = etapa.nome_etapa || '';
        document.getElementById('etapa-recorte').value = etapa.recorte || '';
        document.getElementById('etapa-operacao').value = etapa.operacao || '';
        document.getElementById('etapa-maquina').value = etapa.maquina || '';
        document.getElementById('etapa-tempo').value = etapa.tempo_segundos || 30;
        document.getElementById('etapa-equipamento').value = etapa.equipamento && etapa.equipamento !== 'NENHUM' ? etapa.equipamento : '';
        document.getElementById('etapa-observacoes').value = etapa.observacoes || '';
        renderizarInsumosModal(normalizarInsumos(etapa));

        popularDatalist('lista-recortes-etapa', cacheDatalists.recortes);
        popularDatalist('lista-operacoes-etapa', cacheDatalists.operacoes);
        popularDatalist('lista-maquinas-etapa', cacheDatalists.maquinas);
        popularDatalist('lista-equipamentos-etapa', cacheDatalists.equipamentos);

        const botaoSalvar = document.querySelector('#modal-nova-etapa .btn-primario');
        if (botaoSalvar) {
            botaoSalvar.textContent = '💾 Salvar Alterações';
            botaoSalvar.setAttribute('onclick', 'salvarEdicaoEtapa()');
        }

        document.getElementById('modal-nova-etapa').style.display = 'flex';
        document.getElementById('etapa-nome').focus();
    };

    window.fecharModalNovaEtapa = function() {
        document.getElementById('modal-nova-etapa').style.display = 'none';
        moduloEmEdicao = null;
        cardEmEdicao = null;
        etapaEmEdicao = null;

        const botaoSalvar = document.querySelector('#modal-nova-etapa .btn-primario');
        if (botaoSalvar) {
            botaoSalvar.textContent = 'Adicionar Etapa';
            botaoSalvar.setAttribute('onclick', 'salvarNovaEtapa()');
        }
    };

    window.salvarNovaEtapa = function() {
        if (!moduloEmEdicao) return;

        const nomeEtapa = document.getElementById('etapa-nome').value.trim().toUpperCase();
        const recorte = document.getElementById('etapa-recorte').value.trim().toUpperCase();
        const operacao = document.getElementById('etapa-operacao').value.trim().toUpperCase();
        const maquina = document.getElementById('etapa-maquina').value.trim().toUpperCase();
        const equipamento = document.getElementById('etapa-equipamento').value.trim().toUpperCase() || 'NENHUM';
        const tempo = parseInt(document.getElementById('etapa-tempo').value);
        const observacoes = document.getElementById('etapa-observacoes').value.trim().toUpperCase();
        const insumos = lerInsumosDoModal();
        if (insumos === null) return;

        if (!nomeEtapa) { alert('Informe o nome da etapa.'); return; }
        if (!recorte || !operacao || !maquina) { alert('Preencha Recorte, Operação e Máquina.'); return; }

        if (!cacheDatalists.maquinas.includes(maquina)) {
            if (confirm(`A máquina "${maquina}" não está cadastrada.\n\nDeseja cadastrá-la agora?`)) {
                abrirModalNovaMaquina(maquina);
            }
            return;
        }

        if (!tempo || tempo < 1) { alert('Informe um tempo válido em segundos.'); return; }

        const modulo = modulosDisponiveis.find(m => m.id === moduloEmEdicao);
        if (!modulo) return;

        const novaEtapa = {
            nome_etapa: nomeEtapa,
            recorte: recorte,
            operacao: operacao,
            maquina: maquina,
            equipamento: equipamento,
            tempo_segundos: tempo,
            observacoes: observacoes,
            permite_paralelo: false,
            insumos: insumos
        };

        const etapasAtualizadas = [...(modulo.etapas || []), novaEtapa];

        db.collection('modulos').doc(moduloEmEdicao).update({
            etapas: etapasAtualizadas,
            data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(function() {
            modulo.etapas = etapasAtualizadas;

            if (cardEmEdicao && cardEmEdicao.parentNode) {
                const novoCard = criarCardModulo(moduloEmEdicao, true);
                if (novoCard) cardEmEdicao.replaceWith(novoCard);
            }

            fecharModalNovaEtapa();
            atualizarResumo();
            renderizarBiblioteca();
        })
        .catch(function(erro) {
            console.error('Erro ao adicionar etapa:', erro);
            alert('❌ Erro ao adicionar etapa.');
        });
    };

    window.salvarEdicaoEtapa = function() {
        if (!etapaEmEdicao) return;

        const { moduloId, index, card } = etapaEmEdicao;

        const nomeEtapa = document.getElementById('etapa-nome').value.trim().toUpperCase();
        const recorte = document.getElementById('etapa-recorte').value.trim().toUpperCase();
        const operacao = document.getElementById('etapa-operacao').value.trim().toUpperCase();
        const maquina = document.getElementById('etapa-maquina').value.trim().toUpperCase();
        const tempo = parseInt(document.getElementById('etapa-tempo').value);
        const equipamento = document.getElementById('etapa-equipamento').value.trim().toUpperCase() || 'NENHUM';
        const observacoes = document.getElementById('etapa-observacoes').value.trim().toUpperCase();
        const insumos = lerInsumosDoModal();
        if (insumos === null) return;

        if (!nomeEtapa) { alert('Informe o nome da etapa.'); return; }
        if (!recorte || !operacao || !maquina) { alert('Preencha Recorte, Operação e Máquina.'); return; }

        if (!cacheDatalists.maquinas.includes(maquina)) {
            if (confirm(`A máquina "${maquina}" não está cadastrada.\n\nDeseja cadastrá-la agora?`)) {
                abrirModalNovaMaquina(maquina);
            }
            return;
        }

        if (!tempo || tempo < 1) { alert('Informe um tempo válido.'); return; }

        const modulo = modulosDisponiveis.find(m => m.id === moduloId);
        if (!modulo) return;

        const etapasAtualizadas = [...(modulo.etapas || [])];

        etapasAtualizadas[index] = {
            nome_etapa: nomeEtapa,
            recorte: recorte,
            operacao: operacao,
            maquina: maquina,
            equipamento: equipamento,
            tempo_segundos: tempo,
            observacoes: observacoes,
            permite_paralelo: etapasAtualizadas[index].permite_paralelo || false,
            insumos: insumos
        };

        db.collection('modulos').doc(moduloId).update({
            etapas: etapasAtualizadas,
            data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
        })
        .then(function() {
            modulo.etapas = etapasAtualizadas;

            if (card && card.parentNode) {
                const novoCard = criarCardModulo(moduloId, true);
                if (novoCard) card.replaceWith(novoCard);
            }

            fecharModalNovaEtapa();
            atualizarResumo();
            renderizarBiblioteca();
        })
        .catch(function(erro) {
            console.error('Erro ao editar etapa:', erro);
            alert('❌ Erro ao salvar alterações.');
        });
    };

    // ==========================================
    // 10.1 INSUMOS MÚLTIPLOS POR ETAPA
    // ==========================================
    let insumoRowSeq = 0;

    function obterSugestoesInsumo(tipo) {
        if (tipo === 'recorte') return cacheDatalists.recortes;
        if (tipo === 'aviamento') return cacheDatalists.aviamentos;
        return [];
    }

    function popularDatalistLinha(linha) {
        const select = linha.querySelector('.fluxo-insumo-tipo');
        const datalistId = 'dl-' + linha.dataset.insumoId;
        popularDatalist(datalistId, obterSugestoesInsumo(select.value));
    }

    function gerarLinhaInsumoHTML(dados) {
        dados = dados || {};
        const id = 'insumo-' + (++insumoRowSeq);
        const tipo = dados.tipo || '';
        const nome = dados.nome || '';
        const qtd = dados.quantidade || '';
        const unidade = dados.unidade || 'UN';
        const tipos = ['', 'recorte', 'aviamento'].map(function(t) {
            const rotulo = t === 'recorte' ? 'RECORTE' : (t === 'aviamento' ? 'AVIAMENTO' : 'Nenhum');
            return '<option value="' + t + '"' + (t === tipo ? ' selected' : '') + '>' + rotulo + '</option>';
        }).join('');
        const unidades = ['UN', 'MT', 'KG', 'ROLO'].map(function(u) {
            return '<option value="' + u + '"' + (u === unidade ? ' selected' : '') + '>' + u + '</option>';
        }).join('');
        return `
            <div class="fluxo-insumo-linha" data-insumo-id="${id}">
                <select class="fluxo-insumo-tipo" onchange="atualizarDatalistLinha(this)">${tipos}</select>
                <input type="text" class="fluxo-insumo-nome" list="dl-${id}" placeholder="Nome do insumo" value="${nome}">
                <datalist id="dl-${id}"></datalist>
                <input type="number" class="fluxo-insumo-qtd" placeholder="Qtd" step="0.01" min="0" value="${qtd}">
                <select class="fluxo-insumo-unidade">${unidades}</select>
                <button type="button" class="btn-remover-insumo" onclick="removerLinhaInsumo(this)">×</button>
            </div>`;
    }

    function renderizarInsumosModal(lista) {
        const container = document.getElementById('etapa-insumos-lista');
        if (!container) return;
        insumoRowSeq = 0;
        container.innerHTML = '';
        (lista || []).forEach(function(item) {
            container.insertAdjacentHTML('beforeend', gerarLinhaInsumoHTML(item));
        });
        container.querySelectorAll('.fluxo-insumo-linha').forEach(function(linha) {
            popularDatalistLinha(linha);
        });
    }

    function lerInsumosDoModal() {
        const container = document.getElementById('etapa-insumos-lista');
        if (!container) return [];
        const insumos = [];
        const linhas = container.querySelectorAll('.fluxo-insumo-linha');
        for (let i = 0; i < linhas.length; i++) {
            const linha = linhas[i];
            const tipo = linha.querySelector('.fluxo-insumo-tipo').value;
            const nome = linha.querySelector('.fluxo-insumo-nome').value.trim().toUpperCase();
            const qtd = parseFloat(linha.querySelector('.fluxo-insumo-qtd').value) || 0;
            const unidade = linha.querySelector('.fluxo-insumo-unidade').value;
            if (!tipo && !nome) continue;
            if (tipo && !nome) { alert('Informe o nome do insumo da linha ' + (i + 1) + '.'); return null; }
            if (tipo && qtd <= 0) { alert('Informe a quantidade do insumo da linha ' + (i + 1) + '.'); return null; }
            insumos.push({ tipo: tipo, nome: nome, quantidade: qtd, unidade: unidade });
        }
        return insumos;
    }

    window.adicionarLinhaInsumo = function() {
        const container = document.getElementById('etapa-insumos-lista');
        if (!container) return;
        container.insertAdjacentHTML('beforeend', gerarLinhaInsumoHTML({}));
    };

    window.removerLinhaInsumo = function(botao) {
        const linha = botao.closest('.fluxo-insumo-linha');
        if (linha) linha.remove();
    };

    window.atualizarDatalistLinha = function(select) {
        const linha = select.closest('.fluxo-insumo-linha');
        if (!linha) return;
        popularDatalistLinha(linha);
        linha.querySelector('.fluxo-insumo-nome').value = '';
    };

    // ==========================================
    // 11. MODAL: NOVA MÁQUINA
    // ==========================================
    window.abrirModalNovaMaquina = function(nomeSugerido) {
        const modal = document.getElementById('modal-nova-maquina');
        if (!modal) return;

        document.getElementById('maquina-nome').value = (nomeSugerido || '').toUpperCase();
        modal.style.display = 'flex';
        document.getElementById('maquina-nome').focus();
        document.getElementById('maquina-nome').select();
    };

    window.fecharModalNovaMaquina = function() {
        const modal = document.getElementById('modal-nova-maquina');
        if (modal) modal.style.display = 'none';
    };

    window.salvarNovaMaquina = function() {
        const nome = document.getElementById('maquina-nome').value.trim().toUpperCase();

        if (!nome) { alert('Digite o nome da máquina.'); return; }

        db.collection('maquinas').where('nome', '==', nome).get()
            .then(function(snapshot) {
                if (!snapshot.empty) {
                    alert('Esta máquina já está cadastrada.');
                    throw new Error('duplicado');
                }
                return db.collection('maquinas').add({
                    nome: nome,
                    data_cadastro: firebase.firestore.FieldValue.serverTimestamp()
                });
            })
            .then(function() {
                alert(`✅ Máquina "${nome}" cadastrada!`);

                cacheDatalists.maquinas.push(nome);
                cacheDatalists.maquinas.sort();

                popularDatalist('lista-maquinas-etapa', cacheDatalists.maquinas);

                fecharModalNovaMaquina();

                const campoMaquina = document.getElementById('etapa-maquina');
                if (campoMaquina) campoMaquina.value = nome;
            })
            .catch(function(erro) {
                if (erro.message !== 'duplicado') {
                    console.error('Erro ao cadastrar máquina:', erro);
                    alert('❌ Erro ao cadastrar máquina.');
                }
            });
    };

    // ==========================================
    // 12. SALVAR FLUXOGRAMA
    // ==========================================
    window.salvarFluxograma = function() {
        const zona = document.getElementById('zona-montagem');
        const cards = zona.querySelectorAll('.fluxo-modulo');

        if (cards.length === 0) {
            alert('Adicione pelo menos um módulo antes de salvar.');
            return;
        }

        const nomeAtual = document.getElementById('fluxo-nome').value;
        const categoriaAtual = document.getElementById('fluxo-categoria').value;
        const variacaoAtual = document.getElementById('fluxo-variacao').value;

        document.getElementById('salvar-nome').value = nomeAtual || '';
        document.getElementById('salvar-categoria').value = categoriaAtual || '';
        document.getElementById('salvar-variacao').value = variacaoAtual || '';

        document.getElementById('modal-salvar-titulo').textContent = fluxogramaAtualId
            ? 'Salvar Alterações'
            : 'Salvar Novo Fluxograma';

        document.getElementById('modal-salvar-fluxograma').style.display = 'flex';
        document.getElementById('salvar-nome').focus();
    };

    window.fecharModalSalvarFluxograma = function() {
        document.getElementById('modal-salvar-fluxograma').style.display = 'none';
    };

    window.confirmarSalvarFluxograma = function() {
        const nome = document.getElementById('salvar-nome').value.trim();
        const categoria = document.getElementById('salvar-categoria').value.trim();
        const variacao = document.getElementById('salvar-variacao').value.trim();

        if (!nome) { alert('Informe o nome do modelo.'); return; }

        document.getElementById('fluxo-nome').value = nome.toUpperCase();
        document.getElementById('fluxo-categoria').value = categoria.toUpperCase();
        document.getElementById('fluxo-variacao').value = variacao.toUpperCase();

        const zona = document.getElementById('zona-montagem');
        const cards = zona.querySelectorAll('.fluxo-modulo');

        const modulosSnapshot = [];
        cards.forEach(function(card) {
            const moduloId = card.dataset.moduloId;
            const modulo = modulosDisponiveis.find(m => m.id === moduloId);
            if (modulo) {
                modulosSnapshot.push({
                    modulo_id: moduloId,
                    modulo_nome: modulo.nome,
                    etapas: JSON.parse(JSON.stringify(modulo.etapas || []))
                });
            }
        });

        let totalTempo = 0;
        let totalOperacoes = 0;
        modulosSnapshot.forEach(function(m) {
            m.etapas.forEach(function(e) {
                totalTempo += e.tempo_segundos || 0;
                totalOperacoes++;
            });
        });

        const dados = {
            nome: nome.toUpperCase(),
            categoria: categoria.toUpperCase(),
            variacao: variacao.toUpperCase(),
            modulos: modulosSnapshot,
            total_tempo_segundos: totalTempo,
            total_modulos: modulosSnapshot.length,
            total_operacoes: totalOperacoes,
            data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
        };

        const botao = document.querySelector('#modal-salvar-fluxograma .btn-primario');
        botao.textContent = 'Salvando...';
        botao.disabled = true;

        let promise;
        if (fluxogramaAtualId) {
            promise = db.collection('fluxogramas').doc(fluxogramaAtualId).update(dados);
        } else {
            dados.data_cadastro = firebase.firestore.FieldValue.serverTimestamp();
            promise = db.collection('fluxogramas').add(dados);
        }

        promise.then(function(ref) {
            if (!fluxogramaAtualId && ref) {
                fluxogramaAtualId = ref.id;
            }
            alert('✅ Fluxograma salvo!');
            botao.textContent = '💾 Salvar';
            botao.disabled = false;
            fecharModalSalvarFluxograma();
            window.carregarFluxogramasSalvos();
        })
        .catch(function(erro) {
            console.error('Erro ao salvar fluxograma:', erro);
            alert('❌ Erro ao salvar.');
            botao.textContent = '💾 Salvar';
            botao.disabled = false;
        });
    };

    // ==========================================
    // 13. LIMPAR FLUXOGRAMA
    // ==========================================
    window.limparFluxograma = function() {
        if (!confirm('Tem certeza que deseja limpar tudo? Alterações não salvas serão perdidas.')) return;

        const zona = document.getElementById('zona-montagem');
        zona.innerHTML = '<p class="fluxo-zona-placeholder">Nenhum módulo adicionado ainda. Arraste um módulo da biblioteca.</p>';

        document.getElementById('fluxo-nome').value = '';
        document.getElementById('fluxo-categoria').value = '';
        document.getElementById('fluxo-variacao').value = '';

        fluxogramaAtualId = null;

        atualizarResumo();
    };

    // ==========================================
    // 14. LISTAR FLUXOGRAMAS SALVOS
    // ==========================================
    window.carregarFluxogramasSalvos = function(filtro = '') {
        const lista = document.getElementById('lista-fluxogramas-salvos');
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
                        <div class="fluxo-card-salvo">
                            ${f.categoria ? `<span class="fluxo-card-salvo-categoria">${f.categoria}</span>` : ''}
                            <div class="fluxo-card-salvo-titulo">${f.nome}</div>
                            <div class="fluxo-card-salvo-info">
                                <span>🧩 ${f.total_modulos || 0} módulos</span>
                                <span>⚙️ ${f.total_operacoes || 0} etapas</span>
                                <span>⏱️ ~${minutos}min</span>
                            </div>
                            <div class="fluxo-card-salvo-acoes">
                                <button type="button" class="btn-abrir" onclick="carregarFluxograma('${f.id}')">📂 Abrir</button>
                                <button type="button" class="btn-excluir-salvo" onclick="excluirFluxograma('${f.id}')">🗑️</button>
                            </div>
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

    // ==========================================
    // 15. CARREGAR UM FLUXOGRAMA PARA EDIÇÃO
    // ==========================================
    window.carregarFluxograma = function(fluxogramaId) {
        if (!confirm('Carregar este fluxograma? O que está na zona será substituído.')) return;

        db.collection('fluxogramas').doc(fluxogramaId).get()
            .then(function(doc) {
                if (!doc.exists) {
                    alert('Fluxograma não encontrado.');
                    return;
                }

                const d = doc.data();
                fluxogramaAtualId = fluxogramaId;

                document.getElementById('fluxo-nome').value = d.nome || '';
                document.getElementById('fluxo-categoria').value = d.categoria || '';
                document.getElementById('fluxo-variacao').value = d.variacao || '';

                const zona = document.getElementById('zona-montagem');
                zona.innerHTML = '';

                if (d.modulos && d.modulos.length > 0) {
                    d.modulos.forEach(function(mod) {
                        const modulo = modulosDisponiveis.find(m => m.id === mod.modulo_id);
                        if (modulo) {
                            modulo.etapas = mod.etapas || [];
                            const novoCard = criarCardModulo(mod.modulo_id, false);
                            if (novoCard) zona.appendChild(novoCard);
                        }
                    });
                }

                if (zona.children.length === 0) {
                    zona.innerHTML = '<p class="fluxo-zona-placeholder">Este fluxograma está vazio.</p>';
                }

                atualizarResumo();
                alert('✅ Fluxograma carregado!');
            })
            .catch(function(erro) {
                console.error('Erro ao carregar fluxograma:', erro);
                alert('❌ Erro ao carregar.');
            });
    };

    // ==========================================
    // 16. EXCLUIR FLUXOGRAMA
    // ==========================================
    window.excluirFluxograma = function(fluxogramaId) {
        if (!confirm('Excluir este fluxograma permanentemente?')) return;

        db.collection('fluxogramas').doc(fluxogramaId).delete()
            .then(function() {
                alert('✅ Fluxograma excluído!');
                if (fluxogramaAtualId === fluxogramaId) {
                    fluxogramaAtualId = null;
                }
                window.carregarFluxogramasSalvos();
            })
            .catch(function(erro) {
                console.error('Erro ao excluir:', erro);
                alert('❌ Erro ao excluir.');
            });
    };

    // ==========================================
    // 17. EVENT LISTENERS
    // ==========================================
    
    // Busca na biblioteca de módulos
    const inputBusca = document.getElementById('fluxo-busca-modulo');
    if (inputBusca) {
        inputBusca.addEventListener('input', function() {
            renderizarBiblioteca(this.value);
        });
    }

    // Busca nos fluxogramas salvos
    const inputBuscaSalvos = document.getElementById('fluxo-busca-salvos');
    if (inputBuscaSalvos) {
        inputBuscaSalvos.addEventListener('input', function() {
            window.carregarFluxogramasSalvos(this.value);
        });
    }

    // ==========================================
    // 18. INICIALIZAÇÃO (ÚLTIMA COISA)
    // ==========================================
    carregarDatalists();
    window.carregarModulos();
    verificarZonaVazia();
    window.carregarFluxogramasSalvos();

    console.log('Drag-fluxograma.js (Bloco 3C) carregado com sucesso!');
});