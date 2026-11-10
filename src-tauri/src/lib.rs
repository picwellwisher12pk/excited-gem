pub mod bridge;
pub mod browser_scanner;
pub mod commands;

use bridge::BridgeServer;
use tauri::Manager;

fn log_debug(msg: &str) {
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
        let dir = std::path::Path::new(&local_app_data).join("com.excitedgem.desktop");
        let _ = std::fs::create_dir_all(&dir);
        let path = dir.join("debug.log");
        use std::io::Write;
        if let Ok(mut file) = std::fs::OpenOptions::new().create(true).append(true).open(path) {
            let _ = writeln!(file, "{}", msg);
        }
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    log_debug("Starting Excited Gem desktop application...");
    let bridge = BridgeServer::new();

    tauri::Builder::default()
        .plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            log_debug("Single instance triggered from secondary launch");
            if let Some(w) = app.get_webview_window("main") {
                let _ = w.unminimize();
                let _ = w.show();
                let _ = w.set_focus();
            } else {
                let win = tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::default())
                    .title("Excited Gem")
                    .inner_size(1280.0, 840.0)
                    .min_inner_size(960.0, 640.0)
                    .resizable(true)
                    .fullscreen(false)
                    .center()
                    .visible(true)
                    .decorations(false)
                    .build();

                if let Ok(w) = win {
                    let _ = w.show();
                    let _ = w.set_focus();
                }
            }
        }))
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // Intercept close: hide to tray so background bridge and state stay alive cleanly
                api.prevent_close();
                let _ = window.hide();
            }
        })
        .setup(move |app| {
            log_debug("Executing app setup block");
            if cfg!(debug_assertions) {
                let _ = app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                );
            }

            // Start WebSocket bridge on port 49221
            tauri::async_runtime::spawn(async move {
                if let Err(e) = bridge.start(49221).await {
                    eprintln!("Failed to start bridge server: {}", e);
                    log_debug(&format!("Bridge server error: {}", e));
                }
            });

            log_debug("Creating main window via WebviewWindowBuilder");
            let win = tauri::WebviewWindowBuilder::new(app, "main", tauri::WebviewUrl::default())
                .title("Excited Gem")
                .inner_size(1280.0, 840.0)
                .min_inner_size(960.0, 640.0)
                .resizable(true)
                .fullscreen(false)
                .center()
                .visible(true)
                .decorations(false)
                .build();

            match win {
                Ok(w) => {
                    log_debug("Main window created successfully");
                    let _ = w.show();
                    let _ = w.set_focus();
                }
                Err(e) => {
                    log_debug(&format!("Error creating main window: {}", e));
                }
            }

            // System tray icon setup
            if let (Ok(show_item), Ok(quit_item)) = (
                tauri::menu::MenuItem::with_id(app, "show", "Show Excited Gem", true, None::<&str>),
                tauri::menu::MenuItem::with_id(app, "quit", "Quit", true, None::<&str>),
            ) {
                if let Ok(tray_menu) = tauri::menu::Menu::with_items(app, &[&show_item, &quit_item]) {
                    let mut tray_builder = tauri::tray::TrayIconBuilder::new()
                        .menu(&tray_menu)
                        .show_menu_on_left_click(false)
                        .on_menu_event(|app, event| match event.id.as_ref() {
                            "show" => {
                                if let Some(w) = app.get_webview_window("main") {
                                    let _ = w.unminimize();
                                    let _ = w.show();
                                    let _ = w.set_focus();
                                }
                            }
                            "quit" => {
                                app.exit(0);
                            }
                            _ => {}
                        })
                        .on_tray_icon_event(|tray, event| {
                            if let tauri::tray::TrayIconEvent::Click {
                                button: tauri::tray::MouseButton::Left,
                                button_state: tauri::tray::MouseButtonState::Up,
                                ..
                            } = event
                            {
                                let app = tray.app_handle();
                                if let Some(w) = app.get_webview_window("main") {
                                    let _ = w.unminimize();
                                    let _ = w.show();
                                    let _ = w.set_focus();
                                }
                            }
                        });

                    if let Some(icon) = app.default_window_icon() {
                        tray_builder = tray_builder.icon(icon.clone());
                    }

                    match tray_builder.build(app) {
                        Ok(_) => log_debug("System tray initialized successfully"),
                        Err(e) => log_debug(&format!("Failed to build system tray: {}", e)),
                    }
                }
            }

            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            commands::get_app_info,
            commands::focus_os_window,
            commands::launch_browser_url,
            commands::launch_browser_window,
            commands::get_installed_browser_bookmarks
        ])
        .run(tauri::generate_context!())
        .expect("error while building tauri application");
}
