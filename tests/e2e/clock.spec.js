const path = require('path');
const { pathToFileURL } = require('url');
const { test, expect, chromium } = require('@playwright/test');

const APP_URL = pathToFileURL(path.resolve(__dirname, '../../index.html')).href;

async function gotoApp(page) {
  await page.goto(APP_URL);
  await expect(page.locator('#clock')).toBeVisible();
}

async function freezeTime(page, isoString) {
  await page.addInitScript((fixedIsoString) => {
    const fixedTime = new Date(fixedIsoString).valueOf();
    const RealDate = Date;
    class MockDate extends RealDate {
      constructor(...args) {
        super(...(args.length ? args : [fixedTime]));
      }
      static now() {
        return fixedTime;
      }
      static parse(value) {
        return RealDate.parse(value);
      }
      static UTC(...args) {
        return RealDate.UTC(...args);
      }
    }
    globalThis.Date = MockDate;
  }, isoString);
}

async function mockDesktopShell(page, options = {}) {
  const {
    initialPreset = 'medium',
    initialUiVisible = true
  } = options;

  await page.addInitScript(({ initialPreset, initialUiVisible }) => {
    let preset = initialPreset;
    let uiVisible = initialUiVisible;
    const presetListeners = [];
    const uiListeners = [];

    globalThis.desktopShell = {
      isDesktop: true,
      platform: 'win32',
      getWindowSizePreset: async () => preset,
      setWindowSizePreset: async (nextPreset) => {
        preset = nextPreset;
        for (const listener of presetListeners) listener(preset);
        return preset;
      },
      onWindowSizePresetChange(listener) {
        presetListeners.push(listener);
        return () => {};
      },
      getUiVisibility: async () => uiVisible,
      setUiVisibility: async (nextVisible) => {
        uiVisible = !!nextVisible;
        for (const listener of uiListeners) listener(uiVisible);
        return uiVisible;
      },
      onUiVisibilityChange(listener) {
        uiListeners.push(listener);
        return () => {};
      }
    };

    globalThis.__desktopShellTest = {
      emitUiVisibility(nextVisible) {
        uiVisible = !!nextVisible;
        for (const listener of uiListeners) listener(uiVisible);
      }
    };

    document.addEventListener('DOMContentLoaded', () => {
      document.documentElement.dataset.shell = 'desktop';
    });
  }, { initialPreset, initialUiVisible });
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
  await expect(showOuterCity).not.toBeChecked();
  await expect(showOuterCity).toBeDisabled();
  await expect(page.locator('#desktopSizeLabel')).toBeHidden();

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
  await showOuterCity.check();
  await expect(showOuterCity).toBeChecked();

  await showDebug.check();
  await expect(showDebug).toBeChecked();
  await expect(showDebugFrames).toBeEnabled();
  await showDebugFrames.check();
  await expect(showDebugFrames).toBeChecked();

  const appShellOutline = await page.evaluate(() => {
    return getComputedStyle(document.getElementById('app-shell')).outlineStyle;
  });
  expect(appShellOutline).toBe('dashed');
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

test('persists zones and display toggles across reloads', async ({ page }) => {
  await gotoApp(page);

  const zones = page.locator('.zone-item');
  const initialCount = await zones.count();
  const addSelect = page.locator('#addTzSelect');

  const zoneToAdd = await addSelect.evaluate((el) => {
    const option = Array.from(el.options).find((entry) => entry.value);
    return option ? { value: option.value, label: option.textContent } : null;
  });
  expect(zoneToAdd).not.toBeNull();

  await page.locator('#showBezelLabels').check();
  await addSelect.selectOption(zoneToAdd.value);
  await expect(zones).toHaveCount(initialCount + 1);

  await page.reload();
  await expect(page.locator('#showBezelLabels')).toBeChecked();
  await expect(page.locator('.zone-item')).toHaveCount(initialCount + 1);
  await expect(page.locator('.zone-item', { hasText: zoneToAdd.label })).toBeVisible();
});

test('persists zones and display toggles across browser restart', async ({ browserName }, testInfo) => {
  test.skip(browserName !== 'chromium', 'Persistent context coverage is only needed for Chromium.');

  const userDataDir = path.join(testInfo.outputDir, 'restart-profile');
  let context;

  try {
    context = await chromium.launchPersistentContext(userDataDir, { headless: true });
    let page = context.pages()[0] || await context.newPage();
    await page.goto(APP_URL);
    await expect(page.locator('#clock')).toBeVisible();

    const addSelect = page.locator('#addTzSelect');
    const zoneToAdd = await addSelect.evaluate((el) => {
      const option = Array.from(el.options).find((entry) => entry.value);
      return option ? { value: option.value, label: option.textContent } : null;
    });
    expect(zoneToAdd).not.toBeNull();

    await page.locator('#showBezelLabels').check();
    await addSelect.selectOption(zoneToAdd.value);
    await context.close();

    context = await chromium.launchPersistentContext(userDataDir, { headless: true });
    page = context.pages()[0] || await context.newPage();
    await page.goto(APP_URL);
    await expect(page.locator('#clock')).toBeVisible();

    await expect(page.locator('#showBezelLabels')).toBeChecked();
    await expect(page.locator('.zone-item', { hasText: zoneToAdd.label })).toBeVisible();
  } finally {
    if (context) {
      await context.close();
    }
  }
});

test('local zone action adds the nearest catalog city from geolocation', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'geolocation', {
      configurable: true,
      value: {
        getCurrentPosition(success) {
          success({
            coords: {
              latitude: 21.31,
              longitude: -157.86
            }
          });
        }
      }
    });
  });

  await gotoApp(page);
  const initialCount = await page.locator('.zone-item').count();

  await page.locator('#addLocalZone').click();

  await expect(page.locator('.zone-item')).toHaveCount(initialCount + 1);
  await expect(page.locator('.zone-item', { hasText: 'Honolulu' })).toBeVisible();
});

