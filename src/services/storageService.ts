/**
 * storageService.ts — Unified storage API for sessions and collections.
 * Replaces the legacy getsetSessions.js.
 *
 * All public functions hydrate data before returning to callers.
 * Internally, storage uses URL hashes (urlRegistry) instead of raw {url,title}.
 */

import {
  upsertUrl,
  decrementFreqs,
  gcRegistry,
  hydrateHash,
  touchUrl
} from './urlRegistry'
import { hashUrl } from './urlRegistry'
import { runMigrationIfNeeded } from './migrationService'
import type {
  UrlRegistry,
  Session,
  Collection,
  TabList,
  HydratedSession,
  HydratedCollection,
  HydratedList,
  HydratedTab
} from './storageTypes'
import {
  URL_REGISTRY_KEY,
  SESSIONS_KEY,
  COLLECTIONS_KEY,
  BOOKMARK_ROOT_FOLDER_DEFAULT
} from './storageTypes'

const browserApi =
  typeof chrome !== 'undefined'
    ? chrome
    : (globalThis as any).browser

// ── Storage helpers ──────────────────────────────────────────────────────────

async function getStorage(
  keys: string[]
): Promise<Record<string, any>> {
  return new Promise((resolve) =>
    browserApi.storage.local.get(keys, (r: any) => resolve(r))
  )
}

async function setStorage(data: Record<string, any>): Promise<void> {
  return new Promise((resolve) =>
    browserApi.storage.local.set(data, () => resolve())
  )
}

