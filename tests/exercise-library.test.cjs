/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadModule(relativePath, mocks = {}) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  const resolve = (name) => {
    if (name in mocks) return mocks[name];
    if (name.startsWith('@/')) return loadModule(`src/${name.slice(2)}.ts`, mocks);
    return require(name);
  };
  new Function('require', 'module', 'exports', 'window', outputText)(resolve, module, module.exports, mocks.window);
  return module.exports;
}

const storage = loadModule('src/utils/storage.ts');
const { workoutsById } = loadModule('src/data/workouts.ts');
const { resolveCanonicalExerciseId } = loadModule('src/data/exercises.ts');
const sets = (load, reps) => [{ load, reps, completed: true }];

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
