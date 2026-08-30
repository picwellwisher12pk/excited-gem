const browser =
  typeof window !== 'undefined'
    ? window.browser || window.chrome
    : typeof globalThis !== 'undefined'
      ? globalThis.browser || globalThis.chrome
      : typeof chrome !== 'undefined'
        ? chrome
        : null

// Helper to get storage
async function getStorage(keys) {
  return new Promise((resolve) => {
    browser.storage.local.get(keys, (result) => resolve(result))
  })
}

// Helper to set storage
async function setStorage(data) {
  return new Promise((resolve) => {
    browser.storage.local.set(data, () => resolve())
  })
}

// Migration function
export async function migrateSessions() {
  const storage = await getStorage(['sessions', 'urlBank', 'sessions_migrated'])
  if (storage.sessions_migrated) return

  console.log('Starting session migration...')
  const oldSessions = storage.sessions || []
  const urlBank = storage.urlBank || []
  const newSessions = []

  for (const session of oldSessions) {
    const newWindows = {}
    if (session.windows) {
      // Handle both array (if any) and object windows
      const windowKeys = Object.keys(session.windows)
      windowKeys.forEach((winId) => {
        const tabs = session.windows[winId]
        if (Array.isArray(tabs)) {
          newWindows[winId] = tabs.map((tab) => {
            let index = urlBank.findIndex((u) => u.url === tab.url)
            if (index === -1) {
              urlBank.push({ url: tab.url, title: tab.title })
              index = urlBank.length - 1
            }
            return index
          })
        }
      })
    }
    newSessions.push({ ...session, windows: newWindows })
  }

  await setStorage({
    sessions: newSessions,
    urlBank,
    sessions_migrated: true
  })
  console.log('Sessions migrated successfully!')
}

// Save a session (generic)
// tabs: Array of { url, title, windowId }
export async function saveSession(tabs, name) {
  await migrateSessions() // Ensure migration before saving new data

  const storage = await getStorage(['urlBank', 'sessions'])
  let urlBank = storage.urlBank || []
  let sessions = storage.sessions || []

  const windowMap = {}
  const seenUrls = new Set() // Dedup: never store duplicate URLs in same session

  tabs.forEach((tab) => {
    if (!tab.url || seenUrls.has(tab.url)) return // skip duplicates
    seenUrls.add(tab.url)

    let index = urlBank.findIndex((u) => u.url === tab.url)
    if (index === -1) {
      urlBank.push({ url: tab.url, title: tab.title })
      index = urlBank.length - 1
    }

    // Default to window 0 if no windowId provided
    const winId = tab.windowId !== undefined ? tab.windowId : 0
    if (!windowMap[winId]) windowMap[winId] = []
    windowMap[winId].push(index)
  })

  const newSession = {
    created: Date.now(),
    modified: null,
    name: name || `Session ${new Date().toLocaleString()}`,
    windows: windowMap
  }

  sessions.push(newSession)

  await setStorage({ urlBank, sessions })

  // Notify user
  if (browser.notifications) {
    browser.notifications.create('session-saved', {
      type: 'basic',
      iconUrl: '../images/extension-icon48.png', // Adjust path if needed
      title: 'Session Saved',
      message: `Session "${newSession.name}" has been saved.`
    })
  }

  return newSession
}

// Legacy support: saveTabs (saves selected tabs to a session)
export async function saveTabs(tabs) {
  // tabs might be just {url, title}
  return saveSession(tabs, '')
}

// Legacy support: saveSessions (saves all open windows)
export async function saveSessions() {
  // Get all windows and tabs
  // We need to use browser.windows.getAll
  // This function might need to be called from a context where browser.windows is available (background or popup)

  // If we are in a content script, this won't work. But this file seems to be used in popup/options.

  // We'll assume we can call browser.windows
  if (!browser.windows) {
    console.error('browser.windows API not available')
    return
  }

  return new Promise((resolve) => {
    browser.windows.getAll({ populate: true }, async (windows) => {
      const allTabs = []
      windows.forEach((win) => {
        win.tabs.forEach((tab) => {
          allTabs.push({
            url: tab.url,
            title: tab.title,
            windowId: win.id
          })
        })
      })
      await saveSession(allTabs, '')
      resolve()
    })
  })
}

