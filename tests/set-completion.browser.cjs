/* global process, console, window, document, navigator, localStorage, sessionStorage */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.resolve('dist/cardio-qa/node_modules/playwright'));
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5175';

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install({ time: new Date('2026-09-14T13:00:00Z') });
  await page.addInitScript(() => {
    window.__alerts = 0;
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: () => { window.__alerts++; return true; } });
    sessionStorage.setItem('daily-workout-splash-seen', 'true');
    localStorage.setItem('daily-workout-rest-alert-settings', JSON.stringify({ sound: false, vibration: true, notifications: false }));
  });
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('daily-workout-state')));
  const click = (name) => page.getByRole('button', { name, exact: true }).click();
  const action = (name) => page.getByRole('dialog').getByRole('button', { name, exact: true }).click();
  const firstExercise = () => page.locator('article').filter({ has: page.getByRole('heading', { name: 'Agachamento ou Hack Squat', exact: true }) });
  const mark = () => firstExercise().getByRole('button', { name: 'Marcar', exact: true }).first().click();
  const openUndo = () => firstExercise().getByRole('button', { name: 'Feita', exact: true }).first().click();
  const relatedAction = () => page.getByRole('dialog').getByRole('button', { name: 'Desmarcar e cancelar descanso', exact: true });
  const reset = async (automatic = true) => {
    await page.goto(baseURL);
    await page.evaluate((auto) => {
      localStorage.removeItem('daily-workout-state');
      localStorage.setItem('daily-workout-session-settings', JSON.stringify({ autoStartRestTimer: auto, keepScreenAwake: false }));
    }, automatic);
    await page.goto(`${baseURL}/workout/A`);
    await click('Iniciar treino');
  };

  try {
    await reset(false);
    await mark();
    const noAuto = await state();
    await openUndo();
    assert.equal(await relatedAction().count(), 0);
    assert.equal(await page.getByRole('dialog').getByRole('button').count(), 2);
    assert.deepEqual(await state(), noAuto, 'opening confirmation must not mutate state');
    await action('Cancelar');
    assert.deepEqual(await state(), noAuto);
    await openUndo(); await action('Desmarcar série');
    assert.equal((await state()).activeDraft.exercises[0].sets[0].completed, false);
    assert.deepEqual((await state()).restTimer, noAuto.restTimer);
    console.log('PASS no automatic rest: confirmation, cancel and undo-only');

    await reset(); await mark();
    const automatic = await state();
    assert.equal(automatic.restTimer.automaticSource.exerciseId, 'squat-hack');
    assert.equal(automatic.restTimer.automaticSource.setIndex, 0);
    await openUndo();
    assert.equal(await relatedAction().count(), 1);
    assert.equal(await page.getByRole('dialog').getByRole('button').count(), 3);
    fs.mkdirSync('dist/cardio-qa/artifacts', { recursive: true });
    await page.screenshot({ path: 'dist/cardio-qa/artifacts/undo-series-320.png', animations: 'disabled' });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await action('Cancelar');
    assert.deepEqual(await state(), automatic);
    await openUndo(); await action('Desmarcar série');
    assert.equal((await state()).restTimer.endAt, automatic.restTimer.endAt);
    assert.equal((await state()).restTimer.status, 'running');
    await mark();
    assert.notEqual((await state()).restTimer.automaticSource.id, automatic.restTimer.automaticSource.id);
    await openUndo(); await action('Desmarcar e cancelar descanso');
    assert.equal((await state()).restTimer.status, 'ready');
    assert.equal((await state()).restTimer.endAt, null);
    assert.equal((await state()).activeDraft.exercises[0].sets[0].completed, false);
    await click('Finalizar treino');
    await page.getByRole('dialog').getByRole('button', { name: 'Encerrar sem registrar', exact: true }).waitFor();
    await action('Encerrar sem registrar');
    assert.equal((await state()).history.length, 0);
    await page.clock.runFor(91000);
    assert.equal(await page.evaluate(() => window.__alerts), 0, 'canceled rest must not alert');
    console.log('PASS three actions, fresh rest identity, combined cancellation and accidental short session');

    await reset(); await mark(); await click('Parar descanso'); await click('Iniciar descanso');
    const manual = (await state()).restTimer;
    assert.equal(manual.automaticSource, undefined);
    await openUndo(); assert.equal(await relatedAction().count(), 0);
    await action('Desmarcar série');
    assert.deepEqual((await state()).restTimer, manual);
    console.log('PASS manually restarted rest is not owned by the earlier completion');

    await reset(); await mark(); await mark();
    const other = (await state()).restTimer;
    assert.equal(other.automaticSource.setIndex, 1);
    await openUndo(); assert.equal(await relatedAction().count(), 0);
    await action('Desmarcar série');
    assert.deepEqual((await state()).restTimer, other);
    console.log('PASS undoing set A preserves automatic rest belonging to set B');

    await reset(); await mark(); await openUndo();
    await page.clock.runFor(91000);
    assert.equal(await relatedAction().count(), 0, 'expired rest action must disappear from an open confirmation');
    assert.equal((await state()).restTimer.status, 'finished');
    assert.equal(await page.evaluate(() => window.__alerts), 1);
    await action('Desmarcar série');
    assert.equal((await state()).restTimer.status, 'finished');
    console.log('PASS expiration while confirmation is open, with original completion alert preserved');

    await reset(); await mark(); await mark(); await mark();
    await page.clock.runFor(600);
    const completedHeader = firstExercise().getByRole('button', { name: /Concluído.*3\/3 séries/ });
    assert.equal(await completedHeader.getAttribute('aria-expanded'), 'false');
    await completedHeader.click();
    await firstExercise().getByRole('button', { name: 'Feita', exact: true }).last().click();
    await action('Desmarcar e cancelar descanso');
    await firstExercise().getByText('2/3 séries', { exact: true }).waitFor();
    assert.equal(await firstExercise().getByText('Concluído', { exact: true }).count(), 0);
    await firstExercise().getByRole('button', { name: 'Marcar', exact: true }).waitFor({ state: 'visible' });
    await page.getByText('0 de 7 exercícios concluídos', { exact: true }).waitFor();
    assert.equal((await state()).restTimer.status, 'ready');
    console.log('PASS completed exercise reopens, displays 2/3 and recalculates workout progress');

    await reset(); await mark();
    const beforeNavigation = (await state()).restTimer;
    await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
    await page.getByRole('button', { name: /Treino A em andamento/ }).click();
    assert.deepEqual((await state()).restTimer, beforeNavigation);
    await page.reload();
    assert.deepEqual((await state()).restTimer, beforeNavigation);
    await openUndo(); assert.equal(await relatedAction().count(), 1);
    await action('Desmarcar e cancelar descanso');
    assert.equal((await state()).restTimer.status, 'ready');
    assert.equal((await state()).activeDraft.exercises[0].sets[0].completed, false);
    await page.reload();
    assert.equal((await state()).activeDraft.exercises[0].sets[0].completed, false);
    assert.equal((await state()).restTimer.automaticSource, undefined);
    assert.deepEqual(errors, []);
    console.log('PASS navigation, reload, persisted ownership and persisted undo without browser exceptions');
  } finally {
    await browser.close();
  }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
