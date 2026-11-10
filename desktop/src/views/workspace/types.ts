import type { UnifiedWindow, ConnectedBrowser, } from '../../../src/adapter/types'

export type WorkspaceLayoutMode = 'grid' | 'list' | 'columns'

export type GridDensity = 'comfortable' | 'compact'
export type GridColumns = 'auto' | '2' | '3' | '4' | '5'

export interface SelectedTabIdentifier {
  browserId: string
  tabId: number
  windowId: number
  title: string
  url: string
}

export interface DesktopSearchFilters {
  query: string
  audibleOnly: boolean
  pinnedOnly: boolean
  suspendedOnly: boolean
  isRegex: boolean
  searchInTitle: boolean
  searchInUrl: boolean
}

export interface WorkspaceViewProps {
  windows: UnifiedWindow[]
  browsers: ConnectedBrowser[]
  selectedBrowserId: string
  searchQuery: string
  onFocusTab: (browserId: string, windowId: number, tabId: number) => void
  onFocusWindow: (browserId: string, windowId: number) => void
  onCloseTab: (browserId: string, tabId: number) => void
  onCloseWindow: (browserId: string, windowId: number) => void
  onCreateTab: (browserId: string, windowId?: number, url?: string) => void
  onDiscardTab: (browserId: string, tabId: number) => void
  onMigrateTab?: (sourceBrowserId: string, targetBrowserId: string, tabId: number, url: string, targetWindowId?: number) => void | Promise<void>
  onMoveTabs?: (browserId: string, tabIds: number[], targetWindowId: number, targetIndex?: number) => Promise<void>
  onSortWindowTabs?: (browserId: string, windowId: number, sortBy: string, direction?: 'asc' | 'desc') => Promise<void>
  onRefresh?: () => void
  onOpenCommandPalette?: () => void
}

// Get a deterministic color from a domain string for fallback avatars
export function domainColor(domain: string): string {
  const colors = [
    '#e74c3c', '#3498db', '#2ecc71', '#f39c12',
    '#9b59b6', '#1abc9c', '#e67e22', '#2980b9',
    '#27ae60', '#d35400', '#8e44ad', '#16a085'
  ]
  let hash = 0
  for (let i = 0; i < domain.length; i++) {
    hash = domain.charCodeAt(i) + ((hash << 5) - hash)
  }
  return colors[Math.abs(hash) % colors.length]
}

// Get browser branding details
export function getBrowserBadge(browserId: string) {
  const b = (browserId || '').toLowerCase()
  if (b.includes('opera') || b.includes('opr')) {
    return { name: 'Opera', color: '#ff1b2d' }
  }
  if (b.includes('brave')) {
    return { name: 'Brave', color: '#fb542b' }
  }
  if (b.includes('chrome')) {
    return { name: 'Google Chrome', color: 'var(--browser-chrome)' }
  }
  if (b.includes('edge')) {
    return { name: 'Microsoft Edge', color: 'var(--browser-edge)' }
  }
  if (b.includes('firefox')) {
    return { name: 'Mozilla Firefox', color: 'var(--browser-firefox)' }
  }
  if (b.includes('safari')) {
    return { name: 'Safari', color: '#006cff' }
  }
  return { name: 'Browser', color: 'var(--text-tertiary)' }
}
