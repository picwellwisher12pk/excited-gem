import { getTree } from '../utils/bookmarks'
import type { BookmarkNode } from '../utils/bookmarks'
// @ts-ignore
import {
  getLists,
  getBookmarkLists,
  getSessions
} from '../components/getsetSessions'

const browser =
  typeof chrome !== 'undefined'
    ? chrome
    : typeof (globalThis as any).browser !== 'undefined'
      ? (globalThis as any).browser
      : null

export interface DomainStat {
  domain: string
  count: number
  percentage: number
  favIconUrl?: string
  urls?: string[]
}

export interface WindowStat {
  id: number
  tabCount: number
  focused: boolean
  incognito: boolean
  type?: string
  state?: string
  tabs: Array<{
    id?: number
    title?: string
    url?: string
    favIconUrl?: string
    active?: boolean
    pinned?: boolean
    audible?: boolean
    mutedInfo?: { muted: boolean }
    discarded?: boolean
    groupId?: number
  }>
}

export interface TabGroupStat {
  id: number
  title?: string
  color: string
  collapsed: boolean
  tabCount: number
  windowId: number
}

export interface DuplicateUrlStat {
  url: string
  title?: string
  count: number
  tabIds: number[]
  windowIds: number[]
}

export interface TabsStats {
  totalTabs: number
  totalWindows: number
  normalWindowsCount: number
  incognitoWindowsCount: number
  focusedWindowId?: number
  pinnedTabsCount: number
  audibleTabsCount: number
  mutedTabsCount: number
  discardedTabsCount: number
  activeTabsCount: number
  groupedTabsCount: number
  tabGroupsCount: number
  windows: WindowStat[]
  tabGroups: TabGroupStat[]
  topDomains: DomainStat[]
  duplicateUrls: DuplicateUrlStat[]
  protocolBreakdown: Record<string, number>
}

export interface DuplicateBookmarkStat {
  url: string
  title: string
  count: number
  locations: Array<{
    id: string
    title: string
    folderPath: string
  }>
}

export interface FolderStat {
  id: string
  title: string
  path: string
  bookmarkCount: number
  subfolderCount: number
}

export interface BookmarksStats {
  totalBookmarks: number
  totalFolders: number
  emptyFoldersCount: number
  maxDepth: number
  topDomains: DomainStat[]
  duplicateBookmarks: DuplicateBookmarkStat[]
  topFolders: FolderStat[]
  timelineBreakdown: {
    last24Hours: number
    last7Days: number
    last30Days: number
    lastYear: number
    older: number
  }
}

export interface ListTabItem {
  url: string
  title: string
}

export interface ListStat {
  id: string
  name: string
  libraryId: string
  libraryName: string
  storageType: 'extension' | 'bookmarks'
  tabCount: number
  created: number
  tabs: ListTabItem[]
  topDomains: DomainStat[]
}

export interface ListsStats {
  totalLibraries: number
  totalLists: number
  totalTabs: number
  avgTabsPerList: number
  extensionListsCount: number
  bookmarksListsCount: number
  topDomains: DomainStat[]
  largestLists: ListStat[]
  timelineBreakdown: {
    last7Days: number
    last30Days: number
    older: number
  }
}

export interface SessionStat {
  created: number
  name: string
  windowCount: number
  tabCount: number
  topDomains: DomainStat[]
  windows: Record<string, ListTabItem[]>
}

export interface SessionsStats {
  totalSessions: number
  totalWindows: number
  totalTabs: number
  avgTabsPerSession: number
  topDomains: DomainStat[]
  largestSessions: SessionStat[]
  timelineBreakdown: {
    last7Days: number
    last30Days: number
    older: number
  }
}

export interface CrossDomainStat {
  domain: string
  tabsCount: number
  bookmarksCount: number
  listsCount: number
  sessionsCount: number
  totalCount: number
  favIconUrl?: string
}

export interface FullAnalyticsData {
  tabs: TabsStats
  bookmarks: BookmarksStats
  lists: ListsStats
  sessions: SessionsStats
  crossDomains: CrossDomainStat[]
  timestamp: number
}

