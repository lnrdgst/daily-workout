/* global process, console, window, document, navigator, localStorage, sessionStorage, Event */
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.resolve('dist/cardio-qa/node_modules/playwright'));
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5175';

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true, timezoneId: 'America/Sao_Paulo' });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const now = Date.parse('2026-09-15T15:00:00Z'); // noon local
  await page.clock.install({ time: now });
  await page.clock.pauseAt(now);
  await page.addInitScript(() => {
    sessionStorage.setItem('daily-workout-splash-seen', 'true');
    localStorage.setItem('daily-workout-session-settings', JSON.stringify({ keepScreenAwake: false }));
    localStorage.setItem('daily-workout-rest-alert-settings', JSON.stringify({ sound: false, vibration: true, notifications: false }));
    window.__recoveryAlerts = 0;
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: () => { window.__recoveryAlerts++; return true; } });
  });
  const draft = { type: 'cardio', modality: 'stationary-bike', startedAt: '2026-09-15T11:00:00.000Z', intervalEndAt: null, notes: 'Preservar' };
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('daily-workout-state')));
  const action = (name) => page.getByRole('dialog').getByRole('button', { name, exact: true }).click();
  const seed = async (activeDraft) => {
    await page.goto(baseURL);
    await page.evaluate((active) => localStorage.setItem('daily-workout-state', JSON.stringify({ activeDraft: active, history: [],
      lastCompletedWorkoutId: 'A', lastOpenedWorkoutId: 'A', restTimer: { status: 'ready', selectedSeconds: 90, endAt: null } })), activeDraft);
    await page.goto(`${baseURL}/${activeDraft.type === 'cardio' ? `cardio/${activeDraft.modality}` : 'workout/A'}`);
  };
  const returnFromBackground = () => page.evaluate(() => {
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
    document.dispatchEvent(new Event('visibilitychange'));
    Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
  });
  const fill = async (hours, minutes) => {
    await page.getByLabel('Horas', { exact: true }).fill(hours);
    await page.getByLabel('Minutos', { exact: true }).fill(minutes);
  };
  try {
    await seed({ ...draft, startedAt: new Date(now - 7199000).toISOString() });
    assert.equal(await page.getByRole('dialog').count(), 0);
    await page.clock.runFor(1000);
    await page.evaluate(() => window.dispatchEvent(new Event('focus')));
    await page.getByText('Atividade ainda em andamento', { exact: true }).waitFor();
    console.log('PASS below and exactly two-hour boundary');

    await seed(draft);
    await page.getByText('Atividade ainda em andamento', { exact: true }).waitFor();
    fs.mkdirSync('dist/cardio-qa/artifacts', { recursive: true });
    await page.screenshot({ path: 'dist/cardio-qa/artifacts/stale-cardio-decision.png', animations: 'disabled' });
    const initial = await state();
    await action('Continuar atividade');
    await page.evaluate(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('focus')); });
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.deepEqual(await state(), initial);
    await returnFromBackground();
    await action('Encerrar e registrar');
    assert.equal(await page.getByRole('dialog').count(), 1);
    await fill('0', '40');
    await action('Cancelar');
    assert.deepEqual(await state(), initial);
    await action('Encerrar e registrar');
    await page.reload();
    await page.getByText('Atividade ainda em andamento', { exact: true }).waitFor();
    assert.deepEqual(await state(), initial);
    await action('Encerrar e registrar');
    assert.equal(await page.getByLabel('Minutos', { exact: true }).inputValue(), '');
    for (const [hours, minutes] of [['0', '0'], ['0', '60'], ['5', '0'], ['', '40']]) {
      await fill(hours, minutes); await action('Registrar atividade');
      await page.getByRole('alert').waitFor();
      assert.deepEqual(await state(), initial);
    }
    await fill('0', '40');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
    await page.screenshot({ path: 'dist/cardio-qa/artifacts/stale-cardio-duration.png', animations: 'disabled' });
    await action('Registrar atividade');
    await page.waitForURL('**/history');
    let saved = await state();
    assert.equal(saved.activeDraft, null);
    assert.equal(saved.history.length, 1);
    assert.equal(saved.history[0].finishedAt, '2026-09-15T11:40:00.000Z');
    assert.equal(saved.history[0].completionSource, 'stale-recovery');
    assert.equal(saved.history[0].notes, 'Preservar');
    assert.equal(saved.lastCompletedWorkoutId, 'A');
    await page.getByText('40 min', { exact: true }).waitFor();
    console.log('PASS continue, deduplication, background, cancel, reload, validation and 08:00 + 40min history');

    await seed(draft); await action('Encerrar sem registrar');
    saved = await state();
    assert.equal(saved.activeDraft, null); assert.equal(saved.history.length, 0);
    console.log('PASS accidental stale discard through existing store');

    const planned = { ...draft, modality: 'spinning', intervals: { targetCount: 10, durationSeconds: 30, completedCount: 7 } };
    await seed(planned); await action('Encerrar e registrar'); await fill('0', '50'); await action('Registrar atividade');
    saved = await state();
    assert.deepEqual(saved.history[0].intervals, planned.intervals);
    assert.equal(saved.history[0].finishedAt, '2026-09-15T11:50:00.000Z');

    await seed({ ...planned, intervalEndAt: now - 1000, intervals: { ...planned.intervals, completedCount: 6 } });
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('daily-workout-state')).activeDraft.intervals.completedCount === 7);
    assert.equal(await page.evaluate(() => window.__recoveryAlerts), 1);
    await page.evaluate(() => { window.dispatchEvent(new Event('focus')); window.dispatchEvent(new Event('focus')); });
    await action('Encerrar e registrar'); await fill('0', '50'); await action('Registrar atividade');
    assert.equal((await state()).history[0].intervals.completedCount, 7);
    assert.equal(await page.evaluate(() => window.__recoveryAlerts), 1);
    await page.reload();
    assert.equal((await state()).history[0].intervals.completedCount, 7);
    assert.equal(await page.evaluate(() => window.__recoveryAlerts), 0);
    console.log('PASS partial plan and overdue interval count/alert deduplication');

    await seed(draft); await action('Encerrar e registrar'); await fill('0', '1'); await action('Registrar atividade');
    assert.equal((await state()).history[0].finishedAt, '2026-09-15T11:01:00.000Z');
    const liveNow = await page.evaluate(() => Date.now());
    await seed({ ...draft, startedAt: new Date(liveNow - 20 * 60000).toISOString() });
    await page.getByRole('button', { name: 'Finalizar treino', exact: true }).click();
    const before = await page.evaluate(() => Date.now());
    await action('Finalizar treino');
    const after = await page.evaluate(() => Date.now());
    saved = (await state()).history[0];
    assert.ok(Date.parse(saved.finishedAt) >= before && Date.parse(saved.finishedAt) <= after);
    assert.equal(saved.completionSource, undefined);
    await seed({ ...draft, startedAt: new Date(await page.evaluate(() => Date.now())).toISOString() });
    await page.getByRole('button', { name: 'Finalizar treino', exact: true }).click();
    await action('Encerrar sem registrar');
    assert.equal((await state()).history.length, 0);
    assert.equal((await state()).activeDraft, null);
    console.log('PASS one-minute recovery, normal finish and short cardio discard');

    // Existing page confirmation must not overlap the global recovery after returning.
    await seed({ ...draft, startedAt: new Date(await page.evaluate(() => Date.now()) - 7199000).toISOString() });
    await page.getByRole('button', { name: 'Finalizar treino', exact: true }).click();
    await page.clock.runFor(1000); await returnFromBackground();
    await page.getByText('Atividade ainda em andamento', { exact: true }).waitFor();
    assert.equal(await page.getByRole('dialog').count(), 1);
    await action('Encerrar e registrar');
    assert.equal(await page.getByRole('dialog').count(), 1);
    await fill('0', '40'); await action('Registrar atividade');
    await page.waitForURL('**/history');
    await page.getByRole('dialog').waitFor({ state: 'hidden' });
    console.log('PASS no overlapping page/global dialogs');

    for (const completed of [3, 4]) {
      await page.goto(`${baseURL}/workout/A`);
      await page.getByRole('button', { name: 'Iniciar treino', exact: true }).click();
      const strength = (await state()).activeDraft;
      delete strength.type;
      strength.startedAt = draft.startedAt;
      strength.exercises.slice(0, completed).forEach((exercise) => exercise.sets.forEach((set) => { set.completed = true; }));
      await seed(strength);
      await page.getByText('Treino ainda em andamento', { exact: true }).waitFor();
      await action(completed === 4 ? 'Encerrar e registrar' : 'Encerrar sem registrar');
      saved = await state();
      assert.equal(saved.activeDraft, null);
      assert.equal(saved.history.length, completed === 4 ? 1 : 0);
      if (completed === 4) assert.ok(Date.parse(saved.history[0].finishedAt) >= now);
    }
    assert.deepEqual(errors, []);
    console.log('PASS legacy strength stale branches and unchanged finish timestamp; no browser errors');
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
