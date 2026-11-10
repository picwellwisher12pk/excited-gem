import { invoke } from '@tauri-apps/api/core'

/**
 * Launch an external browser with a single URL using native OS commands
 */
export async function launchBrowserUrl(engine: string, url: string): Promise<void> {
  try {
    await invoke('launch_browser_url', { engine, url })
  } catch (err) {
    console.warn('Failed to launch browser URL via Tauri native command, falling back to window.open:', err)
    window.open(url, '_blank')
  }
}

/**
 * Launch an external browser window with multiple URLs restored
 */
export async function launchBrowserWindow(engine: string, urls: string[]): Promise<void> {
  try {
    await invoke('launch_browser_window', { engine, urls })
  } catch (err) {
    console.error('Failed to launch browser window via Tauri native command:', err)
  }
}