test('sub-hour offsets keep separate hour hands in the deduped count', async ({ page }) => {
  await freezeTime(page, '2026-03-06T12:10:00Z');
  await gotoApp(page);

  await page.locator('#addTzSelect').selectOption({ label: 'Karachi' });
  await page.locator('#addTzSelect').selectOption({ label: 'Mumbai' });
  await page.locator('#showDebug').check();

  await expect(page.locator('#debug-main')).toContainText('active=6 deduped=6');
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

test('desktop hide ui mode leaves only the clock face visible', async ({ page }) => {
  await mockDesktopShell(page, { initialUiVisible: true });
  await page.setViewportSize({ width: 420, height: 560 });
  await gotoApp(page);

  await expect(page.locator('#desktopSizeLabel')).toBeVisible();
  const beforeWidth = await page.evaluate(() => parseFloat(document.getElementById('clock').style.width || '0'));

  await page.evaluate(() => {
    window.__desktopShellTest.emitUiVisibility(false);
  });

  await expect(page.locator('#clock')).toBeVisible();
  await expect(page.locator('#controls')).toBeHidden();
  await expect(page.locator('#zone-bar')).toBeHidden();
  await expect(page.locator('#debug-controls')).toBeHidden();
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.desktopUi)).toBe('clock-only');

  const afterWidth = await page.evaluate(() => parseFloat(document.getElementById('clock').style.width || '0'));
  expect(afterWidth).toBeGreaterThan(beforeWidth);
});

test('accessibility hooks are present', async ({ page }) => {
  await gotoApp(page);

  await expect(page.locator('.skip-link')).toHaveAttribute('href', '#zone-bar');
  await expect(page.locator('#app-shell')).toBeVisible();
  await expect(page.locator('#controls')).toHaveAttribute('role', 'toolbar');
  await expect(page.locator('#zone-bar')).toHaveAttribute('role', 'list');
  await expect(page.locator('#sr-times')).toHaveAttribute('aria-live', 'polite');
  await expect(page.locator('#zone-status')).toHaveAttribute('aria-live', 'polite');
});
