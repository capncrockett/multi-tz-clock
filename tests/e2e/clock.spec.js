const path = require('path');
const { pathToFileURL } = require('url');
const { test, expect } = require('@playwright/test');

const APP_URL = pathToFileURL(path.resolve(__dirname, '../../index.html')).href;

async function gotoApp(page) {
  await page.goto(APP_URL);
  await expect(page.locator('#clock')).toBeVisible();
}

test('loads and initializes without runtime errors', async ({ page }) => {
  const runtimeErrors = [];
  page.on('pageerror', (err) => runtimeErrors.push(err.message));

  await gotoApp(page);
  await expect.poll(async () => {
    return page.evaluate(() => {
      const canvas = document.getElementById('clock');
      return { width: canvas.width, height: canvas.height };
    });
  }).toEqual(expect.objectContaining({ width: expect.any(Number), height: expect.any(Number) }));

  const size = await page.evaluate(() => {
    const canvas = document.getElementById('clock');
    return { width: canvas.width, height: canvas.height };
  });
  expect(size.width).toBeGreaterThan(0);
  expect(size.height).toBeGreaterThan(0);
  expect(runtimeErrors).toEqual([]);
});

test('control toggles and bezel/city dependencies work', async ({ page }) => {
  await gotoApp(page);

  const showBezelLabels = page.locator('#showBezelLabels');
  await expect(showBezelLabels).not.toBeChecked();

  const showOuterCity = page.locator('#showOuterCity');
  await expect(showOuterCity).toBeChecked();
  await expect(showOuterCity).toBeDisabled();

  const showDebug = page.locator('#showDebug');
  const showDebugFrames = page.locator('#showDebugFrames');
  await expect(showDebug).not.toBeChecked();
  await expect(showDebugFrames).toBeDisabled();

  const use24h = page.locator('#use24h');
  await expect(use24h).not.toBeChecked();
  await use24h.check();
  await expect(use24h).toBeChecked();

  const showSeconds = page.locator('#showSeconds');
  await expect(showSeconds).toBeChecked();
  await showSeconds.uncheck();
  await expect(showSeconds).not.toBeChecked();

  await showBezelLabels.check();
  await expect(showBezelLabels).toBeChecked();
  await expect(showOuterCity).toBeEnabled();
  await showOuterCity.uncheck();
  await expect(showOuterCity).not.toBeChecked();

  await showDebug.check();
  await expect(showDebug).toBeChecked();
  await expect(showDebugFrames).toBeEnabled();
  await showDebugFrames.check();
  await expect(showDebugFrames).toBeChecked();
});

test('zone add and remove flow updates chip count', async ({ page }) => {
  await gotoApp(page);

  const zones = page.locator('.zone-item');
  const initialCount = await zones.count();
  expect(initialCount).toBeGreaterThan(0);

  const addSelect = page.locator('#addTzSelect');
  await expect(addSelect).toBeVisible();

  const tzToAdd = await addSelect.evaluate((el) => {
    const options = Array.from(el.options).map((o) => o.value);
    return options.find((value) => value !== '') || null;
  });
  expect(tzToAdd).not.toBeNull();

  await addSelect.selectOption(tzToAdd);
  await expect(zones).toHaveCount(initialCount + 1);

  await page.locator('.zone-remove').first().click();
  await expect(zones).toHaveCount(initialCount);
});

test('small and xsmall viewport tiers update dynamically', async ({ page }) => {
  await page.setViewportSize({ width: 280, height: 500 });
  await gotoApp(page);

  const showBezelLabels = page.locator('#showBezelLabels');
  await expect(showBezelLabels).toBeVisible();

  const showOuterCity = page.locator('#showOuterCity');
  await expect(showOuterCity).toBeVisible();
  await expect(showOuterCity).toBeDisabled();
  await showBezelLabels.check();
  await expect(showBezelLabels).toBeChecked();
  await expect(showOuterCity).toBeEnabled();
  await showOuterCity.uncheck();
  await expect(showOuterCity).not.toBeChecked();
  await showOuterCity.check();
  await expect(showOuterCity).toBeChecked();

  const canvasCssWidth = await page.evaluate(() => {
    const canvas = document.getElementById('clock');
    return parseFloat(canvas.style.width || '0');
  });
  expect(canvasCssWidth).toBeLessThan(300);

  const showDebug = page.locator('#showDebug');
  await showDebug.check();
  const debugMain = page.locator('#debug-main');
  await expect(debugMain).toContainText('tier: small');

  await page.setViewportSize({ width: 200, height: 420 });
  await expect(debugMain).toContainText('tier: xsmall');
});

test('accessibility hooks are present', async ({ page }) => {
  await gotoApp(page);

  await expect(page.locator('.skip-link')).toHaveAttribute('href', '#zone-bar');
  await expect(page.locator('#controls')).toHaveAttribute('role', 'toolbar');
  await expect(page.locator('#zone-bar')).toHaveAttribute('role', 'list');
  await expect(page.locator('#sr-times')).toHaveAttribute('aria-live', 'polite');
});
