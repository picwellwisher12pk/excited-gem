import { invoke } from '@tauri-apps/api/core'
import type { BrowserScanReport } from '../views/bookmarks/types'

/**
 * Invokes the native Tauri command to scan all installed browser bookmarks from disk
 * (Chrome, Edge, Firefox, Brave, Opera, Vivaldi, Arc, etc.) even when browsers are closed.
 */
export async function fetchInstalledBrowserBookmarks(): Promise<BrowserScanReport[]> {
  try {
    const reports = await invoke<BrowserScanReport[]>('get_installed_browser_bookmarks')
    return reports || []
  } catch (err) {
    console.warn('Could not scan browser bookmarks via Tauri command (running in browser mode?):', err)
    return []
  }
}
