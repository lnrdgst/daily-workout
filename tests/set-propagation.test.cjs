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
  const resolve = (name) => name.startsWith('@/') ? loadModule(`src/${name.slice(2)}.ts`) : require(name);
  new Function('require', 'module', 'exports', outputText)(resolve, module, module.exports);
  return module.exports;
}

const { applyManualSetChange } = loadModule('src/utils/setPropagation.ts');
const set = (load, reps, loadSource = 'empty', repsSource = 'prescription', completed = false) => ({ load, reps, loadSource, repsSource, completed });

test('disabled preference changes only the edited set', () => {
  const next = applyManualSetChange([set('12', '15'), set('12', '15'), set('12', '12')], 0, { load: '14' }, false);
  assert.deepEqual(next.map(({ load, reps }) => [load, reps]), [['14', '15'], ['12', '15'], ['12', '12']]);
  assert.equal(next[0].loadSource, 'manual');
});

test('fills empty load and prescription reps independently', () => {
  const next = applyManualSetChange([set('', '10'), set('', '10'), set('', '10')], 0, { load: '20', reps: '12' });
  assert.deepEqual(next.map(({ load, reps }) => [load, reps]), [['20', '12'], ['20', '12'], ['20', '12']]);
  assert.deepEqual(next.slice(1).map(({ loadSource, repsSource }) => [loadSource, repsSource]), [['autofilled', 'autofilled'], ['autofilled', 'autofilled']]);
});

test('history and manual values are protected per field', () => {
  const next = applyManualSetChange([
    set('12', '15', 'history', 'history'),
    set('12', '15', 'history', 'history'),
    set('', '8', 'empty', 'manual'),
  ], 0, { load: '14', reps: '12' });
  assert.deepEqual(next.map(({ load, reps }) => [load, reps]), [['14', '12'], ['12', '15'], ['14', '8']]);
  assert.equal(next[1].loadSource, 'history');
  assert.equal(next[2].repsSource, 'manual');
});

test('a later autofilled field can receive a newer propagation without changing earlier sets', () => {
  let next = applyManualSetChange([set('', '10'), set('', '10'), set('', '10')], 0, { load: '20', reps: '12' });
  next = applyManualSetChange(next, 1, { load: '22', reps: '10' });
  assert.deepEqual(next.map(({ load, reps }) => [load, reps]), [['20', '12'], ['22', '10'], ['22', '10']]);
  assert.deepEqual([next[1].loadSource, next[2].loadSource], ['manual', 'autofilled']);
});

test('last-set edits never change earlier values', () => {
  const next = applyManualSetChange([set('14', '15'), set('16', '12'), set('20', '10')], 2, { load: '24', reps: '8' });
  assert.deepEqual(next.map(({ load, reps }) => [load, reps]), [['14', '15'], ['16', '12'], ['24', '8']]);
});

test('completed sets are protected but do not block a later eligible set', () => {
  const next = applyManualSetChange([set('', '10'), set('13', '14', 'history', 'history', true), set('', '10')], 0, { load: '20', reps: '12' });
  assert.deepEqual(next.map(({ load, reps }) => [load, reps]), [['20', '12'], ['13', '14'], ['20', '12']]);
});

test('legacy drafts without origins remain conservative after rehydration', () => {
  const next = applyManualSetChange([
    { load: '12', reps: '15', completed: false },
    { load: '', reps: '', completed: false },
  ], 0, { load: '14', reps: '12' });
  assert.deepEqual(next.map(({ load, reps }) => [load, reps]), [['14', '12'], ['14', '12']]);
  assert.equal(next[0].loadSource, 'manual');
  assert.equal(next[1].loadSource, 'autofilled');
});