/**
 * Safely extract the domain / hostname from a URL.
 */
export function extractDomain(url?: string): string {
  if (!url) return 'Unknown'
  try {
    if (url.startsWith('chrome://')) return 'chrome://'
    if (url.startsWith('chrome-extension://')) return 'Extension'
    if (url.startsWith('about:') || url.startsWith('edge://'))
      return 'Browser Internal'
    if (url.startsWith('file://')) return 'Local File'

    const parsed = new URL(url)
    return parsed.hostname.replace(/^www\./, '') || parsed.protocol
  } catch {
    return 'Other'
  }
}

/**
 * Extract protocol from URL
 */
export function extractProtocol(url?: string): string {
  if (!url) return 'other'
  try {
    const parsed = new URL(url)
    return parsed.protocol.replace(':', '')
  } catch {
    if (url.startsWith('chrome://')) return 'chrome'
    if (url.startsWith('chrome-extension://')) return 'extension'
    if (url.startsWith('about:')) return 'about'
    if (url.startsWith('file:')) return 'file'
    return 'other'
  }
}

/**
 * Compute top domains from an array of URLs / items
 */
export function aggregateTopDomains(
  items: Array<{ url?: string; favIconUrl?: string }>,
  limit = 100
): DomainStat[] {
  const map = new Map<
    string,
    { count: number; favIconUrl?: string; urls: Set<string> }
  >()
  let totalValid = 0

  for (const item of items) {
    if (!item.url) continue
    const domain = extractDomain(item.url)
    if (!domain || domain === 'Unknown') continue

    totalValid++
    const existing = map.get(domain)
    if (existing) {
      existing.count++
      if (!existing.favIconUrl && item.favIconUrl) {
        existing.favIconUrl = item.favIconUrl
      }
      existing.urls.add(item.url)
    } else {
      map.set(domain, {
        count: 1,
        favIconUrl: item.favIconUrl,
        urls: new Set([item.url])
      })
    }
  }

  const result: DomainStat[] = []
  map.forEach((value, domain) => {
    result.push({
      domain,
      count: value.count,
      percentage:
        totalValid > 0
          ? Number(((value.count / totalValid) * 100).toFixed(1))
          : 0,
      favIconUrl: value.favIconUrl,
      urls: Array.from(value.urls)
    })
  })

  return result.sort((a, b) => b.count - a.count).slice(0, limit)
}

/**
 * Fetch and compute Tabs Analytics
 */
