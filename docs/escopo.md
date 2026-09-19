# ESCOPO — 7Site ERP

> ERP modular voltado para pequenas e médias confecções.

---

## Visão Geral

O **7Site** é um ERP modular desenvolvido inicialmente para a operação da confecção 7ete7 (dogfooding) e, posteriormente, comercializado para outras confecções de pequeno e médio porte.

O sistema é dividido em **4 módulos principais** e possui **características técnicas transversais** que os suportam.

---

## Módulos Principais

### 1. RH
Gestão de pessoas e permissões.

**Funcionalidades atuais:**
- Cadastro de funcionários (nome, CPF, cargo)
- Definição de tipo de usuário (funcionário, subordinado, superior)
- Definição de setor (CDF, Administrativo, Financeiro, RH, Manutenção, TI)
- Delegação em cascata (Mestre cria chefes de setor; chefes criam subordinados)
- Listagem filtrada por setor e tipo
- Plano B: compatibilidade com cadastros antigos

**Funcionalidades futuras:**
- Ativar/Inativar funcionário
- Upload de holerites
- Envio de atestados
- Painel pessoal (Meu Painel)

---

### 2. Administrativo / Expedição
Recepção, conferência e controle de materiais.

**Funcionalidades atuais:**
- Entrada de corte (NF/Lote, descrição da peça, quantidade)
- Checklist de aviamentos vinculados ao corte
- Cadastro rápido de itens no estoque (datalist + modal)
- Estoque unificado com categorias:
  - Interno (patrimônio da confecção, com preço de custo)
  - Externo (itens que vêm com o corte, apenas conferência)
- Biblioteca de itens (cadastro, edição, exclusão)
- Controle de preço de custo (histórico por movimentação)

**Funcionalidades futuras:**
- Autorizar Saída (conferência e despacho do produto final)
- Checklists de recortes do corte
- Geração automática de OP ao registrar entrada
- Baixa automática do estoque interno
- Alerta de estoque mínimo
- Relatórios de movimentação

---

### 3. CDF — Chão de Fábrica
Interpretação técnica e controle da produção.

**Funcionalidades atuais:**
- Biblioteca de operações (código + nome)
- Geração de Ordem de Produção (OP)
- Encerramento de OP (finalizadas, refugadas, sobras)
- Documento da OP (impressão)

**Funcionalidades futuras:**
- Cadastro de máquinas (Reta, Overloque, Galoneira...)
- Cadastro de equipamentos (Aparelho de viés, Aparelho de cós...)
- Cadastro de modos de execução (Tradicional, Automatizada, Manual)
- Montagem de fluxogramas por modelo
- Vinculação do fluxograma à OP
- Distribuição de tarefas por executante
- Acompanhamento de progresso por operação
- Relatórios de produtividade

---

### 4. Financeiro
Controle de contas a pagar e a receber.

**Funcionalidades atuais:**
- Lançamentos (entrada/saída)
- Categorias (tecido, salário, energia, venda loja, etc.)
- Saldo atual, a pagar, a receber, resultado do mês
- Marcar como pago
- Filtros por status e tipo
- Exportação de dados

**Funcionalidades futuras:**
- Faturamento de OP (com cálculo de custo)
- Recebimento parcial
- Múltiplas formas de pagamento (PIX, parcelado, cheque)
- Integração com NF-e (via API ou XML)
- Relatórios de fluxo de caixa

---

## Características Técnicas (Transversais)

Estas características **não são módulos**. Elas suportam todos os módulos:

- **Autenticação:** Login por CPF via Firebase Authentication
- **RBAC:** Controle de acesso baseado em setor + tipo de usuário
- **Dashboard:** Visão geral com atalhos por setor
- **Configurações:** Dados da empresa e preferências
- **Regra de maiúsculo:** Padronização de textos no ERP
- **Auditoria:** Histórico de ações (futuro)

---

## Site Institucional

Além do ERP, o 7Site possui um **site institucional público** que serve como cartão de visitas e canal de comunicação:

- Home
- Notícias (com editoria local "Quatiguá em Destaque")
- Loja virtual (vitrine)
- Trabalhe Conosco (ficha de inscrição)
- Contato (mapa + formulário)

Este site não faz parte do produto comercial. É exclusivo da 7ete7.

---

## Roadmap Estratégico

### Fase 1 — Operacional (atual)
Consolidar os 4 módulos principais, colocar em uso real na 7ete7 e validar com dados físicos.

### Fase 2 — Comercial (próxima)
Preparar o sistema para ser vendido a outras confecções:
- White Label (logo e dados personalizáveis)
- Onboarding facilitado
- Documentação para o cliente final

### Fase 3 — Indústria 4.0 (futuro)
Automatizar a coleta de dados de produção com tecnologia IoT:
- Sensores instalados nas máquinas de costura
- Contagem automática de peças produzidas
- Registro de tempo real por operação
- Dashboard de produção em tempo real
- Integração com o fluxograma (cada operação reporta automaticamente)

**Objetivo:** Eliminar a digitação manual no chão de fábrica e ter dados em tempo real de produtividade, gargalos e eficiência.

---

## Modelo de Comercialização

- **Formato:** SaaS (Software as a Service)
- **Público-alvo:** Pequenas e médias confecções
- **Modelo de cobrança:** A definir (assinatura mensal, por usuário, por volume de OPs)
- **Diferencial:** Foco no chão de fábrica + fluxograma técnico + rastreabilidade + futuro Industria 4.0

---

*Última atualização: Setembro/2026 — Versão 9.0*