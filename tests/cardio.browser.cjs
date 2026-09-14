/* global process, console, window, document, navigator, localStorage, sessionStorage, Event */
// Optional integration suite: PLAYWRIGHT_MODULE points to a temporary Playwright install.
const assert = require('node:assert/strict');
const path = require('node:path');
const fs = require('node:fs');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.resolve('dist/cardio-qa/node_modules/playwright'));
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5175';

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const context = await browser.newContext({ viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true, timezoneId: 'America/Sao_Paulo' });
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.clock.install({ time: new Date('2026-09-13T13:00:00Z') });
  await page.addInitScript(() => {
    window.__qa = { wakeRequests: 0, wakeReleases: 0, vibrations: 0, beeps: 0, notifications: [] };
    window.AudioContext = class {
      state = 'running';
      currentTime = 0;
      destination = {};
      createGain() {
        return { gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} }, connect() { return this; } };
      }
      createOscillator() {
        return { frequency: { setValueAtTime() {} }, connect(target) { return target; }, start() { window.__qa.beeps++; }, stop() {} };
      }
    };
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: {
      request: async () => {
        window.__qa.wakeRequests++;
        const listeners = [];
        const sentinel = {
          released: false,
          addEventListener: (_, listener) => listeners.push(listener),
          release: async () => {
            if (sentinel.released) return;
            sentinel.released = true;
            window.__qa.wakeReleases++;
            listeners.forEach((listener) => listener());
          },
        };
        window.__qa.sentinel = sentinel;
        return sentinel;
      },
    } });
    Object.defineProperty(navigator, 'vibrate', { configurable: true, value: () => { window.__qa.vibrations++; return true; } });
    window.Notification = class {
      static permission = 'granted';
      constructor(title) { window.__qa.notifications.push(title); }
    };
    localStorage.setItem('daily-workout-rest-alert-settings', JSON.stringify({ sound: true, vibration: true, notifications: true, volume: 'high' }));
    sessionStorage.setItem('daily-workout-splash-seen', 'true');
    if (!localStorage.getItem('daily-workout-state')) {
      localStorage.setItem('daily-workout-state', JSON.stringify({
        lastCompletedWorkoutId: 'A', lastOpenedWorkoutId: 'A', activeDraft: null,
        restTimer: { status: 'ready', selectedSeconds: 90, endAt: null },
        history: [{ id: 'legacy-A', workoutId: 'A', workoutName: 'Treino A', startedAt: '2026-09-12T12:00:00Z', finishedAt: '2026-09-12T12:45:00Z',
          exercises: [{ exerciseId: 'squat-hack', exerciseName: 'Agachamento ou Hack Squat', muscleGroup: 'Pernas',
            sets: ['12', '11', '10'].map((reps) => ({ load: '30', reps, completed: true })) }],
        }],
      }));
    }
  });
  const state = () => page.evaluate(() => JSON.parse(localStorage.getItem('daily-workout-state')));
  const click = (name) => page.getByRole('button', { name, exact: true }).click();
  const noOverflow = async () => assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false, 'mobile page overflow');
  const waitCount = (count) => page.waitForFunction((expected) => JSON.parse(localStorage.getItem('daily-workout-state')).activeDraft.intervals.completedCount === expected, count);
  const finish = async () => {
    await click('Finalizar treino');
    await page.getByRole('dialog').getByRole('button', { name: 'Finalizar treino', exact: true }).click();
    await page.waitForURL('**/history');
    await page.getByRole('heading', { name: 'Sessões registradas', exact: true }).waitFor();
  };

  try {
    await page.goto(baseURL);
    const beforeCategories = await state();
    assert.equal(await page.locator('#strength-category-heading').count(), 0);
    await page.getByRole('link', { name: 'Ver treino B', exact: true }).click();
    await page.waitForURL('**/workout/B');
    assert.equal((await state()).activeDraft, null);
    await page.goto(baseURL);
    const openSelector = () => click('Fazer outro treino');
    const closeSelector = () => click('Fechar seletor de treinos');
    await openSelector();
    const dialog = page.getByRole('dialog');
    const cardioCategory = page.locator('#cardio-category-heading');
    const strengthCategory = page.locator('#strength-category-heading');
    assert.equal(await strengthCategory.getAttribute('aria-expanded'), 'true');
    assert.equal(await cardioCategory.getAttribute('aria-expanded'), 'false');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Fechar seletor de treinos');
    await page.keyboard.press('Shift+Tab');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'cardio-category-heading');
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Fechar seletor de treinos');
    await cardioCategory.focus();
    await page.keyboard.press('Enter');
    assert.equal(await strengthCategory.getAttribute('aria-expanded'), 'false');
    assert.equal(await cardioCategory.getAttribute('aria-expanded'), 'true');
    await noOverflow();
    assert.equal(await dialog.evaluate((el) => el.scrollWidth > el.clientWidth), false);
    fs.mkdirSync('dist/cardio-qa/artifacts', { recursive: true });
    await page.screenshot({ path: 'dist/cardio-qa/artifacts/selector-cardio-320.png', animations: 'disabled' });
    await strengthCategory.click();
    assert.equal(await cardioCategory.getAttribute('aria-expanded'), 'false');
    assert.equal(await strengthCategory.getAttribute('aria-expanded'), 'true');
    await page.screenshot({ path: 'dist/cardio-qa/artifacts/selector-strength-320.png', animations: 'disabled' });
    await page.keyboard.press('Escape');
    assert.equal(await dialog.count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Fazer outro treino');
    await openSelector();
    await closeSelector();
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Fazer outro treino');
    await openSelector();
    await dialog.locator('a[href="/workout/A"]').click();
    await page.waitForURL('**/workout/A');
    assert.equal(await dialog.count(), 0);
    assert.equal((await state()).activeDraft, null);
    await click('Iniciar treino');
    const activeStrength = await state();
    await page.goto(baseURL);
    assert.equal(await page.getByRole('button', { name: 'Fazer outro treino', exact: true }).count(), 0);
    assert.equal(await page.getByText('Pr\u00f3ximo treino', { exact: true }).count(), 0);
    await page.getByRole('link', { name: 'Continuar treino', exact: true }).click();
    await page.waitForURL('**/workout/A');
    assert.deepEqual((await state()).activeDraft, activeStrength.activeDraft);
    await page.evaluate((snapshot) => localStorage.setItem('daily-workout-state', JSON.stringify(snapshot)), beforeCategories);
    await page.goto(baseURL);
    await noOverflow();
    await page.screenshot({ path: 'dist/cardio-qa/artifacts/home-next-320.png', fullPage: true, animations: 'disabled' });
    await openSelector();
    await cardioCategory.click();
    await page.reload();
    assert.equal(await dialog.count(), 0);
    await openSelector();
    assert.equal(await strengthCategory.getAttribute('aria-expanded'), 'true');
    assert.deepEqual(await state(), beforeCategories, 'selector must not change persisted workout state');
    await cardioCategory.click();
    await dialog.locator('a[href="/cardio/stationary-bike"]').click();
    await page.waitForURL('**/cardio/stationary-bike');
    assert.equal(await dialog.count(), 0);
    assert.equal((await state()).activeDraft, null, 'preview must not create a session');
    assert.equal(await page.evaluate(() => window.__qa.wakeRequests), 0);
    console.log('PASS Home next workout, selector, keyboard focus, exclusive accordions, preview-only links and active strength');
    await click('Iniciar treino');
    await page.waitForFunction(() => window.__qa.wakeRequests > 0);
    const startedAt = (await state()).activeDraft.startedAt;
    await page.getByRole('link', { name: 'Treinos', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: 'Fazer outro treino', exact: true }).count(), 0);
    assert.equal(await page.getByText('Pr\u00f3ximo treino', { exact: true }).count(), 0);
    await noOverflow();
    await page.getByRole('link', { name: 'Continuar treino', exact: true }).click();
    await page.waitForURL('**/cardio/stationary-bike');
    assert.equal((await state()).activeDraft.startedAt, startedAt);

    await page.clock.runFor(35 * 60000);
    assert.equal(await page.getByRole('dialog').count(), 0, 'no stale strength prompt for cardio');
    assert.ok((await page.locator('body').innerText()).includes('35:00'));
    await page.getByLabel('Distância (km)', { exact: true }).fill('12.4');
    await noOverflow();
    await page.locator('body').click({ position: { x: 4, y: 4 } });
    await page.evaluate(() => window.scrollTo(0, 0));
    fs.mkdirSync('dist/cardio-qa/artifacts', { recursive: true });
    await page.screenshot({ path: 'dist/cardio-qa/artifacts/continuous-320.png', fullPage: true, animations: 'disabled' });
    await finish();
    let current = await state();
    assert.equal(current.activeDraft, null);
    assert.equal(current.lastCompletedWorkoutId, 'A');
    assert.equal(current.history.length, 2);
    assert.equal(current.history[0].type, undefined, 'legacy history must not be migrated');
    assert.equal(current.history[1].distanceKm, 12.4);
    assert.equal(current.history[1].intervals, undefined);
    assert.equal(current.history[1].startedAt, startedAt);
    assert.equal(await page.evaluate(() => window.__qa.wakeReleases > 0), true);
    await page.getByText('SETEMBRO DE 2026', { exact: true }).waitFor();
    await noOverflow();
    console.log('PASS legacy history, preview, continuous cardio, finish, Wake Lock release, monthly grouping');

    await page.goto(`${baseURL}/cardio/stationary-bike`);
    await click('Iniciar treino');
    await click('Configurar tiros');
    await page.getByLabel('Quantidade', { exact: true }).fill('10');
    await page.getByLabel('Duração (s)', { exact: true }).fill('30');
    await click('Salvar tiros');
    const totalStart = (await state()).activeDraft.startedAt;
    await click('Iniciar tiro');
    await noOverflow();
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: 'dist/cardio-qa/artifacts/running-320.png', fullPage: true, animations: 'disabled' });
    let running = (await state()).activeDraft;
    assert.equal(running.intervals.completedCount, 0);
    assert.ok(running.intervalEndAt > new Date(running.startedAt).getTime());
    await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
    await page.clock.runFor(31000);
    await waitCount(1);
    assert.equal((await state()).activeDraft.startedAt, totalStart);
    assert.equal(await page.evaluate(() => window.__qa.vibrations), 1);
    assert.equal(await page.evaluate(() => window.__qa.beeps), 3);
    assert.deepEqual(await page.evaluate(() => window.__qa.notifications), ['Tiro concluído']);
    await page.evaluate(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(await page.evaluate(() => window.__qa.vibrations), 1);
    await page.getByRole('button', { name: /Bike ergométrica em andamento/ }).click();
    await click('Marcar tiro'); await waitCount(2);
    await click('Desfazer último tiro'); await waitCount(1);
    await click('Iniciar tiro');
    await click('Marcar tiro'); await waitCount(2);
    await page.clock.runFor(31000);
    assert.equal((await state()).activeDraft.intervals.completedCount, 2);
    assert.equal(await page.evaluate(() => window.__qa.vibrations), 1);
    console.log('PASS timestamp timer, route navigation, one alert, manual mark, undo, no double completion');

    // Simulate an OS suspension by persisting an overdue interval and reloading.
    await click('Iniciar tiro');
    await page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem('daily-workout-state'));
      saved.activeDraft.intervalEndAt = Date.now() - 1000;
      localStorage.setItem('daily-workout-state', JSON.stringify(saved));
    });
    await page.reload();
    await waitCount(3);
    await page.evaluate(() => { window.dispatchEvent(new Event('focus')); document.dispatchEvent(new Event('visibilitychange')); });
    assert.equal(await page.evaluate(() => window.__qa.vibrations), 1, 'StrictMode and foreground must alert once');
    await page.reload();
    await waitCount(3);
    assert.equal(await page.evaluate(() => window.__qa.vibrations), 0, 'completed persisted interval must not alert on refresh');
    await page.evaluate(async () => {
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
      await window.__qa.sentinel.release();
      document.dispatchEvent(new Event('visibilitychange'));
      Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
      document.dispatchEvent(new Event('visibilitychange'));
    });
    await page.waitForFunction(() => window.__qa.wakeRequests >= 2);
    for (let count = 4; count <= 7; count++) { await click('Marcar tiro'); await waitCount(count); }
    await page.getByLabel('Observações', { exact: true }).fill('Sete tiros realizados');
    await page.setViewportSize({ width: 390, height: 844 });
    await noOverflow();
    await page.locator('body').click({ position: { x: 4, y: 4 } });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.screenshot({ path: 'dist/cardio-qa/artifacts/intervals-390.png', fullPage: true, animations: 'disabled' });
    await finish();
    current = await state();
    assert.equal(current.history.at(-1).intervals.completedCount, 7);
    assert.equal(current.history.at(-1).intervals.targetCount, 10);
    assert.equal(current.activeDraft, null);
    await page.getByRole('button', { name: /Bike ergométrica.*7\/10 tiros/ }).click();
    await page.clock.runFor(400);
    assert.ok((await page.locator('body').innerText()).includes('Sete tiros realizados'));
    await page.screenshot({ path: 'dist/cardio-qa/artifacts/history-390.png', fullPage: true, animations: 'disabled' });
    assert.ok(await page.locator('dl').first().evaluate((details) =>
      details.parentElement.parentElement.getBoundingClientRect().height >= details.getBoundingClientRect().height), 'expanded cardio details must not be clipped');
    await page.getByRole('button', { name: 'Excluir Bike ergométrica do histórico', exact: true }).first().click();
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir registro', exact: true }).click();
    assert.equal((await state()).history.length, 2);
    assert.equal((await state()).lastCompletedWorkoutId, 'A');
    console.log('PASS overdue rehydration, alert deduplication, Wake Lock reacquisition, 7/10 finish, accordion, deletion');

    await page.goto(`${baseURL}/workout/A`);
    await click('Iniciar treino');
    const reps = page.getByLabel('Reps', { exact: true });
    assert.deepEqual(await reps.evaluateAll((inputs) => inputs.map((input) => input.value)), ['12', '11', '10', '8', '8', '8', '8', '8', '8', '10', '10', '10', '12', '12', '12', '10', '10', '10', '10', '10', '10']);
    await page.getByRole('button', { name: 'Aumentar repetições', exact: true }).first().click();
    assert.equal(await reps.first().inputValue(), '13');
    await reps.first().fill('15');
    await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
    await page.getByRole('button', { name: /Treino A em andamento/ }).click();
    assert.equal(await reps.first().inputValue(), '15');
    await page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem('daily-workout-state'));
      delete saved.activeDraft.type;
      localStorage.setItem('daily-workout-state', JSON.stringify(saved));
    });
    await page.reload();
    assert.equal(await reps.first().inputValue(), '15', 'legacy active draft must resume unchanged');
    await click('Finalizar treino');
    assert.ok((await page.getByRole('dialog').innerText()).includes('Encerrar sem registrar'));
    await page.getByRole('dialog').getByRole('button', { name: 'Continuar treino', exact: true }).click();
    await page.getByRole('button', { name: 'Marcar', exact: true }).first().click();
    assert.equal((await state()).restTimer.status, 'running');
    await page.clock.runFor(91000);
    assert.equal((await state()).restTimer.status, 'finished');
    assert.deepEqual(await page.evaluate(() => window.__qa.notifications), ['Descanso concluído']);
    await click('Finalizar treino');
    assert.ok(!(await page.getByRole('dialog').innerText()).includes('Encerrar sem registrar'));
    await page.getByRole('dialog').getByRole('button', { name: 'Finalizar treino', exact: true }).click();
    await page.waitForURL('**/history');
    assert.equal((await state()).history.at(-1).type, 'strength');
    assert.equal((await state()).history.at(-1).exercises[0].sets[0].completed, true);
    assert.equal((await state()).restTimer.status, 'ready');
    console.log('PASS strength autofill, spinner, manual editing, route resume, short session, completion, auto rest, finish');

    for (const workoutId of ['B', 'C']) {
      await page.goto(`${baseURL}/workout/${workoutId}`);
      await click('Iniciar treino');
      assert.equal((await state()).activeDraft.workoutId, workoutId);
      assert.ok((await state()).activeDraft.exercises.every((exercise) => exercise.sets.every((set) => !set.completed && set.load === '')));
      for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Marcar', exact: true }).first().click();
      await page.clock.runFor(600);
      const completedExercise = page.getByRole('button', { name: /Concluído.*3\/3 séries/ }).first();
      assert.equal(await completedExercise.getAttribute('aria-expanded'), 'false');
      await completedExercise.click();
      assert.equal(await completedExercise.getAttribute('aria-expanded'), 'true');
      await finish();
    }
    await page.goto(baseURL);
    await page.getByText('1 sequência concluída', { exact: true }).waitFor();
    console.log('PASS Treinos B/C, exercise completion, accordion, ABC sequence with mixed history');

    await page.goto(`${baseURL}/cardio/walking`);
    await click('Iniciar treino');
    const beforeDiscard = (await state()).history.length;
    await page.goto(`${baseURL}/workout/B`);
    assert.equal(await page.getByRole('button', { name: 'Iniciar treino', exact: true }).count(), 0);
    assert.equal((await state()).activeDraft.type, 'cardio');
    await page.getByRole('link', { name: 'Voltar à atividade em andamento', exact: true }).click();
    await click('Descartar treino');
    await page.getByRole('dialog').getByRole('button', { name: 'Descartar treino', exact: true }).click();
    assert.equal((await state()).activeDraft, null);
    assert.equal((await state()).history.length, beforeDiscard);
    assert.ok(await page.evaluate(() => window.__qa.wakeReleases > 0));
    assert.deepEqual(errors, []);
    console.log('PASS active session protection, discard, no browser exceptions');

    await page.evaluate(() => {
      const saved = JSON.parse(localStorage.getItem('daily-workout-state'));
      saved.history.push({ ...saved.history.find((session) => session.type === 'cardio'), id: 'old-cardio',
        startedAt: '2025-08-13T12:00:00Z', finishedAt: '2025-08-13T12:40:00Z' });
      localStorage.setItem('daily-workout-state', JSON.stringify(saved));
    });
    await page.setViewportSize({ width: 320, height: 800 });
    await page.goto(`${baseURL}/history`);
    await page.getByRole('button', { name: /^2025/ }).click();
    await page.getByRole('button', { name: /AGOSTO DE 2025/ }).click();
    const oldCard = page.locator('article').filter({ has: page.getByText('13/08/2025', { exact: true }) });
    await oldCard.getByRole('button', { name: /Bike ergométrica.*Contínuo/ }).click();
    await noOverflow();
    await page.screenshot({ path: 'dist/cardio-qa/artifacts/year-320.png', fullPage: true, animations: 'disabled' });
    await oldCard.getByRole('button', { name: 'Excluir Bike ergométrica do histórico', exact: true }).click();
    await page.getByRole('dialog').getByRole('button', { name: 'Excluir registro', exact: true }).click();
    assert.equal(await page.getByRole('button', { name: /^2025/ }).count(), 0);
    console.log('PASS yearly/monthly cardio accordions, narrow layout and empty group removal');

    const historyBeforeShort = (await state()).history.length;
    await page.goto(`${baseURL}/cardio/spinning`);
    await click('Iniciar treino');
    await click('Configurar tiros');
    await click('Salvar tiros');
    await click('Marcar tiro');
    await page.clock.runFor(20000);
    await click('Finalizar treino');
    assert.ok((await page.getByRole('dialog').innerText()).includes('menos de 1 minuto'));
    assert.ok((await page.getByRole('dialog').innerText()).includes('não será registrado no histórico'));
    await page.screenshot({ path: 'dist/cardio-qa/artifacts/short-session-320.png', fullPage: true, animations: 'disabled' });
    await page.getByRole('dialog').getByRole('button', { name: 'Continuar treino', exact: true }).click();
    assert.equal((await state()).activeDraft.intervals.completedCount, 1);
    await click('Finalizar treino');
    await page.getByRole('dialog').getByRole('button', { name: 'Encerrar sem registrar', exact: true }).click();
    assert.equal((await state()).history.length, historyBeforeShort);
    assert.equal((await state()).activeDraft, null);

    await page.goto(`${baseURL}/cardio/spinning`);
    await click('Iniciar treino');
    await page.getByLabel('Distância (km)', { exact: true }).fill('4.5');
    const continuousStart = (await state()).activeDraft.startedAt;
    await click('Configurar tiros'); await click('Salvar tiros'); await click('Editar planejamento');
    await click('Remover tiros');
    assert.equal(await page.getByRole('dialog').count(), 0);
    assert.equal((await state()).activeDraft.intervals, undefined);
    await click('Configurar tiros'); await click('Salvar tiros'); await click('Marcar tiro');
    await click('Editar planejamento'); await click('Remover tiros');
    assert.ok((await page.getByRole('dialog').innerText()).includes('o treino continuará como atividade contínua'));
    await page.getByRole('dialog').getByRole('button', { name: 'Manter tiros', exact: true }).click();
    assert.equal((await state()).activeDraft.intervals.completedCount, 1);
    await click('Remover tiros');
    await page.getByRole('dialog').getByRole('button', { name: 'Remover tiros', exact: true }).click();
    assert.equal((await state()).activeDraft.intervals, undefined);
    assert.equal((await state()).activeDraft.startedAt, continuousStart);
    assert.equal((await state()).activeDraft.distanceKm, 4.5);
    await click('Configurar tiros'); await click('Salvar tiros'); await click('Iniciar tiro');
    const alertsBeforeRemove = await page.evaluate(() => window.__qa.vibrations);
    await click('Treino contínuo');
    assert.equal((await state()).activeDraft.intervalEndAt, null);
    await page.clock.runFor(61000);
    assert.equal(await page.evaluate(() => window.__qa.vibrations), alertsBeforeRemove);
    await page.reload();
    assert.equal((await state()).activeDraft.intervals, undefined);
    assert.equal((await state()).activeDraft.startedAt, continuousStart);
    await click('Finalizar treino');
    assert.ok(!(await page.getByRole('dialog').innerText()).toLowerCase().includes('tiros'));
    await page.getByRole('dialog').getByRole('button', { name: 'Continuar treino', exact: true }).click();
    await click('Configurar tiros'); await click('Salvar tiros');
    await click('Finalizar treino');
    assert.ok((await page.getByRole('dialog').innerText()).includes('mesmo sem completar todos os tiros'));
    await page.getByRole('dialog').getByRole('button', { name: 'Continuar treino', exact: true }).click();
    await click('Editar planejamento'); await click('Remover tiros');
    await finish();
    assert.equal((await state()).history.at(-1).intervals, undefined);
    assert.equal((await state()).history.at(-1).distanceKm, 4.5);
    await page.goto(baseURL);
    const lastHome = page.locator('section').filter({ has: page.getByText('Último treino concluído', { exact: true }) });
    const displayedTime = await lastHome.locator('p').last().innerText();
    assert.match(displayedTime, /^Hoje · \d{2}:\d{2} às \d{2}:\d{2}$/);
    await page.goto(`${baseURL}/settings`);
    await page.getByText(displayedTime, { exact: true }).waitFor();
    assert.deepEqual(errors, []);
    console.log('PASS short cardio discard with completed shots, contextual finish, removal/cancel/running removal, persistence and consistent last-session timing');
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
