/* global __dirname */
const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

function loadSettings(localStorage) {
  const filename = path.resolve(__dirname, '..', 'src/utils/workoutSessionSettings.ts');
  const { outputText } = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  });
  const module = { exports: {} };
  new Function('require', 'module', 'exports', 'window', outputText)(require, module, module.exports, { localStorage });
  return module.exports;
}

test('fillFollowingSets defaults to true when absent and persists either user choice', () => {
  let saved = JSON.stringify({ keepScreenAwake: false, autoStartRestTimer: false });
  const localStorage = { getItem: () => saved, setItem: (_, value) => { saved = value; } };
  const settings = loadSettings(localStorage);
  assert.equal(settings.loadWorkoutSessionSettings().fillFollowingSets, true);

  settings.saveWorkoutSessionSettings({ keepScreenAwake: false, autoStartRestTimer: false, fillFollowingSets: true });
  assert.equal(JSON.parse(saved).fillFollowingSets, true);
  settings.saveWorkoutSessionSettings({ keepScreenAwake: false, autoStartRestTimer: false, fillFollowingSets: false });
  assert.equal(settings.loadWorkoutSessionSettings().fillFollowingSets, false);
});
