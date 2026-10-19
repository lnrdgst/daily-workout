/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const React = require('react');

function loadModule(relativePath, mocks = {}, env = {}, cache = new Map()) {
  if (cache.has(relativePath)) return cache.get(relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(path.resolve(__dirname, '..', relativePath), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  const resolve = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/') || name.startsWith('./')) {
      const base = name.startsWith('@/') ? `src/${name.slice(2)}` : path.join(path.dirname(relativePath), name);
      const extension = fs.existsSync(path.resolve(__dirname, '..', `${base}.ts`)) ? '.ts' : '.tsx';
      return loadModule(base + extension, mocks, env, cache);
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', 'window', 'document', outputText)(resolve, module, module.exports, env.window, env.document);
  cache.set(relativePath, module.exports);
  return module.exports;
}

const storage = loadModule('src/utils/storage.ts');
const { workouts, workoutsById } = loadModule('src/data/workouts.ts');
const { exercisesById } = loadModule('src/data/exercises.ts');
const ids = [...new Set([...workouts.flatMap((w) => w.exercises.flatMap((e) => e.prescribedExerciseIds ?? [e.prescribedExerciseId])), 'triceps-press'])];
const canonicalHistory = [{ type: 'strength', id: 'canonical', workoutId: 'A', workoutName: 'Treino A',
  startedAt: '2026-10-15T09:00:00Z', finishedAt: '2026-10-15T10:00:00Z',
  exercises: ids.map((id,index) => ({ exerciseId: id, executedExerciseId: id, exerciseName: exercisesById[id].name,
    sets: Array.from({ length: 3 }, (_,i) => ({ load: String(20 + index + i), reps: `${10 + i}.5`, completed: true })),
  })),
}];
const priorSets = (id, history = canonicalHistory) => history[0].exercises.find((e) => e.executedExerciseId === id).sets;
const exercise = (state, slotId) => state.activeDraft.exercises.find((e) => e.exerciseId === slotId);
const values = (sets) => sets.map(({ load,reps }) => ({ load,reps }));

// Run the real provider and persistence effects with isolated in-memory storage.
function store({ history = canonicalHistory, draft = null, restTimer = storage.defaultRestTimerState, fillFollowingSets = true } = {}) {
  const data = new Map([
    ['daily-workout-state', JSON.stringify({ history, activeDraft: draft, restTimer })],
    ['daily-workout-session-settings', JSON.stringify({ fillFollowingSets })],
  ]);
  const slots = [];
  let cursor = 0;
  let effects = [];
  const hooks = { ...React,
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], (next) => { slots[index] = typeof next === 'function' ? next(slots[index]) : next; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useEffect: (effect) => effects.push(effect), useMemo: (create) => create(),
  };
  const win = { localStorage: { getItem: (k) => data.get(k) ?? null, setItem: (k,v) => data.set(k,v) },
    setTimeout: () => 1, clearTimeout() {}, addEventListener() {}, removeEventListener() {} };
  const { WorkoutStoreProvider } = loadModule('src/hooks/useWorkoutStore.tsx', { react: hooks }, {
    window: win, document: { addEventListener() {}, removeEventListener() {} },
  });
  const render = () => {
    cursor = 0; effects = [];
    const api = WorkoutStoreProvider({}).props.value;
    effects.forEach((effect) => effect());
    return api;
  };
  render();
  return { api: render, act(action) { action(render()); return render(); }, saved: () => JSON.parse(data.get('daily-workout-state')) };
}

function cardsFor(draft, history = canonicalHistory) {
  const ExerciseCard = () => null;
  const component = () => null;
  const mocks = {
    react: { useState: (initial) => [initial, () => {}] },
    'react-router-dom': { Link: component, useNavigate: () => () => {}, useParams: () => ({ id: draft.workoutId }) },
    '@/hooks/useRestTimerSettings': { useRestTimerSettings: () => [{}] },
    '@/hooks/useWorkoutSessionSettings': { useWorkoutSessionSettings: () => [{}] },
    '@/hooks/useWorkoutDuration': { getWorkoutDurationSeconds: () => 60, useWorkoutDuration: () => '00:01' },
    '@/hooks/useWorkoutPreviewNavigation': { useWorkoutPreviewNavigation: () => () => {} },
    '@/hooks/useWorkoutStore': { useWorkoutStore: () => ({ state: { activeDraft: draft, restTimer: {} },
      getPreviousExerciseSets: (id) => storage.getPreviousExercisePerformance(history,id),
    }) },
  };
  for (const name of ['ConfirmDialog','ExerciseIcon','MainNavigation','RestTimer','ViewBackButton']) mocks[`@/components/${name}`] = { [name]: component };
  mocks['@/components/ExerciseCard'] = { ExerciseCard };
  const { WorkoutPage } = loadModule('src/pages/WorkoutPage.tsx', mocks);
  const walk = (node) => !node || typeof node !== 'object' ? [] : [node, ...[node.props?.children].flat(Infinity).flatMap(walk)];
  return walk(WorkoutPage()).filter((n) => n.type === ExerciseCard).map((n) => n.props);
}

test('every new A/B/C exercise selects the principal canonical ID and immediately copies history with correct origins', () => {
  const before = JSON.stringify(canonicalHistory);
  for (const workout of workouts) {
    const draft = storage.createWorkoutDraft(workout,canonicalHistory);
    for (const [i,prescription] of workout.exercises.entries()) {
      const entry = draft.exercises[i];
      assert.equal(entry.exerciseId,prescription.id);
      assert.equal(entry.slotId,prescription.id);
      assert.equal(entry.prescribedExerciseId,prescription.prescribedExerciseId);
      assert.equal(entry.executedExerciseId,prescription.prescribedExerciseId);
      assert.equal(entry.executedExerciseName,exercisesById[prescription.prescribedExerciseId].name);
      assert.deepEqual(values(entry.sets),values(priorSets(prescription.prescribedExerciseId)));
      assert.ok(entry.sets.every((s) => !s.completed && s.loadSource === 'history' && s.repsSource === 'history'));
      assert.notEqual(entry.sets[0],priorSets(prescription.prescribedExerciseId)[0]);
    }
  }
  assert.equal(JSON.stringify(canonicalHistory),before);
});

test('principal ID wins over alternative ordering and composite labels for future prescriptions', () => {
  const prescription = { id: 'future-slot', prescribedExerciseId: 'hack-squat', prescribedExerciseIds: ['squat','hack-squat'], label: 'Agachamento ou Hack', sets: 3, repsMin: 8, repsMax: 12 };
  const draft = storage.createWorkoutDraft({ id: 'A', exercises: [prescription] },canonicalHistory);
  assert.equal(draft.exercises[0].executedExerciseId,'hack-squat');
  assert.equal(draft.exercises[0].executedExerciseName,'Hack Squat');
  assert.deepEqual(values(draft.exercises[0].sets),values(priorSets('hack-squat')));
});

test('without history all exercise types keep blank load and prescribed repetitions with their original sources', () => {
  for (const workout of workouts) for (const [i,entry] of storage.createWorkoutDraft(workout).exercises.entries()) {
    assert.ok(entry.sets.every((s) => s.load === '' && s.reps === String(workout.exercises[i].repsMin) && !s.completed && s.loadSource === 'empty' && s.repsSource === 'prescription'));
    assert.equal(entry.executedExerciseId,workout.exercises[i].prescribedExerciseId);
  }
});

test('the first active page render uses selected names, historical values and Trocar exercício for all alternatives', () => {
  for (const workout of workouts) {
    const cards = cardsFor(storage.createWorkoutDraft(workout,canonicalHistory));
    assert.equal(cards.length,workout.exercises.length);
    for (const [i,card] of cards.entries()) {
      const prescription = workout.exercises[i];
      assert.equal(card.exercise.name,exercisesById[prescription.prescribedExerciseId].name);
      assert.equal(card.sessionState.executedExerciseName,card.exercise.name);
      assert.deepEqual(card.previousSets,priorSets(prescription.prescribedExerciseId));
      assert.deepEqual(values(card.sessionState.sets),values(card.previousSets));
      if (prescription.prescribedExerciseIds?.length > 1) assert.equal(card.optionAction.label,'Trocar exercício');
      else assert.equal(card.optionAction,undefined);
    }
    const pushdown = cards.find((c) => c.sessionState.prescribedExerciseId === 'cable-pushdown');
    if (pushdown) assert.equal(pushdown.secondaryAction.label,'Substituir exercício');
  }
});

test('starting, recording and reopening a workout never needs an initial choice or keypad to save canonical squat history', () => {
  const session = store();
  let api = session.act((a) => a.startWorkout('A'));
  assert.deepEqual(values(exercise(api.state,'squat-hack').sets),values(priorSets('squat')));
  session.act((a) => a.updateSet('squat-hack',0,{ load: '61.5', reps: '18.5' }));
  session.act((a) => a.toggleSetCompleted('squat-hack',0));
  api = session.act((a) => a.finishWorkout());
  const recorded = api.state.history.at(-1).exercises[0];
  assert.equal(recorded.exerciseId,'squat');
  assert.equal(recorded.executedExerciseId,'squat');
  assert.equal(recorded.exerciseName,'Agachamento');
  api = session.act((a) => a.startWorkout('A'));
  assert.equal(exercise(api.state,'squat-hack').sets[0].load,'61.5');
  assert.equal(exercise(api.state,'squat-hack').sets[0].reps,'18.5');
  assert.equal(exercise(api.state,'squat-hack').sets[0].loadSource,'history');
  assert.deepEqual(session.saved().activeDraft,api.state.activeDraft);
});

test('option changes and return use only the chosen history, including missing alternative history', () => {
  for (const hasHackHistory of [true,false]) {
    const history = JSON.parse(JSON.stringify(canonicalHistory));
    if (!hasHackHistory) history[0].exercises = history[0].exercises.filter((e) => e.executedExerciseId !== 'hack-squat');
    const session = store({ history });
    session.act((a) => a.startWorkout('A'));
    let api = session.act((a) => a.selectExerciseOption('squat-hack','hack-squat'));
    const entry = exercise(api.state,'squat-hack');
    assert.equal(entry.executedExerciseId,'hack-squat');
    if (hasHackHistory) assert.deepEqual(values(entry.sets),values(priorSets('hack-squat')));
    else assert.ok(entry.sets.every((s) => s.load === '' && s.reps === '8' && s.loadSource === 'empty' && s.repsSource === 'prescription'));
    api = session.act((a) => a.selectExerciseOption('squat-hack','squat'));
    assert.deepEqual(values(exercise(api.state,'squat-hack').sets),values(priorSets('squat')));
    assert.equal(api.state.activeDraft.exercises[0].sets[0].repsSource,'history');
    assert.deepEqual(api.state.history,history);
  }
});

test('C pushdown initializes canonically, substitutes Press and returns without mixing histories', () => {
  const session = store();
  let api = session.act((a) => a.startWorkout('C'));
  assert.deepEqual(values(exercise(api.state,'cable-pushdown-c').sets),values(priorSets('cable-pushdown')));
  api = session.act((a) => a.replaceExercise('cable-pushdown-c','triceps-press'));
  const press = exercise(api.state,'cable-pushdown-c');
  assert.equal(press.prescribedExerciseId,'cable-pushdown');
  assert.equal(press.executedExerciseId,'triceps-press');
  assert.deepEqual(values(press.sets),values(priorSets('triceps-press')));
  assert.equal(cardsFor(api.state.activeDraft).find((c) => c.sessionState.exerciseId === 'cable-pushdown-c').exercise.name,'Triceps Press');
  api = session.act((a) => a.replaceExercise('cable-pushdown-c','cable-pushdown'));
  assert.deepEqual(values(exercise(api.state,'cable-pushdown-c').sets),values(priorSets('cable-pushdown')));
});

test('reload/resume preserve selected and legacy-unselected active drafts, including blank/manual/autofilled/completed sets and timer', () => {
  for (const legacy of [true,false]) {
    const draft = storage.createWorkoutDraft(workoutsById.A);
    const target = draft.exercises[0];
    if (legacy) {
      delete target.prescribedExerciseId; delete target.executedExerciseId; delete target.executedExerciseName;
    } else {
      target.executedExerciseId = 'hack-squat'; target.executedExerciseName = 'Hack Squat';
    }
    target.sets = [
      { load: '', reps: '', completed: false, loadSource: 'empty', repsSource: 'manual' },
      { load: '63.75', reps: '18.5', completed: true, loadSource: 'manual', repsSource: 'history' },
      { load: '12', reps: '9', completed: false, loadSource: 'autofilled', repsSource: 'autofilled' },
    ];
    if (legacy) { delete target.sets[2].loadSource; delete target.sets[2].repsSource; }
    const restTimer = { status: 'running', selectedSeconds: 90, endAt: Date.now() + 60000,
      automaticSource: { workoutId: 'A', startedAt: draft.startedAt, exerciseId: target.exerciseId, setIndex: 1, id: 'keep-rest' } };
    const session = store({ draft,restTimer });
    const loaded = session.api().state;
    assert.deepEqual(loaded.activeDraft,draft);
    const resumed = session.act((a) => a.startWorkout('A')).state;
    assert.equal(resumed.activeDraft,loaded.activeDraft);
    assert.equal(resumed.restTimer,loaded.restTimer);
    assert.deepEqual(session.saved().activeDraft,draft);
    assert.deepEqual(session.saved().history,canonicalHistory);
  }
});

test('default historical origins stay protected from assisted filling; eligible new fields still respect the preference', () => {
  const historical = store(); historical.act((a) => a.startWorkout('A'));
  const after = historical.act((a) => a.updateSet('squat-hack',0,{ load: '99' })).state;
  assert.equal(exercise(after,'squat-hack').sets[0].loadSource,'manual');
  assert.deepEqual(exercise(after,'squat-hack').sets.slice(1).map((s) => s.load),priorSets('squat').slice(1).map((s) => s.load));
  for (const enabled of [true,false]) {
    const session = store({ history: [],fillFollowingSets: enabled }); session.act((a) => a.startWorkout('A'));
    const { state } = session.act((a) => a.updateSet('squat-hack',0,{ load: '20',reps: '18.5' }));
    const subsequent = exercise(state,'squat-hack').sets[1];
    assert.equal(subsequent.load,enabled ? '20' : '');
    assert.equal(subsequent.reps,enabled ? '18.5' : '8');
    assert.equal(subsequent.loadSource,enabled ? 'autofilled' : 'empty');
  }
});
