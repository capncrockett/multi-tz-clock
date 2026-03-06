const path = require("node:path");
const {
  DEFAULT_DESKTOP_PREFERENCES,
  normalizeDesktopPreferences,
  getDesktopPreferencesPath,
  readDesktopPreferences,
  writeDesktopPreferences
} = require("../../desktop/preferences.cjs");

describe("desktop/preferences", () => {
  test("normalizes desktop preferences and falls back to safe defaults", () => {
    expect(normalizeDesktopPreferences()).toEqual(DEFAULT_DESKTOP_PREFERENCES);
    expect(normalizeDesktopPreferences({
      windowPresetId: "small",
      isUiVisible: true,
      isAlwaysOnTop: false,
      launchOnStartup: true
    })).toEqual({
      windowPresetId: "small",
      isUiVisible: true,
      isAlwaysOnTop: false,
      launchOnStartup: true
    });
    expect(normalizeDesktopPreferences({
      windowPresetId: "invalid",
      isUiVisible: "yes",
      isAlwaysOnTop: 1,
      launchOnStartup: null
    })).toEqual(DEFAULT_DESKTOP_PREFERENCES);
  });

  test("builds the desktop preferences path under Electron userData", () => {
    expect(getDesktopPreferencesPath("C:\\Users\\capnc\\AppData\\Roaming\\multi-tz-clock"))
      .toBe(path.join("C:\\Users\\capnc\\AppData\\Roaming\\multi-tz-clock", "desktop-preferences.json"));
  });

  test("reads the persisted desktop preferences file when present", () => {
    const fileSystem = {
      readFileSync: jest.fn(() => JSON.stringify({
        windowPresetId: "xsmall",
        isUiVisible: true,
        isAlwaysOnTop: false,
        launchOnStartup: true
      }))
    };

    expect(readDesktopPreferences({
      fs: fileSystem,
      preferencesPath: "C:\\prefs.json"
    })).toEqual({
      windowPresetId: "xsmall",
      isUiVisible: true,
      isAlwaysOnTop: false,
      launchOnStartup: true
    });
  });

  test("falls back to defaults when the preferences file is missing or invalid", () => {
    const missingFileSystem = {
      readFileSync: jest.fn(() => {
        throw new Error("ENOENT");
      })
    };
    const invalidFileSystem = {
      readFileSync: jest.fn(() => "{bad json")
    };

    expect(readDesktopPreferences({
      fs: missingFileSystem,
      preferencesPath: "C:\\prefs.json"
    })).toEqual(DEFAULT_DESKTOP_PREFERENCES);
    expect(readDesktopPreferences({
      fs: invalidFileSystem,
      preferencesPath: "C:\\prefs.json"
    })).toEqual(DEFAULT_DESKTOP_PREFERENCES);
  });

  test("writes normalized desktop preferences as local JSON", () => {
    const fileSystem = {
      mkdirSync: jest.fn(),
      writeFileSync: jest.fn()
    };

    const saved = writeDesktopPreferences({
      fs: fileSystem,
      preferencesPath: "C:\\Users\\capnc\\AppData\\Roaming\\multi-tz-clock\\desktop-preferences.json",
      preferences: {
        windowPresetId: "small",
        isUiVisible: true,
        isAlwaysOnTop: false,
        launchOnStartup: true
      }
    });

    expect(saved).toEqual({
      windowPresetId: "small",
      isUiVisible: true,
      isAlwaysOnTop: false,
      launchOnStartup: true
    });
    expect(fileSystem.mkdirSync).toHaveBeenCalledWith(
      path.join("C:\\Users\\capnc\\AppData\\Roaming\\multi-tz-clock"),
      { recursive: true }
    );
    expect(fileSystem.writeFileSync).toHaveBeenCalledWith(
      "C:\\Users\\capnc\\AppData\\Roaming\\multi-tz-clock\\desktop-preferences.json",
      expect.stringContaining('"windowPresetId": "small"'),
      "utf8"
    );
  });
});
