# ARQUITETURA — 7Site ERP

> Como o sistema está organizado por dentro.

---

## 1. Tecnologias Utilizadas

### Frontend
- **HTML5** — Estrutura das páginas.
- **CSS3** — Estilo e responsividade (arquivo único: `css/style.css`).
- **JavaScript (Vanilla)** — Lógica modular em `js/` (core, site, auth, modulos, fluxo).

### Backend / Serviços
- **Firebase Authentication** — Login por CPF (convertido em e-mail interno).
- **Firebase Firestore** — Banco de dados (NoSQL, em nuvem).
- **Firebase Hosting** — Hospedagem do site (deploy via CLI).
- **Firebase Storage** — Armazenamento de arquivos (futuro: holerites, logos).

### APIs Externas
- **BrasilAPI** — Consulta automática de CNPJ na Receita Federal (gratuita).
- **ViaCEP** — Consulta automática de endereço pelo CEP (gratuita).

### Ferramentas de Desenvolvimento
- **VS Code** — Editor de código.
- **Live Server** — Servidor local para testes.
- **Node.js + Firebase CLI** — Ferramentas de deploy.

---

## 2. Estrutura de Pastas

```
/7site
│
├── index.html               → Home (site institucional)
├── noticias.html            → Portal de notícias
├── loja.html                → Vitrine da loja virtual
├── contato.html             → Página de contato
├── vagas.html               → Trabalhe Conosco
│
├── login.html               → Tela de login
├── painel.html              → Painel pessoal do funcionário
├── dashboard.html           → Painel inicial do ERP (por setor)
│








├── admin.html               → Sala do RH
├── estoque.html             → Estoque (cadastro de itens)
├── entrada-corte.html       → Entrada de corte (gera OP automaticamente)
├── operacoes.html           → Biblioteca de operações
├── configuracoes.html       → Configurações do sistema
│
├── /docs
│   ├── ESCOPO.md            → O que o sistema faz
│   ├── ARQUITETURA.md       → Este arquivo
│   ├── MODELO-DADOS.md      → Coleções do Firestore
│   └── CHANGELOG.md         → Histórico de mudanças
│
├── /css
│   └── style.css            → Todos os estilos do projeto
│
├── /js
│   ├── firebase.js          → Conexão com Firebase (auth, db)
│   ├── /core                → Núcleo compartilhado (utils, menu, componentes, guard)
│   ├── /site                → Site público (contato, vagas, noticias)
│   ├── /auth                → Autenticação (login, painel)
│   ├── /modulos             → Módulos do ERP (rh, estoque, pessoas, op, ...)
│   ├── /fluxo               → Fluxograma (drag-and-drop)
│   └── /lib                 → Bibliotecas de terceiros (SortableJS)
│
├── /components
│   ├── header.html          → Cabeçalho do site público
│   ├── footer.html          → Rodapé
│   └── sidebar.html         → Menu lateral do ERP
│
└── /assets
    └── /img                 → Imagens (logo, produtos)
```

---

## 3. Componentes Modulares

O projeto usa **injeção de componentes** para evitar duplicação de código. As páginas HTML têm **divs vazias** que são preenchidas pelo JavaScript com o conteúdo dos componentes.

### Como funciona

Cada página interna tem:
```html
<div id="header-include"></div>
<div id="sidebar-include"></div>
<div id="footer-include"></div>
```

O `js/core/componentes.js` carrega os arquivos de `/components/` e injeta o conteúdo automaticamente via `fetch`.

### Por que isso importa

- **Alterar uma vez, refletir em todo o sistema:** Se mudarmos a logo no `header.html`, ela aparece em todas as páginas.
- **Manutenção simples:** Sem precisar abrir 15 arquivos para corrigir algo no menu.

---

## 4. Autenticação e Login

