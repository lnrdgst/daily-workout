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
const { legacyWorkoutsById } = load('src/data/legacyWorkouts.ts');
const { getWorkoutSequenceProgress } = load('src/utils/workoutSequence.ts');
const { formatLastWorkoutTiming } = load('src/utils/workoutTiming.ts');
const legacy = ['A', 'B', 'C'].map((id, index) => ({
  ...storage.buildHistoryEntry(storage.createWorkoutDraft(legacyWorkoutsById[id])),
  type: undefined, id, finishedAt: new Date(2026, 8, 10 + index).toISOString(),
}));

test('legacy strength state is loaded intact, without adding type or rewriting history', () => {
  const oldDraft = storage.createWorkoutDraft(legacyWorkoutsById.A);
  delete oldDraft.type;
  const oldState = { history: legacy, activeDraft: oldDraft, restTimer: storage.defaultRestTimerState, lastCompletedWorkoutId: 'C', lastOpenedWorkoutId: 'A' };
  const json = JSON.stringify(oldState);
  let writes = 0;
  const reader = load('src/utils/storage.ts', { localStorage: { getItem: () => json, setItem: () => writes++ } });
  assert.deepEqual(reader.loadAppState(), JSON.parse(json));
  assert.equal(writes, 0);
});

test('all modalities start continuous sessions and save without optional fields or intervals', () => {
  for (const modality of Object.keys(load('src/data/cardio.ts').cardioModalities)) {
    const draft = cardio.createCardioDraft(modality);
    assert.equal(draft.type, 'cardio');
    assert.equal(draft.intervalEndAt, null);
    assert.equal(draft.intervals, undefined);
    const end = new Date(draft.startedAt).getTime() + 40 * 60000;
    const saved = cardio.buildCardioHistoryEntry(draft, end);
    assert.equal(new Date(saved.finishedAt) - new Date(saved.startedAt), 40 * 60000);
    assert.equal(saved.intervals, undefined);
    assert.equal(saved.distanceKm, undefined);
    assert.equal(saved.averageSpeedKmH, undefined);
    assert.ok(!('treadmillActivity' in saved));
    assert.ok(!('intervalEndAt' in saved));
  }
});

test('treadmill is a separate modality and its optional activity and metrics round-trip through storage', () => {
  const { cardioModalities, treadmillActivities } = load('src/data/cardio.ts');
  assert.equal(cardioModalities.treadmill, 'Esteira');
  assert.equal(cardioModalities.walking, 'Caminhada');
  assert.equal(cardioModalities.running, 'Corrida');
  assert.deepEqual(treadmillActivities, { walking: 'Caminhada', running: 'Corrida', mixed: 'Caminhada e corrida' });

  for (const treadmillActivity of Object.keys(treadmillActivities)) {
    const draft = cardio.createCardioDraft('treadmill');
    const updated = cardio.updateCardioData(draft, { treadmillActivity, distanceKm: 2.34567, averageSpeedKmH: 5.5, resistance: 0 });
    const json = JSON.stringify({ activeDraft: updated, history: [] });
    const reader = load('src/utils/storage.ts', { localStorage: { getItem: () => json } });
    assert.deepEqual(reader.loadAppState().activeDraft, updated);
    const history = cardio.buildCardioHistoryEntry(reader.loadAppState().activeDraft);
    assert.equal(history.modality, 'treadmill');
    assert.equal(history.workoutName, 'Esteira');
    assert.equal(history.treadmillActivity, treadmillActivity);
    assert.equal(history.distanceKm, 2.34567);
    assert.equal(history.averageSpeedKmH, 5.5);
    assert.equal(history.resistance, 0);
  }
});

test('cardio updates reject invalid values, distinguish empty and zero, and keep treadmill activity scoped', () => {
  const draft = cardio.createCardioDraft('treadmill');
  for (const patch of [{ distanceKm: -1 }, { averageSpeedKmH: Infinity }, { resistance: NaN }, { resistance: null },
    { averageSpeedKmH: '5.5' }, { treadmillActivity: 'invalid' }]) {
    assert.equal(cardio.updateCardioData(draft, patch), draft);
  }
  const filled = cardio.updateCardioData(draft, { distanceKm: 0, resistance: 1.5, treadmillActivity: 'mixed' });
  assert.equal(filled.distanceKm, 0);
  assert.equal(filled.resistance, 1.5);
  const cleared = JSON.parse(JSON.stringify(cardio.updateCardioData(filled, { distanceKm: undefined, treadmillActivity: undefined })));
  assert.ok(!('distanceKm' in cleared));
  assert.ok(!('treadmillActivity' in cleared));
  assert.equal(cleared.resistance, 1.5);
  const walking = cardio.createCardioDraft('walking');
  assert.equal(cardio.updateCardioData(walking, { treadmillActivity: 'walking' }), walking);
});

