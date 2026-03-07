use std::fs;
use std::path::{Path, PathBuf};
use std::sync::Mutex;

use serde::{Deserialize, Serialize};
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Emitter, LogicalSize, Manager, State, WebviewWindow, WindowEvent};

const MAIN_WINDOW_LABEL: &str = "main";
const TOGGLE_UI_MENU_ID: &str = "toggle-ui-visibility";
const TOGGLE_ALWAYS_ON_TOP_MENU_ID: &str = "toggle-always-on-top";
const QUIT_MENU_ID: &str = "quit";
const DEFAULT_WINDOW_PRESET_ID: &str = "medium";
const DESKTOP_PREFERENCES_FILE_NAME: &str = "desktop-preferences.json";

struct DesktopHostState {
    inner: Mutex<DesktopHostStateInner>,
    toggle_ui_item: MenuItem<tauri::Wry>,
    toggle_always_on_top_item: CheckMenuItem<tauri::Wry>,
    preferences_path: Option<PathBuf>,
}

#[derive(Clone, Serialize, Deserialize)]
struct PersistedDesktopPreferences {
    #[serde(rename = "windowPresetId")]
    window_preset_id: String,
    #[serde(rename = "isUiVisible")]
    is_ui_visible: bool,
    #[serde(rename = "isAlwaysOnTop")]
    is_always_on_top: bool,
    #[serde(rename = "launchOnStartup")]
    launch_on_startup: bool,
}

struct DesktopHostStateInner {
    window_preset_id: String,
    is_ui_visible: bool,
    is_always_on_top: bool,
    is_quitting: bool,
}

impl DesktopHostState {
    fn new(
        toggle_ui_item: MenuItem<tauri::Wry>,
        toggle_always_on_top_item: CheckMenuItem<tauri::Wry>,
        preferences_path: Option<PathBuf>,
        preferences: PersistedDesktopPreferences,
    ) -> Self {
        Self {
            inner: Mutex::new(DesktopHostStateInner {
                window_preset_id: preferences.window_preset_id,
                is_ui_visible: preferences.is_ui_visible,
                is_always_on_top: preferences.is_always_on_top,
                is_quitting: false,
            }),
            toggle_ui_item,
            toggle_always_on_top_item,
            preferences_path,
        }
    }
}

impl PersistedDesktopPreferences {
    fn defaults() -> Self {
        Self {
            window_preset_id: DEFAULT_WINDOW_PRESET_ID.to_string(),
            is_ui_visible: false,
            is_always_on_top: true,
            launch_on_startup: false,
        }
    }

    fn normalized(self) -> Self {
        Self {
            window_preset_id: normalize_preset_id(&self.window_preset_id).to_string(),
            is_ui_visible: self.is_ui_visible,
            is_always_on_top: self.is_always_on_top,
            launch_on_startup: self.launch_on_startup,
        }
    }
}

fn normalize_preset_id(preset_id: &str) -> &'static str {
    match preset_id {
        "xsmall" => "xsmall",
        "small" => "small",
        _ => DEFAULT_WINDOW_PRESET_ID,
    }
}

fn get_preset_bounds(preset_id: &str, is_ui_visible: bool) -> (f64, f64) {
    match (normalize_preset_id(preset_id), is_ui_visible) {
        ("xsmall", true) => (232.0, 580.0),
        ("xsmall", false) => (232.0, 232.0),
        ("small", true) => (312.0, 660.0),
        ("small", false) => (312.0, 312.0),
        ("medium", true) => (420.0, 560.0),
        ("medium", false) => (420.0, 372.0),
        _ => (420.0, 372.0),
    }
}

fn get_main_window(app: &AppHandle) -> tauri::Result<WebviewWindow> {
    app.get_webview_window(MAIN_WINDOW_LABEL)
        .ok_or_else(|| tauri::Error::AssetNotFound(MAIN_WINDOW_LABEL.into()))
}