### Como o login funciona
1. O usuário digita o **CPF** e a **senha**.
2. O sistema converte o CPF em um e-mail fictício (`12345678900@7site.com.br`).
3. O Firebase Authentication valida as credenciais.
4. Se válido, o sistema busca os dados do usuário no Firestore.
5. Redireciona conforme o **tipo de usuário**:
   - Funcionário comum → `painel.html`
   - Subordinado/Superior/Mestre → `dashboard.html`

### Sessão
A sessão é mantida pelo próprio Firebase (`onAuthStateChanged`). Não há cookies manuais.

---

## 5. Hierarquia de Permissões (RBAC)

### Estrutura de Acesso

Cada usuário tem:
- **`tipo_usuario`:** `funcionario`, `subordinado` ou `superior`
- **`setor`:** CDF, Administrativo, Financeiro, RH, Manutenção, TI ou `todos` (Mestre)

### Regras de Visibilidade

| Tipo | Acesso |
| :--- | :--- |
| **Funcionário** | Apenas painel pessoal (sem ERP) |
| **Subordinado** | Área do seu setor (executa) |
| **Superior** | Área do seu setor (aprova e gerencia) |
| **Mestre** (`setor: 'todos'`) | Acesso total ao sistema |

### Delegação em Cascata

- **Mestre** cria chefes de setor.
- **Chefe de setor** cria subordinados do seu setor.
- **Subordinado** não gerencia usuários.

---

## 6. Fluxo do Chão de Fábrica (CDF)

O coração do sistema é o **fluxo da OP** (Ordem de Produção):

```
1. Expedição → Recebe corte, cadastra recortes e aviamentos
        ↓
2. Sistema → Gera OP automaticamente (status: 'aguardando_fluxograma')
        ↓
3. CDF → Monta o fluxograma (operações, máquinas, tempos)
        ↓
4. CDF → Status muda para 'em_producao'
        ↓
5. CDF → Encerra a OP (finalizadas, refugadas, sobras)
        ↓
6. Expedição → Confere e autoriza saída
        ↓
7. Financeiro → Fatura e acompanha recebimento
```

### Conceitos-chave

- **Peça:** Descrição do lote (vem da NF do fornecedor). Ex: "CALÇA MASCULINA SARJA CHINO".
- **Recorte:** Componente físico do corte. Ex: "BOLSO RELÓGIO".
- **Operação:** Ação técnica. Ex: "REFILAGEM".
- **Aviamento:** Material de costura. Ex: "ZÍPER METAL PRETO 15CM".
- **Fluxograma:** Roteiro completo (recorte + operação + máquina + tempo).

---

## 7. Estoque Unificado

Existe **uma única coleção de estoque**, com categorias:

| Categoria | Propriedade | Preço de custo? | Saldo? |
| :--- | :--- | :--- | :--- |
| **Interno** | Da confecção | Sim | Sim |
| **Externo** | Do fornecedor (veio com o corte) | Não | Apenas conferência |

---

## 8. Deploy

O site é hospedado no **Firebase Hosting**.

### Comando de deploy

```bash
firebase deploy
```

### URL de Produção
`https://site-sistema-d6d2d.web.app`

### Fluxo de Trabalho

- **Testes locais:** Live Server do VS Code.
- **Publicação:** Terminal do VS Code com o comando acima.

---

## 9. Convenções de Código

- **Texto em maiúsculo:** Função `maiusculo()` aplicada a todos os cadastros do ERP.
- **CSS:** Classes em português (`btn-primario`, `card-indicador`).
- **JavaScript:** Funções expostas via namespace `window.SITE.*`; `window.funcao` apenas quando chamadas inline no HTML.
- **Firestore:** Nomes de coleções em minúsculo, sem acento (`producao`, `operacoes`).

---

## 10. Pendências Técnicas Conhecidas

- Upload de logo da empresa (aguardando ativação do Firebase Storage).
- Ajuste de perfis e permissões editáveis (definição futura).
- Auditoria de logs (a implementar).
- Integração com NF-e (fase futura).
- Migrar globals de compatibilidade do ESLint (`window.X`) para `window.SITE.*` (gradual).

---

*Última atualização: Setembro/2026*
