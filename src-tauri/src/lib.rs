use std::fs;
use std::path::{Path, PathBuf};
use std::sync::{LazyLock, Mutex};
use std::thread;
use std::time::Duration;

use serde::{Deserialize, Serialize};
use tauri::menu::{CheckMenuItem, Menu, MenuItem, PredefinedMenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{
    AppHandle, Emitter, LogicalSize, Manager, PhysicalPosition, PhysicalRect, PhysicalSize, State,
    WebviewWindow, WindowEvent,
};
use tauri_plugin_autostart::{MacosLauncher, ManagerExt as AutostartManagerExt};

const MAIN_WINDOW_LABEL: &str = "main";
const TOGGLE_UI_MENU_ID: &str = "toggle-ui-visibility";
const TOGGLE_ALWAYS_ON_TOP_MENU_ID: &str = "toggle-always-on-top";
const TOGGLE_LAUNCH_ON_STARTUP_MENU_ID: &str = "toggle-launch-on-startup";
const QUIT_MENU_ID: &str = "quit";
const DEFAULT_WINDOW_PRESET_ID: &str = "medium";
const DESKTOP_PREFERENCES_FILE_NAME: &str = "desktop-preferences.json";

#[derive(Clone, Deserialize)]
struct WindowPreset {
    id: String,
    #[cfg_attr(not(test), allow(dead_code))]
    label: String,
    width: u32,
    #[serde(rename = "fullHeight")]
    full_height: u32,
    #[serde(rename = "clockOnlyHeight")]
    clock_only_height: u32,
}

static WINDOW_SIZE_PRESETS: LazyLock<Vec<WindowPreset>> = LazyLock::new(|| {
    serde_json::from_str(include_str!("../../desktop/window-presets.json"))
        .expect("desktop/window-presets.json should be valid")
});

struct DesktopHostState {
    inner: Mutex<DesktopHostStateInner>,
    toggle_ui_item: MenuItem<tauri::Wry>,
    toggle_always_on_top_item: CheckMenuItem<tauri::Wry>,
    toggle_launch_on_startup_item: CheckMenuItem<tauri::Wry>,
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
    launch_on_startup: bool,
    resize_snap_generation: u64,
    is_applying_window_bounds: bool,
    is_quitting: bool,
}

impl DesktopHostState {
    fn new(
        toggle_ui_item: MenuItem<tauri::Wry>,
        toggle_always_on_top_item: CheckMenuItem<tauri::Wry>,
        toggle_launch_on_startup_item: CheckMenuItem<tauri::Wry>,
        preferences_path: Option<PathBuf>,
        preferences: PersistedDesktopPreferences,
    ) -> Self {
        Self {
            inner: Mutex::new(DesktopHostStateInner {
                window_preset_id: preferences.window_preset_id,
                is_ui_visible: preferences.is_ui_visible,
                is_always_on_top: preferences.is_always_on_top,
                launch_on_startup: preferences.launch_on_startup,
                resize_snap_generation: 0,
                is_applying_window_bounds: false,
                is_quitting: false,
            }),
            toggle_ui_item,
            toggle_always_on_top_item,
            toggle_launch_on_startup_item,
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
    WINDOW_SIZE_PRESETS
        .iter()
        .find(|preset| preset.id == preset_id)
        .map(|preset| preset.id.as_str())
        .unwrap_or(DEFAULT_WINDOW_PRESET_ID)
}

fn get_window_preset(preset_id: &str) -> &WindowPreset {
    let normalized_preset_id = normalize_preset_id(preset_id);
    WINDOW_SIZE_PRESETS
        .iter()
        .find(|preset| preset.id == normalized_preset_id)
        .unwrap_or_else(|| {
            WINDOW_SIZE_PRESETS
                .iter()
                .find(|preset| preset.id == DEFAULT_WINDOW_PRESET_ID)
                .expect("default window preset should exist")
        })
}

fn get_preset_bounds(preset_id: &str, is_ui_visible: bool) -> (f64, f64) {
    let preset = get_window_preset(preset_id);
    (
        preset.width as f64,
        if is_ui_visible {
            preset.full_height as f64
        } else {
            preset.clock_only_height as f64
        },
    )
}

fn get_closest_window_preset_id(width: u32, height: u32, is_ui_visible: bool) -> &'static str {
    let safe_width = width as f64;
    let safe_height = height as f64;
    let mut best_preset_id = DEFAULT_WINDOW_PRESET_ID;
    let mut best_delta = f64::MAX;

    for preset in WINDOW_SIZE_PRESETS.iter() {
        let (preset_width, preset_height) = get_preset_bounds(&preset.id, is_ui_visible);
        let next_delta =
            ((preset_width - safe_width).powi(2) + (preset_height - safe_height).powi(2)).sqrt();
        if next_delta < best_delta {
            best_delta = next_delta;
            best_preset_id = normalize_preset_id(&preset.id);
        }
    }

    best_preset_id
}

fn fit_bounds_within_area(
    position: PhysicalPosition<i32>,
    size: PhysicalSize<u32>,
    work_area: PhysicalRect<i32, u32>,
) -> Option<PhysicalPosition<i32>> {
    let max_x = work_area.position.x + (work_area.size.width.saturating_sub(size.width) as i32);
    let max_y = work_area.position.y + (work_area.size.height.saturating_sub(size.height) as i32);

    Some(PhysicalPosition::new(
        position.x.clamp(work_area.position.x, max_x),
        position.y.clamp(work_area.position.y, max_y),
    ))
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
        launch_on_startup: state.launch_on_startup,
    })
    .map_err(|error| error.to_string())?;
    fs::write(preferences_path, format!("{serialized}\n")).map_err(|error| error.to_string())
}