export async function saveURLs(name, tags, tabs) {
  const storage = await getStorage(['savedURLs'])
  let URLs = {
    name,
    tags,
    tabs: tabs.map((tab) => ({ url: tab.url, title: tab.title })),
    created: +new Date()
  }
  // This seems to be a different feature (Saved URLs vs Sessions), keeping it simple for now or migrating it too?
  // The user asked for "Session feature... reduce size". savedURLs seems separate.
  // I'll keep it as is but using async storage.

  let savedURLs = storage.savedURLs || []
  savedURLs.push(URLs)
  await setStorage({ savedURLs })
}

export async function getSessions() {
  await migrateSessions() // Ensure migration

  const storage = await getStorage(['urlBank', 'sessions'])
  const urlBank = storage.urlBank || []
  const sessions = storage.sessions || []

  return sessions.map((session) => {
    const hydratedWindows = {}
    if (session.windows) {
      Object.keys(session.windows).forEach((winId) => {
        hydratedWindows[winId] = session.windows[winId].map((index) => {
          return urlBank[index] || { url: 'about:blank', title: 'Missing' }
        })
      })
    }
    return { ...session, windows: hydratedWindows }
  })
}

export async function removeSessions(sessionID) {
  const storage = await getStorage(['sessions'])
  let sessions = storage.sessions || []
  const newSessions = sessions.filter(
    (s) => String(s.created) !== String(sessionID)
  )
  await setStorage({ sessions: newSessions })
  return getSessions()
}

export async function renameSession(id, name) {
  const storage = await getStorage(['sessions'])
  let sessions = storage.sessions || []
  const session = sessions.find((s) => String(s.created) === String(id))
  if (session) {
    session.name = name
    await setStorage({ sessions })
  }
  return getSessions()
}

export async function removeTab(tabURL, windowId, sessionId) {
  // This is tricky with deduplication. We remove the index from the session.
  // We don't necessarily remove from urlBank as other sessions might use it.
  // Garbage collection for urlBank could be a separate task.

  const storage = await getStorage(['sessions', 'urlBank'])
  let sessions = storage.sessions || []
  let urlBank = storage.urlBank || []

  const session = sessions.find((s) => String(s.created) === String(sessionId))
  if (session && session.windows && session.windows[windowId]) {
    // We need to find the index that corresponds to tabURL
    // This is inefficient if multiple tabs have same URL.
    // But tabURL is passed as identifier.

    const indices = session.windows[windowId]
    const indexToRemove = indices.findIndex(
      (idx) => urlBank[idx] && urlBank[idx].url === tabURL
    )

    if (indexToRemove !== -1) {
      indices.splice(indexToRemove, 1)
      await setStorage({ sessions })
    }
  }
  return getSessions()
}

export async function exportSessions() {
  const storage = await getStorage(['sessions', 'urlBank'])
  return {
    sessions: storage.sessions || [],
    urlBank: storage.urlBank || [],
    exportedAt: Date.now(),
    version: '1.0'
  }
}

export async function importSessions(data, merge = true) {
  const storage = await getStorage(['sessions', 'urlBank'])

  if (merge) {
    // Merge with existing sessions
    const existingSessions = storage.sessions || []
    const existingUrlBank = storage.urlBank || []

    // Add new URLs to urlBank and update session references
    const urlMap = new Map()
    existingUrlBank.forEach((url, index) => {
      urlMap.set(url.url, index)
    })

    let newUrlBank = [...existingUrlBank]
    const importedSessions = data.sessions.map((session) => {
      const newWindows = {}
      Object.keys(session.windows).forEach((winId) => {
        newWindows[winId] = session.windows[winId]
          .map((oldIndex) => {
            const urlData = data.urlBank[oldIndex]
            if (!urlData) return -1

            if (urlMap.has(urlData.url)) {
              return urlMap.get(urlData.url)
            } else {
              const newIndex = newUrlBank.length
              newUrlBank.push(urlData)
              urlMap.set(urlData.url, newIndex)
              return newIndex
            }
          })
          .filter((idx) => idx !== -1)
      })
      return { ...session, windows: newWindows }
    })

    await setStorage({
      sessions: [...existingSessions, ...importedSessions],
      urlBank: newUrlBank
    })
  } else {
    // Replace all sessions
    await setStorage({
      sessions: data.sessions || [],
      urlBank: data.urlBank || []
    })
  }

  return getSessions()
}

