const path = require("node:path");

const rawWindowSizePresets = require("./window-presets.json");

const WINDOW_SIZE_PRESETS = Object.freeze(
  rawWindowSizePresets.map((preset) => Object.freeze({ ...preset }))
);
const DEFAULT_WINDOW_PRESET_ID = "medium";
const DEFAULT_WINDOW_PRESET = WINDOW_SIZE_PRESETS.find((preset) => preset.id === DEFAULT_WINDOW_PRESET_ID);
const MIN_WINDOW_PRESET = WINDOW_SIZE_PRESETS[0];
const MAX_WINDOW_PRESET = WINDOW_SIZE_PRESETS[WINDOW_SIZE_PRESETS.length - 1];
const DEFAULT_WINDOW_BOUNDS = Object.freeze({
  width: DEFAULT_WINDOW_PRESET.width,
  height: DEFAULT_WINDOW_PRESET.fullHeight,
  minWidth: MIN_WINDOW_PRESET.width,
  minHeight: MIN_WINDOW_PRESET.clockOnlyHeight,
  maxWidth: MAX_WINDOW_PRESET.width,
  maxHeight: MAX_WINDOW_PRESET.fullHeight
});

function getWindowSizePreset(presetId) {
  return WINDOW_SIZE_PRESETS.find((preset) => preset.id === presetId) || DEFAULT_WINDOW_PRESET;
}

function getPresetContentBounds(presetId, isUiVisible) {
  const preset = getWindowSizePreset(presetId);
  return {
    width: preset.width,
    height: isUiVisible ? preset.fullHeight : preset.clockOnlyHeight
  };
}

function getClosestWindowSizePreset(width, height, isUiVisible = true) {
  const safeWidth = Number(width) || DEFAULT_WINDOW_PRESET.width;
  const safeHeight = Number(height) || getPresetContentBounds(DEFAULT_WINDOW_PRESET_ID, isUiVisible).height;

  return WINDOW_SIZE_PRESETS.reduce((bestPreset, preset) => {
    const bestBounds = getPresetContentBounds(bestPreset.id, isUiVisible);
    const nextBounds = getPresetContentBounds(preset.id, isUiVisible);
    const bestDelta = Math.hypot(bestBounds.width - safeWidth, bestBounds.height - safeHeight);
    const nextDelta = Math.hypot(nextBounds.width - safeWidth, nextBounds.height - safeHeight);
    return nextDelta < bestDelta ? preset : bestPreset;
  }, DEFAULT_WINDOW_PRESET);
}

function fitBoundsWithinArea(bounds, area) {
  if (
    !bounds
    || !area
    || !Number.isFinite(bounds.x)
    || !Number.isFinite(bounds.y)
    || !Number.isFinite(bounds.width)
    || !Number.isFinite(bounds.height)
    || !Number.isFinite(area.x)
    || !Number.isFinite(area.y)
    || !Number.isFinite(area.width)
    || !Number.isFinite(area.height)
  ) {
    return null;
  }

  const maxX = area.x + Math.max(area.width - bounds.width, 0);
  const maxY = area.y + Math.max(area.height - bounds.height, 0);

  return {
    x: Math.min(Math.max(bounds.x, area.x), maxX),
    y: Math.min(Math.max(bounds.y, area.y), maxY)
  };
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

function createTrayMenuEntries({
  isUiVisible,
  isAlwaysOnTop,
  isLaunchOnStartup = false,
  canToggleLaunchOnStartup = false
}) {
  return [
    {
      id: "toggle-ui-visibility",
      label: isUiVisible ? "Hide UI" : "Show UI"
    },
    {
      id: "toggle-always-on-top",
      label: "Always on Top",
      type: "checkbox",
      checked: isAlwaysOnTop
    },
    {
      id: "toggle-launch-on-startup",
      label: "Launch on Startup",
      type: "checkbox",
      checked: !!isLaunchOnStartup,
      enabled: !!canToggleLaunchOnStartup
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
  getPresetContentBounds,
  getClosestWindowSizePreset,
  fitBoundsWithinArea,
  createMainWindowOptions,
  getClockHtmlPath,
  createTrayMenuEntries
};