export async function fetchTabsStats(): Promise<TabsStats> {
  if (!browser || !browser.tabs) {
    return {
      totalTabs: 0,
      totalWindows: 0,
      normalWindowsCount: 0,
      incognitoWindowsCount: 0,
      pinnedTabsCount: 0,
      audibleTabsCount: 0,
      mutedTabsCount: 0,
      discardedTabsCount: 0,
      activeTabsCount: 0,
      groupedTabsCount: 0,
      tabGroupsCount: 0,
      windows: [],
      tabGroups: [],
      topDomains: [],
      duplicateUrls: [],
      protocolBreakdown: {}
    }
  }

  // 1. Fetch Windows & Tabs
  const [windows, allTabs] = await Promise.all([
    new Promise<chrome.windows.Window[]>((resolve) => {
      browser.windows.getAll(
        { populate: true },
        (wins: chrome.windows.Window[]) => {
          resolve(wins || [])
        }
      )
    }),
    new Promise<chrome.tabs.Tab[]>((resolve) => {
      browser.tabs.query({}, (tabs: chrome.tabs.Tab[]) => {
        resolve(tabs || [])
      })
    })
  ])

  // 2. Fetch Tab Groups if supported
  let tabGroups: TabGroupStat[] = []
  if (browser.tabGroups && typeof browser.tabGroups.query === 'function') {
    try {
      const groups = await new Promise<chrome.tabGroups.TabGroup[]>(
        (resolve) => {
          browser.tabGroups.query({}, (res: chrome.tabGroups.TabGroup[]) =>
            resolve(res || [])
          )
        }
      )
      tabGroups = groups.map((g) => {
        const groupTabsCount = allTabs.filter((t) => t.groupId === g.id).length
        return {
          id: g.id,
          title: g.title || 'Untitled Group',
          color: g.color || 'grey',
          collapsed: Boolean(g.collapsed),
          tabCount: groupTabsCount,
          windowId: g.windowId
        }
      })
    } catch {
      // Tab groups not supported or failed
    }
  }

  // 3. Aggregate tab metrics
  let pinnedTabsCount = 0
  let audibleTabsCount = 0
  let mutedTabsCount = 0
  let discardedTabsCount = 0
  let activeTabsCount = 0
  let groupedTabsCount = 0
  let normalWindowsCount = 0
  let incognitoWindowsCount = 0
  let focusedWindowId: number | undefined

  const protocolBreakdown: Record<string, number> = {}
  const urlMap = new Map<
    string,
    { title?: string; tabIds: number[]; windowIds: number[] }
  >()

  const windowStats: WindowStat[] = windows.map((win) => {
    if (win.type === 'normal') normalWindowsCount++
    if (win.incognito) incognitoWindowsCount++
    if (win.focused) focusedWindowId = win.id

    const tabsInWin = (win.tabs || []).map((t) => {
      if (t.pinned) pinnedTabsCount++
      if (t.audible) audibleTabsCount++
      if (t.mutedInfo?.muted) mutedTabsCount++
      if (t.discarded) discardedTabsCount++
      if (t.active) activeTabsCount++
      if (t.groupId && t.groupId > 0) groupedTabsCount++

      if (t.url) {
        const proto = extractProtocol(t.url)
        protocolBreakdown[proto] = (protocolBreakdown[proto] || 0) + 1

        // Track duplicate URLs
        const existing = urlMap.get(t.url)
        if (existing) {
          if (t.id) existing.tabIds.push(t.id)
          if (t.windowId) existing.windowIds.push(t.windowId)
        } else {
          urlMap.set(t.url, {
            title: t.title,
            tabIds: t.id ? [t.id] : [],
            windowIds: t.windowId ? [t.windowId] : []
          })
        }
      }

      return {
        id: t.id,
        title: t.title,
        url: t.url,
        favIconUrl: t.favIconUrl,
        active: t.active,
        pinned: t.pinned,
        audible: t.audible,
        mutedInfo: t.mutedInfo,
        discarded: t.discarded,
        groupId: t.groupId
      }
    })

    return {
      id: win.id ?? 0,
      tabCount: tabsInWin.length,
      focused: Boolean(win.focused),
      incognito: Boolean(win.incognito),
      type: win.type,
      state: win.state,
      tabs: tabsInWin
    }
  })

  // Duplicate URLs list
  const duplicateUrls: DuplicateUrlStat[] = []
  urlMap.forEach((val, url) => {
    if (val.tabIds.length > 1) {
      duplicateUrls.push({
        url,
        title: val.title,
        count: val.tabIds.length,
        tabIds: val.tabIds,
        windowIds: Array.from(new Set(val.windowIds))
      })
    }
  })
  duplicateUrls.sort((a, b) => b.count - a.count)

  const topDomains = aggregateTopDomains(allTabs)

  return {
    totalTabs: allTabs.length,
    totalWindows: windows.length,
    normalWindowsCount,
    incognitoWindowsCount,
    focusedWindowId,
    pinnedTabsCount,
    audibleTabsCount,
    mutedTabsCount,
    discardedTabsCount,
    activeTabsCount,
    groupedTabsCount,
    tabGroupsCount: tabGroups.length,
    windows: windowStats,
    tabGroups,
    topDomains,
    duplicateUrls,
    protocolBreakdown
  }
}

/**
 * Fetch and compute Bookmarks Analytics
 */
