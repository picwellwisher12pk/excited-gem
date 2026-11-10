// Prevents console window and ConPTY pipe disconnection errors on Windows
#![windows_subsystem = "windows"]

fn main() {
  std::panic::set_hook(Box::new(|info| {
    let msg = format!("PANIC: {}\n", info);
    if let Ok(local_app_data) = std::env::var("LOCALAPPDATA") {
      let path = std::path::Path::new(&local_app_data)
        .join("com.excitedgem.desktop")
        .join("crash.log");
      let _ = std::fs::write(path, msg);
    }
  }));

  app_lib::run();
}
