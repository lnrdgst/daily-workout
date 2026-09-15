/* global process, console, window, document, localStorage, sessionStorage */
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.resolve('dist/cardio-qa/node_modules/playwright'));
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5175';

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true, timezoneId: 'America/Sao_Paulo' });
  const now = Date.parse('2026-09-15T15:00:00Z');
  await page.clock.install({ time: now }); await page.clock.pauseAt(now);
  await page.addInitScript(() => {
    sessionStorage.setItem('daily-workout-splash-seen', 'true');
    localStorage.setItem('daily-workout-user-preferences', JSON.stringify({ displayName: 'Leo' }));
    localStorage.setItem('daily-workout-session-settings', JSON.stringify({ keepScreenAwake: false }));
  });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  const yesterday = { id: 'strength-b', workoutId: 'B', workoutName: 'Treino B', startedAt: '2026-09-14T15:20:00Z', finishedAt: '2026-09-14T15:28:00Z', exercises: [] };
  const today = { ...yesterday, id: 'today-b', startedAt: '2026-09-15T12:20:00Z', finishedAt: '2026-09-15T12:28:00Z' };
  const cardio = { type: 'cardio', modality: 'running', id: 'run', workoutName: 'Corrida', startedAt: '2026-09-15T13:00:00Z', finishedAt: '2026-09-15T13:45:00Z' };
  const top = () => page.locator('main section').first();
  const persisted = () => page.evaluate(() => localStorage.getItem('daily-workout-state'));
  const seed = async (history, activeDraft = null) => {
    await page.goto(baseURL);
    await page.evaluate((state) => localStorage.setItem('daily-workout-state', JSON.stringify(state)), {
      history, activeDraft, lastCompletedWorkoutId: 'B', lastOpenedWorkoutId: 'B', restTimer: { status: 'ready', selectedSeconds: 90, endAt: null },
    });
    await page.reload(); await top().waitFor();
  };
  const artifactDir = 'dist/cardio-qa/artifacts';
  fs.mkdirSync(artifactDir, { recursive: true });
  try {
    for (const [name, history] of [['empty', []], ['yesterday', [yesterday]], ['today', [today]], ['mixed', [cardio, today]]]) {
      await seed(history);
      const before = await persisted();
      const height = await page.locator('main').evaluate((el) => el.getBoundingClientRect().height);
      const baselineFile = `${artifactDir}/home-${name}-height.json`;
      if (process.env.HOME_BASELINE === '1') {
        fs.writeFileSync(baselineFile, JSON.stringify(height));
        await page.screenshot({ path: `${artifactDir}/home-${name}-before.png`, fullPage: true, animations: 'disabled' });
        console.log(`BASELINE ${name}: ${height}px`);
        continue;
      }
      const content = await top().innerText();
      assert.equal(await page.locator('main section').count(), 3);
      assert.equal(await page.getByText('Último treino concluído', { exact: true }).count(), 0);
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
      if (name === 'empty') {
        assert.match(content, /Registre suas cargas/);
        assert.ok(!(await top().getAttribute('class')).includes('border-l-2'));
        assert.ok(!content.includes('Concluído'));
      } else {
        assert.ok(!content.includes('Registre suas cargas'));
        assert.ok(!content.includes('Se quiser treinar novamente'));
        assert.ok(content.includes('Concluído'));
        if (name === 'yesterday') {
          assert.ok(!(await top().getAttribute('class')).includes('border-l-accent-500/70'));
          assert.match(content, /Pronto para o próximo treino/);
          assert.match(content, /Seu último treino concluído/);
          assert.match(content, /14\/09\/2026 das 12:20 às 12:28/);
        } else {
          assert.ok((await top().getAttribute('class')).includes('border-l-accent-500/70'));
          assert.match(content, /Treino de hoje concluído/);
          assert.match(content, /Hoje ·/);
          assert.ok(!content.includes('Seu último treino concluído'));
        }
        if (name === 'mixed') { assert.match(content, /Corrida/); assert.ok(!content.includes('Treino B')); }
        await page.getByRole('link', { name: 'Ver treino C', exact: true }).waitFor();
      }
      if (fs.existsSync(baselineFile)) {
        const previous = JSON.parse(fs.readFileSync(baselineFile, 'utf8'));
        assert.ok(height < previous, `${name}: Home must shrink`);
        console.log(`PASS ${name}: ${previous}px -> ${height}px (reduction ${previous - height}px)`);
      }
      await page.screenshot({ path: `${artifactDir}/home-${name}-after.png`, fullPage: true, animations: 'disabled' });
      assert.equal(await persisted(), before);
    }
    if (process.env.HOME_BASELINE === '1') return;
    for (const activeDraft of [
      { type: 'cardio', modality: 'running', startedAt: new Date(now).toISOString(), intervalEndAt: null },
      { workoutId: 'A', startedAt: new Date(now).toISOString(), exercises: [] },
    ]) {
      await seed([today, cardio], activeDraft);
      assert.match(await top().innerText(), /em andamento/);
      assert.ok(!(await top().innerText()).includes('Hoje ·'));
      await page.getByRole('link', { name: 'Continuar treino', exact: true }).waitFor();
      assert.equal(await page.getByRole('button', { name: 'Fazer outro treino', exact: true }).count(), 0);
    }
    await seed([today]);
    const before = await persisted();
    await page.clock.fastForward(12 * 3600000); // local midnight, no reload
    await page.getByRole('heading', { name: 'Pronto para o próximo treino?', exact: true }).waitFor();
    assert.match(await top().innerText(), /15\/09\/2026 das 09:20 às 09:28/);
    assert.ok(!(await top().getAttribute('class')).includes('border-l-accent-500/70'));
    assert.equal(await persisted(), before);
    assert.deepEqual(errors, []);
    console.log('PASS active session priority, automatic local midnight, storage unchanged, no browser errors');
  } finally { await browser.close(); }
}
main().catch((error) => { console.error(error); process.exitCode = 1; });
