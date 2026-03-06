const path = require("node:path");
const {
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
    expect(getWindowSizePreset("small")).toMatchObject({ id: "small", width: 312, fullHeight: 660, clockOnlyHeight: 312 });
    expect(getWindowSizePreset("unknown")).toMatchObject({ id: "medium", width: 420, fullHeight: 560, clockOnlyHeight: 372 });
  });

  test("returns different fixed bounds for full ui and clock-only modes", () => {
    expect(getPresetContentBounds("xsmall", true)).toEqual({ width: 232, height: 580 });
    expect(getPresetContentBounds("xsmall", false)).toEqual({ width: 232, height: 232 });
    expect(getPresetContentBounds("medium", true)).toEqual({ width: 420, height: 560 });
    expect(getPresetContentBounds("medium", false)).toEqual({ width: 420, height: 372 });
  });

  test("snaps arbitrary window sizes to the nearest preset", () => {
    expect(getClosestWindowSizePreset(210, 420, true).id).toBe("xsmall");
    expect(getClosestWindowSizePreset(320, 620, true).id).toBe("small");
    expect(getClosestWindowSizePreset(400, 545, true).id).toBe("medium");
    expect(getClosestWindowSizePreset(420, 360, false).id).toBe("medium");
  });

  test("fits bounds within a visible work area when the ui must be shown", () => {
    expect(fitBoundsWithinArea(
      { x: -20, y: -10, width: 312, height: 660 },
      { x: 0, y: 0, width: 1920, height: 1040 }
    )).toEqual({ x: 0, y: 0 });

    expect(fitBoundsWithinArea(
      { x: 1800, y: 900, width: 420, height: 560 },
      { x: 0, y: 0, width: 1920, height: 1040 }
    )).toEqual({ x: 1500, y: 480 });

    expect(fitBoundsWithinArea(
      { x: 120, y: 24, width: 232, height: 580 },
      { x: 0, y: 0, width: 1920, height: 1040 }
    )).toEqual({ x: 120, y: 24 });

    expect(fitBoundsWithinArea(null, null)).toBeNull();
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
