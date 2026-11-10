use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct DiscoveredBookmark {
    pub id: String,
    pub title: String,
    pub url: String,
    pub folder: String,
    pub browser: String,
    pub profile: String,
    pub date_added: Option<i64>,
}

#[derive(Serialize, Deserialize, Clone, Debug)]
pub struct BrowserScanReport {
    pub browser: String,
    pub profile: String,
    pub count: usize,
    pub bookmarks: Vec<DiscoveredBookmark>,
}

/// Recursively traverses a Chromium bookmarks JSON node
fn walk_chromium_node(
    node: &serde_json::Value,
    folder_path: &str,
    browser: &str,
    profile: &str,
    results: &mut Vec<DiscoveredBookmark>,
) {
    let node_type = node.get("type").and_then(|v| v.as_str()).unwrap_or("");
    let name = node.get("name").and_then(|v| v.as_str()).unwrap_or("");

    if node_type == "url" {
        if let Some(url) = node.get("url").and_then(|v| v.as_str()) {
            if !url.is_empty() && (url.starts_with("http://") || url.starts_with("https://")) {
                let id = node.get("id").and_then(|v| v.as_str()).unwrap_or("0");
                let date_added_raw = node.get("date_added").and_then(|v| v.as_str()).and_then(|s| s.parse::<i64>().ok());
                
                // Chromium timestamps are microseconds since Jan 1, 1601. Convert to Unix timestamp ms if valid.
                let date_added = date_added_raw.map(|us| {
                    let unix_us = us - 11644473600000000;
                    if unix_us > 0 { unix_us / 1000 } else { 0 }
                });

                results.push(DiscoveredBookmark {
                    id: format!("{}_{}_{}", browser, profile, id),
                    title: if name.is_empty() { url.to_string() } else { name.to_string() },
                    url: url.to_string(),
                    folder: if folder_path.is_empty() { "Bookmarks Bar".to_string() } else { folder_path.to_string() },
                    browser: browser.to_string(),
                    profile: profile.to_string(),
                    date_added,
                });
            }
        }
    } else if node_type == "folder" || node.get("children").is_some() {
        let current_folder = if folder_path.is_empty() {
            name.to_string()
        } else if !name.is_empty() {
            format!("{}/{}", folder_path, name)
        } else {
            folder_path.to_string()
        };

        if let Some(children) = node.get("children").and_then(|v| v.as_array()) {
            for child in children {
                walk_chromium_node(child, &current_folder, browser, profile, results);
            }
        }
    }
}

/// Reads a Chromium Bookmarks JSON file
fn read_chromium_bookmarks_file(
    file_path: &Path,
    browser: &str,
    profile: &str,
) -> Vec<DiscoveredBookmark> {
    let mut bookmarks = Vec::new();
    if let Ok(content) = fs::read_to_string(file_path) {
        if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
            if let Some(roots) = json.get("roots").and_then(|v| v.as_object()) {
                for (root_key, root_node) in roots {
                    let folder_name = match root_key.as_str() {
                        "bookmark_bar" => "Bookmarks Bar",
                        "other" => "Other Bookmarks",
                        "synced" => "Mobile Bookmarks",
                        _ => root_key.as_str(),
                    };
                    walk_chromium_node(root_node, folder_name, browser, profile, &mut bookmarks);
                }
            }
        }
    }
    bookmarks
}

