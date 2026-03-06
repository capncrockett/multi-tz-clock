const path = require("node:path");

const DEFAULT_WINDOW_BOUNDS = Object.freeze({
  width: 420,
  height: 560,
  minWidth: 320,
  minHeight: 420
});

function createMainWindowOptions({ preloadPath }) {
  if (!preloadPath) {
    throw new Error("preloadPath is required");
  }

  return {
    ...DEFAULT_WINDOW_BOUNDS,
    frame: false,
    transparent: true,
    backgroundColor: "#00000000",
    alwaysOnTop: true,
    autoHideMenuBar: true,
    resizable: true,
    maximizable: false,
    fullscreenable: false,
    show: false,
    title: "Multi-TZ Clock",
    webPreferences: {
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    }
  };
}

function getClockHtmlPath(repoRoot) {
  return path.join(repoRoot, "index.html");
}

function createTrayMenuEntries({ isVisible, isAlwaysOnTop }) {
  return [
    {
      id: "toggle-visibility",
      label: isVisible ? "Hide Clock" : "Show Clock"
    },
    {
      id: "toggle-always-on-top",
      label: "Always on Top",
      type: "checkbox",
      checked: isAlwaysOnTop
    },
    { type: "separator" },
    {
      id: "quit",
      label: "Quit"
    }
  ];
}

module.exports = {
  DEFAULT_WINDOW_BOUNDS,
  createMainWindowOptions,
  getClockHtmlPath,
  createTrayMenuEntries
};
