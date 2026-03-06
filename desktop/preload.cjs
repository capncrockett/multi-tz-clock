const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopShell", Object.freeze({
  isDesktop: true,
  platform: process.platform,
  getWindowSizePreset: () => ipcRenderer.invoke("desktop:get-window-size-preset"),
  setWindowSizePreset: (presetId) => ipcRenderer.invoke("desktop:set-window-size-preset", presetId),
  getUiVisibility: () => ipcRenderer.invoke("desktop:get-ui-visibility"),
  setUiVisibility: (isVisible) => ipcRenderer.invoke("desktop:set-ui-visibility", isVisible),
  onWindowSizePresetChange: (listener) => {
    if (typeof listener !== "function") {
      return () => {};
    }

    const wrapped = (_event, presetId) => listener(presetId);
    ipcRenderer.on("desktop:window-size-preset-changed", wrapped);
    return () => ipcRenderer.removeListener("desktop:window-size-preset-changed", wrapped);
  },
  onUiVisibilityChange: (listener) => {
    if (typeof listener !== "function") {
      return () => {};
    }

    const wrapped = (_event, isVisible) => listener(!!isVisible);
    ipcRenderer.on("desktop:ui-visibility-changed", wrapped);
    return () => ipcRenderer.removeListener("desktop:ui-visibility-changed", wrapped);
  }
}));

window.addEventListener("DOMContentLoaded", () => {
  document.documentElement.dataset.shell = "desktop";
});
