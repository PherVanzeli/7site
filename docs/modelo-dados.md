# MODELO DE DADOS — 7Site ERP (v9.0)

> Estrutura das coleções do Firestore (banco de dados NoSQL).

---

## Visão Geral

O 7Site utiliza **Firestore** (Firebase), um banco NoSQL baseado em **coleções** e **documentos**. Cada coleção agrupa documentos de um mesmo tipo. Cada documento tem um **ID único** (geralmente o CPF ou um código gerado automaticamente) e um conjunto de **campos**.

### Convenções

- **Nomes de coleções:** minúsculos, sem acento, no plural (`usuarios`, `producao`, `operacoes`).
- **Nomes de campos:** minúsculos, com underscore quando necessário (`tipo_usuario`, `data_cadastro`).
- **Datas:** armazenadas como `timestamp` do Firestore (formato nativo).
- **Documentos:** identificados por CPF (quando pessoa) ou ID automático (quando registro operacional).

---

## Coleções

### 1. `usuarios`

**Função:** Armazena os funcionários com acesso ao sistema (login e permissões).

**Documento:** `{cpf}` (ex: `12345678900`)

```json
{
  "nome": "MARIA DE FÁTIMA",
  "cpf": "12345678900",
  "cargo": "COSTUREIRA",
  "tipo_usuario": "funcionario",
  "setor": null,
  "ativo": true,
  "criado_por": "99999999999",
  "data_cadastro": "timestamp"
}
```

**Campos:**

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `nome` | string | Nome completo (maiúsculo) |
| `cpf` | string | CPF somente números |
| `cargo` | string | Cargo na empresa (maiúsculo) |
| `tipo_usuario` | string | `funcionario`, `subordinado` ou `superior` |
| `setor` | string/null | CDF, Administrativo, Financeiro, RH, Manutencao, TI, `todos` ou null |
| `ativo` | boolean | Se o funcionário pode logar |
| `criado_por` | string | CPF do usuário que criou o cadastro |
| `data_cadastro` | timestamp | Data de criação |

**Índice recomendado:** `setor` + `tipo_usuario` (para filtros da Sala do RH).

---

### 2. `pessoas`

**Função:** Cadastro único de pessoas físicas e jurídicas (fornecedores, clientes, funcionários externos).

**Documento:** ID automático do Firestore.

```json
{
  "tipo": "juridica",
  "nome": "TECIDOS MARTINS LTDA",
  "documento": "12345678000190",
  "data": "2010-05-20",
  "inscricao_estadual": "123456789",
  "telefones": ["(11) 99999-9999", "(11) 3333-3333"],
  "email": "contato@tecidosmartins.com.br",
  "endereco": {
    "cep": "01310-000",
    "logradouro": "AVENIDA PAULISTA",
    "numero": "1000",
    "complemento": "SALA 5",
    "bairro": "BELA VISTA",
    "cidade": "SÃO PAULO",
    "estado": "SP"
  },
  "data_cadastro": "timestamp",
  "data_atualizacao": "timestamp"
}
```

**Campos:**

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `tipo` | string | `fisica` (CPF) ou `juridica` (CNPJ) |
| `nome` | string | Nome completo ou Razão Social (maiúsculo) |
| `documento` | string | CPF ou CNPJ somente números |
| `data` | string | Data de nascimento ou fundação (YYYY-MM-DD) |
| `inscricao_estadual` | string | IE (só para jurídica) |
| `telefones` | array | Lista de telefones |
| `email` | string | E-mail (minúsculo) |
| `endereco` | map | Objeto com CEP, logradouro, número, etc. |
| `data_cadastro` | timestamp | Data de criação |
| `data_atualizacao` | timestamp | Data da última edição |

**Integração:** Consulta automática via BrasilAPI (CNPJ) e ViaCEP (CEP).

---

### 3. `estoque`

**Função:** Cadastro unificado de itens do estoque (interno e externo).

**Documento:** ID automático do Firestore.

