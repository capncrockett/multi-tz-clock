const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("desktopShell", Object.freeze({
  isDesktop: true,
  platform: process.platform,
  getWindowSizePreset: () => ipcRenderer.invoke("desktop:get-window-size-preset"),
  setWindowSizePreset: (presetId) => ipcRenderer.invoke("desktop:set-window-size-preset", presetId),
  onWindowSizePresetChange: (listener) => {
    if (typeof listener !== "function") {
      return () => {};
    }

    const wrapped = (_event, presetId) => listener(presetId);
    ipcRenderer.on("desktop:window-size-preset-changed", wrapped);
    return () => ipcRenderer.removeListener("desktop:window-size-preset-changed", wrapped);
  }
}));

window.addEventListener("DOMContentLoaded", () => {
  document.documentElement.dataset.shell = "desktop";
});
