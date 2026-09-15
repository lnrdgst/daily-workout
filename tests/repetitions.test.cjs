/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

// Run the existing TypeScript modules without adding a test runtime dependency.
function loadModule(relativePath, mocks = {}) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const source = fs.readFileSync(filename, 'utf8');
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  const resolve = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/')) {
      const base = `src/${name.slice(2)}`;
      const extension = fs.existsSync(path.resolve(__dirname, '..', `${base}.ts`)) ? '.ts' : '.tsx';
      return loadModule(`${base}${extension}`, mocks);
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', 'window', outputText)(resolve, module, module.exports, mocks.window);
  return module.exports;
}

const storage = loadModule('src/utils/storage.ts');
const { workoutsById } = loadModule('src/data/workouts.ts');
const workout = workoutsById.A;
const history = [{ exercises: [{ exerciseId: workout.exercises[0].id,
  sets: ['12', '11', '10'].map((reps, index) => ({ load: index ? '40' : '30', reps, completed: true })),
}] }];

function descendants(node) {
  if (!node || typeof node !== 'object') return [];
  if (node.type?.name === 'IntegerStepper') return descendants(node.type(node.props));
  return [node, ...[node.props?.children].flat(Infinity).flatMap(descendants)];
}

test('shared duration stepper clamps buttons, keeps edits until blur and has no hours ceiling', () => {
  const { IntegerStepper } = loadModule('src/components/IntegerStepper.tsx', { react: { useId: () => 'duration-test' } });
  let value = '0';
  const render = (max) => descendants(IntegerStepper({ label: 'Minutos', decreaseLabel: 'Diminuir minutos', increaseLabel: 'Aumentar minutos', value, max, onChange: (next) => { value = next; } }));
  const input = (max) => render(max).find((node) => node.type === 'input');
  const click = (label, max) => render(max).find((node) => node.props?.['aria-label'] === label).props.onClick();
  click('Diminuir minutos', 59); assert.equal(value, '0');
  click('Aumentar minutos', 59); assert.equal(value, '1');
  value = '59'; click('Aumentar minutos', 59); assert.equal(value, '59');
  input(59).props.onChange({ target: { value: '80' } }); assert.equal(value, '80');
  input(59).props.onBlur(); assert.equal(value, '59');
  input(59).props.onChange({ target: { value: '' } }); input(59).props.onBlur(); assert.equal(value, '');
  click('Aumentar minutos', 59); assert.equal(value, '1');
  value = '2'; click('Aumentar minutos'); assert.equal(value, '3');
  value = '250'; input().props.onBlur(); assert.equal(value, '250');
  assert.equal(input().props.type, 'text');
  assert.equal(input().props.inputMode, 'numeric');
});

function row(initialReps) {
  let set = { reps: initialReps, load: '', completed: false };
  const { SetRow } = loadModule('src/components/SetRow.tsx', { react: { useId: () => 'reps-test' } });
  const render = () => descendants(SetRow({ index: 0, set, onChange: (patch) => { set = { ...set, ...patch }; } }));
  return {
    value: () => set,
    nodes: render,
    click: (label) => render().find((node) => node.props?.['aria-label'] === label).props.onClick(),
    type: (value) => render().find((node) => node.props?.id === 'reps-test').props.onChange({ target: { value } }),
  };
}

test('first execution uses numeric repsMin for all sets and leaves load empty and sets pending', () => {
  const draft = storage.createWorkoutDraft(workout);
  assert.deepEqual(draft.exercises[0].sets, Array.from({ length: 3 }, () => ({ load: '', reps: '8', completed: false })));
  assert.deepEqual(draft.exercises[4].sets.map((set) => set.reps), ['12', '12', '12']);
  assert.equal(storage.getPreviousExercisePerformance([], workout.exercises[0].id), null);
});

test('history wins, remains unchanged and additional sets use the prescription', () => {
  const before = JSON.stringify(history);
  const expanded = { ...workout, exercises: [{ ...workout.exercises[0], sets: 4 }] };
  const sets = storage.createWorkoutDraft(expanded, history).exercises[0].sets;
  assert.deepEqual(sets.map((set) => set.reps), ['12', '11', '10', '8']);
  assert.deepEqual(sets.map((set) => set.load), ['30', '40', '40', '']);
  assert.ok(sets.every((set) => !set.completed));
  assert.equal(JSON.stringify(history), before);
});

