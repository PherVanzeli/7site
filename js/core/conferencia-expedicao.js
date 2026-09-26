// Regras puras da conferencia da Expedicao.
window.SITE = window.SITE || {};
window.SITE.expedicao = window.SITE.expedicao || {};

window.SITE.expedicao.criarRascunho = function(op, usuario) {
    if (!op || !Number.isSafeInteger(op.quantidade_total) || op.quantidade_total <= 0) {
        throw new Error('A OP precisa ter uma quantidade total inteira e positiva.');
    }
    if (!usuario || !usuario.cpf || !usuario.nome) {
        throw new Error('Identifique o responsavel pela conferencia.');
    }
    return {
        quantidade_prevista: op.quantidade_total,
        quantidade_recebida: null,
        quantidade_aprovada: null,
        quantidade_refugada: null,
        quantidade_faltante: null,
        quantidade_excedente: null,
        observacoes: '',
        motivo_devolucao: '',
        conferido_por_cpf: usuario.cpf,
        conferido_por_nome: usuario.nome,
        data_inicio: null,
        data_conclusao: null,
        resultado: null
    };
};

window.SITE.expedicao.validarConferencia = function(conferencia) {
    if (!conferencia || typeof conferencia !== 'object') {
        throw new Error('Informe os dados da conferencia.');
    }
    [
        'quantidade_prevista',
        'quantidade_recebida',
        'quantidade_aprovada',
        'quantidade_refugada'
    ].forEach(function(campo) {
        const valor = conferencia[campo];
        if (!Number.isSafeInteger(valor) || valor < 0 ||
            (campo === 'quantidade_prevista' && valor === 0)) {
            throw new Error('Quantidade invalida: ' + campo + '.');
        }
    });
    const prevista = conferencia.quantidade_prevista;
    const recebida = conferencia.quantidade_recebida;
    const aprovada = conferencia.quantidade_aprovada;
    const refugada = conferencia.quantidade_refugada;
    if (recebida > prevista) {
        throw new Error('A quantidade recebida excede a prevista na OP.');
    }
    if (aprovada + refugada !== recebida) {
        throw new Error('A quantidade recebida deve ser igual a aprovadas mais refugadas.');
    }
    const faltante = prevista - recebida;
    const observacoes = typeof conferencia.observacoes === 'string'
        ? conferencia.observacoes.trim() : '';
    if ((faltante > 0 || refugada > 0) && !observacoes) {
        throw new Error('Informe uma observacao para a divergencia.');
    }
    return Object.assign({}, conferencia, {
        quantidade_faltante: faltante,
        quantidade_excedente: 0,
        observacoes: observacoes
    });
};

// Aceita campos ainda vazios para permitir salvar uma conferência interrompida.
// A validação completa é aplicada somente na decisão final.
window.SITE.expedicao.prepararRascunho = function(rascunho, campos) {
    if (!rascunho || !Number.isSafeInteger(rascunho.quantidade_prevista) ||
        rascunho.quantidade_prevista <= 0) {
        throw new Error('A quantidade prevista da OP é inválida.');
    }
    const resultado = Object.assign({}, rascunho);
    ['quantidade_recebida', 'quantidade_aprovada', 'quantidade_refugada']
        .forEach(function(campo) {
            const valor = campos[campo];
            if (valor !== null && (!Number.isSafeInteger(valor) || valor < 0)) {
                throw new Error('Quantidade inválida: ' + campo + '.');
            }
            resultado[campo] = valor;
        });
    if (resultado.quantidade_recebida !== null &&
        resultado.quantidade_recebida > resultado.quantidade_prevista) {
        throw new Error('A quantidade recebida excede a prevista na OP.');
    }
    resultado.quantidade_faltante = resultado.quantidade_recebida === null
        ? null : resultado.quantidade_prevista - resultado.quantidade_recebida;
    resultado.quantidade_excedente = resultado.quantidade_recebida === null ? null : 0;
    resultado.observacoes = typeof campos.observacoes === 'string'
        ? campos.observacoes.trim() : '';
    resultado.motivo_devolucao = typeof campos.motivo_devolucao === 'string'
        ? campos.motivo_devolucao.trim() : '';
    return resultado;
};

window.SITE.expedicao.validarTransicao = function(origem, destino) {
    const permitidas = {
        em_producao: ['aguardando_expedicao'],
        aguardando_expedicao: ['em_conferencia'],
        em_conferencia: ['finalizado', 'devolvido_cdf'],
        devolvido_cdf: ['aguardando_expedicao']
    };
    if (!permitidas[origem] || !permitidas[origem].includes(destino)) {
        throw new Error('Transição de status inválida: ' + origem + ' → ' + destino + '.');
    }
};

window.SITE.expedicao.prepararReenvioCDF = function(op, cpf, resolucao, data) {
    window.SITE.expedicao.validarTransicao(op && op.status, 'aguardando_expedicao');
    const texto = typeof resolucao === 'string' ? resolucao.trim() : '';
    if (!cpf || !texto) {
        throw new Error('Identifique o responsável e descreva a correção do CDF.');
    }
    const historico = Array.isArray(op.historico) ? op.historico.slice() : [];
    historico.push({
        data: data,
        usuario_cpf: cpf,
        acao: 'cdf_reenviou_expedicao',
        detalhes: 'Correção do CDF: ' + texto
    });
    return {
        status: 'aguardando_expedicao',
        devolucao_cdf: Object.assign({}, op.devolucao_cdf, {
            resolucao: texto,
            resolvido_por_cpf: cpf,
            resolvido_em: data
        }),
        historico: historico
    };
};
