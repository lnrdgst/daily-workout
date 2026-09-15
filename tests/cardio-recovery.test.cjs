/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function load(relativePath, mocks = {}, environment = {}) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  const resolve = (name) => name in mocks ? mocks[name] : name.startsWith('@/')
    ? load(`src/${name.slice(2)}.ts`, mocks, environment) : require(name);
  new Function('require', 'module', 'exports', 'Date', 'window', 'document', outputText)(
    resolve, module, module.exports, environment.Date || Date, environment.window, environment.document);
  return module.exports;
}

const { isStaleSession } = load('src/utils/staleSession.ts');
const { validateCardioRecovery, buildRecoveredCardioHistoryEntry } = load('src/utils/cardioRecovery.ts');
const { settleInterval, buildCardioHistoryEntry } = load('src/utils/cardioSession.ts');
const start = Date.parse('2026-09-15T08:00:00Z');
const now = start + 4 * 3600000;
const draft = { type: 'cardio', modality: 'stationary-bike', startedAt: new Date(start).toISOString(), intervalEndAt: null };
const recover = (active = draft, hours = 0, minutes = 40, clock = now) =>
  buildRecoveredCardioHistoryEntry(active, { ...active, hours, minutes }, clock);

test('stale threshold includes exactly two hours; invalid and future dates are ineligible', () => {
  assert.equal(isStaleSession(draft.startedAt, start + 7199999), false);
  assert.equal(isStaleSession(draft.startedAt, start + 7200000), true);
  assert.equal(isStaleSession(draft.startedAt, now), true);
  assert.equal(isStaleSession('invalid', now), false);
  assert.equal(isStaleSession(draft.startedAt, start - 1), false);
});

test('duration validates whole hours/minutes, minimum and elapsed whole-minute maximum', () => {
  for (const [h, m] of [[0, 0], [-1, 20], [0, -1], [0, 60], [0, 80], [0.5, 0], [0, 1.5], [NaN, 1], [Infinity, 1], [5, 0]]) {
    assert.ok(validateCardioRecovery(draft.startedAt, h, m, now).error);
    assert.equal(recover(draft, h, m), null);
  }
  for (const [h, m] of [[0, 1], [0, 40], [1, 0], [1, 20], [2, 5], [4, 0]]) {
    assert.equal(validateCardioRecovery(draft.startedAt, h, m, now).finishedAt, start + (h * 60 + m) * 60000);
  }
  assert.ok(validateCardioRecovery(draft.startedAt, 4, 1, now + 59999).error);
  assert.equal(validateCardioRecovery(draft.startedAt, 4, 1, now + 60000).finishedAt, now + 60000);
  assert.ok(validateCardioRecovery('invalid', 0, 1, now).error);
});

test('continuous recovery saves corrected timestamps and optional metadata without mutating draft', () => {
  const before = JSON.stringify(draft);
  const saved = recover();
  assert.equal(saved.startedAt, draft.startedAt);
  assert.equal(saved.finishedAt, '2026-09-15T08:40:00.000Z');
  assert.equal(new Date(saved.finishedAt) - new Date(saved.startedAt), 40 * 60000);
  assert.equal(saved.completionSource, 'stale-recovery');
  assert.equal(saved.intervals, undefined);
  assert.equal(JSON.stringify(draft), before);
  const running = { ...draft, modality: 'running', startedAt: '2026-09-15T18:00:00Z' };
  assert.equal(recover(running, 1, 20, Date.parse('2026-09-15T23:00:00Z')).finishedAt, '2026-09-15T19:20:00.000Z');
  assert.equal(recover(running, 0, 45, Date.parse('2026-09-15T23:00:00Z')).finishedAt, '2026-09-15T18:45:00.000Z');
});

test('recovery preserves 7/10 and optional data independently of duration', () => {
  const active = { ...draft, modality: 'spinning', distanceKm: 12, resistance: 0, notes: 'Teste', averageSpeedKmH: 20,
    intervals: { targetCount: 10, durationSeconds: 30, completedCount: 7 } };
  const saved = recover(active, 0, 50);
  assert.deepEqual(saved.intervals, active.intervals);
  for (const key of ['distanceKm', 'resistance', 'notes', 'averageSpeedKmH']) assert.equal(saved[key], active[key]);
  assert.equal(saved.finishedAt, '2026-09-15T08:50:00.000Z');
});

test('overdue interval is settled once regardless of provider/recovery ordering and recovered end', () => {
  const active = { ...draft, intervalEndAt: now - 1000, intervals: { targetCount: 10, durationSeconds: 30, completedCount: 6 } };
  const before = JSON.stringify(active);
  const direct = recover(active);
  const settled = settleInterval(active, now);
  const afterCallback = recover(settled);
  assert.deepEqual(direct, afterCallback);
  assert.equal(direct.intervals.completedCount, 7);
  assert.equal(direct.intervalEndAt, undefined);
  assert.equal(settleInterval(settled, now + 1000), settled);
  assert.equal(JSON.stringify(active), before);
  assert.equal(recover({ ...active, intervalEndAt: now + 1000 }).intervals.completedCount, 6);
});

