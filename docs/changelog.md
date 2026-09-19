# CHANGELOG — 7Site ERP

Todas as mudanças relevantes do projeto são documentadas neste arquivo.

O formato segue o padrão [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/), organizado por data decrescente (mais recente no topo).

Tipos de mudança:
- **Adicionado** — novas funcionalidades
- **Modificado** — mudanças em funcionalidades existentes
- **Corrigido** — correção de bugs
- **Removido** — funcionalidades ou arquivos removidos
- **Pendente** — itens em desenvolvimento

---

## [Setembro/2026]

### [13/09/2026] — Segurança e Sincronização v9.0

**Adicionado**
- `firestore.rules` versionado (regras de segurança por coleção).
- Documentação (`docs/`) sincronizada com a versão 9.0 do sistema.

**Modificado**
- Firestore Rules: `delete` habilitado para usuários autenticados (elimina inconsistência com os botões de exclusão do sistema).

**Pendente**
- Evoluir o RBAC para Custom Claims (validação por setor no próprio Firestore).

---

### [12/09/2026] — Documentação e Refinamento de Operações

**Adicionado**
- Pasta `/docs` com documentação oficial do projeto.
- `docs/ESCOPO.md` — Visão geral, módulos e roadmap estratégico.
- `docs/ARQUITETURA.md` — Tecnologias, estrutura de pastas e fluxos.
- `docs/MODELO-DADOS.md` — Estrutura das coleções do Firestore.
- `docs/CHANGELOG.md` — Este arquivo.

**Modificado**
- Cadastro de Operações simplificado: apenas Código + Nome.
- Removidos campos `setor_execucao` e `nivel_dificuldade` da coleção `operacoes`.
- Documentação da visão de longo prazo adicionada (Industria 4.0).

---

### [11/09/2026] — Sidebar em Acordeão e Cadastro Implícito

**Adicionado**
- Sidebar em acordeão (submenu abre à direita no hover, abaixo no mobile).
- Índice de páginas na sidebar (Painel Inicial sempre visível).
- Cadastro implícito de máquinas, equipamentos, modos e setores.
- Padrão datalist + modal de confirmação para novos itens.

**Modificado**
- Estrutura do `script.js` consolidada na Versão 7.0.
- Aplicada regra de maiúsculo em todo o ERP.
- Removido o `nivel_dificuldade` do cadastro de operações.

**Corrigido**
- Erro de sintaxe no `script.js` (chave sobrando).
- Erro no carregamento do documento da OP (`op.html`).
- CNPJ da BrasilAPI apagando rua/bairro por conflito com ViaCEP.

---

### [10/09/2026] — Ciclo Completo da OP e Estoque Unificado

**Adicionado**
- Cadastro de Pessoas Físicas e Jurídicas com BrasilAPI + ViaCEP.
- Múltiplos telefones com botão "+" dinâmico.
- Inscrição Estadual (aparece só para CNPJ).
- Data de Nascimento/Fundação (label dinâmico).
- Botão de edição de cadastro.
- Confirmação antes de salvar.

**Modificado**
- Estoque unificado com categoria `interno` e `externo`.
- Definição do fluxo: Expedição → CDF → Expedição → Financeiro.

**Corrigido**
- Erro ao encerrar OP por permissão de `update` no Firestore.
- Erro de CPF digitado sem pontos/traço.
- Adicionado botão "Sair" no painel do usuário.

---

### [09/09/2026] — Módulo Financeiro

**Adicionado**
- Página `financeiro.html` com lançamentos.
- Categorias de receita e despesa.
- Cards de indicadores: Saldo, A Pagar, A Receber, Resultado do Mês.
- Botão "Marcar como Pago".
- Filtros por status e tipo.
- Exportação CSV (Pessoas, Estoque, OPs).

**Modificado**
- Firestore Rules atualizadas para permitir `update`.

---

### [08/09/2026] — Deploy e Ajustes Finais

**Adicionado**
- Primeiro deploy no Firebase Hosting.
- URL de produção ativa.

**Modificado**
- Menu CDF reorganizado com submenu.
- Separação visual entre site público e ERP.

---

### [07/09/2026] — Ciclo da OP

**Adicionado**
- Geração de Ordens de Produção (OPs).
- Documento da OP para impressão.
- Encerramento de OP (finalizadas, refugadas, sobras).
- Registro de data/hora de entrada e saída.
- Aviamentos vinculados ao documento da OP.

**Modificado**
- Status da OP: `em_producao` e `finalizado`.

---

### [06/09/2026] — Estoque e Produção

**Adicionado**
- Cadastro de Itens (Aviamentos) com taxonomia padronizada.
- Entrada de Estoque com checklist de aviamentos.
- Indicadores de estoque (cortes, aviamentos).
- Cadastro rápido de item no momento da entrada.

---

### [05/09/2026] — Sala do RH

**Adicionado**
- Cadastro de Funcionários (CPF, senha, setor, cargo, nível).
- Listagem de funcionários cadastrados.
- Validação de CPF (dígitos verificadores).
- Níveis de acesso: 1 (Funcionário), 2 (Gestor), 3 (RH), 4 (TI/Mestre).
- Proteção de rota do painel.

**Modificado**
- Login por CPF + Firebase Authentication.

---

### [04/09/2026] — Autenticação e Login

**Adicionado**
- Tela de login com Firebase Authentication.
- Painel do Usuário com nome dinâmico.
- Logout com limpeza de sessão.
- Proteção de rota (redireciona se não logado).

---

### [03/09/2026] — Portal de Notícias

**Adicionado**
- Portal de notícias estilo editorial (UOL/G1).
- Carrossel de destaques com autoplay.
- Editoria local "Quatiguá em Destaque".
- Central de Oportunidades (vagas da 7ete7 + parceiros).
- Grid de notícias compactas.
- Espaços publicitários reservados.

---

### [02/09/2026] — Loja Virtual e Vagas

**Adicionado**
- Página `loja.html` com vitrine de produtos.
- Página `produto.html` com detalhes e galeria.
- Prova social (comentários de redes sociais).
- Página `vagas.html` com formulário em etapas.
- Benefícios da empresa.

---

### [01/09/2026] — Fundação do Projeto

**Adicionado**
- Estrutura modular com `components/` (header, footer, sidebar).
- CSS consolidado em `css/style.css`.
- JavaScript central em `js/script.js`.
- Conexão com Firebase (`js/firebase.js`).
- Layout responsivo (desktop, tablet, mobile).
- Menu hambúrguer para mobile.
- Página de contato com mapa georreferenciado.

---

## Pendências Conhecidas

### Curto Prazo
- Upload de logo da empresa (aguardando Firebase Storage).
- Ativar/Inativar funcionário.
- Upload de holerites.
- Envio de atestados.

### Médio Prazo
- Montagem de fluxogramas por modelo.
- Vinculação de fluxograma à OP.
- Checklist de recortes na entrada de corte.
- Geração automática de OP ao registrar entrada.
- Baixa automática do estoque interno.

### Longo Prazo
- Integração com NF-e (API ou XML).
- Cálculo de custo real por OP.
- Relatórios de produtividade.
- Industria 4.0 (sensores nas máquinas).
- White Label completo para comercialização.

---

## Notas de Versão

- **Versão atual do `script.js`:** 7.0
- **URL de produção:** https://site-sistema-d6d2d.web.app
- **Projeto Firebase:** site-sistema-d6d2d
- **Repositório local:** C:\7site

---

*Última atualização: Setembro/2026*