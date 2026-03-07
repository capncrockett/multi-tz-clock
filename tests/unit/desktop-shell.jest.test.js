const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const desktopShellScript = fs.readFileSync(
  path.join(__dirname, "..", "..", "assets", "js", "desktop-shell.js"),
  "utf8"
);

function loadDesktopShell(options = {}) {
  const invoke = jest.fn(options.invokeImpl || (async (commandName, args) => {
    switch (commandName) {
      case "desktop_get_window_size_preset":
        return "medium";
      case "desktop_get_ui_visibility":
        return false;
      case "desktop_set_window_size_preset":
        return args.presetId;
      case "desktop_set_ui_visibility":
        return !!args.isVisible;
      default:
        throw new Error(`Unexpected command: ${commandName}`);
    }
  }));
  const eventHandlers = new Map();
  const listen = jest.fn(async (eventName, handler) => {
    eventHandlers.set(eventName, handler);
    return function unlisten() {};
  });
  const documentElement = { dataset: {} };
  const existingDesktopShell = options.existingDesktopShell || null;
  const context = {
    console,
    navigator: {
      platform: "Win32",
      userAgentData: { platform: "Windows" }
    },
    document: {
      documentElement
    },
    window: {
      __TAURI__: options.includeTauri === false ? undefined : {
        core: { invoke },
        event: { listen }
      },
      desktopShell: existingDesktopShell
    }
  };

  vm.runInNewContext(desktopShellScript, context, {
    filename: "assets/js/desktop-shell.js"
  });

  return {
    invoke,
    listen,
    documentElement,
    desktopShell: context.window.desktopShell,
    emit(eventName, payload) {
      const handler = eventHandlers.get(eventName);
      if (handler) {
        handler({ payload });
      }
    }
  };
}

describe("desktop-shell bridge", () => {
  test("leaves an existing desktop shell bridge in place", () => {
    const existingDesktopShell = Object.freeze({ isDesktop: true, marker: "electron" });
    const result = loadDesktopShell({ existingDesktopShell });

    expect(result.desktopShell).toBe(existingDesktopShell);
    expect(result.documentElement.dataset.shell).toBe("desktop");
    expect(result.listen).not.toHaveBeenCalled();
  });

  test("does nothing when Tauri globals are unavailable", () => {
    const result = loadDesktopShell({ includeTauri: false });

    expect(result.desktopShell).toBeNull();
    expect(result.documentElement.dataset.shell).toBeUndefined();
  });

  test("invokes Tauri commands for desktop state queries and mutations", async () => {
    const result = loadDesktopShell();

    await expect(result.desktopShell.getWindowSizePreset()).resolves.toBe("medium");
    await expect(result.desktopShell.getUiVisibility()).resolves.toBe(false);
    await expect(result.desktopShell.setWindowSizePreset("small")).resolves.toBe("small");
    await expect(result.desktopShell.setUiVisibility(true)).resolves.toBe(true);

    expect(result.invoke).toHaveBeenNthCalledWith(1, "desktop_get_window_size_preset");
    expect(result.invoke).toHaveBeenNthCalledWith(2, "desktop_get_ui_visibility");
    expect(result.invoke).toHaveBeenNthCalledWith(3, "desktop_set_window_size_preset", {
      presetId: "small"
    });
    expect(result.invoke).toHaveBeenNthCalledWith(4, "desktop_set_ui_visibility", {
      isVisible: true
    });
  });

  test("forwards backend desktop events through the existing listener contract", async () => {
    const result = loadDesktopShell();
    const presetListener = jest.fn();
    const uiListener = jest.fn();

    result.desktopShell.onWindowSizePresetChange(presetListener);
    result.desktopShell.onUiVisibilityChange(uiListener);

    result.emit("desktop:window-size-preset-changed", "xsmall");
    result.emit("desktop:ui-visibility-changed", true);

    expect(presetListener).toHaveBeenCalledWith("xsmall");
    expect(uiListener).toHaveBeenCalledWith(true);
  });
});
