use serde::Serialize;

#[derive(Serialize)]
pub struct AppInfo {
    pub name: String,
    pub version: String,
    pub platform: String,
}

#[tauri::command]
pub fn get_app_info() -> AppInfo {
    AppInfo {
        name: "Excited Gem Desktop".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
        platform: std::env::consts::OS.to_string(),
    }
}

#[tauri::command]
pub fn focus_os_window(title: Option<String>) -> Result<(), String> {
    log::info!("Request to focus OS window with title: {:?}", title);
    // Platform-specific window focusing handled here or via Tauri Window
    Ok(())
}

#[tauri::command]
pub fn launch_browser_url(engine: String, url: String) -> Result<(), String> {
    log::info!("Launching browser engine: {} with URL: {}", engine, url);
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let prog = match engine.to_lowercase().as_str() {
            e if e.contains("opera") || e.contains("opr") => "opera.exe",
            e if e.contains("chrome") => "chrome.exe",
            e if e.contains("edge") => "msedge.exe",
            e if e.contains("firefox") => "firefox.exe",
            e if e.contains("brave") => "brave.exe",
            _ => "explorer.exe",
        };

        let _ = Command::new("cmd")
            .args(["/C", "start", prog, &url])
            .spawn()
            .map_err(|e| format!("Failed to launch browser: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn launch_browser_window(engine: String, urls: Vec<String>) -> Result<(), String> {
    log::info!("Launching browser engine: {} with {} URLs", engine, urls.len());
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let prog = match engine.to_lowercase().as_str() {
            e if e.contains("opera") || e.contains("opr") => "opera.exe",
            e if e.contains("chrome") => "chrome.exe",
            e if e.contains("edge") => "msedge.exe",
            e if e.contains("firefox") => "firefox.exe",
            e if e.contains("brave") => "brave.exe",
            _ => "explorer.exe",
        };

        let mut cmd = Command::new("cmd");
        cmd.args(["/C", "start", prog]);
        for u in &urls {
            cmd.arg(u);
        }

        let _ = cmd.spawn().map_err(|e| format!("Failed to launch browser window: {}", e))?;
    }
    Ok(())
}

#[tauri::command]
pub fn get_installed_browser_bookmarks() -> Result<Vec<crate::browser_scanner::BrowserScanReport>, String> {
    log::info!("Scanning installed browser bookmarks from disk...");
    let reports = crate::browser_scanner::scan_all_browsers();
    let total_bookmarks: usize = reports.iter().map(|r| r.count).sum();
    log::info!(
        "Completed scan: found {} bookmark reports with {} total bookmarks across installed browsers",
        reports.len(),
        total_bookmarks
    );
    Ok(reports)
}

