use serde::{Deserialize, Serialize};
use std::sync::atomic::{AtomicBool, AtomicU32, Ordering};
use std::sync::Arc;
use tauri::{
    menu::{Menu, MenuItem, PredefinedMenuItem},
    tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent},
    AppHandle, Emitter, Manager, State,
};
use tauri_plugin_notification::NotificationExt;
use tauri_plugin_opener::OpenerExt;

// Shared Application Settings & State
pub struct AppState {
    pub unread_count: Arc<AtomicU32>,
    pub close_to_tray: Arc<AtomicBool>,
    pub notifications_enabled: Arc<AtomicBool>,
}

impl Default for AppState {
    fn default() -> Self {
        Self {
            unread_count: Arc::new(AtomicU32::new(0)),
            close_to_tray: Arc::new(AtomicBool::new(true)),
            notifications_enabled: Arc::new(AtomicBool::new(true)),
        }
    }
}

#[derive(Debug, Serialize, Deserialize, Clone, PartialEq)]
pub struct NotificationPayload {
    pub title: String,
    pub body: Option<String>,
    pub icon: Option<String>,
    pub tag: Option<String>,
    pub url: Option<String>,
}

// Command: Trigger native OS desktop notification (Linux DBus / Windows Toast)
#[tauri::command]
fn trigger_native_notification(
    app: AppHandle,
    state: State<AppState>,
    title: String,
    body: Option<String>,
    icon: Option<String>,
    tag: Option<String>,
    url: Option<String>,
) -> Result<(), String> {
    if !state.notifications_enabled.load(Ordering::Relaxed) {
        return Ok(());
    }

    let payload = NotificationPayload {
        title: title.clone(),
        body: body.clone(),
        icon: icon.clone(),
        tag: tag.clone(),
        url: url.clone(),
    };

    // Emit event to SolidJS frontend so in-app drawer receives it
    let _ = app.emit("notification-received", &payload);

    // Build and send native OS notification via DBus (Linux) or Windows Toast
    let mut builder = app
        .notification()
        .builder()
        .title(&title);

    if let Some(ref text) = body {
        builder = builder.body(text);
    }

    if let Some(ref icon_str) = icon {
        builder = builder.icon(icon_str);
    }

    if let Some(ref tag_str) = tag {
        builder = builder.extra("tag", tag_str.clone());
    }

    if let Some(ref target_url) = url {
        builder = builder.extra("url", target_url.clone());
    }

    let _ = builder.show().map_err(|e| e.to_string())?;

    // Bring attention to taskbar / request informational attention
    if let Some(window) = app.get_webview_window("main") {
        let _ = window.request_user_attention(Some(tauri::UserAttentionType::Informational));
    }

    Ok(())
}

// Command: Update unread badge counter
#[tauri::command]
fn update_unread_count(
    app: AppHandle,
    state: State<AppState>,
    count: u32,
) -> Result<(), String> {
    state.unread_count.store(count, Ordering::SeqCst);
    let _ = app.emit("unread-count-updated", count);

    // Update window title
    if let Some(window) = app.get_webview_window("main") {
        let title = if count > 0 {
            format!("({}) Messenger", count)
        } else {
            "Messenger".to_string()
        };
        let _ = window.set_title(&title);
    }

    // Update system tray tooltip
    if let Some(tray) = app.tray_by_id("messenger-desktop-tray") {
        let tooltip = if count > 0 {
            format!("Messenger Desktop - {} unread message{}", count, if count > 1 { "s" } else { "" })
        } else {
            "Messenger Desktop".to_string()
        };
        let _ = tray.set_tooltip(Some(tooltip));
    }

    Ok(())
}

// Command: Get current unread badge counter
#[tauri::command]
fn get_unread_count(state: State<AppState>) -> Result<u32, String> {
    Ok(state.unread_count.load(Ordering::SeqCst))
}

// Command: Open external URL in default browser
#[tauri::command]
fn open_external_url(app: AppHandle, url: String) -> Result<(), String> {
    app.opener()
        .open_url(&url, None::<&str>)
        .map_err(|e| e.to_string())
}

