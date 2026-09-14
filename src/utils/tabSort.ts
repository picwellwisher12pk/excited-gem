export type TabSortBy =
  | 'duration'
  | 'title'
  | 'url'
  | 'domain'
  | 'pinned-first'
  | 'audible-first'

export type SortDirection = 'asc' | 'desc'
export type MixedWindowSortMode = 'grouped' | 'in-place'
export type VideoPlacement = 'first' | 'last'

export interface TabSortOptions {
  sortBy: TabSortBy
  direction?: SortDirection
  mixedMode?: MixedWindowSortMode
  videoPlacement?: VideoPlacement
  unknownDurationPlacement?: 'start' | 'end'
}

export interface TabSortSettings {
  mixedMode: MixedWindowSortMode
  videoPlacement: VideoPlacement
  defaultDirection: SortDirection
}

export const DEFAULT_TAB_SORT_SETTINGS: TabSortSettings = {
  mixedMode: 'grouped',
  videoPlacement: 'first',
  defaultDirection: 'asc'
}

const STORAGE_KEY = 'tab_sort_settings'

/**
 * Get saved tab sort settings from chrome.storage.local (with fallback to defaults)
 */
export async function getSavedTabSortSettings(): Promise<TabSortSettings> {
  try {
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      const result = await chrome.storage.local.get(STORAGE_KEY)
      if (result && result[STORAGE_KEY]) {
        return { ...DEFAULT_TAB_SORT_SETTINGS, ...result[STORAGE_KEY] }
      }
    }
  } catch (err) {
    console.warn('Failed to load tab sort settings:', err)
  }
  return DEFAULT_TAB_SORT_SETTINGS
}

/**
 * Save tab sort settings to chrome.storage.local
 */
export async function saveTabSortSettings(
  settings: Partial<TabSortSettings>
): Promise<void> {
  try {
    const current = await getSavedTabSortSettings()
    const updated = { ...current, ...settings }
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [STORAGE_KEY]: updated })
    }
  } catch (err) {
    console.warn('Failed to save tab sort settings:', err)
  }
}

/**
 * Extracts the video duration in seconds from a tab, if known.
 */
export function getVideoDuration(tab: any): number | null {
  if (!tab) return null

  // 1. YouTube info
  if (
    typeof tab.youtubeInfo?.duration === 'number' &&
    tab.youtubeInfo.duration > 0
  ) {
    return tab.youtubeInfo.duration
  }

  // 2. Generic video info
  if (
    typeof tab.videoInfo?.duration === 'number' &&
    tab.videoInfo.duration > 0
  ) {
    return tab.videoInfo.duration
  }

  // 3. Fallback to tab.duration if directly attached
  if (typeof tab.duration === 'number' && tab.duration > 0) {
    return tab.duration
  }

  return null
}

const VIDEO_URL_PATTERNS = [
  'youtube.com/',
  'youtu.be/',
  'vimeo.com/',
  'dailymotion.com/',
  'twitch.tv/',
  'bilibili.com/',
  'loom.com/share/'
]

/**
 * Checks if a tab is a video tab (either has video metadata or is a known video URL).
 */
export function isVideoTab(tab: any): boolean {
  if (!tab) return false
  if (tab.youtubeInfo || tab.videoInfo) return true
  if (typeof tab.duration === 'number' && tab.duration > 0) return true

  const url = (tab.url || '').toLowerCase()
  return VIDEO_URL_PATTERNS.some((pattern) => url.includes(pattern))
}

/**
 * Helper to extract clean domain from url
 */
function getHostname(urlStr: string): string {
  try {
    return new URL(urlStr).hostname.replace(/^www\./, '')
  } catch {
    return urlStr || ''
  }
}

/**
 * Sorts an array of video tabs by their duration.
 */
function sortVideoTabs(
  tabs: any[],
  direction: SortDirection = 'asc',
  unknownPlacement: 'start' | 'end' = 'end'
): any[] {
  const dir = direction === 'desc' ? -1 : 1

  return [...tabs].sort((a, b) => {
    const durA = getVideoDuration(a)
    const durB = getVideoDuration(b)

    // Both have valid durations
    if (durA !== null && durB !== null) {
      return (durA - durB) * dir
    }

    // A has duration, B does not
    if (durA !== null && durB === null) {
      return unknownPlacement === 'end' ? -1 : 1
    }

    // B has duration, A does not
    if (durA === null && durB !== null) {
      return unknownPlacement === 'end' ? 1 : -1
    }

    // Neither has duration -> fallback to title or preserve relative order
    const titleA = (a.title || '').toLowerCase()
    const titleB = (b.title || '').toLowerCase()
    return titleA.localeCompare(titleB)
  })
}

/**
 * Sorts tabs within a single partition (e.g. all pinned or all unpinned tabs in one window).
 */
