/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadModule(relativePath) {
  const filename = path.resolve(__dirname, '..', relativePath);
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  const resolve = (name) => name.startsWith('@/')
    ? loadModule(`src/${name.slice(2)}.ts`)
    : require(name);
  new Function('require', 'module', 'exports', outputText)(resolve, module, module.exports);
  return module.exports;
}

const { applyManualSetChange } = loadModule('src/utils/setPropagation.ts');
const sets = (values) => values.map(([load, reps, completed = false]) => ({ load, reps, completed }));

test('load edit on S1 propagates only load to later pending sets', () => {
  const next = applyManualSetChange(sets([['12', '15'], ['12', '12'], ['12', '10']]), 0, { load: '14' });
  assert.deepEqual(next, sets([['14', '15'], ['14', '12'], ['14', '10']]));
});

test('reps edit on S1 propagates only reps to later pending sets', () => {
  const next = applyManualSetChange(sets([['14', '15'], ['16', '10'], ['18', '8']]), 0, { reps: '12' });
  assert.deepEqual(next, sets([['14', '12'], ['16', '12'], ['18', '12']]));
});

test('editing S2 preserves S1 and propagates to every later set', () => {
  const next = applyManualSetChange(sets([['14', '15'], ['12', '15'], ['12', '15'], ['12', '15']]), 1, { load: '16', reps: '12' });
  assert.deepEqual(next, sets([['14', '15'], ['16', '12'], ['16', '12'], ['16', '12']]));
});

test('editing the final set never changes an earlier set', () => {
  const next = applyManualSetChange(sets([['14', '15'], ['16', '15'], ['12', '15']]), 2, { load: '18', reps: '12' });
  assert.deepEqual(next, sets([['14', '15'], ['16', '15'], ['18', '12']]));
});

test('completed later sets remain intact while pending sets after them receive the change', () => {
  const next = applyManualSetChange(sets([['12', '15'], ['13', '14', true], ['12', '10'], ['11', '8', true], ['12', '6']]), 0, { load: '14' });
  assert.deepEqual(next, sets([['14', '15'], ['13', '14', true], ['14', '10'], ['11', '8', true], ['14', '6']]));
});

test('propagation leaves completion state pending and preserves unrelated fields', () => {
  const next = applyManualSetChange(sets([['12', '15'], ['12', '10']]), 0, { reps: '12' });
  assert.deepEqual(next, sets([['12', '12'], ['12', '12']]));
  assert.ok(next.every((set) => !set.completed));
});

test('programmatic draft, option, replacement and rehydration values are untouched until a manual change is applied', () => {
  const initial = sets([['30', '15'], ['40', '10'], ['50', '8']]);
  assert.deepEqual(initial, sets([['30', '15'], ['40', '10'], ['50', '8']]));
  const changed = applyManualSetChange(initial, 1, { reps: '12' });
  assert.deepEqual(changed, sets([['30', '15'], ['40', '12'], ['50', '12']]));
});

test('distinct final values remain available for history after separate manual edits', () => {
  let next = applyManualSetChange(sets([['12', '15'], ['12', '15'], ['12', '15']]), 0, { load: '14' });
  next = applyManualSetChange(next, 1, { load: '16', reps: '12' });
  next = applyManualSetChange(next, 2, { load: '18', reps: '10' });
  assert.deepEqual(next, sets([['14', '15'], ['16', '12'], ['18', '10']]));
});