// Command: Toggle window always-on-top
#[tauri::command]
fn set_always_on_top(app: AppHandle, enabled: bool) -> Result<(), String> {
    if let Some(window) = app.get_webview_window("main") {
        window.set_always_on_top(enabled).map_err(|e| e.to_string())?;
    }
    Ok(())
}

// Command: Set close to tray state
#[tauri::command]
fn set_close_to_tray(state: State<AppState>, enabled: bool) -> Result<(), String> {
    state.close_to_tray.store(enabled, Ordering::Relaxed);
    Ok(())
}

// Command: Set notifications enabled state
#[tauri::command]
fn set_notifications_enabled(state: State<AppState>, enabled: bool) -> Result<(), String> {
    state.notifications_enabled.store(enabled, Ordering::Relaxed);
    Ok(())
}

pub fn sanitize_messenger_url(path: &str) -> String {
    if path.starts_with("http") {
        path.to_string()
    } else {
        let clean = if path.starts_with('/') { &path[1..] } else { path };
        format!("https://www.messenger.com/{}", clean)
    }
}

// Command: Send navigation or action to webview
#[tauri::command]
fn navigate_messenger(app: AppHandle, path: String) -> Result<(), String> {
    let target = sanitize_messenger_url(&path);

    let js = format!(
        "if (window.__MESSENGER_DESKTOP__) {{ window.__MESSENGER_DESKTOP__.navigate('{}'); }} else {{ window.location.href = '{}'; }}",
        target, target
    );

    if let Some(webview) = app.get_webview("messenger") {
        let _ = webview.eval(&js);
    } else if let Some(window) = app.get_webview_window("main") {
        let _ = window.eval(&js);
    }
    Ok(())
}

// Command: Reload webview
#[tauri::command]
fn reload_messenger(app: AppHandle) -> Result<(), String> {
    let js = "if (window.__MESSENGER_DESKTOP__) { window.__MESSENGER_DESKTOP__.reload(); } else { window.location.reload(); }";
    if let Some(webview) = app.get_webview("messenger") {
        let _ = webview.eval(js);
    } else if let Some(window) = app.get_webview_window("main") {
        let _ = window.eval(js);
    }
    Ok(())
}

// Command: History back
#[tauri::command]
fn go_back_messenger(app: AppHandle) -> Result<(), String> {
    let js = "if (window.__MESSENGER_DESKTOP__) { window.__MESSENGER_DESKTOP__.goBack(); } else { window.history.back(); }";
    if let Some(webview) = app.get_webview("messenger") {
        let _ = webview.eval(js);
    } else if let Some(window) = app.get_webview_window("main") {
        let _ = window.eval(js);
    }
    Ok(())
}

// Command: History forward
#[tauri::command]
fn go_forward_messenger(app: AppHandle) -> Result<(), String> {
    let js = "if (window.__MESSENGER_DESKTOP__) { window.__MESSENGER_DESKTOP__.goForward(); } else { window.history.forward(); }";
    if let Some(webview) = app.get_webview("messenger") {
        let _ = webview.eval(js);
    } else if let Some(window) = app.get_webview_window("main") {
        let _ = window.eval(js);
    }
    Ok(())
}

// Command: Set webview zoom
#[tauri::command]
fn set_messenger_zoom(app: AppHandle, zoom_factor: f64) -> Result<(), String> {
    if let Some(webview) = app.get_webview("messenger") {
        let _ = webview.set_zoom(zoom_factor);
    } else if let Some(window) = app.get_webview_window("main") {
        let _ = window.set_zoom(zoom_factor);
    }
    Ok(())
}

// Injected JavaScript for Messenger
const PRELOAD_SCRIPT: &str = include_str!("../../src/bridge/preload.js");

// Modern Desktop Chrome User Agent
const DESKTOP_USER_AGENT: &str = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36";