export async function fetchBookmarksStats(): Promise<BookmarksStats> {
  const tree = await getTree()
  if (!tree || tree.length === 0) {
    return {
      totalBookmarks: 0,
      totalFolders: 0,
      emptyFoldersCount: 0,
      maxDepth: 0,
      topDomains: [],
      duplicateBookmarks: [],
      topFolders: [],
      timelineBreakdown: {
        last24Hours: 0,
        last7Days: 0,
        last30Days: 0,
        lastYear: 0,
        older: 0
      }
    }
  }

  let totalBookmarks = 0
  let totalFolders = 0
  let emptyFoldersCount = 0
  let maxDepth = 0
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000
  const oneWeek = 7 * oneDay
  const oneMonth = 30 * oneDay
  const oneYear = 365 * oneDay

  const timelineBreakdown = {
    last24Hours: 0,
    last7Days: 0,
    last30Days: 0,
    lastYear: 0,
    older: 0
  }

  const allBookmarkNodes: Array<{
    url: string
    title: string
    dateAdded?: number
  }> = []
  const urlMap = new Map<
    string,
    Array<{ id: string; title: string; folderPath: string }>
  >()
  const folderStats: FolderStat[] = []

  function walk(node: BookmarkNode, currentPath: string, depth: number) {
    if (depth > maxDepth) maxDepth = depth

    const path = currentPath
      ? `${currentPath} / ${node.title || 'Untitled'}`
      : node.title || 'Root'

    if (node.url) {
      totalBookmarks++
      allBookmarkNodes.push({
        url: node.url,
        title: node.title,
        dateAdded: node.dateAdded
      })

      // Timeline breakdown
      if (node.dateAdded) {
        const age = now - node.dateAdded
        if (age <= oneDay) timelineBreakdown.last24Hours++
        else if (age <= oneWeek) timelineBreakdown.last7Days++
        else if (age <= oneMonth) timelineBreakdown.last30Days++
        else if (age <= oneYear) timelineBreakdown.lastYear++
        else timelineBreakdown.older++
      }

      // Track duplicates
      const existing = urlMap.get(node.url)
      const location = {
        id: node.id,
        title: node.title,
        folderPath: currentPath || 'Root'
      }
      if (existing) {
        existing.push(location)
      } else {
        urlMap.set(node.url, [location])
      }
    } else {
      // It's a folder (skip counting the virtual root node '0')
      if (node.id !== '0') {
        totalFolders++
      }

      const children = node.children || []
      const bookmarkChildren = children.filter((c) => !!c.url)
      const folderChildren = children.filter((c) => !c.url)

      if (children.length === 0 && node.id !== '0') {
        emptyFoldersCount++
      }

      if (node.id !== '0') {
        folderStats.push({
          id: node.id,
          title: node.title || 'Untitled Folder',
          path,
          bookmarkCount: bookmarkChildren.length,
          subfolderCount: folderChildren.length
        })
      }

      for (const child of children) {
        walk(child, node.id === '0' ? '' : path, depth + 1)
      }
    }
  }

  for (const root of tree) {
    walk(root, '', 0)
  }

  // Duplicate bookmarks
  const duplicateBookmarks: DuplicateBookmarkStat[] = []
  urlMap.forEach((locations, url) => {
    if (locations.length > 1) {
      duplicateBookmarks.push({
        url,
        title: locations[0]?.title || url,
        count: locations.length,
        locations
      })
    }
  })
  duplicateBookmarks.sort((a, b) => b.count - a.count)

  const topDomains = aggregateTopDomains(allBookmarkNodes)
  const topFolders = folderStats
    .sort((a, b) => b.bookmarkCount - a.bookmarkCount)
    .slice(0, 10)

  return {
    totalBookmarks,
    totalFolders,
    emptyFoldersCount,
    maxDepth,
    topDomains,
    duplicateBookmarks,
    topFolders,
    timelineBreakdown
  }
}

/**
 * Fetch and compute Lists Analytics
 */