// ─── LIBRARIES & LISTS ──────────────────────────────────────────────────────

/**
 * Save selected tabs as a new List inside a Library (or append to an existing list).
 *
 * @param {Array<{url,title,windowId?}>} tabs
 * @param {string}  listName        - name for the list (empty = auto-generated)
 * @param {string|null} libraryId   - existing library id, or null to create new
 * @param {string}  newLibraryName  - used when libraryId is null
 * @param {string|null} targetListId - optional existing list id to append tabs into
 * @returns {Promise<{library, list}>}
 */
export async function saveList(
  tabs,
  listName,
  libraryId,
  newLibraryName,
  targetListId
) {
  const storage = await getStorage(['urlBank', 'libraries'])
  let urlBank = storage.urlBank || []
  let libraries = storage.libraries || {}

  // Resolve / create library
  let library
  if (libraryId && libraries[libraryId]) {
    library = libraries[libraryId]
  } else {
    const newId = `lib_${Date.now()}`
    library = {
      id: newId,
      name: newLibraryName?.trim() || 'My Library',
      created: Date.now(),
      lists: {}
    }
    libraries[newId] = library
    libraryId = newId
  }

  const defaultListName =
    listName?.trim() ||
    `List - ${new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    })} ${new Date().toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    })}`

  // If appending to an existing list
  if (targetListId && library.lists[targetListId]) {
    const targetList = library.lists[targetListId]
    const existingUrlsInList = new Set(
      targetList.tabs
        .map((idx) => (urlBank[idx] ? urlBank[idx].url : null))
        .filter(Boolean)
    )

    const seenInThisSave = new Set()
    for (const tab of tabs) {
      if (
        !tab.url ||
        seenInThisSave.has(tab.url) ||
        existingUrlsInList.has(tab.url)
      )
        continue
      seenInThisSave.add(tab.url)

      let index = urlBank.findIndex((u) => u.url === tab.url)
      if (index === -1) {
        urlBank.push({ url: tab.url, title: tab.title || tab.url })
        index = urlBank.length - 1
      }
      targetList.tabs.push(index)
    }

    libraries[libraryId] = library
    await setStorage({ urlBank, libraries })
    return { library, list: targetList }
  }

  // Build a set of URLs already in this library (for dedup across lists)
  const existingUrlsInLibrary = new Set()
  Object.values(library.lists).forEach((list) => {
    list.tabs.forEach((idx) => {
      if (urlBank[idx]) existingUrlsInLibrary.add(urlBank[idx].url)
    })
  })

  // Build tab index list, deduplicating within this save AND against library
  const seenInThisSave = new Set()
  const tabIndices = []

  for (const tab of tabs) {
    if (!tab.url) continue
    if (seenInThisSave.has(tab.url)) continue // duplicate in selection
    if (existingUrlsInLibrary.has(tab.url)) continue // already in library
    seenInThisSave.add(tab.url)

    let index = urlBank.findIndex((u) => u.url === tab.url)
    if (index === -1) {
      urlBank.push({ url: tab.url, title: tab.title || tab.url })
      index = urlBank.length - 1
    }
    tabIndices.push(index)
  }

  const listId = `list_${Date.now()}`
  const newList = {
    id: listId,
    name: defaultListName,
    created: Date.now(),
    tabs: tabIndices
  }

  library.lists[listId] = newList
  libraries[libraryId] = library

  await setStorage({ urlBank, libraries })
  return { library, list: newList }
}

/**
 * Get all libraries with hydrated tab data.
 */
export async function getLists() {
  const storage = await getStorage(['urlBank', 'libraries'])
  const urlBank = storage.urlBank || []
  const libraries = storage.libraries || {}

  return Object.values(libraries).map((lib) => ({
    ...lib,
    lists: Object.values(lib.lists || {}).map((list) => ({
      ...list,
      tabs: (list.tabs || []).map(
        (idx) => urlBank[idx] || { url: 'about:blank', title: 'Missing' }
      )
    }))
  }))
}

/**
 * Add more tabs to an existing list within a library.
 */
