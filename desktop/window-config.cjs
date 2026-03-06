const path = require("node:path");

const WINDOW_SIZE_PRESETS = Object.freeze([
  Object.freeze({ id: "xsmall", label: "X-Small", width: 232, height: 430 }),
  Object.freeze({ id: "small", label: "Small", width: 312, height: 500 }),
  Object.freeze({ id: "medium", label: "Medium", width: 420, height: 560 })
]);
const DEFAULT_WINDOW_PRESET_ID = "medium";
const DEFAULT_WINDOW_PRESET = WINDOW_SIZE_PRESETS.find((preset) => preset.id === DEFAULT_WINDOW_PRESET_ID);
const MIN_WINDOW_PRESET = WINDOW_SIZE_PRESETS[0];
const MAX_WINDOW_PRESET = WINDOW_SIZE_PRESETS[WINDOW_SIZE_PRESETS.length - 1];
const DEFAULT_WINDOW_BOUNDS = Object.freeze({
  width: DEFAULT_WINDOW_PRESET.width,
  height: DEFAULT_WINDOW_PRESET.height,
  minWidth: MIN_WINDOW_PRESET.width,
  minHeight: MIN_WINDOW_PRESET.height,
  maxWidth: MAX_WINDOW_PRESET.width,
  maxHeight: MAX_WINDOW_PRESET.height
});

function getWindowSizePreset(presetId) {
  return WINDOW_SIZE_PRESETS.find((preset) => preset.id === presetId) || DEFAULT_WINDOW_PRESET;
}

function getClosestWindowSizePreset(width, height) {
  const safeWidth = Number(width) || DEFAULT_WINDOW_PRESET.width;
  const safeHeight = Number(height) || DEFAULT_WINDOW_PRESET.height;

  return WINDOW_SIZE_PRESETS.reduce((bestPreset, preset) => {
    const bestDelta = Math.hypot(bestPreset.width - safeWidth, bestPreset.height - safeHeight);
    const nextDelta = Math.hypot(preset.width - safeWidth, preset.height - safeHeight);
    return nextDelta < bestDelta ? preset : bestPreset;
  }, DEFAULT_WINDOW_PRESET);
}

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
    useContentSize: true,
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
      label: isVisible ? "Hide Window" : "Show Window"
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
  WINDOW_SIZE_PRESETS,
  DEFAULT_WINDOW_PRESET_ID,
  DEFAULT_WINDOW_BOUNDS,
  getWindowSizePreset,
  getClosestWindowSizePreset,
  createMainWindowOptions,
  getClockHtmlPath,
  createTrayMenuEntries
};