export async function fetchListsStats(): Promise<ListsStats> {
  const [extLibraries, bmLibraries] = await Promise.all([
    getLists().catch(() => []),
    getBookmarkLists().catch(() => [])
  ])

  let totalLibraries = 0
  let totalLists = 0
  let totalTabs = 0
  let extensionListsCount = 0
  let bookmarksListsCount = 0

  const allTabs: ListTabItem[] = []
  const largestLists: ListStat[] = []
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000
  const oneWeek = 7 * oneDay
  const oneMonth = 30 * oneDay

  const timelineBreakdown = {
    last7Days: 0,
    last30Days: 0,
    older: 0
  }

  const processLibraries = (
    libraries: any[],
    storageType: 'extension' | 'bookmarks'
  ) => {
    if (!libraries || !Array.isArray(libraries)) return
    totalLibraries += libraries.length

    for (const lib of libraries) {
      const lists = lib.lists || []
      for (const list of lists) {
        totalLists++
        if (storageType === 'extension') extensionListsCount++
        else bookmarksListsCount++

        const tabs: ListTabItem[] = (list.tabs || []).map((t: any) => ({
          url: t.url || 'about:blank',
          title: t.title || t.url || 'Untitled'
        }))

        totalTabs += tabs.length
        allTabs.push(...tabs)

        const created = list.created || lib.created || Date.now()
        const age = now - created
        if (age <= oneWeek) timelineBreakdown.last7Days++
        else if (age <= oneMonth) timelineBreakdown.last30Days++
        else timelineBreakdown.older++

        largestLists.push({
          id: list.id || `list_${Math.random()}`,
          name: list.name || 'Unnamed List',
          libraryId: lib.id || '',
          libraryName: lib.name || 'Unnamed Library',
          storageType,
          tabCount: tabs.length,
          created,
          tabs,
          topDomains: aggregateTopDomains(tabs, 5)
        })
      }
    }
  }

  processLibraries(extLibraries, 'extension')
  processLibraries(bmLibraries, 'bookmarks')

  largestLists.sort((a, b) => b.tabCount - a.tabCount)

  const topDomains = aggregateTopDomains(allTabs)
  const avgTabsPerList =
    totalLists > 0 ? Number((totalTabs / totalLists).toFixed(1)) : 0

  return {
    totalLibraries,
    totalLists,
    totalTabs,
    avgTabsPerList,
    extensionListsCount,
    bookmarksListsCount,
    topDomains,
    largestLists: largestLists.slice(0, 10),
    timelineBreakdown
  }
}

/**
 * Fetch and compute Sessions Analytics
 */
export async function fetchSessionsStats(): Promise<SessionsStats> {
  const rawSessions = await getSessions().catch(() => [])
  if (!rawSessions || !Array.isArray(rawSessions)) {
    return {
      totalSessions: 0,
      totalWindows: 0,
      totalTabs: 0,
      avgTabsPerSession: 0,
      topDomains: [],
      largestSessions: [],
      timelineBreakdown: {
        last7Days: 0,
        last30Days: 0,
        older: 0
      }
    }
  }

  let totalSessions = rawSessions.length
  let totalWindows = 0
  let totalTabs = 0

  const allTabs: ListTabItem[] = []
  const largestSessions: SessionStat[] = []
  const now = Date.now()
  const oneDay = 24 * 60 * 60 * 1000
  const oneWeek = 7 * oneDay
  const oneMonth = 30 * oneDay

  const timelineBreakdown = {
    last7Days: 0,
    last30Days: 0,
    older: 0
  }

  for (const session of rawSessions) {
    const windows = session.windows || {}
    const windowKeys = Object.keys(windows)
    totalWindows += windowKeys.length

    let sessionTabCount = 0
    const sessionTabs: ListTabItem[] = []

    windowKeys.forEach((winId) => {
      const tabs = windows[winId] || []
      tabs.forEach((t: any) => {
        sessionTabCount++
        const item = {
          url: t.url || 'about:blank',
          title: t.title || t.url || 'Untitled'
        }
        sessionTabs.push(item)
        allTabs.push(item)
      })
    })

    totalTabs += sessionTabCount

    const created = session.created || Date.now()
    const age = now - created
    if (age <= oneWeek) timelineBreakdown.last7Days++
    else if (age <= oneMonth) timelineBreakdown.last30Days++
    else timelineBreakdown.older++

    largestSessions.push({
      created,
      name: session.name || `Session ${new Date(created).toLocaleDateString()}`,
      windowCount: windowKeys.length,
      tabCount: sessionTabCount,
      topDomains: aggregateTopDomains(sessionTabs, 5),
      windows
    })
  }

  largestSessions.sort((a, b) => b.tabCount - a.tabCount)

  const topDomains = aggregateTopDomains(allTabs)
  const avgTabsPerSession =
    totalSessions > 0 ? Number((totalTabs / totalSessions).toFixed(1)) : 0

  return {
    totalSessions,
    totalWindows,
    totalTabs,
    avgTabsPerSession,
    topDomains,
    largestSessions: largestSessions.slice(0, 10),
    timelineBreakdown
  }
}

