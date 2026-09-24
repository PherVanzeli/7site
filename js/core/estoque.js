// ==========================================
// CORE - estoque.js
// Operações transacionais de estoque
// Depende de: firebase.js (db)
// ==========================================
window.SITE = window.SITE || {};
window.SITE.estoque = window.SITE.estoque || {};

window.SITE.estoque.propriedadePorCategoria = function(categoria) {
    return categoria === 'externo' ? 'fornecedor' : 'confeccao';
};

window.SITE.estoque.consumirInsumosEtapa = function(opId, etapa, quantidadePecas) {
    const itens = (Array.isArray(etapa.insumos) ? etapa.insumos : [])
        .filter(function(item) {
            return item.item_id &&
                item.estoque_categoria === 'interno' &&
                Number(item.quantidade) > 0;
        })
        .reduce(function(acumulado, item) {
            if (!acumulado[item.item_id]) {
                acumulado[item.item_id] = {
                    item_id: item.item_id,
                    nome: item.nome || '',
                    unidade: item.unidade || 'UN',
                    quantidade: 0
                };
            }
            acumulado[item.item_id].quantidade +=
                Number(item.quantidade) * Number(quantidadePecas || 0);
            return acumulado;
        }, {});

    const itensParaConsumir = Object.keys(itens).map(function(itemId) {
        return itens[itemId];
    }).filter(function(item) {
        return item.quantidade > 0;
    });

    if (itensParaConsumir.length === 0) {
        return Promise.resolve();
    }

    return db.runTransaction(function(transaction) {
        return Promise.all(itensParaConsumir.map(function(item) {
            return transaction.get(db.collection('estoque').doc(item.item_id));
        })).then(function(docs) {
            docs.forEach(function(doc, index) {
                const item = itensParaConsumir[index];
                if (!doc.exists) {
                    throw new Error('Insumo não encontrado no estoque: ' + item.nome);
                }

                const dados = doc.data();
                const saldo = Number(dados.quantidade_atual) || 0;
                if (saldo < item.quantidade) {
                    throw new Error(
                        'Saldo insuficiente para ' + (dados.nome || item.nome) +
                        ': disponível ' + saldo + ' ' + (dados.unidade || item.unidade) +
                        ', necessário ' + item.quantidade + ' ' + item.unidade + '.'
                    );
                }

                transaction.update(doc.ref, {
                    quantidade_atual: saldo - item.quantidade,
                    propriedade: dados.propriedade ||
                        window.SITE.estoque.propriedadePorCategoria(dados.categoria),
                    data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
                });

                transaction.set(db.collection('movimentacoes_estoque').doc(), {
                    estoque_id: doc.id,
                    op_id: opId,
                    tipo: 'consumo_etapa',
                    quantidade: item.quantidade,
                    unidade: dados.unidade || item.unidade,
                    propriedade_item: dados.propriedade ||
                        window.SITE.estoque.propriedadePorCategoria(dados.categoria),
                    usuario_cpf: firebase.auth().currentUser
                        ? firebase.auth().currentUser.email.split('@')[0]
                        : null,
                    data_movimentacao: firebase.firestore.FieldValue.serverTimestamp()
                });
            });
        });
    });
};