test('legacy walking and running data load intact, including active drafts and optional numeric values', () => {
  const history = ['walking', 'running'].map((modality) => cardio.buildCardioHistoryEntry({
    ...cardio.createCardioDraft(modality), distanceKm: 1.23456, averageSpeedKmH: 5.5, resistance: 0,
  }));
  for (const modality of ['walking', 'running']) {
    const oldDraft = { ...cardio.createCardioDraft(modality), distanceKm: 2.5, notes: 'Legado' };
    const json = JSON.stringify({ activeDraft: oldDraft, history });
    const reader = load('src/utils/storage.ts', { localStorage: { getItem: () => json, setItem: () => assert.fail('Unexpected write') } });
    const state = reader.loadAppState();
    assert.deepEqual(state.activeDraft, oldDraft);
    assert.deepEqual(state.history, JSON.parse(json).history);
  }
});

test('treadmill does not change the ABCDE strength sequence', () => {
  const { workouts } = load('src/data/workouts.ts');
  const treadmill = cardio.buildCardioHistoryEntry(cardio.createCardioDraft('treadmill'));
  const history = workouts.flatMap((workout) => [storage.buildHistoryEntry(storage.createWorkoutDraft(workout)), treadmill]);
  assert.deepEqual(getWorkoutSequenceProgress(history, 'ABCDE'), { completedSequences: 1, currentStep: 0 });
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
  assert.deepEqual(storage.getPreviousExercisePerformance(mixed, 'squat'), legacy[2].exercises[0].sets);
  assert.equal(storage.getLastWorkout([...mixed, saved], 'C'), legacy[2]);
});

test('invalid interval plans are rejected without mutating the active session', () => {
  const draft = cardio.createCardioDraft('spinning');
  for (const [count, seconds] of [[0, 30], [-1, 30], [1.5, 30], [10, 0], [10, NaN], [10, Infinity], [10, 86401]]) {
    assert.equal(cardio.configureIntervals(draft, count, seconds), draft);
  }
});

test('cardio short-session threshold is strictly below 60 seconds, including completed intervals', () => {
  let draft = cardio.configureIntervals(cardio.createCardioDraft('running'), 10, 30);
  draft = cardio.markInterval(draft);
  const start = new Date(draft.startedAt).getTime();
  assert.equal(cardio.isShortCardioSession(draft, start + 59999), true);
  assert.equal(cardio.isShortCardioSession(draft, start + 60000), false);
  assert.equal(cardio.isShortCardioSession(draft, start + 60001), false);
});

test('removing intervals clears planning, count and running deadline while preserving activity data', () => {
  for (const completed of [false, true]) {
    let draft = { ...cardio.createCardioDraft('spinning'), distanceKm: 12.4, notes: 'Continuar pedalando' };
    draft = cardio.configureIntervals(draft, 10, 30);
    if (completed) draft = cardio.markInterval(draft);
    draft = cardio.startInterval(draft);
    const original = JSON.stringify(draft);
    const continuous = cardio.removeIntervals(draft);
    assert.equal(continuous.intervals, undefined);
    assert.equal(continuous.intervalEndAt, null);
    assert.equal(continuous.startedAt, draft.startedAt);
    assert.equal(continuous.distanceKm, 12.4);
    assert.equal(continuous.notes, draft.notes);
    assert.equal(JSON.stringify(draft), original);
    assert.equal(cardio.settleInterval(continuous, Date.now() + 60000), continuous);
    assert.equal(cardio.buildCardioHistoryEntry(continuous).intervals, undefined);
  }
});

test('last workout timing uses local Today or the full date consistently', () => {
  const start = new Date(2026, 8, 9, 21, 11).toISOString();
  const finish = new Date(2026, 8, 9, 21, 19).toISOString();
  assert.equal(formatLastWorkoutTiming(start, finish, new Date(2026, 8, 9, 23)), 'Hoje · 21:11 às 21:19');
  assert.equal(formatLastWorkoutTiming(start, finish, new Date(2026, 8, 10)), '09/09/2026 das 21:11 às 21:19');
});
