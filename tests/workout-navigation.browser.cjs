/* global process, console, window, document, localStorage, sessionStorage */
const assert = require('node:assert/strict');
const path = require('node:path');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || path.resolve('dist/cardio-qa/node_modules/playwright'));
const baseURL = process.env.TEST_BASE_URL || 'http://127.0.0.1:5175';

async function main() {
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true });
  const page = await browser.newPage({ viewport: { width: 320, height: 800 }, isMobile: true, hasTouch: true });
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await page.addInitScript(() => {
    sessionStorage.setItem('daily-workout-splash-seen', 'true');
    // Seed existing settings so their first-use initialization is not mistaken for navigation persistence.
    localStorage.setItem('daily-workout-rest-timer-settings', JSON.stringify({ defaultRestSeconds: 90 }));
    localStorage.setItem('daily-workout-rest-alert-settings', JSON.stringify({ sound: false, volume: 'high', vibration: false, notifications: false }));
    localStorage.setItem('daily-workout-session-settings', JSON.stringify({ keepScreenAwake: false, autoStartRestTimer: true }));
  });
  const button = (name) => page.getByRole('button', { name, exact: true });
  const dialog = page.getByRole('dialog', { name: 'Fazer outro treino', exact: true });
  const persisted = () => page.evaluate(() => Object.fromEntries(Object.entries(localStorage)));
  const routeState = () => page.evaluate(() => window.history.state?.usr);
  const openSelector = () => button('Fazer outro treino').click();
  const select = async (route) => {
    await dialog.locator(`a[href="${route}"]`).click();
    await page.waitForURL(`${baseURL}${route}`);
    assert.equal(await dialog.count(), 0);
    assert.equal((await routeState()).origin, 'workout-picker');
  };
  const back = async (reopen) => {
    await button('Voltar para treinos').click();
    await page.waitForURL(`${baseURL}/`);
    if (reopen) {
      await dialog.waitFor();
      await page.waitForFunction(() => window.history.state?.usr?.reopenWorkoutPicker === false);
      assert.equal(await dialog.count(), 1);
      assert.equal(await page.evaluate(() => document.activeElement.getAttribute('aria-label')), 'Fechar seletor de treinos');
      assert.equal(await dialog.evaluate((element) => element.scrollWidth > element.clientWidth), false);
    } else {
      assert.equal(await dialog.count(), 0);
    }
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth), false);
  };

  try {
    await page.goto(baseURL);
    const initial = await persisted();
    await page.getByRole('link', { name: 'Ver treino A', exact: true }).click();
    assert.equal((await routeState()).origin, 'home-next-workout');
    await back(false);
    assert.deepEqual(await persisted(), initial);
    console.log('PASS main next-workout link returns to normal Home without changing storage');

    await openSelector();
    await select('/workout/C');
    await back(true);
    await button('Fechar seletor de treinos').click();
    assert.equal(await dialog.count(), 0);
    assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Fazer outro treino');
    await page.getByRole('link', { name: 'Ajustes', exact: true }).click();
    await page.getByRole('link', { name: 'Treinos', exact: true }).click();
    assert.equal(await dialog.count(), 0);
    await page.reload();
    assert.equal(await dialog.count(), 0);
    assert.deepEqual(await persisted(), initial);
    console.log('PASS picker strength return, focus restoration, close and consumed signal');

    for (const modality of ['stationary-bike', 'spinning', 'running', 'walking', 'outdoor-bike']) {
      await openSelector();
      await page.locator('#cardio-category-heading').click();
      await select(`/cardio/${modality}`);
      await back(true);
      await page.keyboard.press('Escape');
      assert.equal(await dialog.count(), 0);
      assert.equal(await page.evaluate(() => document.activeElement.textContent), 'Fazer outro treino');
    }
    assert.deepEqual(await persisted(), initial);
    console.log('PASS all cardio previews return to picker, Escape closes, no persistence added');

    for (const route of ['/workout/B', '/cardio/walking']) {
      await page.goto(`${baseURL}${route}`);
      await page.reload();
      await back(false);
    }
    assert.deepEqual(await persisted(), initial);
    console.log('PASS direct URL and refresh without origin return to normal Home');

    for (const route of ['/workout/A', '/cardio/stationary-bike']) {
      await openSelector();
      if (route.startsWith('/cardio')) await page.locator('#cardio-category-heading').click();
      await select(route);
      await button('Iniciar treino').click();
      await page.waitForFunction(() => !window.history.state?.usr?.origin);
      const active = await page.evaluate(() => JSON.parse(localStorage.getItem('daily-workout-state')).activeDraft);
      assert.ok(active);
      assert.equal('origin' in active, false);
      assert.equal(await button('Voltar para treinos').count(), 0);
      await page.getByRole('link', { name: 'Treinos', exact: true }).click();
      assert.equal(await dialog.count(), 0);
      assert.equal(await button('Fazer outro treino').count(), 0);
      await page.getByRole('link', { name: 'Continuar treino', exact: true }).click();
      assert.deepEqual(await page.evaluate(() => JSON.parse(localStorage.getItem('daily-workout-state')).activeDraft), active);
      await page.evaluate((snapshot) => {
        localStorage.clear();
        for (const [key, value] of Object.entries(snapshot)) localStorage.setItem(key, value);
      }, initial);
      await page.goto(baseURL);
    }
    assert.deepEqual(errors, []);
    console.log('PASS active strength/cardio navigation unchanged, origin cleared and no browser exceptions');
  } finally {
    await browser.close();
  }
}

main().catch((error) => { console.error(error); process.exitCode = 1; });
