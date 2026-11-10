use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct NativeYoutubeInfo {
    pub video_id: String,
    pub title: Option<String>,
    pub duration: u64,
}

#[tauri::command]
pub fn fetch_youtube_video_native(video_id: String) -> Result<NativeYoutubeInfo, String> {
    log::info!("Fetching YouTube video info natively for videoId: {}", video_id);
    #[cfg(target_os = "windows")]
    {
        use std::process::Command;
        let url = format!("https://www.youtube.com/watch?v={}", video_id);
        let output = Command::new("curl.exe")
            .args(["-s", "-L", "--max-time", "8", "-H", "Accept-Language: en-US,en;q=0.9", &url])
            .output()
            .map_err(|e| format!("Failed to run curl.exe: {}", e))?;

        if !output.status.success() {
            return Err(format!("curl.exe failed with code {:?}", output.status.code()));
        }

        let html = String::from_utf8_lossy(&output.stdout);

        // 1. Find approxDurationMs
        let duration_sec = if let Some(pos) = html.find("\"approxDurationMs\":\"") {
            let start = pos + "\"approxDurationMs\":\"".len();
            if let Some(end) = html[start..].find('"') {
                let ms_str = &html[start..start + end];
                ms_str.parse::<u64>().map(|ms| ms / 1000).unwrap_or(0)
            } else {
                0
            }
        } else {
            0
        };

        // 2. Extract title if possible
        let title = if let Some(pos) = html.find("<title>") {
            let start = pos + "<title>".len();
            if let Some(end) = html[start..].find(" - YouTube</title>") {
                Some(html[start..start + end].to_string())
            } else {
                None
            }
        } else {
            None
        };

        if duration_sec > 0 {
            return Ok(NativeYoutubeInfo {
                video_id,
                title,
                duration: duration_sec,
            });
        }

        return Err("Could not extract duration from YouTube watch page (video may be private or unavailable)".to_string());
    }

    #[cfg(not(target_os = "windows"))]
    {
        Err("Native fetch currently supported on Windows".to_string())
    }
}

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

