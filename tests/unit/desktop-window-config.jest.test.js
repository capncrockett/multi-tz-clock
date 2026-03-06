const path = require("node:path");
const {
  WINDOW_SIZE_PRESETS,
  DEFAULT_WINDOW_PRESET_ID,
  DEFAULT_WINDOW_BOUNDS,
  getWindowSizePreset,
  getClosestWindowSizePreset,
  createMainWindowOptions,
  getClockHtmlPath,
  createTrayMenuEntries
} = require("../../desktop/window-config.cjs");

describe("desktop/window-config", () => {
  test("creates frameless always-on-top browser window options", () => {
    const preloadPath = path.join("desktop", "preload.cjs");
    const options = createMainWindowOptions({ preloadPath });

    expect(options).toMatchObject({
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
      title: "Multi-TZ Clock"
    });
    expect(options.webPreferences).toEqual({
      preload: preloadPath,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false
    });
  });

  test("requires a preload path", () => {
    expect(() => createMainWindowOptions({})).toThrow("preloadPath is required");
  });

  test("resolves the browser app entry point from the repo root", () => {
    expect(getClockHtmlPath("C:\\repo")).toBe(path.join("C:\\repo", "index.html"));
  });

  test("exposes the three desktop size presets and falls back to medium", () => {
    expect(WINDOW_SIZE_PRESETS.map((preset) => preset.id)).toEqual(["xsmall", "small", "medium"]);
    expect(DEFAULT_WINDOW_PRESET_ID).toBe("medium");
    expect(getWindowSizePreset("small")).toMatchObject({ id: "small", width: 312, height: 660 });
    expect(getWindowSizePreset("unknown")).toMatchObject({ id: "medium", width: 420, height: 560 });
  });

  test("snaps arbitrary window sizes to the nearest preset", () => {
    expect(getClosestWindowSizePreset(210, 420).id).toBe("xsmall");
    expect(getClosestWindowSizePreset(320, 620).id).toBe("small");
    expect(getClosestWindowSizePreset(400, 545).id).toBe("medium");
  });

  test("builds tray menu descriptors for ui visibility and pinned states", () => {
    expect(createTrayMenuEntries({ isUiVisible: true, isAlwaysOnTop: true })).toEqual([
      { id: "toggle-ui-visibility", label: "Hide UI" },
      { id: "toggle-always-on-top", label: "Always on Top", type: "checkbox", checked: true },
      { type: "separator" },
      { id: "quit", label: "Quit" }
    ]);

    expect(createTrayMenuEntries({ isUiVisible: false, isAlwaysOnTop: false })[0]).toEqual({
      id: "toggle-ui-visibility",
      label: "Show UI"
    });
  });
});
