/**
 * One-time migration from v1 storage (urlBank + sessions array + libraries object)
 * to v2 storage (urlRegistry + sessions_v2 + collections_v2).
 *
 * Safe: reads old keys, writes new keys, only removes old keys after success.
 */

import { hashUrl } from './urlRegistry'
import type {
  UrlRegistry,
  Session,
  Collection,
  TabList
} from './storageTypes'
import {
  STORAGE_VERSION,
  STORAGE_VERSION_KEY,
  URL_REGISTRY_KEY,
  SESSIONS_KEY,
  COLLECTIONS_KEY
} from './storageTypes'

const browserApi =
  typeof chrome !== 'undefined'
    ? chrome
    : (globalThis as any).browser

function getStorage(keys: string[]): Promise<Record<string, any>> {
  return new Promise((resolve) =>
    browserApi.storage.local.get(keys, (r: any) => resolve(r))
  )
}

function setStorage(data: Record<string, any>): Promise<void> {
  return new Promise((resolve) =>
    browserApi.storage.local.set(data, () => resolve())
  )
}

function removeStorage(keys: string[]): Promise<void> {
  return new Promise((resolve) =>
    browserApi.storage.local.remove(keys, () => resolve())
  )
}

function uuid(): string {
  // Use crypto.randomUUID if available (MV3 background), fallback to timestamp+random
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

export async function runMigrationIfNeeded(): Promise<void> {
  const stored = await getStorage([STORAGE_VERSION_KEY])
  if (stored[STORAGE_VERSION_KEY] >= STORAGE_VERSION) {
    return // Already up to date
  }

  console.log('[Excited Gem] Running storage migration v1 → v2...')

  const legacy = await getStorage([
    'urlBank',
    'sessions',
    'libraries',
    'sessions_migrated'
  ])

  const urlBank: Array<{ url: string; title: string }> =
    legacy.urlBank || []
  const oldSessions: any[] = legacy.sessions || []
  const oldLibraries: Record<string, any> = legacy.libraries || {}

  // Build new urlRegistry
  const urlRegistry: UrlRegistry = {}
  const bankIndexToHash: Map<number, string> = new Map()

  for (let i = 0; i < urlBank.length; i++) {
    const entry = urlBank[i]
    if (!entry?.url) continue
    const hash = hashUrl(entry.url)
    bankIndexToHash.set(i, hash)
    // freq will be computed by counting references below
    if (!urlRegistry[hash]) {
      urlRegistry[hash] = {
        url: entry.url,
        title: entry.title || entry.url,
        titleUpdatedAt: Date.now(),
        firstSeen: Date.now(),
        freq: 0
      }
    }
  }

  // Migrate sessions
  const newSessions: Session[] = []
  for (const old of oldSessions) {
    const windows: Record<string, string[]> = {}
    if (old.windows) {
      for (const [winId, tabRefs] of Object.entries(old.windows)) {
        const hashes: string[] = []
        const seen = new Set<string>()
        for (const ref of tabRefs as any[]) {
          // ref may be an index (number) or {url,title} object
          let hash: string | undefined
          if (typeof ref === 'number') {
            hash = bankIndexToHash.get(ref)
          } else if (ref?.url) {
            hash = hashUrl(ref.url)
            if (!urlRegistry[hash]) {
              urlRegistry[hash] = {
                url: ref.url,
                title: ref.title || ref.url,
                titleUpdatedAt: Date.now(),
                firstSeen: Date.now(),
                freq: 0
              }
            }
          }
          if (hash && !seen.has(hash)) {
            seen.add(hash)
            hashes.push(hash)
            urlRegistry[hash].freq++
          }
        }
        if (hashes.length > 0) windows[winId] = hashes
      }
    }
    newSessions.push({
      id: uuid(),
      created: old.created || Date.now(),
      modified: old.modified || old.created || Date.now(),
      name: old.name || `Session ${new Date(old.created || Date.now()).toLocaleString()}`,
      windows
    })
  }

  // Migrate libraries → collections
  const newCollections: Collection[] = []
  for (const [, lib] of Object.entries(oldLibraries)) {
    const lists: TabList[] = []
    const libLists: Record<string, any> = lib.lists || {}

    for (const [, lst] of Object.entries(libLists)) {
      const urlHashes: string[] = []
      const seen = new Set<string>()
      const tabRefs: any[] = lst.tabs || []

      for (const ref of tabRefs) {
        let hash: string | undefined
        if (typeof ref === 'number') {
          hash = bankIndexToHash.get(ref)
        } else if (ref?.url) {
          hash = hashUrl(ref.url)
          if (!urlRegistry[hash]) {
            urlRegistry[hash] = {
              url: ref.url,
              title: ref.title || ref.url,
              titleUpdatedAt: Date.now(),
              firstSeen: Date.now(),
              freq: 0
            }
          }
        }
        if (hash && !seen.has(hash)) {
          seen.add(hash)
          urlHashes.push(hash)
          urlRegistry[hash].freq++
        }
      }

      lists.push({
        id: lst.id || uuid(),
        name: lst.name || 'Unnamed List',
        created: lst.created || Date.now(),
        modified: lst.created || Date.now(),
        urlHashes
      })
    }

    newCollections.push({
      id: lib.id || uuid(),
      name: lib.name || 'My Collection',
      created: lib.created || Date.now(),
      modified: lib.created || Date.now(),
      storageType:
        lib.storageType === 'bookmarks' ? 'bookmarks' : 'extension',
      bookmarkFolderId: lib.bookmarkRootId,
      lists
    })
  }

  // Persist new format
  await setStorage({
    [URL_REGISTRY_KEY]: urlRegistry,
    [SESSIONS_KEY]: newSessions,
    [COLLECTIONS_KEY]: newCollections,
    [STORAGE_VERSION_KEY]: STORAGE_VERSION
  })

  // Clean up legacy keys
  await removeStorage([
    'urlBank',
    'sessions',
    'libraries',
    'sessions_migrated',
    'bookmarkLibraryIds'
  ])

  console.log(
    `[Excited Gem] Migration complete. ${newSessions.length} sessions, ${newCollections.length} collections migrated.`
  )
}
