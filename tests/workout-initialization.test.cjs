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
const { legacyWorkouts } = loadModule('src/data/legacyWorkouts.ts');
const { getWorkoutProgress } = loadModule('src/utils/workoutProgress.ts');
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
function store({ history = canonicalHistory, draft = null, restTimer = storage.defaultRestTimerState, fillFollowingSets = true, published = workoutsById } = {}) {
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
  const { WorkoutStoreProvider } = loadModule('src/hooks/useWorkoutStore.tsx', { react: hooks, '@/data/workouts': { workoutsById: published } }, {
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

function cardsFor(draft, history = canonicalHistory, published = workoutsById) {
  const ExerciseCard = () => null;
  const component = () => null;
  const mocks = {
    react: { useState: (initial) => [initial, () => {}] },
    '@/data/workouts': { workoutsById: published },
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

test('the five split workouts each have five exercises and fifteen sets with the approved rep ranges', () => {
  const expected = {
    A: [['lat-pulldown', 8, 12], ['seated-row', 8, 12], ['bent-over-row', 8, 12], ['barbell-curl', 10, 12], ['hammer-curl', 10, 12]],
    B: [['bench-press', 8, 12], ['incline-dumbbell-press', 8, 12], ['lateral-raise', 12, 15], ['cable-pushdown', 10, 15], ['triceps-rope', 10, 15]],
    C: [['squat', 8, 12], ['stiff', 8, 12], ['lying-leg-curl', 10, 15], ['leg-press', 10, 12], ['standing-calf-raise', 12, 15]],
    D: [['chest-press', 8, 12], ['t-bar-row', 8, 12], ['lat-pulldown', 8, 12], ['scott-curl', 10, 12], ['triceps-french', 10, 15]],
    E: [['leg-press', 10, 12], ['seated-leg-curl', 10, 15], ['stiff', 8, 12], ['standing-calf-raise', 12, 15], ['crunch', 10, 15]],
  };
  assert.deepEqual(workouts.map(({ id }) => id), Object.keys(expected));
  for (const workout of workouts) {
    const draft = storage.createWorkoutDraft(workout);
    assert.equal(draft.planVersion, 'ABCDE');
    assert.deepEqual(workout.exercises.map(({ prescribedExerciseId, repsMin, repsMax }) => [prescribedExerciseId, repsMin, repsMax]), expected[workout.id]);
    assert.deepEqual(draft.exercises.map(({ sets }) => sets.length), [3, 3, 3, 3, 3]);
  }
});

test('a saved A keeps its machine row and its loads stay separate from the new bent-over row', () => {
  const previousWorkout = {
    ...workoutsById.A,
    exercises: workoutsById.A.exercises.map((item) => item.id === 'a-bent-over-row'
      ? { id: 'a-machine-row', prescribedExerciseId: 'machine-row', sets: 3, repsMin: 8, repsMax: 12 }
      : item),
  };
  const draft = storage.createWorkoutDraft(previousWorkout);
  const machineSet = { load: '55', reps: '12', completed: true };
  draft.exercises.find(({ slotId }) => slotId === 'a-machine-row').sets[0] = { ...machineSet, loadSource: 'manual', repsSource: 'manual' };
  const session = store({ draft, history: [] });
  session.act((api) => api.startWorkout('A'));
  const resumed = session.saved().activeDraft;
  assert.deepEqual(resumed, draft);
  const card = cardsFor(resumed, []).find(({ sessionState }) => sessionState.slotId === 'a-machine-row');
  assert.equal(card.exercise.name, 'Remada máquina');
  assert.equal(card.exercise.repsMin, 8);
  assert.equal(card.exercise.repsMax, 12);
  session.act((api) => assert.equal(api.finishWorkout(), true));
  const [previousEntry] = session.saved().history;
  const previousRow = previousEntry.exercises.find(({ executedExerciseId }) => executedExerciseId === 'machine-row');
  assert.deepEqual(previousRow.sets[0], machineSet);

  const { state } = session.act((api) => api.startWorkout('A'));
  const newRow = exercise(state, 'a-bent-over-row');
  assert.equal(newRow.executedExerciseName, 'Remada curvada');
  assert.ok(newRow.sets.every(({ load, reps, loadSource }) => load === '' && reps === '8' && loadSource === 'empty'));
  session.act((api) => api.updateSet('a-bent-over-row', 0, { load: '30', reps: '10' }));
  session.act((api) => assert.equal(api.finishWorkout(), true));
  const { history } = session.saved();
  assert.deepEqual(history[0], previousEntry);
  assert.deepEqual(storage.getPreviousExercisePerformance(history, 'machine-row')[0], machineSet);
  assert.deepEqual(storage.getPreviousExercisePerformance(history, 'bent-over-row')[0], { load: '30', reps: '10', completed: false });
});

test('a saved B keeps its shoulder press and new drafts use the canonical rope history', () => {
  const previousWorkout = {
    ...workoutsById.B,
    exercises: [
      ...workoutsById.B.exercises.slice(0, 3),
      { id: 'b-shoulder-press', prescribedExerciseId: 'shoulder-press', sets: 3, repsMin: 8, repsMax: 12 },
      workoutsById.B.exercises.find(({ id }) => id === 'b-cable-pushdown'),
    ],
  };
  const draft = storage.createWorkoutDraft(previousWorkout);
  const shoulderSet = { load: '32', reps: '10', completed: true };
  draft.exercises.find(({ slotId }) => slotId === 'b-shoulder-press').sets[0] = shoulderSet;
  const session = store({ draft });

  session.act((api) => api.startWorkout('B'));
  const resumed = session.saved().activeDraft;
  assert.deepEqual(resumed, draft);
  const cards = cardsFor(resumed);
  assert.deepEqual(cards.map(({ sessionState }) => sessionState.slotId), draft.exercises.map(({ slotId }) => slotId));
  assert.equal(cards[3].exercise.name, 'Desenvolvimento');
  assert.deepEqual(cards[3].sessionState.sets[0], shoulderSet);

  session.act((api) => assert.equal(api.finishWorkout(), true));
  const { history } = session.saved();
  assert.deepEqual(history.slice(0, -1), canonicalHistory);
  assert.deepEqual(storage.getPreviousExercisePerformance(history, 'shoulder-press')[0], shoulderSet);

  const { state } = session.act((api) => api.startWorkout('B'));
  const rope = exercise(state, 'b-triceps-rope');
  assert.equal(exercise(state, 'b-shoulder-press'), undefined);
  assert.equal(rope.executedExerciseId, 'triceps-rope');
  assert.deepEqual(values(rope.sets), values(priorSets('triceps-rope')));
});

test('every new exercise selects the principal canonical ID and immediately copies history with correct origins', () => {
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
  let api = session.act((a) => a.startWorkout('C'));
  assert.deepEqual(values(exercise(api.state,'c-squat').sets),values(priorSets('squat')));
  session.act((a) => a.updateSet('c-squat',0,{ load: '61.5', reps: '18.5' }));
  session.act((a) => a.toggleSetCompleted('c-squat',0));
  api = session.act((a) => a.finishWorkout());
  const recorded = api.state.history.at(-1).exercises[0];
  assert.equal(recorded.exerciseId,'squat');
  assert.equal(recorded.executedExerciseId,'squat');
  assert.equal(recorded.exerciseName,'Agachamento');
  api = session.act((a) => a.startWorkout('C'));
  assert.equal(exercise(api.state,'c-squat').sets[0].load,'61.5');
  assert.equal(exercise(api.state,'c-squat').sets[0].reps,'18.5');
  assert.equal(exercise(api.state,'c-squat').sets[0].loadSource,'history');
  assert.deepEqual(session.saved().activeDraft,api.state.activeDraft);
});

test('option changes and return use only the chosen history, including missing alternative history', () => {
  for (const hasHackHistory of [true,false]) {
    const history = JSON.parse(JSON.stringify(canonicalHistory));
    if (!hasHackHistory) history[0].exercises = history[0].exercises.filter((e) => e.executedExerciseId !== 'hack-squat');
    const session = store({ history });
    session.act((a) => a.startWorkout('C'));
    let api = session.act((a) => a.selectExerciseOption('c-squat','hack-squat'));
    const entry = exercise(api.state,'c-squat');
    assert.equal(entry.executedExerciseId,'hack-squat');
    if (hasHackHistory) assert.deepEqual(values(entry.sets),values(priorSets('hack-squat')));
    else assert.ok(entry.sets.every((s) => s.load === '' && s.reps === '8' && s.loadSource === 'empty' && s.repsSource === 'prescription'));
    api = session.act((a) => a.selectExerciseOption('c-squat','squat'));
    assert.deepEqual(values(exercise(api.state,'c-squat').sets),values(priorSets('squat')));
    assert.equal(api.state.activeDraft.exercises[0].sets[0].repsSource,'history');
    assert.deepEqual(api.state.history,history);
  }
});

test('B pushdown substitutes Press without offering French or rope as prescribed options', () => {
  const session = store();
  let api = session.act((a) => a.startWorkout('B'));
  const initial = exercise(api.state,'b-cable-pushdown');
  assert.deepEqual(values(initial.sets),values(priorSets('cable-pushdown')));
  assert.deepEqual(initial.prescribedExerciseIds, ['cable-pushdown']);
  api = session.act((a) => a.replaceExercise('b-cable-pushdown','triceps-press'));
  const press = exercise(api.state,'b-cable-pushdown');
  assert.equal(press.prescribedExerciseId,'cable-pushdown');
  assert.equal(press.executedExerciseId,'triceps-press');
  assert.deepEqual(values(press.sets),values(priorSets('triceps-press')));
  assert.equal(cardsFor(api.state.activeDraft).find((c) => c.sessionState.exerciseId === 'b-cable-pushdown').exercise.name,'Triceps Press');
  api = session.act((a) => a.replaceExercise('b-cable-pushdown','cable-pushdown'));
  assert.deepEqual(values(exercise(api.state,'b-cable-pushdown').sets),values(priorSets('cable-pushdown')));
});

test('reload/resume preserve selected and legacy-unselected active drafts, including blank/manual/autofilled/completed sets and timer', () => {
  for (const legacy of [true,false]) {
    const draft = storage.createWorkoutDraft(legacy ? legacyWorkouts[0] : workoutsById.C);
    const target = draft.exercises[0];
    if (legacy) {
      delete target.prescription;
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
      automaticSource: { workoutId: draft.workoutId, startedAt: draft.startedAt, exerciseId: target.exerciseId, setIndex: 1, id: 'keep-rest' } };
    const session = store({ draft,restTimer });
    const loaded = session.api().state;
    assert.deepEqual(loaded.activeDraft,draft);
    const resumed = session.act((a) => a.startWorkout(draft.workoutId)).state;
    assert.equal(resumed.activeDraft,loaded.activeDraft);
    assert.equal(resumed.restTimer,loaded.restTimer);
    assert.deepEqual(session.saved().activeDraft,draft);
    assert.deepEqual(session.saved().history,canonicalHistory);
  }
});

test('old ABC drafts survive a changed catalog through rehydration, rendering, progress and completion', () => {
  for (const workout of legacyWorkouts) {
    const draft = {
      workoutId: workout.id,
      startedAt: new Date(Date.now() - 60000).toISOString(),
      exercises: workout.exercises.map(({ id, sets }) => ({
        exerciseId: id,
        sets: Array.from({ length: sets }, () => ({ load: '27.5', reps: '12', completed: false })),
      })),
    };
    draft.exercises[0].sets.forEach((set) => Object.assign(set, { completed: true, loadSource: 'manual', repsSource: 'autofilled' }));
    const restTimer = { status: 'running', selectedSeconds: 90, endAt: Date.now() + 60000,
      automaticSource: { id: 'legacy-rest', workoutId: workout.id, startedAt: draft.startedAt, exerciseId: draft.exercises[0].exerciseId, setIndex: 2 },
    };
    const published = { [workout.id]: { ...workout, name: 'Nova ficha', exercises: [] } };
    const h = store({ draft, restTimer, published });
    h.act((api) => { api.startWorkout(workout.id); api.startWorkout(workout.id === 'A' ? 'B' : 'A'); });
    const saved = h.saved();
    assert.deepEqual(saved.activeDraft, draft);
    assert.deepEqual(saved.restTimer, restTimer);
    assert.deepEqual(cardsFor(saved.activeDraft, canonicalHistory, published).map((card) => card.exercise.id), draft.exercises.map((entry) => entry.exerciseId));
    assert.deepEqual(getWorkoutProgress(saved.activeDraft), { totalExercises: 7, completedExercises: 1, percentage: 14 });

    const reloaded = store({ draft: saved.activeDraft, restTimer: saved.restTimer, history: saved.history, published });
    reloaded.act((api) => assert.equal(api.finishWorkout(), true));
    const result = reloaded.saved();
    assert.deepEqual(result.history.slice(0, -1), saved.history);
    const entry = result.history.at(-1);
    assert.equal(entry.workoutName, workout.name);
    assert.equal(entry.startedAt, draft.startedAt);
    assert.deepEqual(entry.exercises.map((item) => item.sets), draft.exercises.map((item) => item.sets.map(({ load, reps, completed }) => ({ load, reps, completed }))));
    assert.equal(result.activeDraft, null);
    assert.equal(result.restTimer.status, 'ready');
    for (const [index, prescription] of workout.exercises.entries()) {
      if (prescription.prescribedExerciseIds) {
        assert.notEqual(entry.exercises[index].executedExerciseId, prescription.prescribedExerciseId);
      }
    }
  }
});

test('frozen prescriptions retain options, substitutions and rep ranges after the published workout changes', () => {
  const workout = legacyWorkouts[0];
  const draft = storage.createWorkoutDraft(workout, canonicalHistory);
  const published = { A: { ...workout, name: 'Outra ficha', exercises: [] } };
  const h = store({ draft, published });
  const swapped = h.act((api) => {
    api.selectExerciseOption('squat-hack', 'hack-squat');
    api.selectExerciseOption('squat-hack', 'bench-press');
    api.replaceExercise('cable-pushdown-a', 'triceps-press');
    api.replaceExercise('cable-pushdown-a', 'triceps-rope');
  });
  assert.equal(exercise(swapped.state, 'squat-hack').executedExerciseId, 'hack-squat');
  assert.equal(exercise(swapped.state, 'cable-pushdown-a').executedExerciseId, 'triceps-press');
  const cards = cardsFor(h.saved().activeDraft, canonicalHistory, published);
  assert.equal(cards[0].exercise.repsMin, 8);
  assert.equal(cards[0].exercise.repsMax, 12);
  assert.equal(cards[0].exercise.name, 'Hack Squat');
  h.act((api) => { api.finishWorkout(); });
  assert.equal(h.saved().history.at(-1).workoutName, workout.name);
  assert.equal(h.saved().history.at(-1).exercises[0].executedExerciseId, 'hack-squat');
});

test('the previous three-exercise D resumes and finalizes from its frozen prescription', () => {
  const previousWorkout = {
    ...workoutsById.D,
    exercises: [
      { id: 'd-incline-dumbbell-press', prescribedExerciseId: 'incline-dumbbell-press', sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'd-machine-row', prescribedExerciseId: 'machine-row', prescribedExerciseIds: ['machine-row', 't-bar-row'], sets: 3, repsMin: 8, repsMax: 12 },
      { id: 'd-shoulder-press', prescribedExerciseId: 'shoulder-press', sets: 3, repsMin: 8, repsMax: 12 },
    ],
  };
  const draft = storage.createWorkoutDraft(previousWorkout);
  const firstExercise = draft.exercises[0];
  firstExercise.sets.forEach((set) => { set.completed = true; });
  firstExercise.sets[0] = { load: '27.5', reps: '10', completed: true, loadSource: 'manual', repsSource: 'autofilled' };
  const restTimer = { status: 'running', selectedSeconds: 90, endAt: Date.now() + 60000,
    automaticSource: { id: 'previous-d-rest', workoutId: 'D', startedAt: draft.startedAt, exerciseId: firstExercise.exerciseId, setIndex: 0 },
  };
  const session = store({ draft, restTimer });
  session.act((api) => { api.startWorkout('D'); api.startWorkout('E'); });
  const saved = session.saved();
  assert.deepEqual(saved.activeDraft, draft);
  assert.deepEqual(saved.restTimer, restTimer);
  const cards = cardsFor(saved.activeDraft);
  assert.deepEqual(cards.map(({ sessionState }) => sessionState.executedExerciseId), ['incline-dumbbell-press', 'machine-row', 'shoulder-press']);
  assert.deepEqual(cards[1].exercise.prescribedExerciseIds, ['machine-row', 't-bar-row']);
  assert.deepEqual(getWorkoutProgress(saved.activeDraft), { totalExercises: 3, completedExercises: 1, percentage: 33 });

  session.act((api) => assert.equal(api.finishWorkout(), true));
  const result = session.saved();
  assert.equal(result.activeDraft, null);
  assert.deepEqual(result.history.slice(0, -1), saved.history);
  const entry = result.history.at(-1);
  assert.equal(entry.planVersion, 'ABCDE');
  assert.equal(entry.startedAt, draft.startedAt);
  assert.deepEqual(entry.exercises.map(({ executedExerciseId, sets }) => [executedExerciseId, sets.length]), [
    ['incline-dumbbell-press', 3], ['machine-row', 3], ['shoulder-press', 3],
  ]);
  assert.deepEqual(entry.exercises[0].sets[0], { load: '27.5', reps: '10', completed: true });
  const next = storage.createWorkoutDraft(workoutsById.B, result.history);
  assert.equal(next.exercises.find(({ executedExerciseId }) => executedExerciseId === 'incline-dumbbell-press').sets[0].load, '27.5');
});

test('new D and E preserve their alternative, series and automatic rest when rehydrated and finalized', () => {
  for (const [id, slotId, alternative] of [['D', 'd-machine-row', 'machine-row'], ['E', 'e-leg-curl', 'lying-leg-curl']]) {
    const h = store();
    h.act((api) => api.startWorkout(id));
    const swapped = h.act((api) => api.selectExerciseOption(slotId, alternative));
    assert.deepEqual(values(exercise(swapped.state, slotId).sets), values(priorSets(alternative)));
    h.act((api) => api.toggleSetCompleted(slotId, 0));
    const startedAt = h.saved().activeDraft.startedAt;
    h.act((api) => api.startRestTimer(60, { workoutId: id, startedAt, exerciseId: slotId, setIndex: 0 }));
    const saved = h.saved();
    const reloaded = store({ draft: saved.activeDraft, restTimer: saved.restTimer, history: saved.history });
    assert.deepEqual(reloaded.saved().activeDraft, saved.activeDraft);
    assert.deepEqual(reloaded.saved().restTimer, saved.restTimer);
    assert.equal(reloaded.saved().restTimer.automaticSource.workoutId, id);
    assert.equal(getWorkoutProgress(reloaded.saved().activeDraft).totalExercises, 5);
    reloaded.act((api) => api.finishWorkout());
    const result = reloaded.saved().history.at(-1);
    assert.equal(result.planVersion, 'ABCDE');
    assert.equal(result.workoutId, id);
    assert.equal(result.exercises.length, 5);
    assert.equal(result.exercises[1].executedExerciseId, alternative);
    assert.equal(result.exercises[1].sets[0].completed, true);
  }
});

test('default historical origins stay protected from assisted filling; eligible new fields still respect the preference', () => {
  const historical = store(); historical.act((a) => a.startWorkout('C'));
  const after = historical.act((a) => a.updateSet('c-squat',0,{ load: '99' })).state;
  assert.equal(exercise(after,'c-squat').sets[0].loadSource,'manual');
  assert.deepEqual(exercise(after,'c-squat').sets.slice(1).map((s) => s.load),priorSets('squat').slice(1).map((s) => s.load));
  for (const enabled of [true,false]) {
    const session = store({ history: [],fillFollowingSets: enabled }); session.act((a) => a.startWorkout('C'));
    const { state } = session.act((a) => a.updateSet('c-squat',0,{ load: '20',reps: '18.5' }));
    const subsequent = exercise(state,'c-squat').sets[1];
    assert.equal(subsequent.load,enabled ? '20' : '');
    assert.equal(subsequent.reps,enabled ? '18.5' : '8');
    assert.equal(subsequent.loadSource,enabled ? 'autofilled' : 'empty');
  }
});
