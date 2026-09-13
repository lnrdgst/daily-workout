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

const cardio = load('src/utils/cardioSession.ts');
const storage = load('src/utils/storage.ts');
const { workoutsById } = load('src/data/workouts.ts');
const { getWorkoutSequenceProgress } = load('src/utils/workoutSequence.ts');
const legacy = ['A', 'B', 'C'].map((id, index) => ({
  ...storage.buildHistoryEntry(storage.createWorkoutDraft(workoutsById[id])),
  type: undefined, id, finishedAt: new Date(2026, 8, 10 + index).toISOString(),
}));

test('legacy strength state is loaded intact, without adding type or rewriting history', () => {
  const oldDraft = storage.createWorkoutDraft(workoutsById.A);
  delete oldDraft.type;
  const oldState = { history: legacy, activeDraft: oldDraft, restTimer: storage.defaultRestTimerState, lastCompletedWorkoutId: 'C', lastOpenedWorkoutId: 'A' };
  const json = JSON.stringify(oldState);
  let writes = 0;
  const reader = load('src/utils/storage.ts', { localStorage: { getItem: () => json, setItem: () => writes++ } });
  assert.deepEqual(reader.loadAppState(), JSON.parse(json));
  assert.equal(writes, 0);
});

test('all five modalities start continuous sessions and save without optional fields or intervals', () => {
  for (const modality of Object.keys(load('src/data/cardio.ts').cardioModalities)) {
    const draft = cardio.createCardioDraft(modality);
    assert.equal(draft.type, 'cardio');
    assert.equal(draft.intervalEndAt, null);
    assert.equal(draft.intervals, undefined);
    const end = new Date(draft.startedAt).getTime() + 40 * 60000;
    const saved = cardio.buildCardioHistoryEntry(draft, end);
    assert.equal(new Date(saved.finishedAt) - new Date(saved.startedAt), 40 * 60000);
    assert.equal(saved.intervals, undefined);
    assert.ok(!('intervalEndAt' in saved));
  }
});

test('interval uses a timestamp, completes once after suspension and leaves total startedAt unchanged', () => {
  const configured = cardio.configureIntervals(cardio.createCardioDraft('stationary-bike'), 10, 30);
  const running = cardio.startInterval(configured, 1000);
  assert.equal(running.intervalEndAt, 31000);
  assert.equal(cardio.startInterval(running, 2000), running);
  assert.equal(cardio.settleInterval(running, 30999), running);
  const complete = cardio.settleInterval(running, 120000);
  assert.equal(complete.intervals.completedCount, 1);
  assert.equal(complete.intervalEndAt, null);
  assert.equal(complete.startedAt, configured.startedAt);
  assert.equal(cardio.settleInterval(complete, 150000), complete);
});

test('manual marks stop the running timer, respect target, allow undo and explicit target increase', () => {
  let draft = cardio.configureIntervals(cardio.createCardioDraft('running'), 2, 45);
  draft = cardio.markInterval(cardio.startInterval(draft, 0));
  assert.equal(draft.intervalEndAt, null);
  assert.equal(cardio.settleInterval(draft, 999999), draft);
  draft = cardio.markInterval(draft);
  assert.equal(cardio.markInterval(draft), draft);
  assert.equal(cardio.startInterval(draft), draft);
  assert.equal(cardio.undoInterval(draft).intervals.completedCount, 1);
  assert.equal(cardio.configureIntervals(draft, 1, 30), draft);
  draft = cardio.configureIntervals(draft, 3, 75);
  assert.equal(cardio.markInterval(draft).intervals.completedCount, 3);
});

test('partial interval plan and optional values survive finalization and JSON rehydration', () => {
  let draft = { ...cardio.createCardioDraft('stationary-bike'), distanceKm: 12.4, averageSpeedKmH: 22, resistance: 0, notes: 'Treino contínuo e tiros' };
  draft = cardio.configureIntervals(draft, 10, 30);
  for (let i = 0; i < 7; i++) draft = cardio.markInterval(draft);
  draft = cardio.startInterval(draft);
  const rehydrated = JSON.parse(JSON.stringify(draft));
  assert.deepEqual(rehydrated, draft);
  const saved = cardio.buildCardioHistoryEntry(rehydrated);
  assert.deepEqual(saved.intervals, { targetCount: 10, durationSeconds: 30, completedCount: 7 });
  assert.equal(saved.distanceKm, 12.4);
  assert.equal(saved.resistance, 0);
  assert.equal(saved.notes, draft.notes);
  assert.ok(!('intervalEndAt' in saved));
});

test('cardio does not change ABC sequence, previous sets or last strength session', () => {
  const saved = cardio.buildCardioHistoryEntry(cardio.createCardioDraft('walking'));
  const mixed = [legacy[0], saved, legacy[1], saved, legacy[2]];
  assert.deepEqual(getWorkoutSequenceProgress(mixed), { completedSequences: 1, currentStep: 0 });
  assert.deepEqual(storage.getPreviousExercisePerformance(mixed, 'squat-hack'), legacy[0].exercises[0].sets);
  assert.equal(storage.getLastWorkout([...mixed, saved], 'C'), legacy[2]);
});

test('invalid interval plans are rejected without mutating the active session', () => {
  const draft = cardio.createCardioDraft('spinning');
  for (const [count, seconds] of [[0, 30], [-1, 30], [1.5, 30], [10, 0], [10, NaN], [10, Infinity], [10, 86401]]) {
    assert.equal(cardio.configureIntervals(draft, count, seconds), draft);
  }
});