```json
{
  "codigo": "EST-483920",
  "categoria": "interno",
  "propriedade": "confeccao",
  "nome": "LINHA 40 BRANCA",
  "material": "POLIÉSTER",
  "cor": "BRANCA",
  "tamanho": "40",
  "unidade": "ROLO",
  "observacoes": "",
  "quantidade_atual": 20,
  "quantidade_reservada": 0,
  "quantidade_minima": 5,
  "preco_custo_atual": 8.50,
  "fornecedor_habitual": "AVIAMENTOS SILVA",
  "data_cadastro": "timestamp",
  "data_atualizacao": "timestamp"
}
```

**Campos:**

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `codigo` | string | Código gerado automaticamente (`EST-` + timestamp) |
| `categoria` | string | `interno` ou `externo` |
| `propriedade` | string | `confeccao` para item comprado pela confecção ou `fornecedor` para item enviado pelo fornecedor |
| `nome` | string | Nome do item (maiúsculo) |
| `material` | string | Material (maiúsculo) — `N/A` se vazio |
| `cor` | string | Cor (maiúsculo) — `N/A` se vazio |
| `tamanho` | string | Tamanho/dimensão (maiúsculo) — `N/A` se vazio |
| `unidade` | string | UNIDADE, ROLO, CAIXA, METRO, KG, DÚZIA |
| `observacoes` | string | Campo livre |
| `quantidade_atual` | number | Saldo disponível para uso; também é mantido para aviamentos externos recebidos com o corte |
| `quantidade_reservada` | number | Saldo já comprometido com OPs em produção |
| `quantidade_minima` | number | Alerta de reposição (só interno) |
| `preco_custo_atual` | number | Último preço pago (só interno) |
| `fornecedor_habitual` | string | Fornecedor padrão (só interno) |
| `data_cadastro` | timestamp | Criação |
| `data_atualizacao` | timestamp | Última edição |

> **Nota:** Itens externos não têm `quantidade_minima`, `preco_custo_atual` nem `fornecedor_habitual`. Eles possuem `quantidade_atual` quando foram recebidos com um corte, pois precisam ser conferidos e reservados para a OP, embora permaneçam como propriedade do fornecedor.

> **Atualização v9.1:** itens externos recebidos com o corte também possuem `quantidade_atual`, pois são controlados para conferência e consumo, mas sua `propriedade` é `fornecedor`. A reserva de aviamentos no início da produção reduz o saldo disponível, incrementa `quantidade_reservada` e cria um registro em `movimentacoes_estoque`.

### `movimentacoes_estoque`

**Função:** Histórico das reservas e futuras entradas, baixas, devoluções e ajustes do estoque.

```json
{
  "estoque_id": "docIdEstoque",
  "op_id": "docIdProducao",
  "tipo": "consumo_etapa",
  "quantidade": 400,
  "unidade": "UN",
  "propriedade_item": "fornecedor",
  "usuario_cpf": "12345678900",
  "data_movimentacao": "timestamp"
}
```

**Índice recomendado:** `categoria` + `nome`.

---

### 4. `entradas_corte`

**Função:** Registro da entrada de NF/Ordem de Corte. Cada entrada gera uma OP automaticamente.

**Documento:** ID automático do Firestore.

```json
{
  "numero_nf": "12345",
  "serie_nf": "1",
  "data_emissao_nf": "2026-09-13",
  "valor_nf": 5000.00,
  "chave_acesso_nf": "3579...",
  "fornecedor_id": "docId",
  "fornecedor_nome": "TECIDOS MARTINS LTDA",
  "fornecedor_documento": "12345678000190",
  "numero_ordem_corte": "OC-2026-001",
  "modelo": "RL-9001",
  "descricao_peca": "CALÇA MASCULINA SARJA CHINO",
  "quantidade_total": 400,
  "recortes": [
    { "nome": "BOLSO RELÓGIO", "qtd_por_peca": 2 }
  ],
  "aviamentos_externos": [
    {
      "item_id": "docIdEstoque",
      "nome": "ZÍPER METAL PRETO 15CM",
      "material": "METAL",
      "cor": "PRETO",
      "tamanho": "15CM",
      "quantidade": 400,
      "unidade": "UN"
    }
  ],
  "status": "recebido",
  "registrado_por_cpf": "12345678900",
  "op_id": "docIdProducao",
  "data_entrada": "timestamp"
}
```

