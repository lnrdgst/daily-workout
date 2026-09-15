/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');
const { renderToStaticMarkup } = require('react-dom/server');

// Evaluate the real Home and date helper with a deterministic local clock.
function loadModule(relativePath, mocks, Clock = Date) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  const resolve = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/')) {
      const base = `src/${name.slice(2)}`;
      const extension = fs.existsSync(path.resolve(__dirname, '..', `${base}.ts`)) ? '.ts' : '.tsx';
      return loadModule(`${base}${extension}`, mocks, Clock);
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', 'Date', outputText)(resolve, module, module.exports, Clock);
  return module.exports;
}

const today = new Date(2026, 8, 9, 14);
const yesterday = new Date(2026, 8, 8, 14);
const tomorrow = new Date(2026, 8, 10, 14);
const defaultDescription = 'Registre suas cargas, repetições e acompanhe sua evolução a cada sessão.';
const completedDescription = 'Se quiser treinar novamente, seus próximos treinos continuam disponíveis abaixo.';

function session(date, workoutId = 'B') {
  const startedAt = new Date(date);
  const finishedAt = new Date(date);
  startedAt.setHours(9, 5, 0, 0);
  finishedAt.setHours(9, 58, 0, 0);
  return { id: `${workoutId}-${finishedAt.toISOString()}`, workoutId, workoutName: `Treino ${workoutId}`,
    startedAt: startedAt.toISOString(), finishedAt: finishedAt.toISOString(), exercises: [] };
}

function renderHome(history = [], activeDraft = null, now = today, displayName = 'Leonardo', dataMocks = {}) {
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now.getTime()])); }
  }
  const state = { history, activeDraft, lastCompletedWorkoutId: history.at(-1)?.workoutId ?? null };
  const before = JSON.stringify(state);
  const mocks = {
    '@/hooks/useWorkoutStore': { useWorkoutStore: () => ({ state }) },
    '@/hooks/useUserPreferences': { useUserPreferences: () => [{ displayName }] },
    '@/components/WorkoutProgress': { WorkoutProgress: () => React.createElement('div', null, 'Progresso ativo') },
    'react-router-dom': { useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }), useNavigate: () => () => {}, Link: ({ to, state, children, ...props }) => React.createElement('a', { href: to, 'data-origin': state?.origin, ...props }, children) },
    ...dataMocks,
  };
  const { HomePage } = loadModule('src/pages/HomePage.tsx', mocks, Clock);
  const html = renderToStaticMarkup(React.createElement(HomePage));
  assert.equal(JSON.stringify(state), before, 'Home must not mutate persisted data');
  return { html, text: html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ') };
}