fn get_desktop_preferences_path(app: &AppHandle) -> Option<PathBuf> {
    let app_config_dir = app.path().app_config_dir().ok()?;
    Some(app_config_dir.join(DESKTOP_PREFERENCES_FILE_NAME))
}

fn read_desktop_preferences(preferences_path: Option<&Path>) -> PersistedDesktopPreferences {
    let Some(preferences_path) = preferences_path else {
        return PersistedDesktopPreferences::defaults();
    };

    let Ok(raw_value) = fs::read_to_string(preferences_path) else {
        return PersistedDesktopPreferences::defaults();
    };

    serde_json::from_str::<PersistedDesktopPreferences>(&raw_value)
        .map(PersistedDesktopPreferences::normalized)
        .unwrap_or_else(|_| PersistedDesktopPreferences::defaults())
}

fn persist_desktop_preferences(
    host_state: &DesktopHostState,
    state: &DesktopHostStateInner,
) -> Result<(), String> {
    let Some(preferences_path) = &host_state.preferences_path else {
        return Ok(());
    };

    if let Some(parent_dir) = preferences_path.parent() {
        fs::create_dir_all(parent_dir).map_err(|error| error.to_string())?;
    }

    let serialized = serde_json::to_string_pretty(&PersistedDesktopPreferences {
        window_preset_id: state.window_preset_id.clone(),
        is_ui_visible: state.is_ui_visible,
        is_always_on_top: state.is_always_on_top,
        launch_on_startup: false,
    })
    .map_err(|error| error.to_string())?;
    fs::write(preferences_path, format!("{serialized}\n")).map_err(|error| error.to_string())
}

fn sync_tray_menu(host_state: &DesktopHostState, state: &DesktopHostStateInner) -> tauri::Result<()> {
    host_state.toggle_ui_item.set_text(if state.is_ui_visible {
        "Hide UI"
    } else {
        "Show UI"
    })?;
    host_state
        .toggle_always_on_top_item
        .set_checked(state.is_always_on_top)?;
    Ok(())
}

fn apply_host_state(
    app: &AppHandle,
    state: &DesktopHostStateInner,
    emit_ui_visibility: bool,
    emit_window_preset: bool,
) -> tauri::Result<()> {
    let window = get_main_window(app)?;
    let (width, height) = get_preset_bounds(&state.window_preset_id, state.is_ui_visible);

    window.set_size(LogicalSize::new(width, height))?;
    window.set_always_on_top(state.is_always_on_top)?;

    if emit_ui_visibility {
        window.emit("desktop:ui-visibility-changed", state.is_ui_visible)?;
    }
    if emit_window_preset {
        window.emit(
            "desktop:window-size-preset-changed",
            state.window_preset_id.clone(),
        )?;
    }

    Ok(())
}

fn set_window_size_preset_internal(
    app: &AppHandle,
    host_state: &DesktopHostState,
    preset_id: &str,
    emit_window_preset: bool,
) -> Result<String, String> {
    let mut state = host_state.inner.lock().map_err(|_| "desktop state lock poisoned")?;
    state.window_preset_id = normalize_preset_id(preset_id).to_string();
    apply_host_state(app, &state, false, emit_window_preset).map_err(|error| error.to_string())?;
    sync_tray_menu(host_state, &state).map_err(|error| error.to_string())?;
    persist_desktop_preferences(host_state, &state)?;
    Ok(state.window_preset_id.clone())
}

fn set_ui_visibility_internal(
    app: &AppHandle,
    host_state: &DesktopHostState,
    is_visible: bool,
    emit_ui_visibility: bool,
) -> Result<bool, String> {
    let mut state = host_state.inner.lock().map_err(|_| "desktop state lock poisoned")?;
    state.is_ui_visible = is_visible;
    apply_host_state(app, &state, emit_ui_visibility, false).map_err(|error| error.to_string())?;
    sync_tray_menu(host_state, &state).map_err(|error| error.to_string())?;
    persist_desktop_preferences(host_state, &state)?;
    Ok(state.is_ui_visible)
}