**Campos principais:**

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `numero_nf` | string | Número da Nota Fiscal |
| `serie_nf` | string | Série da NF |
| `data_emissao_nf` | string | Data de emissão (YYYY-MM-DD) |
| `valor_nf` | number | Valor total da NF |
| `chave_acesso_nf` | string | Chave de 44 dígitos (opcional) |
| `fornecedor_id` | string | ID do documento em `pessoas` |
| `fornecedor_nome` | string | Razão Social do fornecedor |
| `fornecedor_documento` | string | CNPJ do fornecedor |
| `numero_ordem_corte` | string | Número da OC (vira o lote da OP) |
| `modelo` | string | Código do modelo/fornecedor |
| `descricao_peca` | string | Descrição da peça |
| `quantidade_total` | number | Total de peças |
| `recortes` | array | Lista de recortes (nome + qtd/peça) |
| `aviamentos_externos` | array | Lista de aviamentos que vieram com o corte |
| `status` | string | `recebido` |
| `registrado_por_cpf` | string/null | CPF de quem registrou |
| `op_id` | string | ID da OP gerada |
| `data_entrada` | timestamp | Data/hora do registro |

---

### 5. `operacoes`

**Função:** Biblioteca técnica de operações (ações atômicas executadas na produção).

**Documento:** ID automático do Firestore.

```json
{
  "codigo": "OP-001",
  "nome": "REFILAGEM",
  "data_cadastro": "timestamp"
}
```

**Campos:**

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `codigo` | string | Código gerado automaticamente |
| `nome` | string | Nome da operação (maiúsculo) |
| `data_cadastro` | timestamp | Data de criação |

---

### 6. `maquinas`

**Função:** Cadastro de máquinas disponíveis na fábrica.

**Documento:** ID automático do Firestore.

```json
{
  "nome": "OVERLOQUE",
  "data_cadastro": "timestamp"
}
```

**Campos:**

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `nome` | string | Nome da máquina (maiúsculo) |
| `data_cadastro` | timestamp | Data de criação |

---

### 7. `equipamentos`

**Função:** Cadastro de aparelhos acopláveis às máquinas.

**Documento:** ID automático do Firestore.

```json
{
  "nome": "APARELHO DE VIÉS 35MM",
  "data_cadastro": "timestamp"
}
```

**Campos:**

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `nome` | string | Nome do equipamento (maiúsculo) |
| `data_cadastro` | timestamp | Data de criação |

---

### 8. `modos_execucao`

**Função:** Cadastro de modos de execução (Tradicional, Automatizada, Manual).

**Documento:** ID automático do Firestore.

```json
{
  "nome": "TRADICIONAL",
  "data_cadastro": "timestamp"
}
```

**Campos:**

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `nome` | string | Nome do modo (maiúsculo) |
| `data_cadastro` | timestamp | Data de criação |

---

### 9. `setores_execucao`

**Função:** Cadastro de setores onde operações são executadas.

> **Nota:** coleção **não usada pelo código** atualmente (mantida para evolução futura).

**Documento:** ID automático do Firestore.

```json
{
  "nome": "CDF",
  "data_cadastro": "timestamp"
}
```

**Campos:**

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `nome` | string | Nome do setor (maiúsculo) |
| `data_cadastro` | timestamp | Data de criação |

---

### 10. `producao`

**Função:** Ordens de Produção (OPs) geradas a partir das entradas de corte.

**Documento:** ID automático do Firestore.