export async function addTabsToList(tabs, libraryId, listId) {
  const storage = await getStorage(['urlBank', 'libraries'])
  let urlBank = storage.urlBank || []
  let libraries = storage.libraries || {}

  const library = libraries[libraryId]
  if (!library) throw new Error('Library not found')
  const list = library.lists[listId]
  if (!list) throw new Error('List not found')

  // Collect existing URLs in this list
  const existingUrls = new Set(
    list.tabs
      .map((idx) => (urlBank[idx] ? urlBank[idx].url : null))
      .filter(Boolean)
  )

  for (const tab of tabs) {
    if (!tab.url || existingUrls.has(tab.url)) continue
    existingUrls.add(tab.url)
    let index = urlBank.findIndex((u) => u.url === tab.url)
    if (index === -1) {
      urlBank.push({ url: tab.url, title: tab.title || tab.url })
      index = urlBank.length - 1
    }
    list.tabs.push(index)
  }

  await setStorage({ urlBank, libraries })
  return getLists()
}

export async function removeLibrary(libraryId) {
  const storage = await getStorage(['libraries'])
  const libraries = storage.libraries || {}
  delete libraries[libraryId]
  await setStorage({ libraries })
  return getLists()
}

export async function removeList(libraryId, listId) {
  const storage = await getStorage(['libraries'])
  const libraries = storage.libraries || {}
  if (libraries[libraryId] && libraries[libraryId].lists) {
    delete libraries[libraryId].lists[listId]
  }
  await setStorage({ libraries })
  return getLists()
}

export async function renameLibrary(libraryId, name) {
  const storage = await getStorage(['libraries'])
  const libraries = storage.libraries || {}
  if (libraries[libraryId]) {
    libraries[libraryId].name = name
    await setStorage({ libraries })
  }
  return getLists()
}

export async function renameTabList(libraryId, listId, name) {
  const storage = await getStorage(['libraries'])
  const libraries = storage.libraries || {}
  if (
    libraries[libraryId] &&
    libraries[libraryId].lists &&
    libraries[libraryId].lists[listId]
  ) {
    libraries[libraryId].lists[listId].name = name
    await setStorage({ libraries })
  }
  return getLists()
}

/**
 * Helper to safely find or create a child folder under a specific parent ID.
 * Avoids global search collision and race conditions.
 */
async function findOrCreateChildFolder(parentId, name) {
  const browserApi = browser
  return new Promise((resolve, reject) => {
    browserApi.bookmarks.getChildren(parentId, (children) => {
      if (browserApi.runtime.lastError) {
        // Fallback: try creating directly
        browserApi.bookmarks.create({ parentId, title: name }, (created) => {
          if (browserApi.runtime.lastError)
            return reject(browserApi.runtime.lastError)
          resolve(created)
        })
        return
      }

      const existing = (children || []).find((c) => !c.url && c.title === name)
      if (existing) {
        resolve(existing)
      } else {
        browserApi.bookmarks.create({ parentId, title: name }, (created) => {
          if (browserApi.runtime.lastError)
            return reject(browserApi.runtime.lastError)
          resolve(created)
        })
      }
    })
  })
}

/**
 * Save tabs as Browser Bookmarks with deterministic folder hierarchy.
 *
 * Folder hierarchy:  parentBookmarkId → [optional rootFolderName] → libraryName → listName → bookmarks
 *
 * @param {Array<{url,title}>} tabs
 * @param {string} listName
 * @param {string} libraryName
 * @param {string|null} parentBookmarkId - bookmark folder id (Bookmarks Bar = '1', Other = '2')
 * @param {string} rootFolderName        - optional top-level grouping folder
 */