function renderSelector(dataMocks = {}) {
  const { WorkoutSelector } = loadModule('src/components/WorkoutSelector.tsx', {
    'react-router-dom': { useLocation: () => ({ pathname: '/', search: '', hash: '', state: null }), useNavigate: () => () => {}, Link: ({ to, state, children, ...props }) => React.createElement('a', { href: to, 'data-origin': state?.origin, ...props }, children) },
    ...dataMocks,
  });
  const html = renderToStaticMarkup(React.createElement(WorkoutSelector, { onClose() {} }));
  return { html, text: html.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ') };
}

test('no recorded session preserves the standard greeting, description and workout links', () => {
  const { text, html } = renderHome();
  assert.ok(text.includes('Boa tarde, Leonardo'));
  assert.ok(text.includes('Pronto para o próximo treino?'));
  assert.ok(text.includes(defaultDescription));
  assert.ok(text.includes('Você ainda não concluiu nenhum treino.'));
  assert.ok(html.includes('href="/workout/A"'));
  assert.ok(!html.includes('category-heading'));
});

test('cardio subtitle follows the real modality collection and handles singular', () => {
  const { cardioModalities } = loadModule('src/data/cardio.ts', {});
  for (const count of [5, 4, 2, 1]) {
    const modalities = Object.fromEntries(Object.entries(cardioModalities).slice(0, count));
    const { text } = renderSelector({ '@/data/cardio': { cardioModalities: modalities } });
    assert.ok(text.includes(`Aeróbico${count} ${count === 1 ? 'atividade' : 'atividades'}`));
  }
});

test('strength subtitle follows the same workouts used for cards, without assuming ABC', () => {
  const data = loadModule('src/data/workouts.ts', {});
  for (const ids of [['A', 'B', 'C'], ['A', 'B', 'C', 'D'], ['A', 'B'], ['A']]) {
    const workouts = ids.map((id) => ({ ...data.workouts[0], id, name: `Treino ${id}` }));
    const { text, html } = renderSelector({ '@/data/workouts': { ...data, workouts } });
    assert.ok(text.includes(`Musculação${ids.length === 1 ? 'Treino' : 'Treinos'} ${ids.join(' · ')}`));
    for (const id of ids) assert.ok(html.includes(`href="/workout/${id}"`));
  }
});

test('one or multiple sessions today use the same completed copy and local time range', () => {
  for (const history of [[session(today)], [session(today, 'A'), session(today)]]) {
    const { text, html } = renderHome(history);
    assert.ok(text.includes('Treino de hoje concluído.'));
    assert.ok(text.includes(completedDescription));
    assert.ok(text.includes('Hoje · 09:05 às 09:58'));
    assert.ok(text.includes('Concluído'));
    assert.ok(html.includes('border-l-accent-500/70'));
    assert.ok(html.includes(history.length === 1 ? 'href="/workout/C"' : 'href="/workout/B"'));
  }
});

test('yesterday keeps the full historical date format', () => {
  const { text } = renderHome([session(yesterday)]);
  assert.ok(text.includes('Pronto para o próximo treino?'));
  assert.ok(text.includes('08/09/2026 das 09:05 às 09:58'));
  assert.ok(!text.includes('Hoje ·'));
});

test('active session takes priority even after a completion today', () => {
  for (const history of [[], [session(today)]]) {
    const { text } = renderHome(history, { workoutId: 'C' });
    assert.ok(text.includes('Seu Treino C está em andamento.'));
    assert.ok(text.includes(defaultDescription));
    assert.ok(text.includes('Progresso ativo'));
    assert.ok(!text.includes('Treino de hoje concluído.'));
    assert.ok(!text.includes('Último treino concluído'));
  }
});

test('deleting today’s only entry and reopening tomorrow both restore the standard state', () => {
  const prior = session(yesterday);
  const latest = session(today);
  assert.ok(renderHome([prior, latest]).text.includes('Treino de hoje concluído.'));
  assert.ok(renderHome([prior]).text.includes('Pronto para o próximo treino?'));
  const reopened = renderHome([latest], null, tomorrow).text;
  assert.ok(reopened.includes('Pronto para o próximo treino?'));
  assert.ok(reopened.includes('09/09/2026 das 09:05 às 09:58'));
});

test('completion date determines today for a session crossing midnight', () => {
  const overnight = session(today);
  overnight.startedAt = new Date(2026, 8, 8, 23, 45).toISOString();
  overnight.finishedAt = new Date(2026, 8, 9, 0, 30).toISOString();
  const { text } = renderHome([overnight]);
  assert.ok(text.includes('Treino de hoje concluído.'));
  assert.ok(text.includes('Hoje · 23:45 às 00:30'));
});

test('local day comparison handles UTC offsets, month/year boundaries and invalid dates', () => {
  const { isSameLocalDay } = loadModule('src/utils/localDate.ts', {});
  const local = new Date(2026, 8, 9, 23, 30);
  assert.ok(isSameLocalDay(new Date(local.toISOString()), today));
  assert.equal(isSameLocalDay(today, tomorrow), false);
  assert.equal(isSameLocalDay(today, new Date(2026, 9, 9)), false);
  assert.equal(isSameLocalDay(today, new Date(2025, 8, 9)), false);
  assert.equal(isSameLocalDay(new Date('invalid'), today), false);
});

test('greeting by hour and trimmed long display names remain unchanged', () => {
  const name = 'Leonardo Augusto de Souza Albuquerque';
  for (const [hour, greeting] of [[8, 'Bom dia'], [14, 'Boa tarde'], [20, 'Boa noite']]) {
    assert.ok(renderHome([], null, new Date(2026, 8, 9, hour), `  ${name}  `).text.includes(`${greeting}, ${name}`));
  }
});

const cardio = { type: 'cardio', id: 'bike', modality: 'stationary-bike', workoutName: 'Bike ergométrica',
  startedAt: today.toISOString(), finishedAt: new Date(today.getTime() + 60000).toISOString() };

test('next strength follows chronological strength history independently of global latest session', () => {
  const { getNextStrengthWorkout } = loadModule('src/utils/nextWorkout.ts', {});
  const { workouts } = loadModule('src/data/workouts.ts', {});
  for (const [history, expected] of [[[], 'A'], [[cardio], 'A'], [[session(today, 'A')], 'B'], [[session(today, 'C')], 'A'],
    [[cardio, session(yesterday, 'A')], 'B'], [[session(today, 'B'), session(yesterday, 'A')], 'C']]) {
    assert.equal(getNextStrengthWorkout(history, workouts).id, expected);
  }
  const extended = [...workouts, { ...workouts[0], id: 'D' }];
  assert.equal(getNextStrengthWorkout([session(today, 'C')], extended).id, 'D');
  assert.equal(getNextStrengthWorkout([session(today, 'D')], extended).id, 'A');
  assert.equal(getNextStrengthWorkout([], []), null);
});

test('global cardio history and next strength coexist without advancing ABC', () => {
  const { text, html } = renderHome([cardio, session(yesterday, 'A')]);
  assert.ok(text.includes('Bike ergométrica'));
  assert.ok(text.includes('Treino de hoje concluído.'));
  assert.ok(html.includes('href="/workout/B"'));
  assert.ok(text.indexOf('Próximo treino') < text.indexOf('Último treino concluído'));
  assert.ok(text.indexOf('Último treino concluído') < text.indexOf('Sequência ABC'));
});

test('both active types prioritize resume and hide the selector and next workout', () => {
  for (const [draft, route] of [[{ workoutId: 'B' }, '/workout/B'], [cardio, '/cardio/stationary-bike']]) {
    const { text, html } = renderHome([], draft);
    assert.ok(text.includes('Continuar treino'));
    assert.ok(html.includes('href="' + route + '"'));
    assert.ok(!text.includes('Fazer outro treino'));
    assert.ok(!text.includes('Próximo treino'));
  }
});
