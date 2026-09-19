// ==========================================
// CORE - utils.js
// Utilitários compartilhados (sem dependências)
// ==========================================
window.SITE = window.SITE || {};
window.SITE.utils = window.SITE.utils || {};

window.maiusculo = function(valor) {
    if (!valor || typeof valor !== 'string') return valor;
    return valor.toUpperCase().trim();
};
window.SITE.utils.maiusculo = window.maiusculo;

window.validarCPF = function(cpf) {
    cpf = cpf.replace(/\D/g, '');
    if (cpf.length !== 11 || /^(\d)\1+$/.test(cpf)) return false;
    let soma = 0, resto;
    for (let i = 1; i <= 9; i++) soma += parseInt(cpf.substring(i - 1, i)) * (11 - i);
    resto = (soma * 10) % 11; if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(9, 10))) return false;
    soma = 0;
    for (let i = 1; i <= 10; i++) soma += parseInt(cpf.substring(i - 1, i)) * (12 - i);
    resto = (soma * 10) % 11; if (resto === 10 || resto === 11) resto = 0;
    if (resto !== parseInt(cpf.substring(10, 11))) return false;
    return true;
};
window.SITE.utils.validarCPF = window.validarCPF;

window.formatarTempo = function(segundos) {
    if (segundos < 60) return segundos + 's';
    const min = Math.floor(segundos / 60);
    const seg = segundos % 60;
    if (seg === 0) return min + 'min';
    return `${min}min ${seg}s`;
};
window.SITE.utils.formatarTempo = window.formatarTempo;

window.normalizarInsumos = function(etapa) {
    if (Array.isArray(etapa.insumos)) return etapa.insumos;
    if (etapa.insumo_tipo && etapa.insumo_tipo !== 'nenhum') {
        return [{
            tipo: etapa.insumo_tipo,
            nome: etapa.insumo_nome || '',
            quantidade: etapa.insumo_quantidade || 0,
            unidade: etapa.insumo_unidade || 'UN'
        }];
    }
    return [];
};
window.SITE.utils.normalizarInsumos = window.normalizarInsumos;