export async function saveListAsBookmarks(
  tabs,
  listName,
  libraryName,
  parentBookmarkId,
  rootFolderName
) {
  const browserApi = browser
  if (!browserApi?.bookmarks) throw new Error('Bookmarks API not available')

  const anchorId = parentBookmarkId || '1'
  let parentForLib = anchorId

  if (rootFolderName && rootFolderName.trim()) {
    const rootFolder = await findOrCreateChildFolder(
      anchorId,
      rootFolderName.trim()
    )
    parentForLib = rootFolder.id
  }

  const finalLibName = libraryName?.trim() || 'My Library'
  const libFolder = await findOrCreateChildFolder(parentForLib, finalLibName)

  const finalListName =
    listName?.trim() ||
    `List - ${new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    })} ${new Date().toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit'
    })}`

  const listFolder = await findOrCreateChildFolder(libFolder.id, finalListName)

  // Track the library folder in storage for guaranteed retrieval
  const storage = await getStorage(['bookmarkLibraryIds'])
  const recorded = new Set(storage.bookmarkLibraryIds || [])
  recorded.add(libFolder.id)
  await setStorage({ bookmarkLibraryIds: Array.from(recorded) })

  // Deduplicate and batch save bookmarks
  const seenUrls = new Set()
  const validTabs = tabs.filter((t) => {
    if (!t.url || seenUrls.has(t.url)) return false
    seenUrls.add(t.url)
    return true
  })

  // Create bookmarks in parallel chunks of 15 to avoid browser throttling
  const chunkSize = 15
  for (let i = 0; i < validTabs.length; i += chunkSize) {
    const chunk = validTabs.slice(i, i + chunkSize)
    await Promise.all(
      chunk.map(
        (t) =>
          new Promise((resolve) => {
            browserApi.bookmarks.create(
              {
                parentId: listFolder.id,
                title: t.title?.trim() || t.url,
                url: t.url
              },
              () => resolve()
            )
          })
      )
    )
  }

  return listFolder
}

/**
 * Read lists saved as Browser Bookmarks.
 * Scans both recorded Excited Gem library folders and root folders across the bookmark tree.
 */
export async function getBookmarkLists(rootFolderName = 'Excited Gem Lists') {
  const browserApi = browser
  if (!browserApi?.bookmarks) return []

  const tree = await new Promise((resolve) =>
    browserApi.bookmarks.getTree(resolve)
  )
  if (!tree || tree.length === 0) return []

  const storage = await getStorage(['bookmarkLibraryIds'])
  const recordedLibIds = new Set(storage.bookmarkLibraryIds || [])

  const results = []
  const seenLibIds = new Set()

  // Helper to parse a folder as a Library with subfolder Lists
  const parseLibraryNode = (libNode) => {
    if (!libNode || seenLibIds.has(libNode.id)) return null
    seenLibIds.add(libNode.id)

    const lists = []
    const subNodes = libNode.children || []

    // 1. Child folders are Lists
    const listFolders = subNodes.filter((n) => !n.url)
    for (const list of listFolders) {
      const tabs = (list.children || [])
        .filter((n) => !!n.url)
        .map((n) => ({ url: n.url, title: n.title || n.url }))

      lists.push({
        id: list.id,
        name: list.title || 'Unnamed List',
        created: list.dateAdded || Date.now(),
        tabs
      })
    }

    // 2. Direct bookmark items under the library (if any) grouped into a "General" list
    const directBookmarks = subNodes
      .filter((n) => !!n.url)
      .map((n) => ({ url: n.url, title: n.title || n.url }))

    if (directBookmarks.length > 0) {
      lists.unshift({
        id: `${libNode.id}_direct`,
        name: 'General',
        created: libNode.dateAdded || Date.now(),
        tabs: directBookmarks
      })
    }

    if (lists.length === 0) return null

    return {
      id: libNode.id,
      name: libNode.title || 'Unnamed Library',
      created: libNode.dateAdded || Date.now(),
      storageType: 'bookmarks',
      lists
    }
  }

  // 1. Process recorded libraries from storage
  for (const libId of recordedLibIds) {
    try {
      const subTree = await new Promise((resolve) =>
        browserApi.bookmarks.getSubTree(libId, (nodes) => {
          if (browserApi.runtime.lastError || !nodes || nodes.length === 0) {
            resolve(null)
          } else {
            resolve(nodes[0])
          }
        })
      )
      if (subTree) {
        const parsed = parseLibraryNode(subTree)
        if (parsed) results.push(parsed)
      }
    } catch {
      // ignore missing/deleted folders
    }
  }

  // 2. Walk entire bookmark tree to find root folders (e.g. "Excited Gem Lists")
  function walkForRoots(nodes) {
    for (const node of nodes) {
      if (!node.url) {
        if (rootFolderName && node.title === rootFolderName) {
          const libraryFolders = (node.children || []).filter((n) => !n.url)
          for (const lib of libraryFolders) {
            const parsed = parseLibraryNode(lib)
            if (parsed) results.push(parsed)
          }
        }
        if (node.children) walkForRoots(node.children)
      }
    }
  }

  walkForRoots(tree[0]?.children || [])

  return results
}
