Perfeito! Aqui está o `MODELO-DADOS.md` completo em um único bloco, pronto para copiar e colar.

---

**Crie o arquivo `docs/MODELO-DADOS.md` e cole o conteúdo abaixo:**

```markdown
# MODELO DE DADOS — 7Site ERP

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

**Função:** Cadastro de itens do estoque (interno e externo) e registro de entradas de corte.

> **Nota:** A coleção `estoque` acumula duas responsabilidades hoje. Na próxima fase será dividida em `estoque_itens` (biblioteca) e `entradas_corte` (movimentações).

**Documento (item de estoque):** ID automático do Firestore.

```json
{
  "codigo": "EST-001",
  "nome": "LINHA 40 BRANCA",
  "categoria": "interno",
  "material": "POLIÉSTER",
  "cor": "BRANCA",
  "tamanho": "40",
  "quantidade_atual": 20,
  "quantidade_minima": 5,
  "unidade": "ROLO",
  "preco_custo_atual": 8.50,
  "fornecedor_habitual": "AVIAMENTOS SILVA",
  "observacoes": "",
  "data_cadastro": "timestamp",
  "data_atualizacao": "timestamp"
}
```

**Campos:**

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `codigo` | string | Código gerado automaticamente |
| `nome` | string | Nome do item (maiúsculo) |
| `categoria` | string | `interno` ou `externo` |
| `material` | string | Material (maiúsculo) |
| `cor` | string | Cor (maiúsculo) |
| `tamanho` | string | Tamanho/dimensão |
| `quantidade_atual` | number | Saldo em estoque |
| `quantidade_minima` | number | Alerta de reposição (só interno) |
| `unidade` | string | ROLO, CAIXA, UNIDADE, METRO |
| `preco_custo_atual` | number | Último preço pago (só interno) |
| `fornecedor_habitual` | string | Fornecedor padrão |
| `observacoes` | string | Campo livre |
| `data_cadastro` | timestamp | Criação |
| `data_atualizacao` | timestamp | Última edição |

**Índice recomendado:** `categoria` + `nome`.

---

### 4. `operacoes`

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

### 5. `maquinas`

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

### 6. `equipamentos`

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

### 7. `modos_execucao`

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

### 8. `setores_execucao`

**Função:** Cadastro de setores onde operações são executadas.

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

### 9. `producao`

**Função:** Ordens de Produção (OPs) geradas a partir das entradas de corte.

**Documento:** ID automático do Firestore.

```json
{
  "estoque_id": "abc123",
  "lote": "NF 12345",
  "descricao": "CALÇA MASCULINA SARJA CHINO",
  "quantidade_total": 400,
  "aviamentos": [
    { "id": "xyz", "nome": "ZÍPER METAL PRETO 15CM", "quantidade": 400 }
  ],
  "fluxograma_id": null,
  "operacoes_executadas": [],
  "encarregado": "JOÃO DA SILVA",
  "status": "aguardando_fluxograma",
  "quantidade_finalizada": 0,
  "quantidade_refugada": 0,
  "quantidade_sobra": 0,
  "data_entrada_producao": "timestamp",
  "data_saida_producao": null
}
```

**Campos:**

| Campo | Tipo | Descrição |
| :--- | :--- | :--- |
| `estoque_id` | string | Referência à entrada de corte |
| `lote` | string | Lote/NF de origem |
| `descricao` | string | Descrição da peça |
| `quantidade_total` | number | Total de peças |
| `aviamentos` | array | Lista de aviamentos vinculados |
| `fluxograma_id` | string/null | Fluxograma escolhido pelo CDF |
| `operacoes_executadas` | array | Operações e seus status |
| `encarregado` | string | Encarregado responsável |
| `status` | string | Status atual da OP |
| `quantidade_finalizada` | number | Peças prontas |
| `quantidade_refugada` | number | Peças com defeito |
| `quantidade_sobra` | number | Peças não expedidas |
| `data_entrada_producao` | timestamp | Início |
| `data_saida_producao` | timestamp/null | Fim |

**Status possíveis:**

- `aguardando_fluxograma`
- `em_producao`
- `aguardando_expedicao`
- `aprovacao_pendente`
- `aguardando_financeiro`
- `faturado`
- `recebido_parcial`
- `recebido_total`

**Índice recomendado:** `status` + `data_entrada_producao`.

---

### 10. `financeiro`

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

### 11. `configuracoes`

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

## Coleções Planejadas (Fase Futura)

| Coleção | Função |
| :--- | :--- |
| `fluxogramas` | Roteiros técnicos por modelo (recorte + operação + máquina + tempo) |
| `movimentacoes` | Histórico de entradas e saídas de estoque |
| `recebimentos` | Registros de recebimento parcial de OPs faturadas |
| `recortes` | *(ou embutidos na entrada de corte)* Componentes físicos |

---

## Relacionamentos Entre Coleções

| Relação | Como se dá |
| :--- | :--- |
| `producao.estoque_id` → `estoque.{id}` | Uma OP nasce de uma entrada de corte |
| `producao.fluxograma_id` → `fluxogramas.{id}` | Uma OP usa um fluxograma |
| `usuarios.setor` → `setores_execucao.nome` | Um usuário pertence a um setor |
| `estoque.fornecedor_habitual` → `pessoas.nome` | Um item tem um fornecedor padrão |
| `producao.aviamentos[].id` → `estoque.{id}` | Aviamentos usados vêm do estoque |

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
      allow delete: if false;  // Exclusão só via console (auditoria)
    }
  }
}
```

**Nota:** `delete` desabilitado para preservar histórico. Exclusões são feitas manualmente no console do Firebase ou via função administrativa (futuro).

---

*Última atualização: Setembro/2026*
```

---

## Depois de salvar

1. Verifique se a pasta `docs` agora tem **3 arquivos**: `ESCOPO.md`, `ARQUITETURA.md` e `MODELO-DADOS.md`.
2. Abra o preview do `MODELO-DADOS.md` (Ctrl + Shift + V) e confira se as tabelas aparecem formatadas.

---

