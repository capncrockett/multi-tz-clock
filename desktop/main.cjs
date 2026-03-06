const path = require("node:path");
const {
  app,
  BrowserWindow,
  Menu,
  Tray,
  nativeImage
} = require("electron");
const {
  createMainWindowOptions,
  getClosestWindowSizePreset,
  getClockHtmlPath,
  createTrayMenuEntries,
  getWindowSizePreset,
  DEFAULT_WINDOW_PRESET_ID
} = require("./window-config.cjs");

const repoRoot = path.resolve(__dirname, "..");
const preloadPath = path.join(__dirname, "preload.cjs");

let mainWindow = null;
let tray = null;
let isQuitting = false;
let currentWindowPresetId = DEFAULT_WINDOW_PRESET_ID;
let resizeSnapTimer = null;
let isApplyingWindowPreset = false;

function createTrayIcon() {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
      <circle cx="32" cy="32" r="29" fill="#0f3460" />
      <circle cx="32" cy="32" r="26" fill="#16213e" stroke="#eef0f8" stroke-width="2" />
      <path d="M32 18v16l11 7" fill="none" stroke="#e94560" stroke-width="4" stroke-linecap="round" stroke-linejoin="round" />
      <circle cx="32" cy="32" r="3" fill="#eef0f8" />
    </svg>
  `.trim();

  return nativeImage.createFromDataURL(`data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`);
}

function getMainWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return null;
  }

  return mainWindow;
}

function showWindow() {
  const win = getMainWindow();
  if (!win) {
    createMainWindow();
    return;
  }

  win.show();
  win.focus();
}

function toggleWindowVisibility() {
  const win = getMainWindow();
  if (!win) {
    createMainWindow();
    return;
  }

  if (win.isVisible()) {
    win.hide();
  } else {
    showWindow();
  }
}

function toggleAlwaysOnTop() {
  const win = getMainWindow();
  if (!win) {
    return;
  }

  win.setAlwaysOnTop(!win.isAlwaysOnTop(), "screen-saver");
  refreshTrayMenu();
}

function quitApplication() {
  isQuitting = true;
  app.quit();
}

function buildTrayMenuItem(entry) {
  if (entry.type === "separator") {
    return { type: "separator" };
  }

  const item = {
    label: entry.label,
    type: entry.type || "normal"
  };

  if (typeof entry.checked === "boolean") {
    item.checked = entry.checked;
  }

  if (Array.isArray(entry.submenu)) {
    item.submenu = entry.submenu.map(buildTrayMenuItem);
  }

  switch (entry.id) {
    case "toggle-visibility":
      item.click = toggleWindowVisibility;
      break;
    case "toggle-always-on-top":
      item.click = toggleAlwaysOnTop;
      break;
    case "quit":
      item.click = quitApplication;
      break;
    default:
      if (entry.id?.startsWith("size-")) {
        const presetId = entry.id.slice("size-".length);
        item.click = () => applyWindowPreset(presetId);
      }
      break;
  }

  return item;
}

function refreshTrayMenu() {
  if (!tray) {
    return;
  }

  const win = getMainWindow();
  const entries = createTrayMenuEntries({
    isVisible: !!win?.isVisible(),
    isAlwaysOnTop: !!win?.isAlwaysOnTop(),
    currentPresetId: currentWindowPresetId
  });

  const template = entries.map(buildTrayMenuItem);

  tray.setContextMenu(Menu.buildFromTemplate(template));
  tray.setToolTip("Multi-TZ Clock");
}

function applyWindowPreset(presetId) {
  const preset = getWindowSizePreset(presetId);
  currentWindowPresetId = preset.id;

  const win = getMainWindow();
  if (!win) {
    return;
  }

  isApplyingWindowPreset = true;
  win.setContentSize(preset.width, preset.height);
  refreshTrayMenu();

  setTimeout(() => {
    isApplyingWindowPreset = false;
  }, 0);
}

function snapWindowToNearestPreset() {
  const win = getMainWindow();
  if (!win || isApplyingWindowPreset) {
    return;
  }

  const [contentWidth, contentHeight] = win.getContentSize();
  const nearestPreset = getClosestWindowSizePreset(contentWidth, contentHeight);
  const currentPreset = getWindowSizePreset(nearestPreset.id);
  const alreadyAtPresetSize = contentWidth === currentPreset.width && contentHeight === currentPreset.height;
  if (nearestPreset.id !== currentWindowPresetId || !alreadyAtPresetSize) {
    applyWindowPreset(nearestPreset.id);
  }
}

function scheduleWindowPresetSnap() {
  if (resizeSnapTimer) {
    clearTimeout(resizeSnapTimer);
  }

  resizeSnapTimer = setTimeout(() => {
    resizeSnapTimer = null;
    snapWindowToNearestPreset();
  }, 140);
}

function wireWindowSizing(win) {
  win.on("resize", () => {
    if (isApplyingWindowPreset) {
      return;
    }

    scheduleWindowPresetSnap();
  });
}

function createTray() {
  tray = new Tray(createTrayIcon());
  tray.setIgnoreDoubleClickEvents(true);
  tray.on("click", toggleWindowVisibility);
  refreshTrayMenu();
}

function createMainWindow() {
  mainWindow = new BrowserWindow(createMainWindowOptions({ preloadPath }));
  mainWindow.setAlwaysOnTop(true, "screen-saver");
  mainWindow.loadFile(getClockHtmlPath(repoRoot));
  wireWindowSizing(mainWindow);

  mainWindow.once("ready-to-show", () => {
    applyWindowPreset(currentWindowPresetId);
    mainWindow.show();
    refreshTrayMenu();
  });

  mainWindow.on("show", refreshTrayMenu);
  mainWindow.on("hide", refreshTrayMenu);
  mainWindow.on("close", (event) => {
    if (isQuitting) {
      return;
    }

    event.preventDefault();
    mainWindow.hide();
  });
  mainWindow.on("closed", () => {
    mainWindow = null;
    refreshTrayMenu();
  });
}

app.setAppUserModelId("com.capnc.multi-tz-clock");

app.whenReady().then(() => {
  createMainWindow();
  createTray();

  app.on("activate", () => {
    showWindow();
  });
});

app.on("before-quit", () => {
  isQuitting = true;
  if (resizeSnapTimer) {
    clearTimeout(resizeSnapTimer);
    resizeSnapTimer = null;
  }
});