/**
 * Combine all 4 areas into Cross Domain matrix
 */
export function buildCrossDomainMatrix(
  tabs: TabsStats,
  bookmarks: BookmarksStats,
  lists: ListsStats,
  sessions: SessionsStats
): CrossDomainStat[] {
  const domainMap = new Map<string, CrossDomainStat>()

  const addEntries = (
    domains: DomainStat[],
    key: 'tabsCount' | 'bookmarksCount' | 'listsCount' | 'sessionsCount'
  ) => {
    for (const d of domains) {
      const existing = domainMap.get(d.domain)
      if (existing) {
        existing[key] += d.count
        existing.totalCount += d.count
        if (!existing.favIconUrl && d.favIconUrl)
          existing.favIconUrl = d.favIconUrl
      } else {
        const item: CrossDomainStat = {
          domain: d.domain,
          tabsCount: 0,
          bookmarksCount: 0,
          listsCount: 0,
          sessionsCount: 0,
          totalCount: d.count,
          favIconUrl: d.favIconUrl
        }
        item[key] = d.count
        domainMap.set(d.domain, item)
      }
    }
  }

  addEntries(tabs.topDomains, 'tabsCount')
  addEntries(bookmarks.topDomains, 'bookmarksCount')
  addEntries(lists.topDomains, 'listsCount')
  addEntries(sessions.topDomains, 'sessionsCount')

  const result: CrossDomainStat[] = Array.from(domainMap.values())
  return result.sort((a, b) => b.totalCount - a.totalCount)
}

/**
 * Fetch complete analytics data
 */
export async function fetchFullAnalyticsData(): Promise<FullAnalyticsData> {
  const [tabs, bookmarks, lists, sessions] = await Promise.all([
    fetchTabsStats(),
    fetchBookmarksStats(),
    fetchListsStats(),
    fetchSessionsStats()
  ])

  const crossDomains = buildCrossDomainMatrix(tabs, bookmarks, lists, sessions)

  return {
    tabs,
    bookmarks,
    lists,
    sessions,
    crossDomains,
    timestamp: Date.now()
  }
}

/**
 * Action: Close duplicate tabs (keeps the first occurrence)
 */
export async function closeDuplicateTabs(
  duplicateUrl: string
): Promise<number> {
  if (!browser || !browser.tabs) return 0

  const tabs: chrome.tabs.Tab[] = await new Promise((resolve) => {
    browser.tabs.query({ url: duplicateUrl }, resolve)
  })

  if (tabs.length <= 1) return 0

  // Keep first tab, close the rest
  const tabsToClose = tabs
    .slice(1)
    .map((t) => t.id)
    .filter(Boolean) as number[]
  if (tabsToClose.length > 0) {
    await new Promise((resolve) => browser.tabs.remove(tabsToClose, resolve))
  }

  return tabsToClose.length
}

/**
 * Action: Close all open tabs for a specific domain
 */