window.SITE.estoque.reservarAviamentosOP = function(opId, opData) {
    const itens = (opData.aviamentos_externos || [])
        .filter(function(item) {
            return item.item_id && Number(item.quantidade) > 0;
        })
        .reduce(function(acumulado, item) {
            if (!acumulado[item.item_id]) {
                acumulado[item.item_id] = {
                    item_id: item.item_id,
                    nome: item.nome || '',
                    unidade: item.unidade || 'UN',
                    quantidade: 0
                };
            }
            acumulado[item.item_id].quantidade += Number(item.quantidade);
            return acumulado;
        }, {});

    const itensParaReservar = Object.keys(itens).map(function(itemId) {
        return itens[itemId];
    });

    const itensSemCadastro = (opData.aviamentos_externos || [])
        .filter(function(item) {
            return !item.item_id && Number(item.quantidade) > 0;
        });
    if (itensSemCadastro.length > 0) {
        return Promise.reject(new Error(
            'Há aviamento sem cadastro no estoque: ' + itensSemCadastro[0].nome
        ));
    }

    if (itensParaReservar.length === 0) {
        return Promise.resolve();
    }

    const opRef = db.collection('producao').doc(opId);

    return db.runTransaction(function(transaction) {
        return transaction.get(opRef).then(function(opDoc) {
            if (!opDoc.exists) {
                throw new Error('OP não encontrada para reservar aviamentos.');
            }

            const opAtual = opDoc.data();
            if (opAtual.aviamentos_baixados) {
                return;
            }

            return Promise.all(itensParaReservar.map(function(item) {
                return transaction.get(db.collection('estoque').doc(item.item_id));
            })).then(function(docs) {
                const movimentos = [];

                docs.forEach(function(doc, index) {
                    const item = itensParaReservar[index];
                    if (!doc.exists) {
                        throw new Error('Aviamento não encontrado no estoque: ' + item.nome);
                    }

                    const dados = doc.data();
                    const saldo = Number(dados.quantidade_atual) || 0;
                    if (saldo < item.quantidade) {
                        throw new Error(
                            'Saldo insuficiente para ' + (dados.nome || item.nome) +
                            ': disponível ' + saldo + ' ' + (dados.unidade || item.unidade) +
                            ', necessário ' + item.quantidade + ' ' + item.unidade + '.'
                        );
                    }

                    const estoqueRef = doc.ref;
                    transaction.update(estoqueRef, {
                        quantidade_atual: saldo - item.quantidade,
                        quantidade_reservada: (Number(dados.quantidade_reservada) || 0) + item.quantidade,
                        propriedade: dados.propriedade ||
                            window.SITE.estoque.propriedadePorCategoria(dados.categoria),
                        data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    const movimentoRef = db.collection('movimentacoes_estoque').doc();
                    transaction.set(movimentoRef, {
                        estoque_id: doc.id,
                        op_id: opId,
                        tipo: 'reserva_producao',
                        quantidade: item.quantidade,
                        unidade: dados.unidade || item.unidade,
                        propriedade_item: dados.propriedade ||
                            window.SITE.estoque.propriedadePorCategoria(dados.categoria),
                        usuario_cpf: firebase.auth().currentUser
                            ? firebase.auth().currentUser.email.split('@')[0]
                            : null,
                        data_movimentacao: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    movimentos.push({
                        item_id: doc.id,
                        nome: dados.nome || item.nome,
                        quantidade: item.quantidade,
                        unidade: dados.unidade || item.unidade
                    });
                });

                transaction.update(opRef, {
                    aviamentos_baixados: true,
                    aviamentos_baixados_em: firebase.firestore.FieldValue.serverTimestamp(),
                    aviamentos_reservados: movimentos
                });
            });
        });
    });
};

window.SITE.estoque.concluirReservasOP = function(opId) {
    const opRef = db.collection('producao').doc(opId);

    return db.runTransaction(function(transaction) {
        return transaction.get(opRef).then(function(opDoc) {
            if (!opDoc.exists) {
                throw new Error('OP não encontrada para concluir as reservas.');
            }

            const opData = opDoc.data();
            if (!opData.aviamentos_baixados || opData.aviamentos_reservas_concluidas) {
                return;
            }

            const reservas = opData.aviamentos_reservados || [];
            return Promise.all(reservas.map(function(item) {
                return transaction.get(db.collection('estoque').doc(item.item_id));
            })).then(function(docs) {
                docs.forEach(function(doc, index) {
                    const reserva = reservas[index];
                    if (!doc.exists) {
                        throw new Error('Aviamento reservado não encontrado no estoque: ' + reserva.nome);
                    }

                    const dados = doc.data();
                    const reservado = Number(dados.quantidade_reservada) || 0;
                    if (reservado < Number(reserva.quantidade)) {
                        throw new Error(
                            'Reserva inconsistente para ' + (dados.nome || reserva.nome) + '.'
                        );
                    }

                    transaction.update(doc.ref, {
                        quantidade_reservada: reservado - Number(reserva.quantidade),
                        data_atualizacao: firebase.firestore.FieldValue.serverTimestamp()
                    });

                    transaction.set(db.collection('movimentacoes_estoque').doc(), {
                        estoque_id: doc.id,
                        op_id: opId,
                        tipo: 'consumo_reserva',
                        quantidade: Number(reserva.quantidade),
                        unidade: dados.unidade || reserva.unidade || 'UN',
                        propriedade_item: dados.propriedade ||
                            window.SITE.estoque.propriedadePorCategoria(dados.categoria),
                        usuario_cpf: firebase.auth().currentUser
                            ? firebase.auth().currentUser.email.split('@')[0]
                            : null,
                        data_movimentacao: firebase.firestore.FieldValue.serverTimestamp()
                    });
                });

                transaction.update(opRef, {
                    aviamentos_reservas_concluidas: true,
                    aviamentos_reservas_concluidas_em:
                        firebase.firestore.FieldValue.serverTimestamp()
                });
            });
        });
    });
};
