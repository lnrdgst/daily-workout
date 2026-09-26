/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadModule(relativePath, mocks = {}) {
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
      return loadModule(`${base}${extension}`, mocks);
    }
    return require(name);
  };
  new Function('require', 'module', 'exports', 'window', outputText)(resolve, module, module.exports, mocks.window);
  return module.exports;
}

const storage = loadModule('src/utils/storage.ts');
const { workoutsById } = loadModule('src/data/workouts.ts');
const { resolveCanonicalExerciseId } = loadModule('src/data/exercises.ts');
const sets = (load, reps) => [{ load, reps, completed: true }];
const history = (exercises) => [{ type: 'strength', exercises }];

test('new drafts keep the stable slot and canonical prescribed/executed identities', () => {
  const draft = storage.createWorkoutDraft(workoutsById.A);
  const lateral = draft.exercises.find((exercise) => exercise.exerciseId === 'lateral-raise-a');
  assert.equal(lateral.slotId, 'lateral-raise-a');
  assert.equal(lateral.prescribedExerciseId, 'lateral-raise');
  assert.equal(lateral.executedExerciseId, 'lateral-raise');
  assert.equal(lateral.prescribedExerciseId, lateral.executedExerciseId);
});

test('identical exercises in A and C share canonical identity and autofill across workouts', () => {
  const history = [{ type: 'strength', exercises: [
    { exerciseId: 'lateral-raise', executedExerciseId: 'lateral-raise', sets: sets('10', '12') },
    { exerciseId: 'cable-pushdown', executedExerciseId: 'cable-pushdown', sets: sets('45', '10') },
  ] }];
  const draft = storage.createWorkoutDraft(workoutsById.C, history);
  const lateral = draft.exercises.find((exercise) => exercise.exerciseId === 'lateral-raise-c');
  assert.equal(workoutsById.A.exercises.find((exercise) => exercise.id === 'lateral-raise-a').prescribedExerciseId, 'lateral-raise');
  assert.equal(lateral.sets[0].load, '10');
  assert.equal(lateral.sets[0].reps, '12');
  const pushdown = draft.exercises.find((exercise) => exercise.exerciseId === 'cable-pushdown-c');
  assert.equal(pushdown.sets[0].load, '45');
  assert.equal(pushdown.sets[0].reps, '10');
});

test('cable pushdown aliases legacy A/C records but distinct canonical exercises never contaminate autofill', () => {
  const legacy = [{ exercises: [{ exerciseId: 'cable-pushdown-a', sets: sets('45', '10') }] }];
  assert.deepEqual(storage.getPreviousExercisePerformance(legacy, 'cable-pushdown'), sets('45', '10'));
  assert.equal(storage.getPreviousExercisePerformance(legacy, 'triceps-press'), null);
  assert.equal(resolveCanonicalExerciseId('leg-curl-a'), 'leg-curl-lying-or-seated');
  assert.notEqual(resolveCanonicalExerciseId('leg-curl-a'), 'lying-leg-curl');
  assert.notEqual(resolveCanonicalExerciseId('leg-curl-a'), 'seated-leg-curl');
});

test('new history snapshots prescribed and executed identities while preserving workout origin', () => {
  const draft = storage.createWorkoutDraft(workoutsById.C);
  const entry = storage.buildHistoryEntry(draft);
  const pushdown = entry.exercises.find((exercise) => exercise.executedExerciseId === 'cable-pushdown');
  assert.equal(entry.workoutId, 'C');
  assert.equal(pushdown.prescribedExerciseId, 'cable-pushdown');
  assert.equal(pushdown.executedExerciseId, 'cable-pushdown');
  assert.equal(pushdown.exerciseId, 'cable-pushdown');
  assert.equal(pushdown.prescribedExerciseName, 'Tríceps na polia');
  assert.equal(pushdown.executedExerciseName, 'Tríceps na polia');
});

test('legacy drafts remain readable without normalization or localStorage reset', () => {
  const legacyDraft = { type: 'strength', workoutId: 'A', startedAt: '2026-01-01T10:00:00.000Z', exercises: [{ exerciseId: 'squat-hack', sets: sets('30', '8') }] };
  const persistent = loadModule('src/utils/storage.ts', { window: { localStorage: { getItem: () => JSON.stringify({ activeDraft: legacyDraft, history: [] }) } } });
  assert.deepEqual(persistent.loadAppState().activeDraft, legacyDraft);
});

