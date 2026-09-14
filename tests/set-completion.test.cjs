/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(relativePath, window) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  const resolve = (name) => name.startsWith('@/') ? load(`src/${name.slice(2)}.ts`, window) : require(name);
  new Function('require', 'module', 'exports', 'window', outputText)(resolve, module, module.exports, window);
  return module.exports;
}

const storage = load('src/utils/storage.ts');
const { workoutsById } = load('src/data/workouts.ts');
const { getWorkoutProgress } = load('src/utils/workoutProgress.ts');
const { getRelatedAutomaticRestId, undoCompletedSet } = load('src/utils/setCompletion.ts');
const now = Date.now();
function fixture() {
  const draft = storage.createWorkoutDraft(workoutsById.A);
  draft.exercises[0].sets.forEach((set) => { set.completed = true; });
  const target = { workoutId: 'A', startedAt: draft.startedAt, exerciseId: draft.exercises[0].exerciseId, setIndex: 0 };
  const state = { ...storage.loadAppState(), activeDraft: draft,
    restTimer: { status: 'running', selectedSeconds: 90, endAt: now + 90000, automaticSource: { ...target, id: 'automatic-1' } },
  };
  return { state, target };
}

test('only an unexpired automatic rest owned by the exact session and set is related', () => {
  const { state, target } = fixture();
  assert.equal(getRelatedAutomaticRestId(state, target, now), 'automatic-1');
  for (const changed of [
    { ...target, setIndex: 1 }, { ...target, exerciseId: 'other' }, { ...target, workoutId: 'B' }, { ...target, startedAt: 'old-session' },
  ]) assert.equal(getRelatedAutomaticRestId(state, changed, now), null);
  for (const restTimer of [
    { ...state.restTimer, automaticSource: undefined }, { ...state.restTimer, status: 'finished' },
    { ...state.restTimer, status: 'ready' }, { ...state.restTimer, endAt: now },
  ]) assert.equal(getRelatedAutomaticRestId({ ...state, restTimer }, target, now), null);
});

test('undo-only keeps countdown and presets and retires the completion ownership', () => {
  const { state, target } = fixture();
  const before = JSON.stringify(state);
  const next = undoCompletedSet(state, target, undefined, now);
  assert.equal(next.activeDraft.exercises[0].sets[0].completed, false);
  assert.equal(next.restTimer.status, 'running');
  assert.equal(next.restTimer.endAt, state.restTimer.endAt);
  assert.equal(next.restTimer.selectedSeconds, 90);
  assert.equal(next.restTimer.automaticSource, undefined);
  assert.equal(JSON.stringify(state), before);
  assert.equal(next.history, state.history);
  assert.equal(next.activeDraft.exercises[0].sets[0].reps, state.activeDraft.exercises[0].sets[0].reps);
});

test('combined undo cancels only the captured automatic rest and recalculates progress', () => {
  const { state, target } = fixture();
  assert.equal(getWorkoutProgress(state.activeDraft).completedExercises, 1);
  const next = undoCompletedSet(state, target, 'automatic-1', now);
  assert.equal(next.restTimer.status, 'ready');
  assert.equal(next.restTimer.endAt, null);
  assert.equal(next.activeDraft.exercises[0].sets.filter((set) => set.completed).length, 2);
  assert.equal(getWorkoutProgress(next.activeDraft).completedExercises, 0);
  assert.equal(getWorkoutProgress(next.activeDraft).percentage, 0);
});

test('manual, other-set and replacement timers are never canceled by a stale confirmation', () => {
  const { state, target } = fixture();
  for (const automaticSource of [undefined, { ...state.restTimer.automaticSource, setIndex: 1 }, { ...state.restTimer.automaticSource, id: 'automatic-2' }]) {
    const current = { ...state, restTimer: { ...state.restTimer, automaticSource } };
    const next = undoCompletedSet(current, target, 'automatic-1', now);
    assert.equal(next.restTimer.status, 'running');
    assert.equal(next.restTimer.endAt, current.restTimer.endAt);
    assert.equal(next.activeDraft.exercises[0].sets[0].completed, false);
    if (!automaticSource || automaticSource.setIndex === 1) assert.equal(next.restTimer, current.restTimer);
  }
});

test('expired timers and other sessions cannot be canceled; repeated undo cannot mark the set again', () => {
  const { state, target } = fixture();
  const expired = { ...state, restTimer: { ...state.restTimer, status: 'finished', endAt: null } };
  assert.equal(undoCompletedSet(expired, target, 'automatic-1', now).restTimer.status, 'finished');
  assert.equal(undoCompletedSet(state, { ...target, startedAt: 'other-session' }, 'automatic-1', now), state);
  const next = undoCompletedSet(state, target, 'automatic-1', now);
  assert.equal(undoCompletedSet(next, target, 'automatic-1', now), next);
});

test('association survives active-state rehydration but never enters final history', () => {
  const { state, target } = fixture();
  const persistent = load('src/utils/storage.ts', { localStorage: { getItem: () => JSON.stringify(state) } });
  const restored = persistent.loadAppState();
  assert.equal(getRelatedAutomaticRestId(restored, target, now), 'automatic-1');
  assert.equal(JSON.stringify(storage.buildHistoryEntry(restored.activeDraft)).includes('automaticSource'), false);
  const legacy = { ...state, restTimer: { status: 'running', selectedSeconds: 60, endAt: now + 60000 } };
  const legacyStorage = load('src/utils/storage.ts', { localStorage: { getItem: () => JSON.stringify(legacy) } });
  assert.equal(getRelatedAutomaticRestId(legacyStorage.loadAppState(), target, now), null);
});

test('undoing the sole completed set leaves no completed activity despite prefilled reps', () => {
  const { state, target } = fixture();
  state.activeDraft.exercises[0].sets[1].completed = false;
  state.activeDraft.exercises[0].sets[2].completed = false;
  const next = undoCompletedSet(state, target, 'automatic-1', now);
  assert.equal(next.activeDraft.exercises.some((exercise) => exercise.sets.some((set) => set.completed)), false);
});