pub fn update_child_bounds(window: &tauri::Window, webview: &tauri::Webview) {
    if let Ok(size) = window.inner_size() {
        let scale = window.scale_factor().unwrap_or(1.0);
        let titlebar_h_physical = (44.0 * scale).round() as u32;
        let target_width = size.width;
        let target_height = size.height.saturating_sub(titlebar_h_physical);

        let _ = webview.set_position(tauri::Position::Physical(
            tauri::PhysicalPosition::new(0, titlebar_h_physical as i32),
        ));
        let _ = webview.set_size(tauri::Size::Physical(
            tauri::PhysicalSize::new(target_width, target_height.max(50)),
        ));
    }
}

pub fn show_main_window(app: &AppHandle) {
    if let Some(window) = app.get_window("main") {
        let _ = window.show();
        let _ = window.unminimize();
        let _ = window.set_focus();
        if let Some(webview) = app.get_webview("messenger") {
            let _ = webview.show();
            let _ = webview.set_focus();
            update_child_bounds(&window, &webview);
        }
    }
}

pub fn hide_main_window(app: &AppHandle) {
    if let Some(webview) = app.get_webview("messenger") {
        let _ = webview.hide();
    }
    if let Some(window) = app.get_window("main") {
        let _ = window.hide();
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let state = AppState::default();
    let close_to_tray_ref = Arc::clone(&state.close_to_tray);

    tauri::Builder::default()
        .manage(state)
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_notification::init())
        .plugin(tauri_plugin_autostart::init(
            tauri_plugin_autostart::MacosLauncher::LaunchAgent,
            Some(vec!["--minimized"]),
        ))
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            show_main_window(app);
        }))
        .invoke_handler(tauri::generate_handler![
            trigger_native_notification,
            update_unread_count,
            get_unread_count,
            open_external_url,
            set_always_on_top,
            set_close_to_tray,
            set_notifications_enabled,
            navigate_messenger,
            reload_messenger,
            go_back_messenger,
            go_forward_messenger,
            set_messenger_zoom
        ])
        .setup(move |app| {
            // Setup System Tray
            let open_item = MenuItem::with_id(app, "open", "Open Messenger", true, None::<&str>)?;
            let chats_item = MenuItem::with_id(app, "chats", "Chats & Messages", true, None::<&str>)?;
            let test_notif_item = MenuItem::with_id(app, "test_notif", "Send Test Notification", true, None::<&str>)?;
            let separator = PredefinedMenuItem::separator(app)?;
            let quit_item = MenuItem::with_id(app, "quit", "Quit Messenger", true, None::<&str>)?;

            let tray_menu = Menu::with_items(
                app,
                &[&open_item, &chats_item, &test_notif_item, &separator, &quit_item],
            )?;

            let icon = match app.default_window_icon() {
                Some(icon) => icon.clone(),
                None => tauri::image::Image::from_bytes(include_bytes!("../icons/32x32.png")).unwrap(),
            };

            let _tray = TrayIconBuilder::with_id("messenger-desktop-tray")
                .icon(icon)
                .menu(&tray_menu)
                .tooltip("Messenger Desktop")
                .on_menu_event(|app, event| match event.id.as_ref() {
                    "open" => {
                        show_main_window(app);
                    }
                    "chats" => {
                        show_main_window(app);
                        let _ = navigate_messenger(app.clone(), "/".to_string());
                    }
                    "test_notif" => {
                        let state = app.state::<AppState>();
                        let _ = trigger_native_notification(
                            app.clone(),
                            state,
                            "Messenger".to_string(),
                            Some("Desktop notifications are active and connected!".to_string()),
                            None,
                            Some("test".to_string()),
                            Some("https://www.messenger.com".to_string()),
                        );
                    }
                    "quit" => {
                        app.exit(0);
                    }
                    _ => {}
                })
                .on_tray_icon_event(|tray, event| {
                    match event {
                        TrayIconEvent::Click {
                            button: MouseButton::Left,
                            button_state: MouseButtonState::Up,
                            ..
                        }
                        | TrayIconEvent::DoubleClick {
                            button: MouseButton::Left,
                            ..
                        } => {
                            let app = tray.app_handle();
                            let is_visible = app
                                .get_window("main")
                                .and_then(|w| w.is_visible().ok())
                                .unwrap_or(false);
                            if is_visible {
                                hide_main_window(app);
                            } else {
                                show_main_window(app);
                            }
                        }
                        _ => {}
                    }
                })
                .build(app)?;

            // Setup Messenger Child Webview under the titlebar (y: 44px)
            let handle = app.handle();
            if let Some(main_window) = handle.get_window("main") {
                let scale_factor = main_window.scale_factor().unwrap_or(1.0);
                let window_size = main_window.inner_size().unwrap_or(tauri::PhysicalSize::new(1200, 840));
                let titlebar_h_physical = (44.0 * scale_factor).round() as u32;

                let webview_builder = tauri::webview::WebviewBuilder::new(
                    "messenger",
                    tauri::WebviewUrl::External("https://www.messenger.com".parse().unwrap()),
                )
                .user_agent(DESKTOP_USER_AGENT)
                .initialization_script(PRELOAD_SCRIPT);

                let pos = tauri::Position::Physical(tauri::PhysicalPosition::new(0, titlebar_h_physical as i32));
                let target_width = window_size.width;
                let target_height = window_size.height.saturating_sub(titlebar_h_physical);
                let size = tauri::Size::Physical(tauri::PhysicalSize::new(
                    target_width,
                    target_height.max(50),
                ));

                // Add child webview to main window
                match main_window.add_child(webview_builder, pos, size) {
                    Ok(child_webview) => {
                        let webview_clone = child_webview.clone();
                        let main_win_clone = main_window.clone();

                        // Immediate and delayed bounds adjustments to prevent black borders
                        update_child_bounds(&main_window, &child_webview);
                        let win_delayed = main_window.clone();
                        let webview_delayed = child_webview.clone();
                        std::thread::spawn(move || {
                            std::thread::sleep(std::time::Duration::from_millis(150));
                            update_child_bounds(&win_delayed, &webview_delayed);
                            std::thread::sleep(std::time::Duration::from_millis(350));
                            update_child_bounds(&win_delayed, &webview_delayed);
                        });

                        // Listen for window close, resize, scale, focus events
                        main_window.on_window_event(move |event| {
                            match event {
                                tauri::WindowEvent::CloseRequested { api, .. } => {
                                    if close_to_tray_ref.load(Ordering::Relaxed) {
                                        api.prevent_close();
                                        let _ = webview_clone.hide();
                                        let _ = main_win_clone.hide();
                                    }
                                }
                                tauri::WindowEvent::Resized(_)
                                | tauri::WindowEvent::ScaleFactorChanged { .. }
                                | tauri::WindowEvent::Focused(true) => {
                                    update_child_bounds(&main_win_clone, &webview_clone);
                                }
                                _ => {}
                            }
                        });
                    }
                    Err(e) => {
                        eprintln!("[Messenger Desktop] Failed to create child webview: {}", e);
                    }
                }
            }

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running Messenger desktop application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_default_app_state() {
        let state = AppState::default();
        assert_eq!(state.unread_count.load(Ordering::SeqCst), 0);
        assert!(state.close_to_tray.load(Ordering::Relaxed));
        assert!(state.notifications_enabled.load(Ordering::Relaxed));
    }

    #[test]
    fn test_notification_payload_serialization() {
        let payload = NotificationPayload {
            title: "Messenger".to_string(),
            body: Some("Alex: Hey there!".to_string()),
            icon: None,
            tag: Some("chat-123".to_string()),
            url: Some("https://www.messenger.com/t/123".to_string()),
        };

        let json = serde_json::to_string(&payload).unwrap();
        let deserialized: NotificationPayload = serde_json::from_str(&json).unwrap();
        assert_eq!(payload, deserialized);
    }

    #[test]
    fn test_sanitize_messenger_url() {
        assert_eq!(sanitize_messenger_url("/t/123"), "https://www.messenger.com/t/123");
        assert_eq!(sanitize_messenger_url("active/"), "https://www.messenger.com/active/");
        assert_eq!(sanitize_messenger_url("https://www.messenger.com/t/456"), "https://www.messenger.com/t/456");
    }
}