fn sync_tray_menu(
    host_state: &DesktopHostState,
    state: &DesktopHostStateInner,
) -> tauri::Result<()> {
    host_state.toggle_ui_item.set_text(if state.is_ui_visible {
        "Hide UI"
    } else {
        "Show UI"
    })?;
    host_state
        .toggle_always_on_top_item
        .set_checked(state.is_always_on_top)?;
    host_state
        .toggle_launch_on_startup_item
        .set_checked(state.launch_on_startup)?;
    Ok(())
}

fn apply_host_state(
    app: &AppHandle,
    state: &mut DesktopHostStateInner,
    emit_ui_visibility: bool,
    emit_window_preset: bool,
) -> tauri::Result<()> {
    let window = get_main_window(app)?;
    let (width, height) = get_preset_bounds(&state.window_preset_id, state.is_ui_visible);

    state.is_applying_window_bounds = true;
    window.set_size(LogicalSize::new(width, height))?;
    window.set_always_on_top(state.is_always_on_top)?;
    if state.is_ui_visible {
        keep_window_within_visible_work_area(&window)?;
    }
    state.is_applying_window_bounds = false;

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
    let mut state = host_state
        .inner
        .lock()
        .map_err(|_| "desktop state lock poisoned")?;
    state.window_preset_id = normalize_preset_id(preset_id).to_string();
    apply_host_state(app, &mut state, false, emit_window_preset)
        .map_err(|error| error.to_string())?;
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
    let mut state = host_state
        .inner
        .lock()
        .map_err(|_| "desktop state lock poisoned")?;
    state.is_ui_visible = is_visible;
    apply_host_state(app, &mut state, emit_ui_visibility, false)
        .map_err(|error| error.to_string())?;
    sync_tray_menu(host_state, &state).map_err(|error| error.to_string())?;
    persist_desktop_preferences(host_state, &state)?;
    Ok(state.is_ui_visible)
}

fn set_always_on_top_internal(
    app: &AppHandle,
    host_state: &DesktopHostState,
    is_always_on_top: bool,
) -> Result<bool, String> {
    let mut state = host_state
        .inner
        .lock()
        .map_err(|_| "desktop state lock poisoned")?;
    state.is_always_on_top = is_always_on_top;
    apply_host_state(app, &mut state, false, false).map_err(|error| error.to_string())?;
    sync_tray_menu(host_state, &state).map_err(|error| error.to_string())?;
    persist_desktop_preferences(host_state, &state)?;
    Ok(state.is_always_on_top)
}