```json
{
  "entrada_id": "docIdEntradaCorte",
  "lote": "OC-2026-001",
  "descricao": "CALÇA MASCULINA SARJA CHINO",
  "modelo": "RL-9001",
  "quantidade_total": 400,
  "recortes": [
    { "nome": "DIANTEIRO", "qtd_por_peca": 2 }
  ],
  "aviamentos_externos": [
    { "item_id": "docIdEstoque", "nome": "ZÍPER METAL PRETO 15CM", "quantidade": 400, "unidade": "UN" }
  ],
  "aviamentos_internos_reservados": [],
  "fluxograma_id": null,
  "fluxograma_nome": null,
  "modulos_fluxograma": [],
  "progresso": 0,
  "encarregado": "",
  "status": "aguardando_fluxograma",
  "data_entrada_producao": null,
  "data_inicio_execucao": null,
  "data_fim_execucao": null,
  "data_saida_producao": null,
  "data_despacho": null,
  "historico": []
}
```

**Campos:**

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `entrada_id` | string | Referência a `entradas_corte/{id}` (origem do corte) |
| `lote` | string | Lote/OC de origem |
| `descricao` | string | Descrição da peça |
| `modelo` | string | Código do modelo |
| `quantidade_total` | number | Total de peças |
| `recortes` | array | Recortes do corte (`nome`, `qtd_por_peca`) — editáveis na OP |
| `aviamentos_externos` | array | Aviamentos vinculados (`item_id`, `nome`, `quantidade`, `unidade`) |
| `aviamentos_internos_reservados` | array | Previsto, não usado |
| `fluxograma_id` | string/null | Fluxograma vinculado |
| `fluxograma_nome` | string/null | Nome do fluxograma (cache) |
| `modulos_fluxograma` | array | Snapshot dos módulos/etapas em execução — ver "Etapa da OP" |
| `progresso` | number | Progresso da OP |
| `encarregado` | string | Encarregado responsável |
| `status` | string | Status atual da OP |
| `data_entrada_producao` | timestamp/null | Início da produção (ao vincular fluxograma) |
| `data_inicio_execucao` | timestamp/null | Primeira etapa iniciada |
| `data_fim_execucao` | timestamp/null | Última etapa concluída |
| `data_saida_producao` | timestamp/null | Fim da produção (quando o CDF conclui todas as etapas) |
| `data_despacho` | timestamp/null | Saída da fábrica (quando a expedição autoriza) |
| `historico` | array | `{ data, usuario_cpf, acao, detalhes, autorizacao }` |

> **Legado (gravado mas não lido):** `operacoes_executadas`, `quantidade_finalizada`, `quantidade_refugada`, `quantidade_sobra`.

**Status possíveis:**

- `aguardando_fluxograma` — sem fluxograma vinculado
- `em_producao` — CDF executando as etapas
- `aguardando_expedicao` — produção concluída, aguardando despacho
- `finalizado` — expedição autorizou a saída
- `faturado` — financeiro faturou
- `recebido_parcial` / `recebido_total` — recebimento

**Índice recomendado:** `status` + `data_entrada_producao`.

**Etapa da OP (`modulos_fluxograma[].etapas[]`):**

```json
{
  "nome_etapa": "APLICAR FAIXA NA MANGA",
  "recorte": "MANGA",
  "operacao": "APLICAR FAIXA",
  "maquina": "RETA",
  "equipamento": "NENHUM",
  "tempo_segundos": 45,
  "insumos": [ "..." ],

  "status": "em_andamento",
  "data_inicio": "timestamp",
  "data_fim": null,

  "operador_cpf": "12345678900",
  "operador_nome": "JOÃO DA SILVA",
  "operador_fim_cpf": null,
  "operador_fim_nome": null,
  "maquina_real": "RETA",
  "fonte": "manual",

  "eventos": [
    {
      "tipo": "iniciada",
      "operador_cpf": "12345678900",
      "operador_nome": "JOÃO DA SILVA",
      "timestamp": "2026-09-20T14:30:00.000Z",
      "maquina_real": "RETA",
      "fonte": "manual",
      "motivo": null
    }
  ]
}
```

**Status da etapa:** `pendente` · `em_andamento` · `concluida`.

**Campos de autoria:**

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `operador_cpf` / `operador_nome` | string/null | Quem **assumiu** a etapa (evento `iniciada`/`retomada`) |
| `operador_fim_cpf` / `operador_fim_nome` | string/null | Quem **concluiu** (evento `concluida`) |
| `maquina_real` | string/null | Máquina usada de fato (default = `maquina` planejada) |
| `fonte` | string | `manual` · `qr` · `sensor` · `robot` — como o evento foi capturado |

