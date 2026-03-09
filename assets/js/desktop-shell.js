(function initializeDesktopShellBridge() {
  const root = document.documentElement;
  if (window.desktopShell?.isDesktop) {
    root.dataset.shell = "desktop";
    return;
  }

  const tauriCoreApi = window.__TAURI__?.core;
  const tauriEventApi = window.__TAURI__?.event;
  if (
    !tauriCoreApi
    || typeof tauriCoreApi.invoke !== "function"
    || !tauriEventApi
    || typeof tauriEventApi.listen !== "function"
  ) {
    return;
  }

  const DEFAULT_WINDOW_PRESET_ID = "medium";
  const sizeListeners = new Set();
  const uiListeners = new Set();
  let currentPresetId = DEFAULT_WINDOW_PRESET_ID;
  let isUiVisible = false;

  function normalizePresetId(presetId) {
    return presetId === "xsmall" || presetId === "small" || presetId === "medium"
      ? presetId
      : DEFAULT_WINDOW_PRESET_ID;
  }

  async function setWindowSizePreset(presetId) {
    const nextPresetId = await tauriCoreApi.invoke("desktop_set_window_size_preset", {
      presetId: normalizePresetId(presetId)
    });
    currentPresetId = normalizePresetId(nextPresetId);
    return currentPresetId;
  }

  async function setUiVisibility(nextVisible) {
    isUiVisible = !!(await tauriCoreApi.invoke("desktop_set_ui_visibility", {
      isVisible: !!nextVisible
    }));
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
      currentPresetId = normalizePresetId(await tauriCoreApi.invoke("desktop_get_window_size_preset"));
      return currentPresetId;
    },
    setWindowSizePreset,
    getUiVisibility: async function getUiVisibility() {
      isUiVisible = !!(await tauriCoreApi.invoke("desktop_get_ui_visibility"));
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

  void Promise.all([
    tauriCoreApi.invoke("desktop_get_window_size_preset"),
    tauriCoreApi.invoke("desktop_get_ui_visibility")
  ])
    .then(function onDesktopStateResolved(values) {
      currentPresetId = normalizePresetId(values?.[0]);
      isUiVisible = !!values?.[1];
      return tauriCoreApi.invoke("desktop_report_frontend_ready", {
        report: {
          shell: root.dataset.shell || null,
          platform: navigator.userAgentData?.platform || navigator.platform || "desktop",
          windowPresetId: currentPresetId,
          isUiVisible
        }
      });
    })
    .catch(() => {});

  void tauriEventApi.listen("desktop:window-size-preset-changed", function onPresetChanged(event) {
    currentPresetId = normalizePresetId(event?.payload);
    sizeListeners.forEach((listener) => listener(currentPresetId));
  });

  void tauriEventApi.listen("desktop:ui-visibility-changed", function onUiVisibilityChanged(event) {
    isUiVisible = !!event?.payload;
    uiListeners.forEach((listener) => listener(isUiVisible));
  });
})();