test('prescribed alternatives remain unselected until the session chooses a physical exercise', () => {
  const draft = storage.createWorkoutDraft(workoutsById.C, [{ exercises: [{ exerciseId: 'leg-curl-a', sets: sets('55', '10') }] }]);
  const curl = draft.exercises.find((exercise) => exercise.exerciseId === 'leg-curl-c');
  assert.deepEqual(curl.prescribedExerciseIds, ['lying-leg-curl', 'seated-leg-curl']);
  assert.equal(curl.executedExerciseId, undefined);
  assert.equal(curl.sets[0].load, '');
  assert.equal(curl.sets[0].reps, '10');
  assert.equal(curl.slotId, 'leg-curl-c');
});

test('legacy composites stay separate from explicit canonical triceps and machine row identities', () => {
  const legacy = history([
    { exerciseId: 'triceps-french', sets: sets('40', '10') },
    { exerciseId: 'machine-row', sets: sets('55', '12') },
  ]);
  const legacyBeforeLookup = JSON.stringify(legacy);
  const canonical = history([
    { exerciseId: 'triceps-french', executedExerciseId: 'triceps-french', sets: sets('30', '15') },
    { exerciseId: 'machine-row', executedExerciseId: 'machine-row', sets: sets('60', '10') },
  ]);

  assert.deepEqual(storage.getPreviousExercisePerformance(legacy, 'triceps-french-or-rope'), sets('40', '10'));
  assert.equal(storage.getPreviousExercisePerformance(legacy, 'triceps-french'), null);
  assert.deepEqual(storage.getPreviousExercisePerformance(canonical, 'triceps-french'), sets('30', '15'));
  assert.equal(storage.getPreviousExercisePerformance(canonical, 'triceps-french-or-rope'), null);
  assert.deepEqual(storage.getPreviousExercisePerformance(legacy, 'machine-row-or-t-bar'), sets('55', '12'));
  assert.equal(storage.getPreviousExercisePerformance(legacy, 'machine-row'), null);
  assert.deepEqual(storage.getPreviousExercisePerformance(canonical, 'machine-row'), sets('60', '10'));
  assert.equal(storage.getPreviousExercisePerformance(canonical, 'machine-row-or-t-bar'), null);
  assert.equal(JSON.stringify(legacy), legacyBeforeLookup);
});

test('canonical prescribed alternatives only read their own explicit history, never a legacy composite', () => {
  const pairs = [
    ['squat-hack', 'squat-or-hack', 'squat', 'hack-squat'],
    ['leg-curl-a', 'leg-curl-lying-or-seated', 'lying-leg-curl', 'seated-leg-curl'],
    ['triceps-french', 'triceps-french-or-rope', 'triceps-french', 'triceps-rope'],
    ['machine-row', 'machine-row-or-t-bar', 'machine-row', 't-bar-row'],
  ];

  for (const [legacyId, compositeId, firstOption, secondOption] of pairs) {
    const legacy = history([{ exerciseId: legacyId, sets: sets('99', '99') }]);
    const first = history([{ exerciseId: firstOption, executedExerciseId: firstOption, sets: sets('10', '10') }]);
    const second = history([{ exerciseId: secondOption, executedExerciseId: secondOption, sets: sets('20', '20') }]);
    assert.deepEqual(storage.getPreviousExercisePerformance(legacy, compositeId), sets('99', '99'), `${legacyId} remains legacy`);
    assert.equal(storage.getPreviousExercisePerformance(legacy, firstOption), null, `${legacyId} does not fill ${firstOption}`);
    assert.equal(storage.getPreviousExercisePerformance(legacy, secondOption), null, `${legacyId} does not fill ${secondOption}`);
    assert.deepEqual(storage.getPreviousExercisePerformance(first, firstOption), sets('10', '10'));
    assert.equal(storage.getPreviousExercisePerformance(first, secondOption), null);
    assert.deepEqual(storage.getPreviousExercisePerformance(second, secondOption), sets('20', '20'));
    assert.equal(storage.getPreviousExercisePerformance(second, firstOption), null);
  }
});

