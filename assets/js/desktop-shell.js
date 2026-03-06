(function initializeDesktopShellBridge() {
  const root = document.documentElement;
  if (window.desktopShell?.isDesktop) {
    root.dataset.shell = "desktop";
    return;
  }

  const tauriWindowApi = window.__TAURI__?.window;
  if (
    !tauriWindowApi
    || typeof tauriWindowApi.getCurrentWindow !== "function"
    || typeof tauriWindowApi.LogicalSize !== "function"
  ) {
    return;
  }

  const WINDOW_SIZE_PRESETS = Object.freeze({
    xsmall: Object.freeze({ width: 232, fullHeight: 580, clockOnlyHeight: 232 }),
    small: Object.freeze({ width: 312, fullHeight: 660, clockOnlyHeight: 312 }),
    medium: Object.freeze({ width: 420, fullHeight: 560, clockOnlyHeight: 372 })
  });
  const DEFAULT_WINDOW_PRESET_ID = "medium";
  const MIN_WINDOW_BOUNDS = Object.freeze({ width: 232, height: 232 });
  const MAX_WINDOW_BOUNDS = Object.freeze({ width: 420, height: 660 });

  const appWindow = tauriWindowApi.getCurrentWindow();
  const sizeListeners = new Set();
  const uiListeners = new Set();
  let currentPresetId = DEFAULT_WINDOW_PRESET_ID;
  let isUiVisible = true;

  function normalizePresetId(presetId) {
    return WINDOW_SIZE_PRESETS[presetId] ? presetId : DEFAULT_WINDOW_PRESET_ID;
  }

  function getWindowPreset(presetId) {
    return WINDOW_SIZE_PRESETS[normalizePresetId(presetId)];
  }

  function getPresetBounds(presetId, nextUiVisible) {
    const preset = getWindowPreset(presetId);
    return {
      width: preset.width,
      height: nextUiVisible ? preset.fullHeight : preset.clockOnlyHeight
    };
  }

  async function setWindowSize(width, height) {
    const logicalSize = new tauriWindowApi.LogicalSize(width, height);
    await Promise.allSettled([
      appWindow.setMinSize(new tauriWindowApi.LogicalSize(MIN_WINDOW_BOUNDS.width, MIN_WINDOW_BOUNDS.height)),
      appWindow.setMaxSize(new tauriWindowApi.LogicalSize(MAX_WINDOW_BOUNDS.width, MAX_WINDOW_BOUNDS.height)),
      appWindow.setSize(logicalSize)
    ]);
  }

  async function setWindowSizePreset(presetId) {
    currentPresetId = normalizePresetId(presetId);

    const bounds = getPresetBounds(currentPresetId, isUiVisible);
    await setWindowSize(bounds.width, bounds.height);
    sizeListeners.forEach((listener) => listener(currentPresetId));
    return currentPresetId;
  }

  async function setUiVisibility(nextVisible) {
    isUiVisible = !!nextVisible;
    const bounds = getPresetBounds(currentPresetId, isUiVisible);
    await setWindowSize(bounds.width, bounds.height);
    uiListeners.forEach((listener) => listener(isUiVisible));
    return isUiVisible;
  }

  function subscribe(listeners, listener) {
    if (typeof listener !== "function") {
      return function unsubscribe() {};
    }

    listeners.add(listener);
    return function unsubscribe() {
      listeners.delete(listener);
    };
  }

  window.desktopShell = Object.freeze({
    isDesktop: true,
    platform: navigator.userAgentData?.platform || navigator.platform || "desktop",
    getWindowSizePreset: async function getWindowSizePreset() {
      return currentPresetId;
    },
    setWindowSizePreset,
    getUiVisibility: async function getUiVisibility() {
      return isUiVisible;
    },
    setUiVisibility,
    onWindowSizePresetChange: function onWindowSizePresetChange(listener) {
      return subscribe(sizeListeners, listener);
    },
    onUiVisibilityChange: function onUiVisibilityChange(listener) {
      return subscribe(uiListeners, listener);
    }
  });

  root.dataset.shell = "desktop";
  void setWindowSizePreset(currentPresetId);
})();
