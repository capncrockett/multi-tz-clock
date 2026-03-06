const EventEmitter = require("node:events");

function flushMicrotasks() {
  return new Promise((resolve) => setImmediate(resolve));
}

class FakeBrowserWindow extends EventEmitter {
  constructor(options) {
    super();
    this.options = options;
    this.bounds = {
      x: 0,
      y: 0,
      width: options.width,
      height: options.height
    };
    this.contentSize = [options.width, options.height];
    this.visible = false;
    this.destroyed = false;
    this.alwaysOnTop = false;
    this.webContents = {
      send: jest.fn()
    };
    this.loadFile = jest.fn();
    this.focus = jest.fn();
    this.setPosition = jest.fn((x, y) => {
      this.bounds.x = x;
      this.bounds.y = y;
    });
    this.setAlwaysOnTop = jest.fn((nextValue) => {
      this.alwaysOnTop = !!nextValue;
    });
    this.setContentSize = jest.fn((width, height) => {
      this.contentSize = [width, height];
      this.bounds.width = width;
      this.bounds.height = height;
    });
  }

  isDestroyed() {
    return this.destroyed;
  }

  isVisible() {
    return this.visible;
  }

  show() {
    this.visible = true;
    this.emit("show");
  }

  hide() {
    this.visible = false;
    this.emit("hide");
  }

  isAlwaysOnTop() {
    return this.alwaysOnTop;
  }

  getBounds() {
    return { ...this.bounds };
  }

  getContentSize() {
    return [...this.contentSize];
  }
}

class FakeTray extends EventEmitter {
  constructor(icon) {
    super();
    this.icon = icon;
    this.contextMenu = null;
    this.ignoreDoubleClickEvents = false;
    this.tooltip = "";
    this.setContextMenu = jest.fn((menu) => {
      this.contextMenu = menu;
    });
    this.setIgnoreDoubleClickEvents = jest.fn((value) => {
      this.ignoreDoubleClickEvents = !!value;
    });
    this.setToolTip = jest.fn((value) => {
      this.tooltip = value;
    });
  }
}

async function loadDesktopMain(options = {}) {
  jest.resetModules();

  const ipcHandlers = {};
  let workArea = { x: 0, y: 0, width: 1920, height: 1040 };
  let lastWindow = null;
  let lastTray = null;
  const savedPreferences = {
    windowPresetId: "medium",
    isUiVisible: false,
    isAlwaysOnTop: true,
    launchOnStartup: false,
    ...options.savedPreferences
  };
  const readDesktopPreferences = jest.fn(() => savedPreferences);
  const writeDesktopPreferences = jest.fn((payload) => payload.preferences);
  const getDesktopPreferencesPath = jest.fn(() => "C:\\Users\\capnc\\AppData\\Roaming\\multi-tz-clock\\desktop-preferences.json");

  const app = new EventEmitter();
  app.setAppUserModelId = jest.fn();
  app.whenReady = jest.fn(() => Promise.resolve());
  app.quit = jest.fn();
  app.getPath = jest.fn(() => "C:\\Users\\capnc\\AppData\\Roaming\\multi-tz-clock");
  app.getAppPath = jest.fn(() => "C:\\Users\\capnc\\Codin\\multi-tz-clock");
  app.setLoginItemSettings = jest.fn();

  const BrowserWindow = jest.fn((options) => {
    lastWindow = new FakeBrowserWindow(options);
    return lastWindow;
  });
  const Tray = jest.fn((icon) => {
    lastTray = new FakeTray(icon);
    return lastTray;
  });
  const ipcMain = {
    handle: jest.fn((channel, handler) => {
      ipcHandlers[channel] = handler;
    })
  };
  const Menu = {
    buildFromTemplate: jest.fn((template) => ({ template }))
  };
  const screen = {
    getDisplayMatching: jest.fn(() => ({ workArea }))
  };
  const nativeImage = {
    createFromDataURL: jest.fn(() => ({ mocked: true }))
  };

  jest.doMock("electron", () => ({
    app,
    BrowserWindow,
    ipcMain,
    Menu,
    screen,
    Tray,
    nativeImage
  }));
  jest.doMock("../../desktop/preferences.cjs", () => ({
    DEFAULT_DESKTOP_PREFERENCES: {
      windowPresetId: "medium",
      isUiVisible: false,
      isAlwaysOnTop: true,
      launchOnStartup: false
    },
    getDesktopPreferencesPath,
    readDesktopPreferences,
    writeDesktopPreferences
  }));

  jest.isolateModules(() => {
    require("../../desktop/main.cjs");
  });

  await flushMicrotasks();

  return {
    app,
    BrowserWindow,
    ipcHandlers,
    Menu,
    screen,
    readDesktopPreferences,
    writeDesktopPreferences,
    getWindow() {
      return lastWindow;
    },
    getTray() {
      return lastTray;
    },
    setWorkArea(nextWorkArea) {
      workArea = nextWorkArea;
    }
  };
}

