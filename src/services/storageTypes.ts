/**
 * Unified storage type definitions for Excited Gem v2.
 * All sessions and lists share a single URL registry keyed by FNV-1a hash.
 */

// ── URL Registry ─────────────────────────────────────────────────────────────

export interface UrlEntry {
  url: string
  title: string
  titleUpdatedAt: number
  firstSeen: number
  freq: number // times this URL appears across any list/session
  lastAccessed?: number // when user last clicked "Open" on this URL
}

/** Map of FNV-1a hash → UrlEntry. Storage key: "urlRegistry" */
export type UrlRegistry = Record<string, UrlEntry>

// ── Sessions ─────────────────────────────────────────────────────────────────

export interface Session {
  id: string // UUID, never timestamp
  created: number
  modified: number
  name: string
  /** windowId → array of urlHashes */
  windows: Record<string, string[]>
}

// ── Collections (formerly Libraries) ─────────────────────────────────────────

export interface TabList {
  id: string
  name: string
  created: number
  modified: number
  urlHashes: string[]
  pinned?: boolean
  tags?: string[]
}

export interface Collection {
  id: string
  name: string
  created: number
  modified: number
  /** 'extension' = chrome.storage.local, 'bookmarks' = native bookmarks */
  storageType: 'extension' | 'bookmarks'
  bookmarkFolderId?: string // only when storageType='bookmarks'
  lists: TabList[]
}

// ── Hydrated (read-time) types ────────────────────────────────────────────────

export interface HydratedTab {
  url: string
  title: string
  hash: string
  freq: number
  lastAccessed?: number
}

export interface HydratedList {
  id: string
  name: string
  created: number
  modified: number
  tabs: HydratedTab[]
  pinned?: boolean
  tags?: string[]
}

export interface HydratedCollection {
  id: string
  name: string
  created: number
  modified: number
  storageType: 'extension' | 'bookmarks'
  bookmarkFolderId?: string
  lists: HydratedList[]
}

export interface HydratedSession {
  id: string
  created: number
  modified: number
  name: string
  /** windowId → array of HydratedTab */
  windows: Record<string, HydratedTab[]>
}

// ── Storage schema version ────────────────────────────────────────────────────
export const STORAGE_VERSION = 2
export const STORAGE_VERSION_KEY = 'storage_version'
export const URL_REGISTRY_KEY = 'urlRegistry'
export const SESSIONS_KEY = 'sessions_v2'
export const COLLECTIONS_KEY = 'collections_v2'
export const BOOKMARK_ROOT_FOLDER_DEFAULT = 'Excited Gem'
