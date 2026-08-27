# Daily Workout

Aplicativo frontend para registrar treinos de musculação no celular, com foco em uso rápido durante a academia.

# Acessar aplicação em produção

https://daily-workout-cyan.vercel.app/

## Stack

- React
- Vite
- TypeScript
- Tailwind CSS
- React Router
- `localStorage`
- PWA com funcionamento offline após carregamento

## Como rodar

```bash
npm install
npm run dev
```

## Build de produção

```bash
npm run build
```

## Scripts

- `npm run dev`: sobe o ambiente local
- `npm run build`: valida TypeScript e gera o build
- `npm run lint`: verifica o código com ESLint
- `npm run preview`: pré-visualiza o build

## Estrutura

```text
src/
  components/
  data/
  hooks/
  pages/
  types/
  utils/
```

## Onde alterar os treinos

Os treinos ficam centralizados em [src/data/workouts.ts](/C:/Users/leoaf/projetos/daily-workout/src/data/workouts.ts). Para trocar exercícios, séries ou faixa de repetições, basta editar esse arquivo.

## Funcionalidades incluídas

- Treinos A, B e C na tela inicial
- Indicação do último treino realizado
- Registro de carga e repetições por série
- Marcação de séries concluídas
- Visualização da carga/repetições do treino anterior por exercício
- Cronômetro de descanso com presets
- Histórico local completo
- PWA instalável com service worker