function uuid(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`
}

// ── Core read ────────────────────────────────────────────────────────────────

async function readStore(): Promise<{
  registry: UrlRegistry
  sessions: Session[]
  collections: Collection[]
}> {
  await runMigrationIfNeeded()
  const stored = await getStorage([
    URL_REGISTRY_KEY,
    SESSIONS_KEY,
    COLLECTIONS_KEY
  ])
  return {
    registry: stored[URL_REGISTRY_KEY] || {},
    sessions: stored[SESSIONS_KEY] || [],
    collections: stored[COLLECTIONS_KEY] || []
  }
}

// ── Hydration helpers ────────────────────────────────────────────────────────

function hydrateHashes(
  registry: UrlRegistry,
  hashes: string[]
): HydratedTab[] {
  return hashes.map((hash) => {
    const entry = hydrateHash(registry, hash)
    return {
      url: entry.url,
      title: entry.title,
      hash,
      freq: entry.freq,
      lastAccessed: entry.lastAccessed
    }
  })
}

function hydrateSession(
  session: Session,
  registry: UrlRegistry
): HydratedSession {
  const windows: Record<string, HydratedTab[]> = {}
  for (const [winId, hashes] of Object.entries(session.windows)) {
    windows[winId] = hydrateHashes(registry, hashes)
  }
  return { ...session, windows }
}

function hydrateCollection(
  collection: Collection,
  registry: UrlRegistry
): HydratedCollection {
  const lists: HydratedList[] = collection.lists.map((list) => ({
    ...list,
    tabs: hydrateHashes(registry, list.urlHashes)
  }))
  return { ...collection, lists }
}

// ── Sessions API ─────────────────────────────────────────────────────────────

/**
 * Get all sessions, hydrated with full {url, title} data.
 */
export async function getSessions(): Promise<HydratedSession[]> {
  const { registry, sessions } = await readStore()
  return sessions
    .map((s) => hydrateSession(s, registry))
    .sort((a, b) => b.created - a.created)
}

/**
 * Save all currently open browser windows as a new session.
 */
export async function saveCurrentSession(name?: string): Promise<HydratedSession> {
  if (!browserApi?.windows) throw new Error('browser.windows API not available')

  return new Promise((resolve, reject) => {
    browserApi.windows.getAll({ populate: true }, async (windows: any[]) => {
      try {
        const { registry, sessions } = await readStore()
        let reg = { ...registry }
        const windowMap: Record<string, string[]> = {}
        const seenUrls = new Set<string>()

        for (const win of windows) {
          const hashes: string[] = []
          for (const tab of win.tabs || []) {
            if (!tab.url || seenUrls.has(tab.url)) continue
            seenUrls.add(tab.url)
            const result = upsertUrl(reg, tab.url, tab.title || tab.url)
            reg = result.registry
            hashes.push(result.hash)
          }
          if (hashes.length > 0) {
            windowMap[String(win.id)] = hashes
          }
        }

        const now = Date.now()
        const newSession: Session = {
          id: uuid(),
          created: now,
          modified: now,
          name: name || `Session ${new Date(now).toLocaleString()}`,
          windows: windowMap
        }

        await setStorage({
          [URL_REGISTRY_KEY]: reg,
          [SESSIONS_KEY]: [...sessions, newSession]
        })

        resolve(hydrateSession(newSession, reg))
      } catch (err) {
        reject(err)
      }
    })
  })
}

/**
 * Save an array of tabs (with optional windowId) as a new session.
 */
export async function saveSession(
  tabs: Array<{ url: string; title?: string; windowId?: number }>,
  name?: string
): Promise<HydratedSession> {
  const { registry, sessions } = await readStore()
  let reg = { ...registry }
  const windowMap: Record<string, string[]> = {}
  const seenUrls = new Set<string>()

  for (const tab of tabs) {
    if (!tab.url || seenUrls.has(tab.url)) continue
    seenUrls.add(tab.url)
    const result = upsertUrl(reg, tab.url, tab.title || tab.url)
    reg = result.registry
    const winId = String(tab.windowId ?? 0)
    if (!windowMap[winId]) windowMap[winId] = []
    windowMap[winId].push(result.hash)
  }

  const now = Date.now()
  const newSession: Session = {
    id: uuid(),
    created: now,
    modified: now,
    name: name || `Session ${new Date(now).toLocaleString()}`,
    windows: windowMap
  }

  await setStorage({
    [URL_REGISTRY_KEY]: reg,
    [SESSIONS_KEY]: [...sessions, newSession]
  })

  return hydrateSession(newSession, reg)
}

export async function deleteSession(sessionId: string): Promise<void> {
  const { registry, sessions } = await readStore()
  const target = sessions.find((s) => s.id === sessionId)
  if (!target) return

  const allHashes = Object.values(target.windows).flat()
  const updatedRegistry = gcRegistry(decrementFreqs(registry, allHashes))
  const updatedSessions = sessions.filter((s) => s.id !== sessionId)

  await setStorage({
    [URL_REGISTRY_KEY]: updatedRegistry,
    [SESSIONS_KEY]: updatedSessions
  })
}

export async function renameSession(
  sessionId: string,
  name: string
): Promise<void> {
  const { sessions } = await readStore()
  const updated = sessions.map((s) =>
    s.id === sessionId ? { ...s, name, modified: Date.now() } : s
  )
  await setStorage({ [SESSIONS_KEY]: updated })
}

export async function removeTabFromSession(
  sessionId: string,
  windowId: string,
  url: string
): Promise<void> {
  const { registry, sessions } = await readStore()
  const hash = hashUrl(url)

  const updated = sessions.map((s) => {
    if (s.id !== sessionId) return s
    const windows = { ...s.windows }
    if (windows[windowId]) {
      windows[windowId] = windows[windowId].filter((h) => h !== hash)
    }
    return { ...s, windows, modified: Date.now() }
  })

  const updatedRegistry = gcRegistry(decrementFreqs(registry, [hash]))
  await setStorage({
    [URL_REGISTRY_KEY]: updatedRegistry,
    [SESSIONS_KEY]: updated
  })
}

export async function exportSessions(): Promise<object> {
  const { registry, sessions } = await readStore()
  return { sessions, urlRegistry: registry, exportedAt: Date.now(), version: 2 }
}

export async function importSessions(
  data: any,
  merge = true
): Promise<HydratedSession[]> {
  const { registry, sessions } = await readStore()
  const importedSessions: Session[] = data.sessions || []
  const importedRegistry: UrlRegistry = data.urlRegistry || {}

  // Merge imported registry — imported entries never override existing
  const mergedRegistry: UrlRegistry = { ...importedRegistry, ...registry }

  const finalSessions = merge
    ? [
        ...sessions,
        ...importedSessions.map((s) => ({ ...s, id: uuid() }))
      ]
    : importedSessions.map((s) => ({ ...s, id: uuid() }))

  await setStorage({
    [URL_REGISTRY_KEY]: mergedRegistry,
    [SESSIONS_KEY]: finalSessions
  })

  return finalSessions.map((s) => hydrateSession(s, mergedRegistry)).sort((a, b) => b.created - a.created)
}

/**
 * Mark a URL as accessed (updates lastAccessed in registry).
 */
export async function markUrlAccessed(url: string): Promise<void> {
  const stored = await getStorage([URL_REGISTRY_KEY])
  const registry: UrlRegistry = stored[URL_REGISTRY_KEY] || {}
  const hash = hashUrl(url)
  if (registry[hash]) {
    await setStorage({ [URL_REGISTRY_KEY]: touchUrl(registry, hash) })
  }
}

// ── Collections API ──────────────────────────────────────────────────────────

/**
 * Get all extension-stored collections, hydrated.
 */
export async function getCollections(): Promise<HydratedCollection[]> {
  const { registry, collections } = await readStore()
  return collections
    .filter((c) => c.storageType === 'extension')
    .map((c) => hydrateCollection(c, registry))
    .sort((a, b) => {
      // Pinned lists bubble to the top; otherwise sort by modified desc
      return b.modified - a.modified
    })
}

/**
 * Save tabs into a collection/list.
 * Creates new collection and/or list if needed.
 * Returns the updated HydratedCollection.
 */
export async function saveToCollection(
  tabs: Array<{ url: string; title?: string; windowId?: number }>,
  options: {
    listName?: string
    collectionId?: string
    newCollectionName?: string
    appendToListId?: string
  } = {}
): Promise<HydratedCollection> {
  const { registry, collections } = await readStore()
  let reg = { ...registry }
  let cols = [...collections]

  // Resolve or create collection
  let collectionIndex = cols.findIndex(
    (c) => c.id === options.collectionId && c.storageType === 'extension'
  )
  if (collectionIndex === -1) {
    const now = Date.now()
    const newCol: Collection = {
      id: uuid(),
      name: options.newCollectionName?.trim() || 'My Collection',
      created: now,
      modified: now,
      storageType: 'extension',
      lists: []
    }
    cols.push(newCol)
    collectionIndex = cols.length - 1
  }

  const collection = { ...cols[collectionIndex] }
  const now = Date.now()

  // Build existing URL set for dedup
  const existingUrls = new Set<string>()
  for (const list of collection.lists) {
    for (const hash of list.urlHashes) {
      const entry = hydrateHash(reg, hash)
      existingUrls.add(entry.url)
    }
  }

  // Resolve or create list
  let listIndex = options.appendToListId
    ? collection.lists.findIndex((l) => l.id === options.appendToListId)
    : -1

  if (listIndex === -1) {
    const autoName = `List — ${new Date(now).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${new Date(now).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
    const newList: TabList = {
      id: uuid(),
      name: options.listName?.trim() || autoName,
      created: now,
      modified: now,
      urlHashes: []
    }
    collection.lists = [...collection.lists, newList]
    listIndex = collection.lists.length - 1
  }

  const targetList = { ...collection.lists[listIndex] }
  const seenInSave = new Set<string>()

  for (const tab of tabs) {
    if (!tab.url) continue
    if (seenInSave.has(tab.url)) continue
    if (existingUrls.has(tab.url) && listIndex !== collection.lists.findIndex((l) => l.id === targetList.id)) continue
    seenInSave.add(tab.url)
    const result = upsertUrl(reg, tab.url, tab.title || tab.url)
    reg = result.registry
    if (!targetList.urlHashes.includes(result.hash)) {
      targetList.urlHashes = [...targetList.urlHashes, result.hash]
    }
  }

  targetList.modified = now
  const updatedLists = [...collection.lists]
  updatedLists[listIndex] = targetList
  collection.lists = updatedLists
  collection.modified = now

  cols[collectionIndex] = collection

  await setStorage({
    [URL_REGISTRY_KEY]: reg,
    [COLLECTIONS_KEY]: cols
  })

  return hydrateCollection(collection, reg)
}

export async function deleteCollection(collectionId: string): Promise<void> {
  const { registry, collections } = await readStore()
  const target = collections.find((c) => c.id === collectionId)
  if (!target) return

  const allHashes = target.lists.flatMap((l) => l.urlHashes)
  const updatedRegistry = gcRegistry(decrementFreqs(registry, allHashes))
  const updated = collections.filter((c) => c.id !== collectionId)

  await setStorage({
    [URL_REGISTRY_KEY]: updatedRegistry,
    [COLLECTIONS_KEY]: updated
  })
}

export async function deleteList(
  collectionId: string,
  listId: string
): Promise<void> {
  const { registry, collections } = await readStore()
  const colIdx = collections.findIndex((c) => c.id === collectionId)
  if (colIdx === -1) return

  const col = { ...collections[colIdx] }
  const targetList = col.lists.find((l) => l.id === listId)
  if (!targetList) return

  const updatedRegistry = gcRegistry(
    decrementFreqs(registry, targetList.urlHashes)
  )
  col.lists = col.lists.filter((l) => l.id !== listId)
  col.modified = Date.now()

  const updatedCols = [...collections]
  updatedCols[colIdx] = col

  await setStorage({
    [URL_REGISTRY_KEY]: updatedRegistry,
    [COLLECTIONS_KEY]: updatedCols
  })
}

export async function renameCollection(
  collectionId: string,
  name: string
): Promise<void> {
  const { collections } = await readStore()
  const updated = collections.map((c) =>
    c.id === collectionId ? { ...c, name, modified: Date.now() } : c
  )
  await setStorage({ [COLLECTIONS_KEY]: updated })
}

export async function renameList(
  collectionId: string,
  listId: string,
  name: string
): Promise<void> {
  const { collections } = await readStore()
  const updated = collections.map((c) => {
    if (c.id !== collectionId) return c
    return {
      ...c,
      modified: Date.now(),
      lists: c.lists.map((l) =>
        l.id === listId ? { ...l, name, modified: Date.now() } : l
      )
    }
  })
  await setStorage({ [COLLECTIONS_KEY]: updated })
}

// ── Bookmark Collections ─────────────────────────────────────────────────────

/**
 * Save tabs as browser bookmarks under a fixed root folder.
 * Path: {rootFolder} → {collectionName} → {listName} → bookmarks
 */
export async function saveToBookmarks(
  tabs: Array<{ url: string; title?: string }>,
  options: {
    listName?: string
    collectionName?: string
    rootFolder?: string
  } = {}
): Promise<void> {
  if (!browserApi?.bookmarks) throw new Error('Bookmarks API not available')

  const root = options.rootFolder?.trim() || BOOKMARK_ROOT_FOLDER_DEFAULT
  const collectionName = options.collectionName?.trim() || 'My Collection'
  const now = Date.now()
  const listName =
    options.listName?.trim() ||
    `List — ${new Date(now).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })} ${new Date(now).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`

  const findOrCreate = (parentId: string, title: string): Promise<chrome.bookmarks.BookmarkTreeNode> =>
    new Promise((resolve, reject) => {
      browserApi.bookmarks.getChildren(parentId, (children: any[]) => {
        if (browserApi.runtime.lastError) {
          browserApi.bookmarks.create({ parentId, title }, (node: any) => {
            if (browserApi.runtime.lastError) return reject(browserApi.runtime.lastError)
            resolve(node)
          })
          return
        }
        const existing = (children || []).find((c: any) => !c.url && c.title === title)
        if (existing) {
          resolve(existing)
        } else {
          browserApi.bookmarks.create({ parentId, title }, (node: any) => {
            if (browserApi.runtime.lastError) return reject(browserApi.runtime.lastError)
            resolve(node)
          })
        }
      })
    })

  // Always anchor under Bookmarks Bar (id='1')
  const rootNode = await findOrCreate('1', root)
  const colNode = await findOrCreate(rootNode.id, collectionName)
  const listNode = await findOrCreate(colNode.id, listName)

  // Batch create bookmarks in chunks of 15
  const seen = new Set<string>()
  const valid = tabs.filter((t) => {
    if (!t.url || seen.has(t.url)) return false
    seen.add(t.url)
    return true
  })

  const chunkSize = 15
  for (let i = 0; i < valid.length; i += chunkSize) {
    await Promise.all(
      valid.slice(i, i + chunkSize).map(
        (t) =>
          new Promise<void>((res) =>
            browserApi.bookmarks.create(
              { parentId: listNode.id, title: t.title?.trim() || t.url, url: t.url },
              () => res()
            )
          )
      )
    )
  }
}

/**
 * Read all collections saved as bookmarks under the fixed root folder.
 */
export async function getBookmarkCollections(
  rootFolder = BOOKMARK_ROOT_FOLDER_DEFAULT
): Promise<HydratedCollection[]> {
  if (!browserApi?.bookmarks) return []

  const tree: any[] = await new Promise((resolve) =>
    browserApi.bookmarks.getTree((t: any[]) => resolve(t))
  )
  if (!tree || tree.length === 0) return []

  // Find the root folder under Bookmarks Bar (id=1) or Other Bookmarks (id=2)
  const roots = tree[0]?.children || []
  const rootNode = roots
    .flatMap((r: any) => r.children || [])
    .find((n: any) => !n.url && n.title === rootFolder) ??
    roots.find((n: any) => !n.url && n.title === rootFolder)

  if (!rootNode) return []

  const result: HydratedCollection[] = []

  for (const colNode of (rootNode.children || []).filter((n: any) => !n.url)) {
    const lists: HydratedList[] = []

    for (const listNode of (colNode.children || []).filter((n: any) => !n.url)) {
      const tabs: HydratedTab[] = (listNode.children || [])
        .filter((n: any) => !!n.url)
        .map((n: any) => ({
          url: n.url,
          title: n.title || n.url,
          hash: hashUrl(n.url),
          freq: 1,
          lastAccessed: undefined
        }))

      if (tabs.length > 0) {
        lists.push({
          id: listNode.id,
          name: listNode.title || 'Unnamed List',
          created: listNode.dateAdded || Date.now(),
          modified: listNode.dateGroupModified || listNode.dateAdded || Date.now(),
          tabs,
          urlHashes: tabs.map((t) => t.hash)
        })
      }
    }

    // Direct bookmarks under collection (no subfolder) → group into 'General'
    const directTabs: HydratedTab[] = (colNode.children || [])
      .filter((n: any) => !!n.url)
      .map((n: any) => ({
        url: n.url,
        title: n.title || n.url,
        hash: hashUrl(n.url),
        freq: 1,
        lastAccessed: undefined
      }))

    if (directTabs.length > 0) {
      lists.unshift({
        id: `${colNode.id}_direct`,
        name: 'General',
        created: colNode.dateAdded || Date.now(),
        modified: colNode.dateGroupModified || colNode.dateAdded || Date.now(),
        tabs: directTabs,
        urlHashes: directTabs.map((t) => t.hash)
      })
    }

    if (lists.length > 0) {
      result.push({
        id: colNode.id,
        name: colNode.title || 'Unnamed Collection',
        created: colNode.dateAdded || Date.now(),
        modified: colNode.dateGroupModified || colNode.dateAdded || Date.now(),
        storageType: 'bookmarks',
        bookmarkFolderId: colNode.id,
        lists
      })
    }
  }

  return result
}

// ── Legacy shim exports (for gradual migration of callers) ───────────────────
// These match the old getsetSessions.js API surface so existing callers
// don't break immediately. Remove after all callers are updated.

/** @deprecated Use getSessions() */
export const getSessions_legacy = getSessions

/** @deprecated Use saveCurrentSession() */
export const saveSessions = saveCurrentSession

/** @deprecated Use deleteSession() */
export async function removeSessions(sessionId: string | number): Promise<HydratedSession[]> {
  await deleteSession(String(sessionId))
  return getSessions()
}

/** @deprecated Use renameSession() */
export async function renameSession_legacy(
  id: string | number,
  name: string
): Promise<HydratedSession[]> {
  await renameSession(String(id), name)
  return getSessions()
}

/** @deprecated Use getCollections() */
export const getLists = getCollections

/** @deprecated Use getBookmarkCollections() */
export const getBookmarkLists = getBookmarkCollections
