import type { UnifiedWindow, ConnectedBrowser } from '../../../src/adapter/types'

const CACHE_KEY = 'excited_gem_offline_browser_cache'

export interface CachedBrowserRecord {
  browserId: string
  browserName: string
  engine: string
  lastSeen: number
  windows: UnifiedWindow[]
}

export function saveBrowsersToCache(browsers: ConnectedBrowser[], windows: UnifiedWindow[]): void {
  try {
    const existingStr = localStorage.getItem(CACHE_KEY)
    const existingCache: Record<string, CachedBrowserRecord> = existingStr
      ? JSON.parse(existingStr)
      : {}

    // Only update cache for currently connected browsers that have windows
    for (const b of browsers) {
      if (b.isConnected) {
        const bWindows = windows.filter((w) => w.browserId === b.id)
        if (bWindows.length > 0) {
          existingCache[b.id] = {
            browserId: b.id,
            browserName: b.name,
            engine: b.engine,
            lastSeen: Date.now(),
            windows: bWindows
          }
        }
      }
    }

    localStorage.setItem(CACHE_KEY, JSON.stringify(existingCache))
  } catch (err) {
    console.error('Failed to save browser cache to localStorage:', err)
  }
}

export function getOfflineBrowserWindows(
  connectedBrowserIds: Set<string>
): UnifiedWindow[] {
  try {
    const existingStr = localStorage.getItem(CACHE_KEY)
    if (!existingStr) return []

    const cache: Record<string, CachedBrowserRecord> = JSON.parse(existingStr)
    const offlineWindows: UnifiedWindow[] = []

    for (const [id, record] of Object.entries(cache)) {
      // If browser is currently NOT connected, return its cached windows
      if (!connectedBrowserIds.has(id) && record.windows) {
        const markedWindows = record.windows.map((win) => ({
          ...win,
          isOffline: true,
          offlineLastSeen: record.lastSeen,
          offlineBrowserName: record.browserName
        }))
        offlineWindows.push(...(markedWindows as unknown as UnifiedWindow[]))
      }
    }

    return offlineWindows
  } catch (err) {
    console.error('Failed to load offline browser windows:', err)
    return []
  }
}

export function clearBrowserCache(): void {
  try {
    localStorage.removeItem(CACHE_KEY)
  } catch (err) {
    console.error('Failed to clear browser cache:', err)
  }
}
