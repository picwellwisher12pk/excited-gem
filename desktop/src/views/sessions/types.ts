import type { UnifiedWindow, ConnectedBrowser } from '../../../src/adapter/types'

export interface SavedSession {
  id: string
  name: string
  timestamp: number
  totalWindows: number
  totalTabs: number
  windows: UnifiedWindow[]
  tags?: string[]
}

export interface SessionsViewProps {
  windows: UnifiedWindow[]
  connectedBrowsers?: ConnectedBrowser[]
  onOpenUrl?: (url: string) => void
  onCreateTab?: (browserId: string, windowId?: number, url?: string) => void
}

export const SESSIONS_STORAGE_KEY = 'excited_gem_desktop_sessions'