describe("desktop/main", () => {
  test("registers Electron startup and tray wiring", async () => {
    const desktopMain = await loadDesktopMain();
    const win = desktopMain.getWindow();
    const tray = desktopMain.getTray();

    expect(desktopMain.app.setAppUserModelId).toHaveBeenCalledWith("com.capnc.multi-tz-clock");
    expect(desktopMain.app.whenReady).toHaveBeenCalledTimes(1);
    expect(desktopMain.BrowserWindow).toHaveBeenCalledTimes(1);
    expect(win.loadFile).toHaveBeenCalledWith(expect.stringMatching(/index\.html$/));
    expect(tray.setIgnoreDoubleClickEvents).toHaveBeenCalledWith(true);
    expect(desktopMain.readDesktopPreferences).toHaveBeenCalledWith({
      preferencesPath: "C:\\Users\\capnc\\AppData\\Roaming\\multi-tz-clock\\desktop-preferences.json"
    });
    expect(tray.contextMenu.template[0]).toMatchObject({ label: "Show UI" });
  });

  test("starts in clock-only mode by default and applies the persisted startup preference", async () => {
    const desktopMain = await loadDesktopMain({
      savedPreferences: {
        launchOnStartup: true
      }
    });
    const win = desktopMain.getWindow();

    win.setContentSize.mockClear();
    win.emit("ready-to-show");

    expect(win.setContentSize).toHaveBeenCalledWith(420, 372);
    expect(desktopMain.app.setLoginItemSettings).toHaveBeenCalledWith(expect.objectContaining({
      openAtLogin: true
    }));
  });

  test("shrinks to clock-only bounds without forcing an on-screen reposition", async () => {
    const desktopMain = await loadDesktopMain();
    const win = desktopMain.getWindow();
    const tray = desktopMain.getTray();

    win.emit("ready-to-show");
    win.setContentSize.mockClear();
    win.setPosition.mockClear();
    win.webContents.send.mockClear();

    const result = await desktopMain.ipcHandlers["desktop:set-ui-visibility"](null, false);

    expect(result).toBe(false);
    expect(win.setContentSize).toHaveBeenCalledWith(420, 372);
    expect(win.setPosition).not.toHaveBeenCalled();
    expect(win.webContents.send).toHaveBeenCalledWith("desktop:ui-visibility-changed", false);
    expect(tray.contextMenu.template[0]).toMatchObject({ label: "Show UI" });
  });

  test("restores the full ui bounds and re-fits the widget inside the work area", async () => {
    const desktopMain = await loadDesktopMain();
    const win = desktopMain.getWindow();

    win.emit("ready-to-show");
    await desktopMain.ipcHandlers["desktop:set-ui-visibility"](null, false);
    win.bounds.x = 1800;
    win.bounds.y = 900;
    desktopMain.setWorkArea({ x: 0, y: 0, width: 1920, height: 1040 });
    win.setContentSize.mockClear();
    win.setPosition.mockClear();
    win.webContents.send.mockClear();

    const result = await desktopMain.ipcHandlers["desktop:set-ui-visibility"](null, true);

    expect(result).toBe(true);
    expect(win.setContentSize).toHaveBeenCalledWith(420, 560);
    expect(win.setPosition).toHaveBeenCalledWith(1500, 480);
    expect(win.webContents.send).toHaveBeenCalledWith("desktop:ui-visibility-changed", true);
  });

  test("applies preset changes against the active ui mode instead of the full widget height", async () => {
    const desktopMain = await loadDesktopMain();
    const win = desktopMain.getWindow();

    win.emit("ready-to-show");
    win.setContentSize.mockClear();
    win.setPosition.mockClear();
    win.webContents.send.mockClear();
    desktopMain.writeDesktopPreferences.mockClear();

    const result = await desktopMain.ipcHandlers["desktop:set-window-size-preset"](null, "small");

    expect(result).toBe("small");
    expect(win.setContentSize).toHaveBeenCalledWith(312, 312);
    expect(win.setPosition).not.toHaveBeenCalled();
    expect(win.webContents.send).toHaveBeenCalledWith("desktop:window-size-preset-changed", "small");
    expect(desktopMain.writeDesktopPreferences).toHaveBeenCalledWith(expect.objectContaining({
      preferences: expect.objectContaining({
        windowPresetId: "small",
        isUiVisible: false
      })
    }));
  });

  test("tray clicks toggle the whole window without changing ui visibility mode", async () => {
    const desktopMain = await loadDesktopMain();
    const win = desktopMain.getWindow();
    const tray = desktopMain.getTray();

    win.emit("ready-to-show");
    win.webContents.send.mockClear();

    tray.emit("click");
    expect(win.isVisible()).toBe(false);

    tray.emit("click");
    expect(win.isVisible()).toBe(true);
    expect(win.focus).toHaveBeenCalled();
    expect(win.webContents.send).not.toHaveBeenCalledWith("desktop:ui-visibility-changed", expect.anything());
  });

  test("tray menu toggles host preferences and persists them locally", async () => {
    const desktopMain = await loadDesktopMain();
    const win = desktopMain.getWindow();
    const tray = desktopMain.getTray();

    win.emit("ready-to-show");
    desktopMain.writeDesktopPreferences.mockClear();

    tray.contextMenu.template[1].click();
    tray.contextMenu.template[2].click();

    expect(win.setAlwaysOnTop).toHaveBeenLastCalledWith(false, "screen-saver");
    expect(desktopMain.app.setLoginItemSettings).toHaveBeenLastCalledWith(expect.objectContaining({
      openAtLogin: true
    }));
    expect(desktopMain.writeDesktopPreferences).toHaveBeenNthCalledWith(1, expect.objectContaining({
      preferences: expect.objectContaining({
        isAlwaysOnTop: false,
        launchOnStartup: false
      })
    }));
    expect(desktopMain.writeDesktopPreferences).toHaveBeenNthCalledWith(2, expect.objectContaining({
      preferences: expect.objectContaining({
        isAlwaysOnTop: false,
        launchOnStartup: true
      })
    }));
  });
});
