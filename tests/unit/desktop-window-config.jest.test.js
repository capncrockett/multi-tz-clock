const path = require("node:path");
const {
  DEFAULT_WINDOW_BOUNDS,
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

  test("builds tray menu descriptors for visible and pinned states", () => {
    expect(createTrayMenuEntries({ isVisible: true, isAlwaysOnTop: true })).toEqual([
      { id: "toggle-visibility", label: "Hide Clock" },
      { id: "toggle-always-on-top", label: "Always on Top", type: "checkbox", checked: true },
      { type: "separator" },
      { id: "quit", label: "Quit" }
    ]);

    expect(createTrayMenuEntries({ isVisible: false, isAlwaysOnTop: false })[0]).toEqual({
      id: "toggle-visibility",
      label: "Show Clock"
    });
  });
});