function sortPartition(tabs: any[], options: TabSortOptions): any[] {
  const {
    sortBy,
    direction = 'asc',
    mixedMode = 'grouped',
    videoPlacement = 'first',
    unknownDurationPlacement = 'end'
  } = options

  if (tabs.length <= 1) return tabs

  const dir = direction === 'desc' ? -1 : 1

  if (sortBy === 'duration') {
    const videoTabs: any[] = []
    const nonVideoTabs: any[] = []

    tabs.forEach((tab) => {
      if (isVideoTab(tab)) {
        videoTabs.push(tab)
      } else {
        nonVideoTabs.push(tab)
      }
    })

    // If pure videos or pure non-videos, straightforward sort
    if (videoTabs.length === 0) {
      return tabs
    }
    if (nonVideoTabs.length === 0) {
      return sortVideoTabs(videoTabs, direction, unknownDurationPlacement)
    }

    // Mixed Window: Option B - In-Place (Slot-preserving)
    if (mixedMode === 'in-place') {
      const sortedVideos = sortVideoTabs(
        videoTabs,
        direction,
        unknownDurationPlacement
      )
      let videoIdx = 0
      return tabs.map((tab) => {
        if (isVideoTab(tab)) {
          const replacement = sortedVideos[videoIdx]
          videoIdx++
          return replacement
        }
        return tab
      })
    }

    // Mixed Window: Option A - Grouped
    const sortedVideos = sortVideoTabs(
      videoTabs,
      direction,
      unknownDurationPlacement
    )

    if (videoPlacement === 'last') {
      return [...nonVideoTabs, ...sortedVideos]
    }
    return [...sortedVideos, ...nonVideoTabs]
  }

  // Non-duration sorting criteria
  return [...tabs].sort((a, b) => {
    if (sortBy === 'audible-first') {
      if (a.audible !== b.audible) return a.audible ? -1 : 1
    }

    let valA = ''
    let valB = ''

    if (sortBy === 'domain') {
      valA = getHostname(a.url || '')
      valB = getHostname(b.url || '')
    } else if (sortBy === 'title') {
      valA = (a.title || '').toLowerCase()
      valB = (b.title || '').toLowerCase()
    } else {
      valA = (a.url || '').toLowerCase()
      valB = (b.url || '').toLowerCase()
    }

    return valA.localeCompare(valB) * dir
  })
}

/**
 * Sorts tabs according to the specified options, ensuring:
 * 1. Pinned tabs remain at index 0..k (Chrome requirement)
 * 2. Tabs are grouped and sorted per window
 * 3. Mixed window mode (grouped or in-place) is respected
 */
export function sortTabsByCriteria(
  tabs: any[],
  options: TabSortOptions
): any[] {
  if (!tabs || tabs.length <= 1) return tabs || []

  // 1. Group tabs by windowId
  const winMap: Record<number, any[]> = {}
  for (const t of tabs) {
    const wId = t.windowId || 0
    if (!winMap[wId]) winMap[wId] = []
    winMap[wId].push(t)
  }

  const result: any[] = []

  // 2. Sort each window independently
  for (const winId of Object.keys(winMap)) {
    const windowTabs = winMap[Number(winId)]

    // Separate pinned vs unpinned tabs (pinned must always be at front)
    const pinnedTabs = windowTabs.filter((t) => t.pinned)
    const unpinnedTabs = windowTabs.filter((t) => !t.pinned)

    const sortedPinned = sortPartition(pinnedTabs, options)
    const sortedUnpinned = sortPartition(unpinnedTabs, options)

    result.push(...sortedPinned, ...sortedUnpinned)
  }

  return result
}

/**
 * Applies the calculated sort order to actual browser tabs using chrome.tabs.move
 */
export async function executeTabSort(
  tabs: any[],
  options: TabSortOptions
): Promise<number> {
  const sorted = sortTabsByCriteria(tabs, options)

  // Group by window
  const winMap: Record<number, any[]> = {}
  for (const t of sorted) {
    const wId = t.windowId || 0
    if (!winMap[wId]) winMap[wId] = []
    winMap[wId].push(t)
  }

  let totalMoved = 0

  for (const winId of Object.keys(winMap)) {
    const windowTabs = winMap[Number(winId)]
    for (let idx = 0; idx < windowTabs.length; idx++) {
      const tab = windowTabs[idx]
      if (tab.id && tab.index !== idx) {
        try {
          if (typeof chrome !== 'undefined' && chrome.tabs?.move) {
            await chrome.tabs.move(tab.id, { index: idx })
            totalMoved++
          }
        } catch (err) {
          console.warn(`Tab move error for tab ${tab.id}:`, err)
        }
      }
    }
  }

  return totalMoved
}