**Evento (`eventos[]`) — log completo:**

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `tipo` | string | `iniciada` · `pausada` · `retomada` · `concluida` · `retrabalho` |
| `operador_cpf` / `operador_nome` | string/null | Quem gerou o evento |
| `timestamp` | string | Momento do evento |
| `maquina_real` | string/null | Máquina no momento do evento |
| `fonte` | string | `manual` · `qr` · `sensor` · `robot` |
| `motivo` | string/null | Motivo (para `pausada`/`retrabalho`) |

> **Nota:** os campos planos (`status`, `operador_*`, `data_inicio`, `data_fim`) são um **cache do último evento**; `eventos[]` preserva o histórico completo. Etapas de OPs antigas não têm esses campos — a leitura é defensiva (`|| null`).

---


### 11. `financeiro`

**Função:** Lançamentos de contas a pagar e a receber.

**Documento:** ID automático do Firestore.

```json
{
  "tipo": "saida",
  "categoria": "TECIDO",
  "descricao": "COMPRA DE MALHA FRIA",
  "valor": 1500.00,
  "data_vencimento": "2026-09-20",
  "data_pagamento": null,
  "status": "pendente",
  "data_cadastro": "timestamp"
}
```

**Campos:**

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `tipo` | string | `entrada` ou `saida` |
| `categoria` | string | Tecido, Salário, Energia, Venda Loja, etc. |
| `descricao` | string | Descrição do lançamento (maiúsculo) |
| `valor` | number | Valor em R$ |
| `data_vencimento` | string | Data (YYYY-MM-DD) |
| `data_pagamento` | string/null | Data em que foi quitado |
| `status` | string | `pendente` ou `pago` |
| `data_cadastro` | timestamp | Criação |

**Índice recomendado:** `status` + `data_vencimento`.

---
### 12. `configuracoes`

**Função:** Dados da empresa e preferências do sistema. Usa dois documentos fixos.

**Documento 1:** `empresa`

```json
{
  "nome": "7ETE7",
  "cnpj": "12345678000190",
  "telefone": "(11) 99999-9999",
  "email": "contato@7ete7.com.br",
  "endereco": "RUA DAS MÁQUINAS, 123 - SÃO PAULO/SP",
  "data_atualizacao": "timestamp"
}
```

**Documento 2:** `preferencias`

```json
{
  "maiusculo": true,
  "notificacoes": false,
  "fuso": "America/Sao_Paulo",
  "data_atualizacao": "timestamp"
}
```

---

### 13. `recortes`

**Função:** Cadastro de recortes (componentes físicos do corte) usados como insumo nas etapas do fluxograma.

**Documento:** ID automático do Firestore.

```json
{
  "nome": "DIANTEIRO",
  "data_cadastro": "timestamp"
}
```

**Campos:** `nome` (string, maiúsculo) · `data_cadastro` (timestamp).

---

### 14. `modulos`

**Função:** Blocos de montagem reutilizáveis (ex.: MANGA, GOLA) compostos por etapas. Servem de biblioteca para montar fluxogramas.

**Documento:** ID automático do Firestore.

```json
{
  "nome": "MANGA",
  "descricao": "MÓDULO DE MANGA COM PUNHO",
  "etapas": [
    {
      "nome_etapa": "APLICAR FAIXA NA MANGA",
      "recorte": "MANGA",
      "operacao": "APLICAR FAIXA",
      "maquina": "RETA",
      "equipamento": "NENHUM",
      "tempo_segundos": 45,
      "observacoes": "",
      "permite_paralelo": false,
      "insumos": [
        { "tipo": "recorte", "nome": "DIANTEIRO", "quantidade": 2, "unidade": "UN" },
        { "tipo": "aviamento", "nome": "LINHA 40 BRANCA", "quantidade": 0.20, "unidade": "MT" }
      ]
    }
  ],
  "data_cadastro": "timestamp",
  "data_atualizacao": "timestamp"
}
```

