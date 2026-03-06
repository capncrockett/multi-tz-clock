const fs = require("node:fs");
const path = require("node:path");
const { getWindowSizePreset, DEFAULT_WINDOW_PRESET_ID } = require("./window-config.cjs");

const DEFAULT_DESKTOP_PREFERENCES = Object.freeze({
  windowPresetId: DEFAULT_WINDOW_PRESET_ID,
  isUiVisible: false,
  isAlwaysOnTop: true,
  launchOnStartup: false
});

function normalizeDesktopPreferences(rawPreferences) {
  if (!rawPreferences || typeof rawPreferences !== "object") {
    return { ...DEFAULT_DESKTOP_PREFERENCES };
  }

  return {
    windowPresetId: getWindowSizePreset(rawPreferences.windowPresetId).id,
    isUiVisible: typeof rawPreferences.isUiVisible === "boolean"
      ? rawPreferences.isUiVisible
      : DEFAULT_DESKTOP_PREFERENCES.isUiVisible,
    isAlwaysOnTop: typeof rawPreferences.isAlwaysOnTop === "boolean"
      ? rawPreferences.isAlwaysOnTop
      : DEFAULT_DESKTOP_PREFERENCES.isAlwaysOnTop,
    launchOnStartup: typeof rawPreferences.launchOnStartup === "boolean"
      ? rawPreferences.launchOnStartup
      : DEFAULT_DESKTOP_PREFERENCES.launchOnStartup
  };
}

function getDesktopPreferencesPath(userDataPath) {
  return path.join(userDataPath, "desktop-preferences.json");
}

function readDesktopPreferences(options = {}) {
  const fileSystem = options.fs || fs;
  const preferencesPath = options.preferencesPath;
  if (!preferencesPath) {
    throw new Error("preferencesPath is required");
  }

  try {
    const rawValue = fileSystem.readFileSync(preferencesPath, "utf8");
    return normalizeDesktopPreferences(JSON.parse(rawValue));
  } catch {
    return { ...DEFAULT_DESKTOP_PREFERENCES };
  }
}

function writeDesktopPreferences(options = {}) {
  const fileSystem = options.fs || fs;
  const preferencesPath = options.preferencesPath;
  if (!preferencesPath) {
    throw new Error("preferencesPath is required");
  }

  const nextPreferences = normalizeDesktopPreferences(options.preferences);
  fileSystem.mkdirSync(path.dirname(preferencesPath), { recursive: true });
  fileSystem.writeFileSync(
    preferencesPath,
    `${JSON.stringify(nextPreferences, null, 2)}\n`,
    "utf8"
  );
  return nextPreferences;
}

module.exports = {
  DEFAULT_DESKTOP_PREFERENCES,
  normalizeDesktopPreferences,
  getDesktopPreferencesPath,
  readDesktopPreferences,
  writeDesktopPreferences
};
