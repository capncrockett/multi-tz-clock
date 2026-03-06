const { contextBridge } = require("electron");

contextBridge.exposeInMainWorld("desktopShell", Object.freeze({
  isDesktop: true,
  platform: process.platform
}));

window.addEventListener("DOMContentLoaded", () => {
  document.documentElement.dataset.shell = "desktop";
});