export async function closeTabsByDomain(domain: string): Promise<number> {
  if (!browser || !browser.tabs) return 0

  const allTabs: chrome.tabs.Tab[] = await new Promise((resolve) => {
    browser.tabs.query({}, resolve)
  })

  const tabsToClose = allTabs
    .filter((t) => extractDomain(t.url) === domain && t.id)
    .map((t) => t.id as number)

  if (tabsToClose.length > 0) {
    await new Promise((resolve) => browser.tabs.remove(tabsToClose, resolve))
  }

  return tabsToClose.length
}

/**
 * Generate Markdown summary report
 */
export function generateMarkdownReport(data: FullAnalyticsData): string {
  const dateStr = new Date(data.timestamp).toLocaleString()

  return `# Excited Gem - Browser Analytics Report
Generated on: ${dateStr}

---

## 🌐 Overview Summary
- **Open Tabs**: ${data.tabs.totalTabs} tabs across ${data.tabs.totalWindows} windows (${data.tabs.pinnedTabsCount} pinned, ${data.tabs.discardedTabsCount} sleeping/memory saved)
- **Bookmarks**: ${data.bookmarks.totalBookmarks} bookmarks across ${data.bookmarks.totalFolders} folders (${data.bookmarks.duplicateBookmarks.length} duplicate URLs found)
- **Saved Lists**: ${data.lists.totalLists} lists across ${data.lists.totalLibraries} libraries (${data.lists.totalTabs} saved tabs)
- **Saved Sessions**: ${data.sessions.totalSessions} sessions (${data.sessions.totalTabs} tabs preserved)
- **Unique Domains Tracked**: ${data.crossDomains.length}

---

## 🗂️ Open Tabs Breakdown
- **Windows**: ${data.tabs.totalWindows} (${data.tabs.normalWindowsCount} normal, ${data.tabs.incognitoWindowsCount} incognito)
- **Tab Groups**: ${data.tabs.tabGroupsCount} groups (${data.tabs.groupedTabsCount} grouped tabs)
- **Audible / Playing Media**: ${data.tabs.audibleTabsCount} tabs
- **Duplicate Open URLs**: ${data.tabs.duplicateUrls.length} duplicate URLs

### Top Open Domains
${data.tabs.topDomains
  .slice(0, 10)
  .map(
    (d, i) => `${i + 1}. **${d.domain}**: ${d.count} tabs (${d.percentage}%)`
  )
  .join('\n')}

---

## 📑 Bookmarks Breakdown
- **Total Bookmarks**: ${data.bookmarks.totalBookmarks}
- **Folders**: ${data.bookmarks.totalFolders} (Empty: ${data.bookmarks.emptyFoldersCount})
- **Folder Hierarchy Depth**: ${data.bookmarks.maxDepth} levels

### Top Bookmarked Domains
${data.bookmarks.topDomains
  .slice(0, 10)
  .map(
    (d, i) =>
      `${i + 1}. **${d.domain}**: ${d.count} bookmarks (${d.percentage}%)`
  )
  .join('\n')}

---

## 📚 Saved Lists Breakdown
- **Libraries**: ${data.lists.totalLibraries}
- **Lists**: ${data.lists.totalLists} (${data.lists.extensionListsCount} extension storage, ${data.lists.bookmarksListsCount} bookmarks)
- **Total Tabs in Lists**: ${data.lists.totalTabs} (Avg: ${data.lists.avgTabsPerList} tabs/list)

---

## 💾 Saved Sessions Breakdown
- **Sessions**: ${data.sessions.totalSessions}
- **Windows Preserved**: ${data.sessions.totalWindows}
- **Tabs Preserved**: ${data.sessions.totalTabs} (Avg: ${data.sessions.avgTabsPerSession} tabs/session)

---

## 🌍 Top Overall Domains
${data.crossDomains
  .slice(0, 15)
  .map(
    (d, i) =>
      `${i + 1}. **${d.domain}**: ${d.totalCount} total (Tabs: ${d.tabsCount}, Bookmarks: ${d.bookmarksCount}, Lists: ${d.listsCount}, Sessions: ${d.sessionsCount})`
  )
  .join('\n')}
`
}
