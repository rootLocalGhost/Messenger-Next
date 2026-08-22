use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use tauri::{
    AppHandle, Emitter, Manager, State, WindowEvent,
};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_opener::OpenerExt;

mod tray;

pub struct AppSettings {
    pub close_to_tray: AtomicBool,
    pub notifications_enabled: AtomicBool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            close_to_tray: AtomicBool::new(true),
            notifications_enabled: AtomicBool::new(true),
        }
    }
}

// Injected Webview Preload Script
const PRELOAD_SCRIPT: &str = include_str!("../../src/bridge/preload.js");

#[tauri::command]
fn emit_native_notification(
    app: AppHandle,
    settings: State<'_, Arc<AppSettings>>,
    title: String,
    body: String,
    _icon: Option<String>,
    _tag: Option<String>,
) -> Result<(), String> {
    if !settings.notifications_enabled.load(Ordering::Relaxed) {
        return Ok(());
    }

    let app_clone = app.clone();
    app.notification()
        .builder()
        .title(&title)
        .body(&body)
        .show()
        .map_err(|e| e.to_string())?;

    // Also bring window to attention / flash taskbar if minimized
    if let Some(window) = app_clone.get_webview_window("main") {
        let _ = window.request_user_attention(Some(tauri::UserAttentionType::Informational));
    }

    Ok(())
}

#[tauri::command]
fn update_unread_badge(
    app: AppHandle,
    count: u32,
) -> Result<(), String> {
    // Emit event to frontend if needed
    let _ = app.emit("unread-count-changed", serde_json::json!({ "count": count }));

    // Update window title and tray tooltip if available
    if let Some(window) = app.get_webview_window("main") {
        let title = if count > 0 {
            format!("({}) Messenger", count)
        } else {
            "Messenger".to_string()
        };
        let _ = window.set_title(&title);
    }

    if let Some(tray) = app.tray_by_id("main-tray") {
        let tooltip = if count > 0 {
            format!("Messenger - {} unread message{}", count, if count > 1 { "s" } else { "" })
        } else {
            "Messenger Desktop".to_string()
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }

    Ok(())
}

#[tauri::command]
fn open_external_url(
    app: AppHandle,
    url: String,
) -> Result<(), String> {
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn set_close_to_tray(
    settings: State<'_, Arc<AppSettings>>,
    enabled: bool,
) -> Result<(), String> {
    settings.close_to_tray.store(enabled, Ordering::Relaxed);
    Ok(())
}

#[tauri::command]
fn set_notifications_enabled(
    settings: State<'_, Arc<AppSettings>>,
    enabled: bool,
) -> Result<(), String> {
    settings.notifications_enabled.store(enabled, Ordering::Relaxed);
    Ok(())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let settings = Arc::new(AppSettings::default());
    let settings_window_hook = Arc::clone(&settings);

    tauri::Builder::default()
        .manage(settings)
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.show();
                let _ = window.unminimize();
                let _ = window.set_focus();
            }
        }))
        .setup(move |app| {
            let handle = app.handle();

            // Initialize System Tray
            if let Err(e) = tray::create_tray(handle) {
                eprintln!("[Messenger Desktop] Failed to create system tray: {}", e);
            }

            // Setup main window and inject bridge
            if let Some(window) = handle.get_webview_window("main") {
                let window_clone = window.clone();
                // Inject the bridge script immediately when DOM is ready
                let _ = window.eval(PRELOAD_SCRIPT);

                window.on_window_event(move |event| {
                    if let WindowEvent::CloseRequested { api, .. } = event {
                        if settings_window_hook.close_to_tray.load(Ordering::Relaxed) {
                            api.prevent_close();
                            let _ = window_clone.hide();
                        }
                    }
                });
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            emit_native_notification,
            update_unread_badge,
            open_external_url,
            set_close_to_tray,
            set_notifications_enabled,
        ])
        .run(tauri::generate_context!())
        .expect("error while running Messenger desktop application");
}