test('historical empty and zero reps retain existing behavior', () => {
  const prior = [{ exercises: [{ exerciseId: workout.exercises[0].id,
    sets: [{ load: '30', reps: '', completed: true }, { load: '', reps: '0', completed: true }],
  }] }];
  assert.deepEqual(storage.createWorkoutDraft(workout, prior).exercises[0].sets.map((set) => set.reps), ['', '0', '8']);
});

test('explicit buttons increment/decrement history values, clamp zero and safely handle empty/invalid values', () => {
  for (const [initial, label, expected] of [
    ['12', 'Aumentar repetições', '13'], ['12', 'Diminuir repetições', '11'],
    ['0', 'Diminuir repetições', '0'], ['', 'Aumentar repetições', '1'],
    ['', 'Diminuir repetições', '0'], ['NaN', 'Aumentar repetições', '1'],
  ]) {
    const control = row(initial);
    control.click(label);
    assert.deepEqual(control.value(), { reps: expected, load: '', completed: false });
  }
});

test('manual input permits clearing and digits, rejects negatives, decimals and invalid numbers, and retains numeric keyboard', () => {
  const control = row('8');
  control.type('');
  assert.equal(control.value().reps, '');
  control.type('15');
  for (const invalid of ['-1', '1.5', 'NaN', 'Infinity', '1e3']) control.type(invalid);
  assert.equal(control.value().reps, '15');
  const input = control.nodes().find((node) => node.props?.id === 'reps-test');
  assert.equal(input.props.inputMode, 'numeric');
  assert.equal(control.nodes().find((node) => node.props?.htmlFor === 'reps-test').props.children, 'Reps');
});

test('saving and rehydrating edited or empty session reps does not reapply defaults', () => {
  let saved;
  const persistent = loadModule('src/utils/storage.ts', { window: { localStorage: {
    setItem: (_, value) => { saved = value; }, getItem: () => saved,
  } } });
  const state = { ...persistent.loadAppState(), activeDraft: persistent.createWorkoutDraft(workout) };
  state.activeDraft.exercises[0].sets[0].reps = '15';
  state.activeDraft.exercises[0].sets[1].reps = '';
  persistent.saveAppState(state);
  assert.deepEqual(persistent.loadAppState().activeDraft, state.activeDraft);
});

test('actual finish handler treats 20-second prefills as accidental and explicit completion as activity', () => {
  for (const prior of [[], history]) {
    for (const completed of [false, true]) {
      const draft = storage.createWorkoutDraft(workout, prior);
      draft.startedAt = new Date(Date.now() - 20000).toISOString();
      draft.exercises[0].sets[0].completed = completed;
      const dialogs = [];
      let stateIndex = 0;
      const component = () => null;
      const mocks = {
        react: { useState: () => { const index = stateIndex++; return [false, (value) => { dialogs[index] = value; }]; } },
        'react-router-dom': { Link: component, useNavigate: () => () => {}, useParams: () => ({ id: 'A' }) },
        '@/hooks/useWorkoutStore': { useWorkoutStore: () => ({ state: { activeDraft: draft }, getPreviousExerciseSets: () => null }) },
        '@/hooks/useWorkoutPreviewNavigation': { useWorkoutPreviewNavigation: () => () => {} },
        '@/hooks/useRestTimerSettings': { useRestTimerSettings: () => [{}] },
        '@/hooks/useWorkoutSessionSettings': { useWorkoutSessionSettings: () => [{}] },
        '@/hooks/useWorkoutDuration': { ...loadModule('src/hooks/useWorkoutDuration.ts'), useWorkoutDuration: () => '00:20' },
      };
      for (const name of ['ConfirmDialog', 'ExerciseCard', 'ExerciseIcon', 'MainNavigation', 'RestTimer']) {
        mocks[`@/components/${name}`] = { [name]: component };
      }
      const { WorkoutPage } = loadModule('src/pages/WorkoutPage.tsx', mocks);
      descendants(WorkoutPage()).find((node) => node.type === 'button' && node.props.children === 'Finalizar treino').props.onClick();
      assert.equal(dialogs[completed ? 0 : 1], true);
      assert.equal(dialogs[completed ? 1 : 0], undefined);
    }
  }
});
