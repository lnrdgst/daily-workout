# Sessões aeróbicas

## Auditoria e domínio

Antes, `WorkoutSessionDraft` e `WorkoutSessionHistory` representavam apenas A/B/C.
O provider já centralizava sessão ativa, persistência local e finalização. O layout
global já mantinha o Wake Lock, e a duração já era calculada por timestamps ISO.

A integração mantém esses componentes. Os tipos originais continuam representando
musculação; `ActiveSession` e `SessionHistory` são unions com os novos tipos cardio.
Registros antigos sem `type` continuam sendo musculação. Novos registros declaram
`type: 'strength'` ou `type: 'cardio'`. Não há migração, inclusão automática de campos
nos registros antigos ou mudança da chave `daily-workout-state`.

Uma única sessão fica ativa por vez. Visualizar uma modalidade não inicia sessão.
Cardio não substitui um treino ativo: a interface oferece retornar a ele. Ao iniciar,
`startedAt` é criado; ao confirmar a finalização, `finishedAt` é criado. A duração
usa esses timestamps, como na musculação. Cardio contínuo pode ser finalizado sem
campos opcionais ou tiros. O descarte explícito encerra sem adicionar histórico.

## Tiros

O planejamento contém `targetCount`, `durationSeconds` e `completedCount`.
`intervalEndAt` existe apenas no draft; não é salvo no registro histórico final.
Há atalhos de 30/45/60 segundos e duração personalizada inteira de 1 segundo a 24h.
O usuário inicia cada tiro; não há recuperação nem início automático do próximo.

“Remover tiros”, na edição, retorna ao modo contínuo sem mudar `startedAt` ou os
dados da atividade. Se existem tiros concluídos, é necessária confirmação para
descartar esses dados. Um timer de tiro ativo também é limpo. A sessão segue aberta.

O provider detecta o vencimento por `intervalEndAt - Date.now()`. Timeout, foco e
retorno à visibilidade verificam o mesmo estado. A UI apenas atualiza a exibição.
Conclusão e limpeza do timestamp são persistidas antes do alerta. Uma referência
adicional evita alerta duplicado na repetição de efeitos do Strict Mode. Ao reabrir,
um tiro vencido é contado uma vez; um já registrado não volta a alertar.

Marcação manual conclui um tiro e limpa seu timer. Cancelamento limpa somente o
timer. Desfazer reduz a última contagem quando não há tiro ativo. O limite planejado
é respeitado; aumentá-lo exige editar o planejamento. Finalizar com tiros pendentes
é permitido e salva a contagem realizada. Um tiro já vencido é contabilizado mesmo
se a confirmação da finalização ocorrer antes do callback do timer.

Som e vibração usam a camada existente de alertas. Notificações de cardio dizem
“Tiro concluído”; as mensagens e configurações existentes de descanso são preservadas.
As permissões e limitações do navegador continuam valendo, inclusive em background.

## Integrações preservadas

- O mesmo `useScreenWakeLock` atende ambas as sessões pela configuração existente.
- Cardio participa do histórico cronológico, dos accordions de mês/ano e da exclusão.
- Detalhes aeróbicos exibem somente os campos preenchidos, incluindo zero válido.
- Home e resumo em Ajustes consideram a última sessão de qualquer tipo.
- Sequência ABC, último treino A/B/C e autopreenchimento filtram somente musculação.
- Cardio não recebe percentual de progresso nem a regra de treino esquecido >=50%.
- Cardio aberto há pelo menos 2h possui recuperação própria: continuar, descartar
  ou informar horas/minutos para registrar. A duração manual deve ser de pelo menos
  1 minuto e não superar os minutos inteiros transcorridos. O término salvo é
  `startedAt + duração informada`, com `completionSource: 'stale-recovery'` opcional.
  Ausência do metadado continua compatível com registros normais/antigos.
  A detecção compartilha montagem, foco, visibilidade e deduplicação com musculação;
  a política e finalização de musculação permanecem iguais. Cancelar a duração
  retorna à decisão sem alterar o draft. Nenhum estado do modal é persistido.
  Tiros vencidos são resolvidos pelo relógio atual, independentemente do término
  recuperado, preservando a contagem mesmo se o callback ainda não executou.
- Cardio com duração inferior a 60 segundos é encerrado sem histórico, inclusive
  quando há tiros marcados. A confirmação informa o descarte; a regra de musculação
  permanece intacta. Confirmações de cardio contínuo não mencionam tiros.
- Home e Ajustes compartilham a data contextual do último treino: “Hoje · …” ou data completa.
- RestTimer, dados da ficha, séries, cargas, spinner, progresso e PWA não foram reescritos.

## Arquivos

Novos: `src/data/cardio.ts`, `src/utils/cardioSession.ts`, `src/utils/sessions.ts`,
`src/pages/CardioPage.tsx`, `src/components/CardioIntervals.tsx`,
`src/components/CardioHistoryDetails.tsx`, `tests/cardio.test.cjs`,
`tests/cardio.browser.cjs` e este documento.

Integração: `src/types/workout.ts`, `src/hooks/useWorkoutStore.tsx`,
`src/utils/storage.ts`, `src/utils/workoutSequence.ts`, `src/utils/restAlerts.ts`,
`src/components/AppLayout.tsx`, `src/components/ActiveWorkoutBar.tsx`,
`src/pages/HomePage.tsx`, `src/pages/WorkoutPage.tsx`, `src/pages/HistoryPage.tsx`,
`src/pages/SettingsPage.tsx` e `src/router.tsx`.

## Validação reproduzível

```text
npm run lint
npm run build
node --test tests/*.test.cjs
```

O teste de integração usa Chrome headless com perfil descartável. Para executá-lo,
inicie `npm run dev -- --host 127.0.0.1` e instale Playwright em uma pasta temporária:

```text
npm install --prefix dist/cardio-qa --no-save --package-lock=false playwright
node tests/cardio.browser.cjs
node tests/cardio-recovery.browser.cjs
```

Configure `TEST_BASE_URL` com a URL informada pelo Vite (padrão do teste: porta 5175).
`PLAYWRIGHT_MODULE` e `CHROME_PATH` permitem ajustar a instalação e o executável.
No PowerShell com restrição de scripts, use `npm.cmd`.

O teste usa estado local isolado, relógio controlado e simulações de Wake Lock,
vibração e notificações. Ele verifica integração e ciclo de vida, não o hardware
físico nem a audibilidade do som. Capturas mobile ficam em
`dist/cardio-qa/artifacts/`. Um novo build remove essa pasta temporária.