/// Scans standard Chromium user-data directory for profiles
fn scan_chromium_browser(
    base_dir: &Path,
    browser_name: &str,
) -> Vec<BrowserScanReport> {
    let mut reports = Vec::new();
    if !base_dir.exists() {
        return reports;
    }

    // Check direct Bookmarks in base_dir (e.g. Opera)
    let direct_bm = base_dir.join("Bookmarks");
    if direct_bm.exists() {
        let bms = read_chromium_bookmarks_file(&direct_bm, browser_name, "Default");
        if !bms.is_empty() {
            reports.push(BrowserScanReport {
                browser: browser_name.to_string(),
                profile: "Default".to_string(),
                count: bms.len(),
                bookmarks: bms,
            });
        }
    }

    // Check subdirectories (Default, Profile 1, Profile 2, etc.)
    if let Ok(entries) = fs::read_dir(base_dir) {
        for entry in entries.flatten() {
            let path = entry.path();
            if path.is_dir() {
                let bm_path = path.join("Bookmarks");
                if bm_path.exists() {
                    let profile_name = entry.file_name().to_string_lossy().to_string();
                    let bms = read_chromium_bookmarks_file(&bm_path, browser_name, &profile_name);
                    if !bms.is_empty() {
                        reports.push(BrowserScanReport {
                            browser: browser_name.to_string(),
                            profile: profile_name,
                            count: bms.len(),
                            bookmarks: bms,
                        });
                    }
                }
            }
        }
    }

    reports
}

/// Reads Firefox bookmarks from places.sqlite database
fn scan_firefox_profiles(profiles_dir: &Path, browser_name: &str) -> Vec<BrowserScanReport> {
    let mut reports = Vec::new();
    if !profiles_dir.exists() {
        return reports;
    }

    if let Ok(entries) = fs::read_dir(profiles_dir) {
        for entry in entries.flatten() {
            let profile_dir = entry.path();
            if profile_dir.is_dir() {
                let places_path = profile_dir.join("places.sqlite");
                if places_path.exists() {
                    let profile_name = entry.file_name().to_string_lossy().to_string();
                    if let Ok(bms) = read_firefox_places(&places_path, browser_name, &profile_name) {
                        if !bms.is_empty() {
                            reports.push(BrowserScanReport {
                                browser: browser_name.to_string(),
                                profile: profile_name,
                                count: bms.len(),
                                bookmarks: bms,
                            });
                        }
                    }
                }
            }
        }
    }

    reports
}