test('recovery rejects a different active session and non-stale draft; normal builder stays unchanged', () => {
  assert.equal(buildRecoveredCardioHistoryEntry(draft, { ...draft, hours: 0, minutes: 40, modality: 'walking' }, now), null);
  assert.equal(buildRecoveredCardioHistoryEntry(draft, { ...draft, hours: 0, minutes: 40, startedAt: 'other' }, now), null);
  assert.equal(recover(draft, 0, 40, start + 3600000), null);
  const normal = buildCardioHistoryEntry(draft, now);
  assert.equal(normal.finishedAt, new Date(now).toISOString());
  assert.equal(normal.completionSource, undefined);
});

// Exercise the actual hook, effect cleanup and event callbacks without a new test dependency.
function detector(initialDraft) {
  let clock = now;
  let active = initialDraft;
  let cursor = 0;
  const slots = [];
  const pending = [];
  const listeners = { focus: new Set(), visibilitychange: new Set() };
  const events = { addEventListener: (name, cb) => listeners[name].add(cb), removeEventListener: (name, cb) => listeners[name].delete(cb) };
  const document = { ...events, visibilityState: 'visible' };
  const react = {
    useState(initial) { const index = cursor++; if (!(index in slots)) slots[index] = initial;
      return [slots[index], (value) => { slots[index] = value; }]; },
    useRef(initial) { const index = cursor++; return slots[index] ??= { current: initial }; },
    useEffect(callback, deps) { const index = cursor++; const previous = slots[index];
      if (!previous || deps.some((dep, i) => dep !== previous.deps[i])) {
        previous?.cleanup?.(); pending.push(() => { slots[index] = { deps, cleanup: callback() }; });
      } },
  };
  class Clock extends Date { static now() { return clock; } }
  const { useStaleWorkoutDetection } = load('src/hooks/useStaleWorkoutDetection.ts', { react }, { Date: Clock, window: events, document });
  const render = () => { cursor = 0; const result = useStaleWorkoutDetection(active); pending.splice(0).forEach((fn) => fn()); return result; };
  render();
  return { read: render, update(next) { active = next; render(); }, time(value) { clock = value; },
    fire(name, visibility) { if (visibility) document.visibilityState = visibility; [...listeners[name]].forEach((fn) => fn()); },
    listeners, unmount() { slots.forEach((slot) => slot?.cleanup?.()); } };
}

test('actual detector continues without mutations, deduplicates focus and rearms after background/reload', () => {
  const before = JSON.stringify(draft);
  const hook = detector(draft);
  assert.deepEqual(hook.read().prompt, { type: 'cardio' });
  hook.read().dismissPrompt();
  hook.fire('focus'); hook.fire('focus');
  assert.equal(hook.read().prompt, null);
  hook.fire('visibilitychange', 'hidden'); hook.fire('visibilitychange', 'visible');
  assert.deepEqual(hook.read().prompt, { type: 'cardio' });
  assert.equal(hook.listeners.focus.size, 1);
  hook.update(null);
  assert.equal(hook.read().prompt, null);
  hook.unmount();
  assert.equal(hook.listeners.focus.size, 0);
  assert.equal(detector(JSON.parse(before)).read().prompt.type, 'cardio');
  assert.equal(JSON.stringify(draft), before);
});

test('actual detector waits below threshold and retains strength policy including legacy drafts', () => {
  const young = { ...draft, startedAt: new Date(now - 7199999).toISOString() };
  const hook = detector(young);
  assert.equal(hook.read().prompt, null);
  hook.time(now + 1); hook.fire('focus');
  assert.equal(hook.read().prompt.type, 'cardio');
  const { createWorkoutDraft } = load('src/utils/storage.ts');
  const { workoutsById } = load('src/data/workouts.ts');
  for (const count of [3, 4]) {
    const strength = createWorkoutDraft(workoutsById.A);
    delete strength.type;
    strength.startedAt = draft.startedAt;
    strength.exercises.slice(0, count).forEach((exercise) => exercise.sets.forEach((set) => { set.completed = true; }));
    const detectorHook = detector(strength);
    assert.deepEqual(detectorHook.read().prompt, { type: 'strength', shouldRegister: count === 4 });
    detectorHook.read().dismissPrompt(); detectorHook.fire('focus');
    assert.equal(detectorHook.read().prompt, null);
    detectorHook.fire('visibilitychange', 'hidden'); detectorHook.fire('visibilitychange', 'visible');
    assert.equal(detectorHook.read().prompt.shouldRegister, count === 4);
    detectorHook.unmount();
  }
});
