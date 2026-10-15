# Revisão da identidade visual — Daily Workout

Data: 15/10/2026.

A identidade laranja foi substituída por verde-água, com referência em
`#71AFA5`, para aproximação visual com o ecossistema Glicoponto. Nome,
ícone (desenho), tipografia, layout, espaçamentos e funcionalidades foram
preservados. Não foi adicionada dependência ou integração entre aplicativos.

## Investigação e implementação

- A paleta anterior estava em `tailwind.config.js`: `accent.500` (`#F97316`),
  `accent.400` (`#FB923C`) e `accent.300` (`#FDBA74`).
- O laranja também estava no `shadow.glow`, no gradiente de `src/styles.css`
  e no preenchimento dos três ícones SVG de `public/`.
- Os componentes usam tokens `accent`; não foi necessário alterar cada
  ocorrência de títulos, ícones, barras de progresso ou bordas.
- A nova fonte dos tokens é `:root` em `src/styles.css`, com canais RGB e
  mapeamento no Tailwind. Modificadores de opacidade continuam disponíveis.
- A classe compartilhada `accent-solid` reúne fundo, texto, hover, estado
  pressionado e foco. Foi aplicada aos botões primários e opções selecionadas
  com fundo sólido. Botões desabilitados não recebem hover/pressionamento.
- Seleções suaves mantêm o acento a 15% ou 20% com texto `accent.300`.
  O foco usa `accent.400`; botões compartilhados receberam foco visível.
- O indicador dos switches ligados usa texto/fundo escuro no círculo para
  manter contraste sobre o novo acento.
- Sucesso (`#22C55E`) e perigo (`#EF4444`) mantêm suas cores e significados.
  Apenas o texto nos botões sólidos dessas cores passou para `#09090B`.
- As URLs do favicon, manifest e ícones receberam `?v=teal-1`, inclusive na
  splash e no ícone das notificações, para distinguir os arquivos atualizados
  dos já armazenados pelo PWA. O service worker e suas regras não mudaram.
  A atualização de ícones instalados depende do navegador e de acesso online.
- Não houve alteração em regras de negócio, estado, armazenamento,
  temporizadores, permissões ou integrações. Em `restAlerts.ts`, a única
  alteração é a URL do ícone da notificação.

## Paleta

| Token | Cor | Uso |
| --- | --- | --- |
| `accent.500` | `#71AFA5` | Primária, progresso, seleção sólida e switches ligados |
| `accent.400` | `#91C5BC` | Hover e foco |
| `accent.600` | `#57998F` | Estado pressionado |
| `accent.300` | `#B3DCD5` | Títulos, ícones e texto nas seleções suaves |
| `accent.foreground` | `#09090B` | Texto e ícones sobre fundos sólidos de acento |
| `success` (preservado) | `#22C55E` | Séries concluídas e confirmação de salvamento |
| `danger` (preservado) | `#EF4444` | Exclusão, ações destrutivas e erros |

Superfícies escuras preservadas: `#09090B`, `#111115`, `#18181F` e `#23232D`.
O gradiente usa o acento a 12%; o contorno de brilho usa 16%.

## Contraste

Razões calculadas por luminância relativa sRGB, usando os tokens do CSS.
Referência: [WCAG 2.2 — contraste de texto](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)
exige 4,5:1 para texto comum; [contraste não textual](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)
usa 3:1 para a informação visual necessária para identificar controles/estados.

| Combinação | Razão |
| --- | --- |
| Texto `#09090B` / primária | 7,94:1 |
| Texto `#09090B` / hover | 10,34:1 |
| Texto `#09090B` / pressionado | 6,02:1 |
| `accent.500` / painel `white/5` sobre `surface.800` | 6,19:1 |
| `accent.300` / painel `white/5` sobre `surface.800` | 10,42:1 |
| `accent.300` / seleção a 15% sobre esse painel | 8,01:1 |
| `accent.300` / seleção a 20% sobre esse painel | 7,27:1 |
| Texto `#09090B` / sucesso | 8,73:1 |
| Texto `#09090B` / perigo | 5,29:1 |

Texto branco sobre o laranja anterior tinha 2,80:1; sobre o novo verde-água
teria 2,51:1. Por isso, os controles sólidos agora usam texto escuro.

Limitações existentes: `text-zinc-500` em textos pequenos pode ficar abaixo
de 4,5:1 (3,21:1 no painel calculado). `text-danger/70`, usado na exclusão de
registros do histórico, também demanda revisão de contraste. Esses estilos
não foram alterados nesta troca de identidade. Os cálculos não representam
uma certificação de acessibilidade de todas as combinações renderizadas.

## Validação

- `npm.cmd run build`: aprovado (TypeScript e Vite, 1.882 módulos).
- `node --test tests/*.test.cjs`: 66 testes aprovados, nenhuma falha.
- `npm.cmd run lint`: aprovado.
- `git diff --check`: aprovado.
- Busca nos arquivos de origem, configuração e assets: nenhum uso restante
  da paleta laranja anterior.
- Revisão visual no navegador: **pendente**. A ferramenta de UI retornou
  inventário vazio (`apps: []`, `browsers: []`); a criação de uma aba de
  prévia também não estava disponível. Não foram produzidas capturas.

Cobertura por inspeção do código e tokens; a coluna visual permanece pendente:

| Área | Elementos abrangidos | Visual |
| --- | --- | --- |
| Home | Saudação, próximo treino, continuar, seletor e sequência | Pendente |
| Execução | Iniciar/finalizar, progresso, séries e descanso | Pendente |
| Exercícios | Ícones, grupos musculares, bordas concluídas e foco | Pendente |
| Histórico | Títulos dos registros e foco dos expansores via tokens | Pendente |
| Ajustes | Switches, volume, duração, confirmação e exclusão | Pendente |
| Navegação | Item ativo, foco e barra de treino em andamento | Pendente |
| Aeróbico | Início/finalização, configuração e execução de tiros | Pendente |
| Identidade/PWA | Splash, favicon e ícones do aplicativo/notificações | Pendente |

## Arquivos alterados

- `tailwind.config.js`
- `src/styles.css`
- `src/pages/HomePage.tsx`
- `src/pages/WorkoutPage.tsx`
- `src/pages/CardioPage.tsx`
- `src/pages/SettingsPage.tsx`
- `src/components/CardioIntervals.tsx`
- `src/components/ConfirmDialog.tsx`
- `src/components/MainNavigation.tsx`
- `src/components/RestTimer.tsx`
- `src/components/SetRow.tsx`
- `src/components/SplashScreen.tsx`
- `src/components/WorkoutCard.tsx`
- `src/utils/restAlerts.ts` (somente URL do ícone)
- `index.html`
- `public/manifest.webmanifest`
- `public/favicon.svg`
- `public/icon-192.svg`
- `public/icon-512.svg`
- `docs/visual-identity.md` (este relatório)

Sem commit ou push.