/// Query Firefox places.sqlite directly using rusqlite
fn read_firefox_places(
    sqlite_path: &Path,
    browser_name: &str,
    profile_name: &str,
) -> Result<Vec<DiscoveredBookmark>, String> {
    // Open in read-only mode with fallback to a temporary copy if locked
    let conn = match rusqlite::Connection::open_with_flags(
        sqlite_path,
        rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY | rusqlite::OpenFlags::SQLITE_OPEN_URI,
    ) {
        Ok(c) => c,
        Err(_) => {
            let safe_name = profile_name.replace(['/', '\\', ':', '*'], "_");
            let temp_path = std::env::temp_dir().join(format!("eg_places_{}.sqlite", safe_name));
            let _ = fs::copy(sqlite_path, &temp_path);
            rusqlite::Connection::open_with_flags(
                &temp_path,
                rusqlite::OpenFlags::SQLITE_OPEN_READ_ONLY,
            )
            .map_err(|e| format!("Failed to open Firefox SQLite: {}", e))?
        }
    };

    // Build folder map
    let mut folder_names: HashMap<i64, String> = HashMap::new();
    if let Ok(mut stmt) = conn.prepare("SELECT id, title FROM moz_bookmarks WHERE type = 2") {
        let rows = stmt.query_map([], |row| {
            let id: i64 = row.get(0)?;
            let title: Option<String> = row.get(1)?;
            Ok((id, title.unwrap_or_else(|| "Folder".to_string())))
        });
        if let Ok(folder_rows) = rows {
            for item in folder_rows.flatten() {
                folder_names.insert(item.0, item.1);
            }
        }
    }

    // Query URL bookmarks (type = 1)
    let mut stmt = conn
        .prepare(
            "SELECT b.id, b.title, p.url, b.dateAdded, b.parent \
             FROM moz_bookmarks b \
             JOIN moz_places p ON b.fk = p.id \
             WHERE b.type = 1 AND p.url NOT LIKE 'place:%' \
             ORDER BY b.dateAdded DESC",
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    let rows = stmt
        .query_map([], |row| {
            let id: i64 = row.get(0)?;
            let title: Option<String> = row.get(1)?;
            let url: String = row.get(2)?;
            let date_added_raw: Option<i64> = row.get(3)?;
            let parent_id: Option<i64> = row.get(4)?;

            let date_added = date_added_raw.map(|us| us / 1000); // us to ms
            let folder_name = parent_id
                .and_then(|pid| folder_names.get(&pid).cloned())
                .unwrap_or_else(|| "Bookmarks Menu".to_string());

            let clean_title = title.unwrap_or_else(|| url.clone());

            Ok(DiscoveredBookmark {
                id: format!("{}_{}_{}", browser_name, profile_name, id),
                title: clean_title,
                url,
                folder: folder_name,
                browser: browser_name.to_string(),
                profile: profile_name.to_string(),
                date_added,
            })
        })
        .map_err(|e| format!("Query map failed: {}", e))?;

    let mut bookmarks = Vec::new();
    for row in rows.flatten() {
        if row.url.starts_with("http://") || row.url.starts_with("https://") {
            bookmarks.push(row);
        }
    }

    Ok(bookmarks)
}

/// Discovers bookmarks from all known browser installations on the system
pub fn scan_all_browsers() -> Vec<BrowserScanReport> {
    let mut all_reports = Vec::new();

    let local_app_data = std::env::var("LOCALAPPDATA").map(PathBuf::from).ok();
    let app_data = std::env::var("APPDATA").map(PathBuf::from).ok();

    if let Some(ref local) = local_app_data {
        // Google Chrome
        let chrome_dir = local.join("Google").join("Chrome").join("User Data");
        all_reports.extend(scan_chromium_browser(&chrome_dir, "Google Chrome"));

        // Microsoft Edge
        let edge_dir = local.join("Microsoft").join("Edge").join("User Data");
        all_reports.extend(scan_chromium_browser(&edge_dir, "Microsoft Edge"));

        // Brave Browser
        let brave_dir = local.join("BraveSoftware").join("Brave-Browser").join("User Data");
        all_reports.extend(scan_chromium_browser(&brave_dir, "Brave Browser"));

        // Vivaldi
        let vivaldi_dir = local.join("Vivaldi").join("User Data");
        all_reports.extend(scan_chromium_browser(&vivaldi_dir, "Vivaldi"));

        // Arc Browser
        let arc_dir = local.join("Arc").join("User Data");
        all_reports.extend(scan_chromium_browser(&arc_dir, "Arc Browser"));

        // Chromium
        let chromium_dir = local.join("Chromium").join("User Data");
        all_reports.extend(scan_chromium_browser(&chromium_dir, "Chromium"));
    }

    if let Some(ref roaming) = app_data {
        // Mozilla Firefox
        let firefox_dir = roaming.join("Mozilla").join("Firefox").join("Profiles");
        all_reports.extend(scan_firefox_profiles(&firefox_dir, "Mozilla Firefox"));

        // Waterfox
        let waterfox_dir = roaming.join("Waterfox").join("Profiles");
        all_reports.extend(scan_firefox_profiles(&waterfox_dir, "Waterfox"));

        // Floorp
        let floorp_dir = roaming.join("Floorp").join("Profiles");
        all_reports.extend(scan_firefox_profiles(&floorp_dir, "Floorp"));

        // Zen Browser
        let zen_dir = roaming.join("Zen").join("Profiles");
        all_reports.extend(scan_firefox_profiles(&zen_dir, "Zen Browser"));

        // Opera
        let opera_dir = roaming.join("Opera Software").join("Opera Stable");
        all_reports.extend(scan_chromium_browser(&opera_dir, "Opera"));

        // Opera GX
        let operagx_dir = roaming.join("Opera Software").join("Opera GX Stable");
        all_reports.extend(scan_chromium_browser(&operagx_dir, "Opera GX"));
    }

    all_reports
}
