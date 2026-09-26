# Homologação do fluxo CDF → Expedição

## Validação automatizada

Executar com Java 21 e dependências instaladas:

```sh
npm run lint
npm test
npm run test:rules
```

O último comando usa apenas o projeto local `demo-7site-regras`. O teste
`fluxo completo CDF, devolução, correção, reenvio e despacho` executa as
transições com os mesmos cálculos do cliente e valida as gravações pelas regras
do Firestore. Ele verifica também a ordem dos eventos e a preservação das duas
rodadas de conferência.

## Aceite operacional

Usar uma OP de teste e dois usuários ativos: um do setor CDF e outro do
Administrativo. Registrar o ID da OP e o resultado de cada passo. Se o teste
ocorrer no sistema de produção, identificar claramente a OP como teste antes de
criá-la; a aprovação registra um despacho definitivo.

| Passo | Ação | Resultado esperado |
| :--- | :--- | :--- |
| 1 | CDF conclui a última etapa da OP | Status `aguardando_expedicao`, com data de saída da produção; OP aparece na fila da Expedição sem recarregar a página |
| 2 | Administrativo inicia a conferência | Status `em_conferencia`; usuário e horário de início registrados |
| 3 | Mesmo usuário salva quantidades parciais e reabre a conferência | Rascunho recuperado com os valores salvos |
| 4 | Outro usuário do Administrativo tenta alterar a conferência | Alteração bloqueada; responsável original preservado |
| 5 | Responsável devolve a OP com motivo | Status `devolvido_cdf`; rodada arquivada e motivo visível ao CDF |
| 6 | CDF registra a correção e reenvia | Status `aguardando_expedicao`; resolução e evento de reenvio registrados |
| 7 | Administrativo inicia nova conferência e aprova as quantidades | Status `finalizado`, data de despacho registrada; duas rodadas e três eventos preservados |
| 8 | CDF tenta despachar diretamente ou Administrativo tenta aprovar sem conferência | Operações bloqueadas pelas regras |

O aceite termina quando os oito resultados forem observados no sistema
publicado e o ID da OP, os usuários de teste, a data e eventuais desvios forem
registrados pela equipe. Não usar uma OP real para essa validação.
