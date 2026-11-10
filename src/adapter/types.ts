export type BrowserEngine = 'chrome' | 'edge' | 'firefox' | 'brave' | 'arc' | 'opera' | 'safari' | 'other'

export interface ConnectedBrowser {
  id: string
  name: string
  engine: BrowserEngine
  version?: string
  icon?: string
  isConnected: boolean
  windowCount: number
  tabCount: number
  memoryUsageMb?: number
  lastSeen?: number
}

export interface UnifiedTab {
  id: number
  browserId: string
  windowId: number
  index: number
  title: string
  url: string
  favIconUrl?: string
  active: boolean
  pinned: boolean
  audible: boolean
  discarded: boolean
  status?: string
  groupId?: number
  incognito: boolean
  containerId?: string // Firefox Multi-Account Container
  youtubeInfo?: {
    title?: string
    duration?: number
    currentTime?: number
    paused?: boolean
    percentage?: number
  }
}

export interface UnifiedWindow {
  id: number
  browserId: string
  focused: boolean
  incognito: boolean
  type?: string
  tabs: UnifiedTab[]
}

export interface IBrowserAdapter {
  getConnectedBrowsers(): Promise<ConnectedBrowser[]>
  getAllWindows(browserId?: string): Promise<UnifiedWindow[]>
  getTabs(browserId?: string, windowId?: number | string): Promise<UnifiedTab[]>
  focusTab(browserId: string, windowId: number, tabId: number): Promise<void>
  focusWindow(browserId: string, windowId: number): Promise<void>
  closeTab(browserId: string, tabId: number): Promise<void>
  closeWindow(browserId: string, windowId: number): Promise<void>
  createTab(browserId: string, windowId?: number, url?: string): Promise<UnifiedTab | null>
  moveTab?(browserId: string, tabId: number, targetWindowId: number, targetIndex?: number): Promise<void>
  moveTabs?(browserId: string, tabIds: number[], targetWindowId: number, targetIndex?: number): Promise<void>
  discardTab(browserId: string, tabId: number): Promise<void>
  migrateTab(sourceBrowserId: string, targetBrowserId: string, tabId: number, url: string, targetWindowId?: number): Promise<void>
  sortWindowTabs?(browserId: string, windowId: number, sortBy: string, direction?: 'asc' | 'desc'): Promise<void>
  onTabsChanged(listener: (browserId: string) => void): () => void
  onBrowsersChanged(listener: (browsers: ConnectedBrowser[]) => void): () => void
}

export function normalizeBrowserEngine(raw?: string): BrowserEngine {
  if (!raw) return 'other'
  const s = raw.toLowerCase().trim()
  if (s.includes('opera') || s.includes('opr')) return 'opera'
  if (s.includes('brave')) return 'brave'
  if (s.includes('edge') || s.includes('edg') || s.includes('msedge')) return 'edge'
  if (s.includes('firefox')) return 'firefox'
  if (s.includes('safari')) return 'safari'
  if (s.includes('chrome') || s.includes('chromium')) return 'chrome'
  if (s.includes('arc')) return 'arc'
  return 'other'
}

export function isSameBrowserEngine(b1?: string, b2?: string): boolean {
  if (!b1 || !b2) return false
  const e1 = normalizeBrowserEngine(b1)
  const e2 = normalizeBrowserEngine(b2)
  if (e1 !== 'other' && e2 !== 'other') {
    return e1 === e2
  }
  const s1 = b1.toLowerCase().replace(/-main$/, '').trim()
  const s2 = b2.toLowerCase().replace(/-main$/, '').trim()
  return s1 === s2 || s1.includes(s2) || s2.includes(s1)
}