fn set_launch_on_startup_internal(
    app: &AppHandle,
    host_state: &DesktopHostState,
    launch_on_startup: bool,
) -> Result<bool, String> {
    let autostart_manager = app.autolaunch();
    if launch_on_startup {
        autostart_manager
            .enable()
            .map_err(|error| error.to_string())?;
    } else {
        autostart_manager
            .disable()
            .map_err(|error| error.to_string())?;
    }

    let mut state = host_state
        .inner
        .lock()
        .map_err(|_| "desktop state lock poisoned")?;
    state.launch_on_startup = launch_on_startup;
    sync_tray_menu(host_state, &state).map_err(|error| error.to_string())?;
    persist_desktop_preferences(host_state, &state)?;
    Ok(state.launch_on_startup)
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

fn keep_window_within_visible_work_area(window: &WebviewWindow) -> tauri::Result<()> {
    let Some(monitor) = window.current_monitor()? else {
        return Ok(());
    };

    let position = window.outer_position()?;
    let size = window.outer_size()?;
    let Some(next_position) = fit_bounds_within_area(position, size, *monitor.work_area()) else {
        return Ok(());
    };

    if next_position != position {
        window.set_position(next_position)?;
    }

    Ok(())
}

fn snap_window_to_nearest_preset(app: &AppHandle) -> Result<(), String> {
    let window = get_main_window(app).map_err(|error| error.to_string())?;
    let size = window.outer_size().map_err(|error| error.to_string())?;
    let host_state = app.state::<DesktopHostState>();
    let mut state = host_state
        .inner
        .lock()
        .map_err(|_| "desktop state lock poisoned")?;
    let nearest_preset_id =
        get_closest_window_preset_id(size.width, size.height, state.is_ui_visible);
    let (preset_width, preset_height) = get_preset_bounds(nearest_preset_id, state.is_ui_visible);
    let already_at_preset_size =
        size.width == preset_width as u32 && size.height == preset_height as u32;
    if state.window_preset_id == nearest_preset_id && already_at_preset_size {
        return Ok(());
    }

    state.window_preset_id = nearest_preset_id.to_string();
    apply_host_state(app, &mut state, false, true).map_err(|error| error.to_string())?;
    sync_tray_menu(&host_state, &state).map_err(|error| error.to_string())?;
    persist_desktop_preferences(&host_state, &state)?;
    Ok(())
}

fn schedule_window_preset_snap(app: &AppHandle) {
    let host_state = app.state::<DesktopHostState>();
    let generation = match host_state.inner.try_lock() {
        // Window resize events can arrive synchronously while we are already
        // applying host-managed bounds. Skip those events instead of blocking
        // on the same mutex from the same UI thread.
        Ok(mut state) => {
            if state.is_applying_window_bounds {
                return;
            }
            state.resize_snap_generation += 1;
            state.resize_snap_generation
        }
        Err(_) => return,
    };

    let app_handle = app.clone();
    thread::spawn(move || {
        thread::sleep(Duration::from_millis(140));
        let host_state = app_handle.state::<DesktopHostState>();
        let should_snap = host_state
            .inner
            .try_lock()
            .map(|state| {
                !state.is_applying_window_bounds && state.resize_snap_generation == generation
            })
            .unwrap_or(false);

        if should_snap {
            let _ = snap_window_to_nearest_preset(&app_handle);
        }
    });
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
        } else if matches!(event, WindowEvent::Resized(_)) {
            schedule_window_preset_snap(&app_handle);
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
    let toggle_launch_on_startup_item = CheckMenuItem::with_id(
        app,
        TOGGLE_LAUNCH_ON_STARTUP_MENU_ID,
        "Launch on Startup",
        true,
        false,
        None::<&str>,
    )?;
    let quit_item = MenuItem::with_id(app, QUIT_MENU_ID, "Quit", true, None::<&str>)?;
    let separator = PredefinedMenuItem::separator(app)?;
    let tray_menu = Menu::with_items(
        app,
        &[
            &toggle_ui_item,
            &toggle_always_on_top_item,
            &toggle_launch_on_startup_item,
            &separator,
            &quit_item,
        ],
    )?;
    let preferences_path = get_desktop_preferences_path(app);
    let preferences = read_desktop_preferences(preferences_path.as_deref());
    let host_state = DesktopHostState::new(
        toggle_ui_item.clone(),
        toggle_always_on_top_item.clone(),
        toggle_launch_on_startup_item.clone(),
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
                TOGGLE_LAUNCH_ON_STARTUP_MENU_ID => {
                    let current_launch_on_startup = host_state
                        .inner
                        .lock()
                        .map(|state| state.launch_on_startup)
                        .unwrap_or(false);
                    let _ = set_launch_on_startup_internal(
                        app,
                        &host_state,
                        !current_launch_on_startup,
                    );
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
    let state = state
        .inner
        .lock()
        .map_err(|_| "desktop state lock poisoned")?;
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
    let state = state
        .inner
        .lock()
        .map_err(|_| "desktop state lock poisoned")?;
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
        .plugin(tauri_plugin_autostart::init(
            MacosLauncher::LaunchAgent,
            None,
        ))
        .setup(|app| {
            create_tray(&app.handle())?;
            wire_close_behavior(&app.handle())?;

            let host_state = app.state::<DesktopHostState>();
            let mut state = host_state
                .inner
                .lock()
                .map_err(|_| tauri::Error::AssetNotFound("desktop-state".into()))?;
            let autostart_manager = app.autolaunch();
            if state.launch_on_startup {
                let _ = autostart_manager.enable();
            } else {
                let _ = autostart_manager.disable();
            }
            apply_host_state(&app.handle(), &mut state, false, false)?;

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
    use super::{
        fit_bounds_within_area, get_closest_window_preset_id, get_window_preset,
        read_desktop_preferences, PersistedDesktopPreferences, WINDOW_SIZE_PRESETS,
    };
    use std::fs;
    use std::path::PathBuf;
    use std::time::{SystemTime, UNIX_EPOCH};
    use tauri::{PhysicalPosition, PhysicalRect, PhysicalSize};

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

    #[test]
    fn shared_window_presets_include_the_expected_default_layouts() {
        assert_eq!(WINDOW_SIZE_PRESETS.len(), 3);
        assert_eq!(get_window_preset("small").width, 312);
        assert_eq!(get_window_preset("medium").full_height, 560);
        assert_eq!(get_window_preset("xsmall").clock_only_height, 232);
        assert_eq!(get_window_preset("small").label, "Small");
    }

    #[test]
    fn nearest_preset_matches_electron_window_snap_rules() {
        assert_eq!(get_closest_window_preset_id(210, 420, true), "xsmall");
        assert_eq!(get_closest_window_preset_id(320, 620, true), "small");
        assert_eq!(get_closest_window_preset_id(400, 545, true), "medium");
        assert_eq!(get_closest_window_preset_id(420, 360, false), "medium");
    }

    #[test]
    fn work_area_fit_clamps_positions_inside_monitor_bounds() {
        let work_area = PhysicalRect {
            position: PhysicalPosition::new(0, 0),
            size: PhysicalSize::new(1920, 1040),
        };

        assert_eq!(
            fit_bounds_within_area(
                PhysicalPosition::new(-20, -10),
                PhysicalSize::new(312, 660),
                work_area
            ),
            Some(PhysicalPosition::new(0, 0))
        );

        assert_eq!(
            fit_bounds_within_area(
                PhysicalPosition::new(1800, 900),
                PhysicalSize::new(420, 560),
                PhysicalRect {
                    position: PhysicalPosition::new(0, 0),
                    size: PhysicalSize::new(1920, 1040),
                }
            ),
            Some(PhysicalPosition::new(1500, 480))
        );
    }
}