fn set_always_on_top_internal(
    app: &AppHandle,
    host_state: &DesktopHostState,
    is_always_on_top: bool,
) -> Result<bool, String> {
    let mut state = host_state.inner.lock().map_err(|_| "desktop state lock poisoned")?;
    state.is_always_on_top = is_always_on_top;
    apply_host_state(app, &state, false, false).map_err(|error| error.to_string())?;
    sync_tray_menu(host_state, &state).map_err(|error| error.to_string())?;
    persist_desktop_preferences(host_state, &state)?;
    Ok(state.is_always_on_top)
}

fn toggle_window_visibility(app: &AppHandle) -> tauri::Result<()> {
    let window = get_main_window(app)?;
    if window.is_visible()? {
        window.hide()?;
    } else {
        window.show()?;
        window.set_focus()?;
    }

    Ok(())
}

fn wire_close_behavior(app: &AppHandle) -> tauri::Result<()> {
    let app_handle = app.clone();
    let window = get_main_window(app)?;
    window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            let host_state = app_handle.state::<DesktopHostState>();
            let should_quit = host_state
                .inner
                .lock()
                .map(|state| state.is_quitting)
                .unwrap_or(true);

            if should_quit {
                return;
            }

            api.prevent_close();
            if let Some(main_window) = app_handle.get_webview_window(MAIN_WINDOW_LABEL) {
                let _ = main_window.hide();
            }
        }
    });
    Ok(())
}

fn create_tray(app: &AppHandle) -> tauri::Result<()> {
    let toggle_ui_item = MenuItem::with_id(app, TOGGLE_UI_MENU_ID, "Show UI", true, None::<&str>)?;
    let toggle_always_on_top_item = CheckMenuItem::with_id(
        app,
        TOGGLE_ALWAYS_ON_TOP_MENU_ID,
        "Always on Top",
        true,
        true,
        None::<&str>,
    )?;
    let quit_item = MenuItem::with_id(app, QUIT_MENU_ID, "Quit", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let tray_menu = Menu::with_items(
        app,
        &[&toggle_ui_item, &toggle_always_on_top_item, &separator, &quit_item],
    )?;
    let preferences_path = get_desktop_preferences_path(app);
    let preferences = read_desktop_preferences(preferences_path.as_deref());
    let host_state = DesktopHostState::new(
        toggle_ui_item.clone(),
        toggle_always_on_top_item.clone(),
        preferences_path,
        preferences,
    );

    {
        let state = host_state
            .inner
            .lock()
            .map_err(|_| tauri::Error::AssetNotFound("desktop-state".into()))?;
        sync_tray_menu(&host_state, &state)?;
    }
    app.manage(host_state);

    let tray_icon = app
        .default_window_icon()
        .cloned()
        .ok_or_else(|| tauri::Error::AssetNotFound("default-window-icon".into()))?;
    TrayIconBuilder::with_id("main-tray")
        .icon(tray_icon)
        .menu(&tray_menu)
        .show_menu_on_left_click(false)
        .on_menu_event(|app, event| {
            let host_state = app.state::<DesktopHostState>();
            match event.id().as_ref() {
                TOGGLE_UI_MENU_ID => {
                    let current_visibility = host_state
                        .inner
                        .lock()
                        .map(|state| state.is_ui_visible)
                        .unwrap_or(false);
                    let _ = set_ui_visibility_internal(app, &host_state, !current_visibility, true);
                }
                TOGGLE_ALWAYS_ON_TOP_MENU_ID => {
                    let current_always_on_top = host_state
                        .inner
                        .lock()
                        .map(|state| state.is_always_on_top)
                        .unwrap_or(true);
                    let _ = set_always_on_top_internal(app, &host_state, !current_always_on_top);
                }
                QUIT_MENU_ID => {
                    if let Ok(mut state) = host_state.inner.lock() {
                        state.is_quitting = true;
                    }
                    app.exit(0);
                }
                _ => {}
            }
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let _ = toggle_window_visibility(&tray.app_handle());
            }
        })
        .build(app)?;

    Ok(())
}

