// Fila e rascunho de conferência da Expedição.
// Depende de firebase.js e core/conferencia-expedicao.js.
document.addEventListener('DOMContentLoaded', function() {
    const lista = document.getElementById('lista-expedicao');
    if (!lista) return;

    const totalProntas = document.getElementById('exp-total-prontas');
    const totalConferencia = document.getElementById('exp-total-conferencia');
    const totalDevolvidas = document.getElementById('exp-total-devolvidas');
    const totalDespachadas = document.getElementById('exp-total-despachadas');
    const aviso = document.getElementById('exp-aviso');
    const painel = document.getElementById('exp-conferencia');
    const formulario = document.getElementById('exp-conferencia-form');
    const titulo = document.getElementById('exp-conferencia-titulo');
    const resumo = document.getElementById('exp-conferencia-resumo');
    const calculo = document.getElementById('exp-conferencia-calculo');
    const erroFormulario = document.getElementById('exp-conferencia-erro');
    const salvar = document.getElementById('exp-salvar');
    const aprovar = document.getElementById('exp-aprovar');
    const devolver = document.getElementById('exp-devolver');
    const campos = {
        prevista: document.getElementById('exp-prevista'),
        recebida: document.getElementById('exp-recebida'),
        aprovada: document.getElementById('exp-aprovada'),
        refugada: document.getElementById('exp-refugada'),
        observacoes: document.getElementById('exp-observacoes'),
        motivoDevolucao: document.getElementById('exp-motivo-devolucao')
    };

    let cancelarEscuta = null;
    let opAbertaId = null;
    let iniciando = false;
    let salvando = false;
    let decidindo = false;
    let opsPorId = new Map();

    function cpfAtual() {
        const usuario = auth.currentUser;
        return usuario && usuario.email ? usuario.email.split('@')[0] : null;
    }

    function avisar(mensagem) {
        aviso.textContent = mensagem || '';
    }

    function mostrarErro(mensagem) {
        erroFormulario.textContent = mensagem || '';
        erroFormulario.hidden = !mensagem;
    }

    function valorInteiro(campo) {
        const texto = campo.value.trim();
        return texto === '' ? null : Number(texto);
    }

    function valoresFormulario() {
        return {
            quantidade_recebida: valorInteiro(campos.recebida),
            quantidade_aprovada: valorInteiro(campos.aprovada),
            quantidade_refugada: valorInteiro(campos.refugada),
            observacoes: campos.observacoes.value,
            motivo_devolucao: campos.motivoDevolucao.value
        };
    }

    function atualizarCalculo() {
        aprovar.disabled = true;
        devolver.disabled = !campos.motivoDevolucao.value.trim() || salvando || decidindo;
        if (!opAbertaId) return;
        const op = opsPorId.get(opAbertaId);
        if (!op || !op.conferencia_expedicao) return;
        try {
            const rascunho = window.SITE.expedicao.prepararRascunho(
                op.conferencia_expedicao, valoresFormulario()
            );
            calculo.textContent = rascunho.quantidade_faltante === null
                ? 'Informe a quantidade recebida para calcular a diferença.'
                : 'Faltantes: ' + rascunho.quantidade_faltante + '.';
            mostrarErro('');
            if (rascunho.quantidade_recebida !== null &&
                rascunho.quantidade_aprovada !== null &&
                rascunho.quantidade_refugada !== null) {
                window.SITE.expedicao.validarConferencia(rascunho);
                calculo.textContent += ' Quantidades consistentes.';
                aprovar.disabled = salvando || decidindo;
            }
        } catch (erro) {
            mostrarErro(erro.message);
        }
    }

    function atualizarAcoesDepoisDeSalvar() {
        const erroAtual = erroFormulario.hidden ? '' : erroFormulario.textContent;
        atualizarCalculo();
        if (erroAtual) mostrarErro(erroAtual);
    }

    function fecharPainel() {
        opAbertaId = null;
        painel.hidden = true;
        formulario.reset();
        calculo.textContent = '';
        mostrarErro('');
    }

    function abrirPainel(op) {
        const dados = op.conferencia_expedicao;
        opAbertaId = op.id;
        titulo.textContent = 'Conferência da OP ' + (op.lote || op.id);
        resumo.textContent = (op.descricao || 'Sem descrição') +
            ' — responsável: ' + (dados.conferido_por_nome || dados.conferido_por_cpf);
        campos.prevista.value = dados.quantidade_prevista;
        campos.recebida.value = dados.quantidade_recebida === null ? '' : dados.quantidade_recebida;
        campos.aprovada.value = dados.quantidade_aprovada === null ? '' : dados.quantidade_aprovada;
        campos.refugada.value = dados.quantidade_refugada === null ? '' : dados.quantidade_refugada;
        campos.observacoes.value = dados.observacoes || '';
        campos.motivoDevolucao.value = dados.motivo_devolucao || '';
        painel.hidden = false;
        atualizarCalculo();
        painel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }

    function instanteSaida(op) {
        const data = op.data_saida_producao;
        return data && typeof data.toMillis === 'function' ? data.toMillis() : 0;
    }

    function adicionarCelula(linha, valor) {
        const celula = document.createElement('td');
        celula.textContent = String(valor);
        linha.appendChild(celula);
        return celula;
    }

    function renderizar(snapshot) {
        const pendentes = [];
        const emConferencia = [];
        const devolvidas = [];
        let despachadas = 0;
        const novosDados = new Map();

        snapshot.forEach(function(doc) {
            const op = { id: doc.id, ...doc.data() };
            novosDados.set(op.id, op);
            if (op.status === 'aguardando_expedicao') pendentes.push(op);
            else if (op.status === 'em_conferencia') emConferencia.push(op);
            else if (op.status === 'devolvido_cdf') devolvidas.push(op);
            else if (op.status === 'finalizado') despachadas++;
        });
        opsPorId = novosDados;

        if (opAbertaId) {
            const aberta = opsPorId.get(opAbertaId);
            if (!aberta || aberta.status !== 'em_conferencia' ||
                !aberta.conferencia_expedicao ||
                aberta.conferencia_expedicao.conferido_por_cpf !== cpfAtual()) {
                fecharPainel();
                avisar('A OP aberta mudou de estado ou responsável. Consulte a lista atualizada.');
            }
        }

        const ops = pendentes.concat(emConferencia, devolvidas);
        ops.sort(function(a, b) {
            return instanteSaida(a) - instanteSaida(b) || a.id.localeCompare(b.id);
        });
        totalProntas.textContent = String(pendentes.length);
        totalConferencia.textContent = String(emConferencia.length);
        totalDevolvidas.textContent = String(devolvidas.length);
        totalDespachadas.textContent = String(despachadas);
        lista.replaceChildren();

        if (ops.length === 0) {
            lista.textContent = 'Nenhuma OP na Expedição no momento.';
            return;
        }

        const tabela = document.createElement('table');
        tabela.className = 'tabela-estoque';
        const cabecalho = document.createElement('thead');
        const linhaCabecalho = document.createElement('tr');
        ['Lote', 'Modelo', 'Descrição', 'Qtd', 'Saída Produção', 'Situação', 'Ações']
            .forEach(function(texto) {
                const coluna = document.createElement('th');
                coluna.textContent = texto;
                linhaCabecalho.appendChild(coluna);
            });
        cabecalho.appendChild(linhaCabecalho);
        tabela.appendChild(cabecalho);

        const corpo = document.createElement('tbody');
        ops.forEach(function(op) {
            const linha = document.createElement('tr');
            const data = op.data_saida_producao;
            const dataSaida = data && typeof data.toDate === 'function'
                ? data.toDate().toLocaleString('pt-BR') : '—';
            adicionarCelula(linha, op.lote || '—');
            adicionarCelula(linha, op.modelo || '—');
            adicionarCelula(linha, op.descricao || '—');
            adicionarCelula(linha, op.quantidade_total ?? '—');
            adicionarCelula(linha, dataSaida);
            const situacao = op.status === 'em_conferencia' ? 'Em conferência'
                : op.status === 'devolvido_cdf' ? 'Devolvida ao CDF'
                    : 'Aguardando conferência';
            const statusCelula = adicionarCelula(linha, situacao);
            if (op.status === 'devolvido_cdf' && op.devolucao_cdf) {
                const motivo = document.createElement('small');
                motivo.className = 'exp-status-motivo';
                motivo.textContent = op.devolucao_cdf.motivo || '';
                statusCelula.appendChild(motivo);
            }

            const acoes = document.createElement('td');
            const botao = document.createElement('button');
            botao.type = 'button';
            botao.className = 'btn-acao-op';
            if (op.status === 'aguardando_expedicao') {
                botao.textContent = 'Iniciar conferência';
                botao.addEventListener('click', function() {
                    window.iniciarConferencia(op.id);
                });
            } else if (op.status === 'em_conferencia' && op.conferencia_expedicao &&
                op.conferencia_expedicao.conferido_por_cpf === cpfAtual()) {
                botao.textContent = 'Retomar conferência';
                botao.addEventListener('click', function() {
                    window.retomarConferencia(op.id);
                });
            } else if (op.status === 'devolvido_cdf') {
                botao.textContent = 'Aguardando correção do CDF';
                botao.disabled = true;
            } else {
                botao.textContent = 'Em conferência com ' +
                    ((op.conferencia_expedicao &&
                        op.conferencia_expedicao.conferido_por_nome) || 'outro colaborador');
                botao.disabled = true;
            }
            acoes.appendChild(botao);
            linha.appendChild(acoes);
            corpo.appendChild(linha);
        });
        tabela.appendChild(corpo);
        lista.appendChild(tabela);
    }

    function buscarResponsavel() {
        const cpf = cpfAtual();
        if (!cpf) return Promise.reject(new Error('Faça login para iniciar a conferência.'));
        return db.collection('usuarios').doc(cpf).get().then(function(doc) {
            if (!doc.exists) throw new Error('Usuário não encontrado.');
            const dados = doc.data();
            if (dados.ativo === false) {
                throw new Error('Seu cadastro está inativo.');
            }
            if (!['Administrativo', 'todos'].includes(dados.setor)) {
                throw new Error('Seu setor não pode conferir esta OP.');
            }
            return { cpf: cpf, nome: dados.nome || cpf };
        });
    }

    window.iniciarConferencia = function(opId) {
        if (iniciando) return Promise.resolve();
        iniciando = true;
        avisar('');
        return buscarResponsavel().then(function(usuario) {
            const ref = db.collection('producao').doc(opId);
            return db.runTransaction(function(transaction) {
                return transaction.get(ref).then(function(doc) {
                    if (!doc.exists || doc.data().status !== 'aguardando_expedicao') {
                        throw new Error('Esta OP já foi assumida ou mudou de estado.');
                    }
                    window.SITE.expedicao.validarTransicao(
                        doc.data().status, 'em_conferencia'
                    );
                    const dados = doc.data();
                    const rascunho = window.SITE.expedicao.criarRascunho(dados, usuario);
                    rascunho.data_inicio = firebase.firestore.FieldValue.serverTimestamp();
                    transaction.update(ref, {
                        status: 'em_conferencia',
                        conferencia_expedicao: rascunho
                    });
                    return { id: opId, ...dados, status: 'em_conferencia',
                        conferencia_expedicao: rascunho };
                });
            });
        }).then(function(op) {
            opsPorId.set(op.id, op);
            abrirPainel(op);
        }).catch(function(erro) {
            avisar(erro.message);
            console.error('Erro ao iniciar conferência:', erro);
        }).finally(function() {
            iniciando = false;
        });
    };

    window.retomarConferencia = function(opId) {
        avisar('');
        return db.collection('producao').doc(opId).get().then(function(doc) {
            if (!doc.exists) throw new Error('OP não encontrada.');
            const op = { id: doc.id, ...doc.data() };
            if (op.status !== 'em_conferencia' || !op.conferencia_expedicao ||
                op.conferencia_expedicao.conferido_por_cpf !== cpfAtual()) {
                throw new Error('Esta conferência não está disponível para você.');
            }
            opsPorId.set(op.id, op);
            abrirPainel(op);
        }).catch(function(erro) {
            avisar(erro.message);
            console.error('Erro ao retomar conferência:', erro);
        });
    };

    window.salvarRascunhoConferencia = function() {
        if (!opAbertaId || salvando || decidindo) return Promise.resolve();
        salvando = true;
        salvar.disabled = true;
        aprovar.disabled = true;
        devolver.disabled = true;
        mostrarErro('');
        const opId = opAbertaId;
        const valores = valoresFormulario();
        const ref = db.collection('producao').doc(opId);
        return db.runTransaction(function(transaction) {
            return transaction.get(ref).then(function(doc) {
                if (!doc.exists || doc.data().status !== 'em_conferencia') {
                    throw new Error('A OP mudou de estado. Atualize a conferência.');
                }
                const op = doc.data();
                if (!op.conferencia_expedicao ||
                    op.conferencia_expedicao.conferido_por_cpf !== cpfAtual()) {
                    throw new Error('Esta conferência pertence a outro responsável.');
                }
                if (op.conferencia_expedicao.quantidade_prevista !== op.quantidade_total) {
                    throw new Error('A quantidade prevista da OP mudou. Revise a conferência.');
                }
                const rascunho = window.SITE.expedicao.prepararRascunho(
                    op.conferencia_expedicao, valores
                );
                transaction.update(ref, { conferencia_expedicao: rascunho });
                return rascunho;
            });
        }).then(function() {
            avisar('Rascunho salvo.');
        }).catch(function(erro) {
            mostrarErro(erro.message);
            console.error('Erro ao salvar conferência:', erro);
        }).finally(function() {
            salvando = false;
            salvar.disabled = false;
            atualizarAcoesDepoisDeSalvar();
        });
    };

    function decidirConferencia(destino) {
        if (!opAbertaId || salvando || decidindo) return Promise.resolve();
        const motivo = campos.motivoDevolucao.value.trim();
        if (destino === 'devolvido_cdf' && !motivo) {
            mostrarErro('Informe o motivo para devolver a OP ao CDF.');
            return Promise.resolve();
        }
        const valores = valoresFormulario();
        const cpf = cpfAtual();
        if (!cpf) {
            mostrarErro('Faça login para concluir a conferência.');
            return Promise.resolve();
        }
        let divergencia = false;
        if (destino === 'finalizado') {
            try {
                const op = opsPorId.get(opAbertaId);
                const rascunho = window.SITE.expedicao.prepararRascunho(
                    op.conferencia_expedicao, valores
                );
                const conferida = window.SITE.expedicao.validarConferencia(rascunho);
                divergencia = conferida.quantidade_faltante > 0 ||
                    conferida.quantidade_refugada > 0;
            } catch (erro) {
                mostrarErro(erro.message);
                return Promise.resolve();
            }
        }
        const mensagem = destino === 'finalizado'
            ? 'Aprovar a conferência e autorizar o despacho desta OP?' +
                (divergencia ? '\nHá faltantes ou refugos registrados.' : '')
            : 'Devolver esta OP ao CDF para correção?';
        if (!confirm(mensagem)) return Promise.resolve();

        decidindo = true;
        salvar.disabled = true;
        aprovar.disabled = true;
        devolver.disabled = true;
        mostrarErro('');
        const opId = opAbertaId;
        const ref = db.collection('producao').doc(opId);
        return buscarResponsavel().then(function(usuario) {
            if (usuario.cpf !== cpf) throw new Error('A sessão mudou. Tente novamente.');
            return db.runTransaction(function(transaction) {
            return transaction.get(ref).then(function(doc) {
                if (!doc.exists) throw new Error('OP não encontrada.');
                const op = doc.data();
                window.SITE.expedicao.validarTransicao(op.status, destino);
                if (!op.conferencia_expedicao ||
                    op.conferencia_expedicao.conferido_por_cpf !== cpf ||
                    cpfAtual() !== cpf) {
                    throw new Error('Esta conferência pertence a outro responsável.');
                }
                if (op.conferencia_expedicao.quantidade_prevista !== op.quantidade_total) {
                    throw new Error('A quantidade prevista mudou. Revise a conferência.');
                }
                let conferencia = window.SITE.expedicao.prepararRascunho(
                    op.conferencia_expedicao, valores
                );
                if (destino === 'finalizado') {
                    conferencia = window.SITE.expedicao.validarConferencia(conferencia);
                    conferencia.motivo_devolucao = '';
                } else if (!conferencia.motivo_devolucao) {
                    throw new Error('Informe o motivo para devolver a OP ao CDF.');
                }
                const encerradaEm = new Date();
                const registro = Object.assign({}, conferencia, {
                    data_conclusao: encerradaEm,
                    resultado: destino === 'finalizado' ? 'aprovado' : 'devolvido_cdf'
                });
                const historico = Array.isArray(op.historico) ? op.historico.slice() : [];
                historico.push({
                    data: encerradaEm,
                    usuario_cpf: cpf,
                    acao: destino === 'finalizado'
                        ? 'expedicao_aprovada' : 'expedicao_devolvida',
                    detalhes: destino === 'finalizado'
                        ? 'Saída aprovada: ' + registro.quantidade_aprovada + ' peças aprovadas.'
                        : 'Devolvida ao CDF: ' + registro.motivo_devolucao
                });
                const anteriores = Array.isArray(op.conferencias_expedicao)
                    ? op.conferencias_expedicao.slice() : [];
                anteriores.push(registro);
                const atualizacao = {
                    status: destino,
                    conferencia_expedicao: registro,
                    conferencias_expedicao: anteriores,
                    historico: historico
                };
                if (destino === 'finalizado') {
                    atualizacao.data_despacho =
                        firebase.firestore.FieldValue.serverTimestamp();
                } else {
                    atualizacao.devolucao_cdf = {
                        motivo: registro.motivo_devolucao,
                        observacoes: registro.observacoes,
                        solicitado_por_cpf: cpf,
                        data_solicitacao: encerradaEm,
                        resolucao: null,
                        resolvido_em: null
                    };
                }
                transaction.update(ref, atualizacao);
            });
            });
        }).then(function() {
            fecharPainel();
            avisar(destino === 'finalizado'
                ? 'Saída aprovada e despacho registrado.'
                : 'OP devolvida ao CDF para correção.');
        }).catch(function(erro) {
            mostrarErro(erro.message);
            console.error('Erro ao concluir conferência:', erro);
        }).finally(function() {
            decidindo = false;
            salvar.disabled = false;
            atualizarAcoesDepoisDeSalvar();
        });
    }

    window.aprovarConferencia = function() {
        return decidirConferencia('finalizado');
    };

    window.devolverConferencia = function() {
        return decidirConferencia('devolvido_cdf');
    };

    window.carregarExpedicao = function() {
        if (cancelarEscuta) return;
        lista.textContent = 'Carregando...';
        cancelarEscuta = db.collection('producao')
            .where('status', 'in', [
                'aguardando_expedicao', 'em_conferencia', 'devolvido_cdf', 'finalizado'
            ])
            .onSnapshot(renderizar, function(erro) {
                console.error('Erro ao acompanhar a expedição:', erro);
                cancelarEscuta = null;
                lista.textContent = 'Erro ao carregar as OPs. Atualize a página para tentar novamente.';
            });
    };

    formulario.addEventListener('input', atualizarCalculo);
    formulario.addEventListener('submit', function(evento) {
        evento.preventDefault();
        window.salvarRascunhoConferencia();
    });
    document.getElementById('exp-fechar').addEventListener('click', fecharPainel);
    aprovar.addEventListener('click', window.aprovarConferencia);
    devolver.addEventListener('click', window.devolverConferencia);

    auth.onAuthStateChanged(function(usuario) {
        if (usuario) {
            window.carregarExpedicao();
        } else {
            if (cancelarEscuta) cancelarEscuta();
            cancelarEscuta = null;
            opsPorId.clear();
            fecharPainel();
            lista.replaceChildren();
        }
    });

    window.addEventListener('pageshow', function() {
        if (auth.currentUser) window.carregarExpedicao();
    });
    window.addEventListener('pagehide', function() {
        if (cancelarEscuta) cancelarEscuta();
        cancelarEscuta = null;
    });
});
