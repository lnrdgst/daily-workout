/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');

// Exercise real components, store and storage modules with the same lightweight
// hook approach as the existing suite. Native dialog rendering still needs a browser.
function loadModule(relativePath, mocks = {}, env = {}, cache = new Map()) {
  if (cache.has(relativePath)) return cache.get(relativePath);
  const filename = path.resolve(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  const resolve = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/') || name.startsWith('./')) {
      const base = name.startsWith('@/') ? `src/${name.slice(2)}` : path.join(path.dirname(relativePath), name);
      return loadModule(base + (fs.existsSync(path.resolve(__dirname, '..', `${base}.ts`)) ? '.ts' : '.tsx'), mocks, env, cache);
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', 'window', 'document', 'HTMLElement', outputText)(resolve, module, module.exports, env.window, env.document, env.HTMLElement);
  cache.set(relativePath, module.exports);
  return module.exports;
}

function renderComponent(file, name, initialProps, env = {}) {
  const slots = [];
  let cursor = 0;
  let effects = [];
  let props = initialProps;
  const hooks = {
    ...React,
    useId: () => 'numeric-editor-test',
    useState: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (next) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    },
    useRef: (initial) => {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect: (effect) => { effects.push(effect); },
    useMemo: (create) => create(),
  };
  const Component = loadModule(file, { react: hooks }, env)[name];
  return {
    render(nextProps = props) { props = nextProps; cursor = 0; effects = []; return Component(props); },
    flushEffects: () => effects.map((effect) => effect()),
  };
}

function nodes(node) {
  if (!node || typeof node !== 'object') return [];
  if (node.type?.name === 'IntegerStepper') return nodes(node.type(node.props));
  return [node, ...[node.props?.children].flat(Infinity).flatMap(nodes)];
}
const text = (node) => node == null || typeof node === 'boolean' ? '' : typeof node !== 'object' ? String(node) : [node.props?.children].flat(Infinity).map(text).join('');
const named = (tree, label) => nodes(tree).find((n) => n.type === 'button' && (n.props['aria-label'] === label || text(n) === label));

function keypad(props = {}) {
  const confirmed = [];
  let canceled = 0;
  const view = renderComponent('src/components/SetNumericKeypad.tsx', 'SetNumericKeypad', {
    exerciseName: 'Supino reto', seriesNumber: 2, field: 'load', value: '24.5',
    onConfirm: (v) => confirmed.push(v), onCancel: () => { canceled++; }, ...props,
  });
  return {
    ...view, confirmed, canceled: () => canceled,
    click: (label) => named(view.render(), label).props.onClick(),
    value: () => text(nodes(view.render()).find((n) => n.type === 'output')).replace(/ (kg|reps)$/, ''),
    key: (key, modifiers = {}) => {
      let prevented = false;
      view.render().props.onKeyDown({ key, preventDefault: () => { prevented = true; }, ...modifiers });
      return prevented;
    },
  };
}

test('load and repetitions open the contextual keypad without an editable input or contenteditable', () => {
  for (const field of ['load', 'reps']) {
    const view = renderComponent('src/components/SetRow.tsx', 'SetRow', {
      exerciseName: 'Supino reto', index: 1, isNextPending: true,
      set: { load: '24.5', reps: '18.5', completed: false }, onChange: () => assert.fail('Opening must not save'),
    });
    const label = `Editar ${field === 'load' ? 'carga' : 'repetições'} de Supino reto, série 2. Valor atual: ${field === 'load' ? '24,5 kg' : '18,5'}`;
    const trigger = named(view.render(), label);
    assert.equal(trigger.type, 'button');
    assert.equal(trigger.props['aria-haspopup'], 'dialog');
    trigger.props.onClick();
    const sheet = nodes(view.render()).find((n) => n.type?.name === 'SetNumericKeypad');
    assert.equal(sheet.props.exerciseName, 'Supino reto');
    assert.equal(sheet.props.seriesNumber, 2);
    assert.equal(sheet.props.field, field);
    assert.equal(sheet.props.value, field === 'load' ? '24.5' : '18.5');
    assert.ok(!nodes(view.render()).some((n) => ['input', 'textarea'].includes(n.type) || n.props?.contentEditable));
    const pad = keypad(sheet.props);
    assert.match(text(pad.render()), /Série 2 · (Carga|Repetições)/);
    assert.match(text(pad.render()), /Supino reto/);
    assert.ok(!nodes(pad.render()).some((n) => ['input', 'textarea'].includes(n.type) || n.props?.contentEditable));
  }
});

test('first digit replaces the old value; further keys compose integers and comma decimals', () => {
  for (const [keys, expected] of [[['2','0'], '20'], [['2','4',',','5'], '24.5'], [['3','0',',','7','5'], '30.75']]) {
    const pad = keypad();
    for (const key of keys) pad.click(key === ',' ? 'Vírgula decimal' : key);
    assert.deepEqual(pad.confirmed, []);
    pad.click('Confirmar');
    assert.deepEqual(pad.confirmed, [expected]);
  }
  const pad = keypad({ field: 'reps' });
  ['1', '8', ',', '5'].forEach((key) => pad.key(key));
  assert.equal(pad.value(), '18,5');
  pad.key('Enter');
  assert.deepEqual(pad.confirmed, ['18.5']);
});

test('multiple separators, signs, spaces, exponent notation and nonnumeric keys are ignored', () => {
  const pad = keypad();
  ['3', ',', '7', ',', '.', '-', '+', ' ', 'a', 'e', 'Infinity'].forEach((key) => pad.key(key));
  assert.equal(pad.value(), '3,7');
  pad.click('Confirmar');
  assert.deepEqual(pad.confirmed, ['3.7']);
});

test('backspace removes one character; clear is temporary and can be confirmed as empty', () => {
  const pad = keypad();
  pad.click('Apagar último caractere');
  assert.equal(pad.value(), '24,');
  pad.click('Apagar último caractere');
  assert.equal(pad.value(), '24');
  pad.click('Limpar');
  assert.equal(pad.value(), '—');
  assert.deepEqual(pad.confirmed, []);
  pad.click('Confirmar');
  assert.deepEqual(pad.confirmed, ['']);
  const zero = keypad();
  zero.key(','); zero.key('5'); zero.key('Backspace'); zero.key('Enter');
  assert.deepEqual(zero.confirmed, ['0']);
});

test('invalid legacy values cannot be confirmed; a digit repairs them without rounding', () => {
  for (const value of ['-1', 'Infinity', '1e3', 'NaN']) {
    const pad = keypad({ value });
    assert.equal(named(pad.render(), 'Confirmar').props.disabled, true);
    pad.click('Confirmar');
    assert.deepEqual(pad.confirmed, []);
    pad.key('2'); pad.key('Enter');
    assert.deepEqual(pad.confirmed, ['2']);
  }
  const numeric = loadModule('src/utils/setNumericEntry.ts');
  assert.equal(numeric.confirmNumericEntry('9'.repeat(310)), null);
  assert.equal(numeric.confirmNumericEntry('0,1234567890123456789'), '0.1234567890123456789');
});

test('cancel button, Escape and native dialog cancellation discard draft; internal clicks never dismiss', () => {
  for (const cancel of ['button', 'escape', 'native']) {
    const pad = keypad(); pad.key('9');
    if (cancel === 'button') pad.click('Cancelar edição');
    if (cancel === 'escape') assert.equal(pad.key('Escape'), true);
    if (cancel === 'native') pad.render().props.onCancel({ preventDefault() {} });
    assert.equal(pad.canceled(), 1);
    assert.deepEqual(pad.confirmed, []);
  }
  const pad = keypad();
  assert.equal(pad.render().props.onClick, undefined);
  pad.click('2'); pad.click('Vírgula decimal'); pad.click('5');
  assert.equal(pad.canceled(), 0);
  assert.equal(pad.value(), '2,5');
});

test('physical keypad supports digits, dot/comma, Delete, Backspace and Enter without intercepting Tab/modifiers', () => {
  const pad = keypad();
  assert.equal(pad.key('Tab'), false);
  assert.equal(pad.key('1', { ctrlKey: true }), false);
  for (const key of ['1', '8', '.', '5']) assert.equal(pad.key(key), true);
  pad.key('Backspace'); pad.key('5');
  assert.equal(pad.value(), '18,5');
  pad.key('Delete'); pad.key('2'); pad.key('Enter');
  pad.click('Confirmar');
  assert.deepEqual(pad.confirmed, ['2'], 'Repeated confirmation must not propagate twice');
});

test('native modal isolates focus, prevents background scrolling and returns focus without scrolling', () => {
  const calls = [];
  class Element {
    isConnected = true;
    focus(options) { calls.push(['focus', options]); }
  }
  const previous = new Element();
  const doc = { activeElement: previous, documentElement: { style: { overflow: 'auto' } } };
  const view = renderComponent('src/components/SetNumericKeypad.tsx', 'SetNumericKeypad', {
    exerciseName: 'Supino', seriesNumber: 1, field: 'load', value: '', onConfirm() {}, onCancel() {},
  }, { document: doc, HTMLElement: Element });
  const tree = view.render();
  tree.ref.current = { showModal: () => calls.push('modal'), close: () => calls.push('close') };
  nodes(tree).find((n) => n.type === 'output').ref.current = new Element();
  const [cleanup] = view.flushEffects();
  assert.equal(doc.documentElement.style.overflow, 'hidden');
  assert.deepEqual(calls, ['modal', ['focus', { preventScroll: true }]]);
  cleanup();
  assert.equal(doc.documentElement.style.overflow, 'auto');
  assert.deepEqual(calls.slice(-2), ['close', ['focus', { preventScroll: true }]]);
  assert.match(tree.props.className, /max-h-\[100dvh\]/);
  assert.match(tree.props.className, /safe-area-inset-bottom/);
});

function workoutEditor(fillFollowingSets = true, index = 0) {
  const storage = loadModule('src/utils/storage.ts');
  const { workoutsById } = loadModule('src/data/workouts.ts');
  const draft = storage.createWorkoutDraft(workoutsById.A);
  // Extra sets let one confirmation exercise every provenance rule together.
  draft.exercises[0].sets = [
    { load: '', reps: '8', completed: false, loadSource: 'empty', repsSource: 'prescription' },
    { load: '40', reps: '12', completed: false, loadSource: 'history', repsSource: 'history' },
    { load: '22', reps: '9', completed: false, loadSource: 'manual', repsSource: 'manual' },
    { load: '', reps: '8', completed: true, loadSource: 'empty', repsSource: 'prescription' },
    { load: '', reps: '8', completed: false, loadSource: 'empty', repsSource: 'prescription' },
  ];
  const automaticSource = { workoutId: 'A', startedAt: draft.startedAt, exerciseId: draft.exercises[0].exerciseId, setIndex: 3, id: 'existing-rest' };
  const oldHistory = [{ type: 'strength', id: 'previous', workoutId: 'A', exercises: [], startedAt: draft.startedAt, finishedAt: draft.startedAt, workoutName: 'Treino A' }];
  const data = new Map([
    ['daily-workout-state', JSON.stringify({ activeDraft: draft, history: oldHistory, restTimer: { status: 'running', selectedSeconds: 90, endAt: Date.now() + 60000, automaticSource } })],
    ['daily-workout-session-settings', JSON.stringify({ fillFollowingSets })],
  ]);
  let writes = 0;
  const win = { localStorage: { getItem: (k) => data.get(k) ?? null, setItem: (k,v) => { writes++; data.set(k,v); } },
    setInterval: () => 1, clearInterval() {}, setTimeout: () => 1, clearTimeout() {}, addEventListener() {}, removeEventListener() {} };
  const store = renderComponent('src/hooks/useWorkoutStore.tsx', 'WorkoutStoreProvider', {}, { window: win, document: { addEventListener() {}, removeEventListener() {} } });
  const api = () => store.render().props.value;
  api(); store.flushEffects();
  let edits = 0;
  const rowProps = () => ({ index, exerciseName: 'Supino reto', isNextPending: true, set: api().state.activeDraft.exercises[0].sets[index],
    onChange: (patch) => { edits++; api().updateSet(draft.exercises[0].exerciseId, index, patch); api(); store.flushEffects(); },
    onToggleCompleted: () => { api().toggleSetCompleted(draft.exercises[0].exerciseId, index); api(); store.flushEffects(); },
  });
  const row = renderComponent('src/components/SetRow.tsx', 'SetRow', rowProps());
  const render = () => row.render(rowProps());
  return {
    api, render, edits: () => edits, writes: () => writes, saved: () => data.get('daily-workout-state'),
    open: (field) => {
      nodes(render()).find((n) => n.type === 'button' && n.props['aria-label']?.startsWith(`Editar ${field === 'load' ? 'carga' : 'repetições'} de`)).props.onClick();
      return keypad(nodes(render()).find((n) => n.type?.name === 'SetNumericKeypad').props);
    },
  };
}

test('typing/cancel never changes the real store or persistence; confirm saves only one field and propagates once', () => {
  for (const field of ['load', 'reps']) {
    const editor = workoutEditor();
    const before = editor.api().state;
    const saved = editor.saved(); const writes = editor.writes();
    let pad = editor.open(field);
    ['1', '8', ',', '5'].forEach((key) => pad.key(key));
    assert.equal(editor.saved(), saved);
    assert.equal(editor.writes(), writes);
    assert.deepEqual(editor.api().state, before);
    pad.click('Cancelar edição');
    assert.equal(editor.saved(), saved);
    assert.ok(!nodes(editor.render()).some((n) => n.type?.name === 'SetNumericKeypad'));
    pad = editor.open(field);
    ['1', '8', ',', '5'].forEach((key) => pad.key(key));
    pad.key('Enter'); pad.click('Confirmar');
    assert.equal(editor.edits(), 1);
    const next = editor.api().state;
    const sets = next.activeDraft.exercises[0].sets;
    assert.equal(sets[0][field], '18.5'); assert.equal(sets[0][`${field}Source`], 'manual');
    assert.deepEqual(sets.slice(1,4), before.activeDraft.exercises[0].sets.slice(1,4), 'Historical/manual/completed sets must be preserved');
    assert.equal(sets[4][field], '18.5'); assert.equal(sets[4][`${field}Source`], 'autofilled');
    const other = field === 'load' ? 'reps' : 'load';
    assert.deepEqual(sets.map((s) => s[other]), before.activeDraft.exercises[0].sets.map((s) => s[other]));
    assert.deepEqual(next.restTimer, before.restTimer);
    assert.deepEqual(next.history, before.history);
    const { getWorkoutProgress } = loadModule('src/utils/workoutProgress.ts');
    assert.deepEqual(getWorkoutProgress(next.activeDraft), getWorkoutProgress(before.activeDraft));
    assert.deepEqual(JSON.parse(editor.saved()).activeDraft, next.activeDraft);
    assert.ok(!nodes(editor.render()).some((n) => n.type?.name === 'SetNumericKeypad'));
  }
});

test('disabled assisted filling changes only the confirmed set; confirming an unchanged value preserves origins', () => {
  const editor = workoutEditor(false);
  const before = editor.api().state.activeDraft.exercises[0].sets;
  editor.open('reps').click('Confirmar');
  assert.equal(editor.edits(), 0);
  const pad = editor.open('load'); pad.key('3'); pad.key('0'); pad.key('Enter');
  const after = editor.api().state.activeDraft.exercises[0].sets;
  assert.equal(after[0].load, '30');
  assert.deepEqual(after.slice(1), before.slice(1));
});

test('later edits never change earlier sets and blank confirmations remain persistable', () => {
  const editor = workoutEditor(true, 2);
  const before = editor.api().state.activeDraft.exercises[0].sets;
  const pad = editor.open('reps'); pad.click('Limpar'); pad.click('Confirmar');
  const after = editor.api().state.activeDraft.exercises[0].sets;
  assert.deepEqual(after.slice(0,2), before.slice(0,2));
  assert.equal(after[2].reps, ''); assert.equal(after[4].reps, '');
  assert.equal(JSON.parse(editor.saved()).activeDraft.exercises[0].sets[2].reps, '');
});

test('plus/minus preserve decimal digits with exact steps of one and clamp only at zero', () => {
  const { adjustSetReps } = loadModule('src/utils/setNumericEntry.ts');
  for (const [initial,delta,expected] of [['18',1,'19'], ['18.5',1,'19.5'], ['19.5',1,'20.5'], ['18.5',-1,'17.5'], ['18.1234567890123456789',1,'19.1234567890123456789'], ['0.5',-1,'0']]) {
    assert.equal(adjustSetReps(initial,delta),expected);
  }
  const editor = workoutEditor(false);
  const pad = editor.open('reps'); ['1','8',',','5'].forEach((k) => pad.key(k)); pad.key('Enter');
  named(editor.render(), 'Aumentar repetições').props.onClick();
  assert.equal(editor.api().state.activeDraft.exercises[0].sets[0].reps, '19.5');
  named(editor.render(), 'Diminuir repetições').props.onClick();
  assert.equal(editor.api().state.activeDraft.exercises[0].sets[0].reps, '18.5');
});

test('the next pending badge moves after mark/unmark, stays unique and disappears when all sets are complete', () => {
  const props = {
    exercise: { id: 'bench', name: 'Supino', muscleGroup: 'Peito', sets: 3, repsMin: 8, repsMax: 12 },
    sessionState: { exerciseId: 'bench', sets: [false,false,false].map((completed) => ({ load: '', reps: '8', completed })) }, previousSets: null,
  };
  const card = renderComponent('src/components/ExerciseCard.tsx', 'ExerciseCard', props);
  const pending = () => nodes(card.render(props)).filter((n) => n.type?.name === 'SetRow' && n.props.isNextPending).map((n) => n.props.index);
  assert.deepEqual(pending(), [0]);
  props.sessionState.sets[2].completed = true; assert.deepEqual(pending(), [0]);
  props.sessionState.sets[0].completed = true; assert.deepEqual(pending(), [1]);
  props.sessionState.sets[0].completed = false; assert.deepEqual(pending(), [0]);
  props.sessionState.sets.forEach((s) => { s.completed = true; }); assert.deepEqual(pending(), []);
});

test('Marcar remains immediate and permits out-of-order completion without opening the editor', () => {
  const editor = workoutEditor(false, 2);
  named(editor.render(), 'Marcar').props.onClick();
  assert.equal(editor.api().state.activeDraft.exercises[0].sets[2].completed, true);
  assert.equal(editor.api().state.activeDraft.exercises[0].sets[0].completed, false);
  assert.equal(editor.edits(), 0);
  assert.ok(named(editor.render(), 'Feita').props.className.includes('bg-success'));
  assert.ok(!nodes(editor.render()).some((n) => n.type?.name === 'SetNumericKeypad'));
  named(editor.render(), 'Feita').props.onClick();
  assert.equal(editor.api().state.activeDraft.exercises[0].sets[2].completed, false);
});

test('decimal values survive JSON rehydration, completed history and subsequent autofill without a migration', () => {
  let saved;
  const storage = loadModule('src/utils/storage.ts', {}, { window: { localStorage: { getItem: () => saved ?? null, setItem: (_,v) => { saved = v; } } } });
  const { workoutsById } = loadModule('src/data/workouts.ts');
  const state = { ...storage.loadAppState(), activeDraft: storage.createWorkoutDraft(workoutsById.A) };
  state.activeDraft.exercises[2].sets[0] = { load: '30.75', reps: '18.5', completed: true };
  storage.saveAppState(state);
  const loaded = storage.loadAppState(); assert.deepEqual(loaded.activeDraft, state.activeDraft);
  const entry = storage.buildHistoryEntry(loaded.activeDraft);
  assert.deepEqual(entry.exercises[2].sets[0], { load: '30.75', reps: '18.5', completed: true });
  const next = storage.createWorkoutDraft(workoutsById.A, [entry]);
  assert.equal(next.exercises[2].sets[0].load, '30.75');
  assert.equal(next.exercises[2].sets[0].reps, '18.5');
  assert.equal(next.exercises[2].sets[0].repsSource, 'history');
});
