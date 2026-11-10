import type { UnifiedWindow } from '../../../src/adapter/types'

export interface BookmarkItem {
  id: string
  title: string
  url: string
  folder: string
  createdAt: number
  favicon?: string
  browser?: string
  profile?: string
  source?: 'app' | 'browser'
}

export interface DiscoveredBookmark {
  id: string
  title: string
  url: string
  folder: string
  browser: string
  profile: string
  date_added?: number | null
}

export interface BrowserScanReport {
  browser: string
  profile: string
  count: number
  bookmarks: DiscoveredBookmark[]
}

export interface BookmarksViewProps {
  onOpenUrl: (url: string) => void
  windows?: UnifiedWindow[]
}

export const STORAGE_KEY = 'excited_gem_bookmarks_v1'

export const DEFAULT_FOLDERS = ['All', 'Favorites', 'Work', 'Research', 'Tools']