test('changing prescribed options rebuilds sets from the new canonical history or prescription', () => {
  const prescription = workoutsById.B.exercises.find((exercise) => exercise.id === 'triceps-french');
  const frenchHistory = [
    { load: '30', reps: '15', completed: true },
    { load: '40', reps: '10', completed: true },
    { load: '40', reps: '8', completed: true },
  ];
  const frenchSets = storage.createExerciseSets(prescription, frenchHistory);
  const ropeSets = storage.createExerciseSets(prescription, null);
  const frenchAgain = storage.createExerciseSets(prescription, frenchHistory);

  assert.deepEqual(frenchSets.map(({ load, reps }) => ({ load, reps })), [
    { load: '30', reps: '15' }, { load: '40', reps: '10' }, { load: '40', reps: '8' },
  ]);
  assert.deepEqual(ropeSets.map(({ load, reps, completed }) => ({ load, reps, completed })), Array.from({ length: 3 }, () => ({ load: '', reps: '10', completed: false })));
  assert.ok(ropeSets.every((set) => set.loadSource === 'empty' && set.repsSource === 'prescription'));
  assert.deepEqual(frenchAgain.map(({ load, reps }) => ({ load, reps })), [
    { load: '30', reps: '15' }, { load: '40', reps: '10' }, { load: '40', reps: '8' },
  ]);
});

test('an unselected multi-option card does not request its first option history', () => {
  const ExerciseCard = () => null;
  const component = () => null;
  const draft = storage.createWorkoutDraft(workoutsById.B);
  const calls = [];
  const mocks = {
    react: { useState: () => [null, () => {}] },
    'react-router-dom': { Link: component, useNavigate: () => () => {}, useParams: () => ({ id: 'B' }) },
    '@/components/ConfirmDialog': { ConfirmDialog: component },
    '@/components/ExerciseCard': { ExerciseCard },
    '@/components/ExerciseIcon': { ExerciseIcon: component },
    '@/components/MainNavigation': { MainNavigation: component },
    '@/components/RestTimer': { RestTimer: component },
    '@/components/ViewBackButton': { ViewBackButton: component },
    '@/hooks/useRestTimerSettings': { useRestTimerSettings: () => [{}] },
    '@/hooks/useWorkoutSessionSettings': { useWorkoutSessionSettings: () => [{ autoStartRestTimer: false }] },
    '@/hooks/useWorkoutDuration': { getWorkoutDurationSeconds: () => 60, useWorkoutDuration: () => '00:01' },
    '@/hooks/useWorkoutStore': { useWorkoutStore: () => ({
      state: { activeDraft: draft, restTimer: {} }, startWorkout: () => {}, updateSet: () => {}, toggleSetCompleted: () => {}, undoSetCompleted: () => {}, startRestTimer: () => {}, finishWorkout: () => {}, discardDraft: () => {},
      getPreviousExerciseSets: (id) => { calls.push(id); return sets('10', '10'); }, selectExerciseOption: () => {}, replaceExercise: () => {},
    }) },
    '@/hooks/useWorkoutPreviewNavigation': { useWorkoutPreviewNavigation: () => () => {} },
    '@/utils/workoutProgress': { getWorkoutProgress: () => ({ completedExercises: 0, totalExercises: 7, percentage: 0 }) },
    '@/utils/sessions': { getSessionPath: () => '/' },
    '@/utils/setCompletion': { getRelatedAutomaticRestId: () => null },
  };
  const { WorkoutPage } = loadModule('src/pages/WorkoutPage.tsx', mocks);
  const walk = (node) => !node || typeof node !== 'object' ? [] : [node, ...[].concat(node.props?.children ?? []).flat(Infinity).flatMap(walk)];
  const cards = walk(WorkoutPage()).filter((node) => node.type === ExerciseCard);
  const tricepsCard = cards.find((node) => node.props.sessionState.exerciseId === 'triceps-french');

  assert.equal(tricepsCard.props.previousSets, null);
  assert.ok(!calls.includes('triceps-french'));
});

test('explicit canonical history survives persistence and rehydration', () => {
  const state = { history: history([{ exerciseId: 'triceps-french', executedExerciseId: 'triceps-french', sets: sets('30', '15') }]) };
  const persistent = loadModule('src/utils/storage.ts', { window: { localStorage: { getItem: () => JSON.stringify(state) } } });
  const rehydrated = persistent.loadAppState();
  assert.deepEqual(persistent.getPreviousExercisePerformance(rehydrated.history, 'triceps-french'), sets('30', '15'));
  assert.equal(persistent.getPreviousExercisePerformance(rehydrated.history, 'triceps-rope'), null);
});