#[tauri::command]
fn desktop_get_window_size_preset(state: State<DesktopHostState>) -> Result<String, String> {
    let state = state.inner.lock().map_err(|_| "desktop state lock poisoned")?;
    Ok(state.window_preset_id.clone())
}

#[tauri::command]
fn desktop_set_window_size_preset(
    app: AppHandle,
    state: State<DesktopHostState>,
    preset_id: String,
) -> Result<String, String> {
    set_window_size_preset_internal(&app, &state, &preset_id, true)
}

#[tauri::command]
fn desktop_get_ui_visibility(state: State<DesktopHostState>) -> Result<bool, String> {
    let state = state.inner.lock().map_err(|_| "desktop state lock poisoned")?;
    Ok(state.is_ui_visible)
}

#[tauri::command]
fn desktop_set_ui_visibility(
    app: AppHandle,
    state: State<DesktopHostState>,
    is_visible: bool,
) -> Result<bool, String> {
    set_ui_visibility_internal(&app, &state, is_visible, true)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            create_tray(&app.handle())?;
            wire_close_behavior(&app.handle())?;

            let host_state = app.state::<DesktopHostState>();
            let state = host_state
                .inner
                .lock()
                .map_err(|_| tauri::Error::AssetNotFound("desktop-state".into()))?;
            apply_host_state(&app.handle(), &state, false, false)?;

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            desktop_get_window_size_preset,
            desktop_set_window_size_preset,
            desktop_get_ui_visibility,
            desktop_set_ui_visibility
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::{read_desktop_preferences, PersistedDesktopPreferences};
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};

    fn create_temp_preferences_path(name: &str) -> PathBuf {
        let unique_suffix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .expect("system time should be after unix epoch")
            .as_nanos();
        std::env::temp_dir()
            .join("multi-tz-clock-tests")
            .join(format!("{name}-{unique_suffix}.json"))
    }

    #[test]
    fn defaults_are_used_when_preferences_file_is_missing() {
        let preferences = read_desktop_preferences(None);

        assert_eq!(preferences.window_preset_id, "medium");
        assert!(!preferences.is_ui_visible);
        assert!(preferences.is_always_on_top);
        assert!(!preferences.launch_on_startup);
    }

    #[test]
    fn stored_preferences_are_normalized_on_read() {
        let preferences_path = create_temp_preferences_path("desktop-preferences");
        fs::create_dir_all(
            preferences_path
                .parent()
                .expect("temp preferences path should have a parent"),
        )
        .expect("temp preferences directory should be created");
        fs::write(
            &preferences_path,
            r#"{
  "windowPresetId": "unknown",
  "isUiVisible": true,
  "isAlwaysOnTop": false,
  "launchOnStartup": true
}
"#,
        )
        .expect("temp preferences file should be written");

        let preferences = read_desktop_preferences(Some(&preferences_path));

        assert_eq!(preferences.window_preset_id, "medium");
        assert!(preferences.is_ui_visible);
        assert!(!preferences.is_always_on_top);
        assert!(preferences.launch_on_startup);

        let _ = fs::remove_file(preferences_path);
    }

    #[test]
    fn preference_normalization_keeps_supported_presets() {
        let preferences = PersistedDesktopPreferences {
            window_preset_id: "small".into(),
            is_ui_visible: true,
            is_always_on_top: false,
            launch_on_startup: false,
        }
        .normalized();

        assert_eq!(preferences.window_preset_id, "small");
        assert!(preferences.is_ui_visible);
        assert!(!preferences.is_always_on_top);
    }
}