**Etapa — campos:**

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `nome_etapa` | string | Nome curto usado no chão de fábrica |
| `recorte` | string | Recorte principal da etapa |
| `operacao` | string | Operação executada |
| `maquina` | string | Máquina utilizada |
| `equipamento` | string | Equipamento acoplado (`NENHUM` se vazio) |
| `tempo_segundos` | number | Tempo estimado |
| `permite_paralelo` | boolean | Permite execução em paralelo |
| `insumos` | array | Insumos consumidos pela etapa |

**Insumo (item de `insumos`):**

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `tipo` | string | `recorte` ou `aviamento` |
| `nome` | string | Nome do insumo (maiúsculo) |
| `quantidade` | number | Quantidade por peça (fração permitida) |
| `unidade` | string | `UN`, `MT`, `KG`, `ROLO` |
| `item_id` | string/null | ID do item no `estoque` (para baixa automática) |
| `estoque_categoria` | string/null | `interno` ou `externo` do item correspondente |

> **Nota:** `insumos` substitui os antigos campos `insumo_tipo`/`insumo_nome`/`insumo_quantidade`/`insumo_unidade`, mantidos apenas para leitura de dados legados (via `normalizarInsumos`).

> **Nota:** as etapas da biblioteca (`modulos.etapas[]`) **não** têm campos de runtime (`status`, `data_inicio`, `data_fim`, `operador_*`, `fonte`, `eventos[]`). Eles são adicionados quando o fluxograma é vinculado à OP — ver `producao.modulos_fluxograma[].etapas[]`.

---

### 15. `fluxogramas`

**Função:** Roteiro técnico completo de um modelo — snapshot dos módulos e etapas no momento do salvamento.

**Documento:** ID automático do Firestore.

```json
{
  "nome": "MACACÃO NR10",
  "categoria": "EPI",
  "variacao": "PADRÃO",
  "modulos": [
    { "modulo_id": "docId", "modulo_nome": "MANGA", "etapas": [ "..." ] }
  ],
  "total_tempo_segundos": 120,
  "total_modulos": 1,
  "total_operacoes": 3,
  "data_cadastro": "timestamp",
  "data_atualizacao": "timestamp"
}
```

**Campos:** `nome` (string) · `categoria` (string) · `variacao` (string) · `modulos` (array com `modulo_id`, `modulo_nome`, `etapas`) · `total_tempo_segundos` (number) · `total_modulos` (number) · `total_operacoes` (number) · `data_cadastro`/`data_atualizacao` (timestamp).

---

## Coleções Planejadas (Fase Futura)

| Coleção | Função |
| :--- | :--- |
| `movimentacoes` | Histórico de entradas e saídas de estoque |
| `recebimentos` | Registros de recebimento parcial de OPs faturadas |

---

## Relacionamentos Entre Coleções

| Relação | Como se dá |
| :--- | :--- |
| `producao.entrada_id` → `entradas_corte.{id}` | Uma OP nasce de uma entrada de corte (bidirecional: `entradas_corte.op_id` → `producao.{id}`) |
| `producao.fluxograma_id` → `fluxogramas.{id}` | Uma OP usa um fluxograma |
| `producao.aviamentos_externos[].item_id` → `estoque.{id}` | Aviamentos vinculados vêm do estoque |
| `producao.modulos_fluxograma[].etapas[].insumos[].item_id` → `estoque.{id}` | Insumos das etapas (baixa automática) |
| `modulos.etapas[].insumos[].item_id` → `estoque.{id}` | Insumos da biblioteca de módulos |
| `entradas_corte.fornecedor_id` → `pessoas.{id}` | Fornecedor do corte |
| `estoque.fornecedor_habitual` → `pessoas.nome` | Um item tem um fornecedor padrão |

---

## Regras de Segurança (Firestore Rules)

Atualmente configuradas como:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null;
      allow delete: if autenticado();
    }
  }
}
```

**Nota:** `delete` habilitado para usuários autenticados (consistente com os botões de exclusão do sistema).

---

*Última atualização: Setembro/2026*
