/**
 * windowManagerService — Multi-window tab management and consolidation.
 * Supports cross-window tab gathering, filtering, grouping, and profile-aware merging.
 */

export interface CombineWindowsOptions {
  /** Target window ID, 'current', or 'new'. Defaults to 'current'. */
  targetWindowId?: number | 'current' | 'new'
  /** Only gather tabs matching this keyword, domain, or regex (case-insensitive) */
  filter?: string
  /** Specific tab IDs to gather across windows */
  tabIds?: number[]
  /** Bundle the combined tabs into a named tab group in the destination window */
  groupName?: string
  /** Color for the tab group: 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange' */
  groupColor?: string
}

export interface CombineWindowsResult {
  success: boolean
  movedCount: number
  closedWindowsCount: number
  skippedIncognitoCount: number
  destinationWindowId?: number
  createdGroupId?: number
  error?: string
}

/**
 * Combines tabs across browser windows into a destination window.
 * - Respects Chrome's profile isolation: normal and incognito windows cannot cross-merge.
 * - Preserves pinned tabs at the beginning of the destination window.
 * - Provides full liberty to filter tabs, create groups, or target a new window.
 */
export async function combineAllWindows(
  options: CombineWindowsOptions = {}
): Promise<CombineWindowsResult> {
  const browserApi =
    typeof chrome !== 'undefined'
      ? chrome
      : typeof (globalThis as any).browser !== 'undefined'
        ? (globalThis as any).browser
        : null

  if (!browserApi?.windows || !browserApi?.tabs) {
    return {
      success: false,
      movedCount: 0,
      closedWindowsCount: 0,
      skippedIncognitoCount: 0,
      error: 'Browser window/tab API not available'
    }
  }

  try {
    const allWindows: chrome.windows.Window[] = await new Promise((resolve, reject) => {
      browserApi.windows.getAll(
        { populate: true, windowTypes: ['normal'] },
        (wins: chrome.windows.Window[]) => {
          if (browserApi.runtime?.lastError) {
            reject(new Error(browserApi.runtime.lastError.message))
          } else {
            resolve(wins || [])
          }
        }
      )
    })

    if (!allWindows || allWindows.length === 0) {
      return {
        success: true,
        movedCount: 0,
        closedWindowsCount: 0,
        skippedIncognitoCount: 0
      }
    }

    // Determine current active window for context
    const currentWin = await new Promise<chrome.windows.Window | undefined>((resolve) => {
      browserApi.windows.getCurrent((curr: chrome.windows.Window) => {
        resolve(curr)
      })
    }).catch(() => undefined)

    let targetWin: chrome.windows.Window | undefined

    if (options.targetWindowId === 'new') {
      // Create a new window with matching incognito profile
      const newWin = await new Promise<chrome.windows.Window>((resolve, reject) => {
        browserApi.windows.create(
          { incognito: currentWin?.incognito ?? false },
          (created: chrome.windows.Window) => {
            if (browserApi.runtime?.lastError) reject(new Error(browserApi.runtime.lastError.message))
            else resolve(created)
          }
        )
      })
      targetWin = newWin
    } else if (typeof options.targetWindowId === 'number') {
      targetWin = allWindows.find((w) => w.id === options.targetWindowId)
    } else {
      // 'current' or undefined
      targetWin = currentWin || allWindows[0]
    }

    if (!targetWin || typeof targetWin.id !== 'number') {
      return {
        success: false,
        movedCount: 0,
        closedWindowsCount: 0,
        skippedIncognitoCount: 0,
        error: 'Target destination window could not be resolved'
      }
    }

    const destWindowId = targetWin.id
    const targetIsIncognito = !!targetWin.incognito

    // Chrome Rule: Tabs can only be moved between windows with the same incognito state
    const eligibleWindows = allWindows.filter(
      (w) => w.id !== destWindowId && !!w.incognito === targetIsIncognito
    )
    const skippedIncognitoCount = allWindows.filter(
      (w) => w.id !== destWindowId && !!w.incognito !== targetIsIncognito
    ).length

    if (eligibleWindows.length === 0 && !options.tabIds && !options.filter) {
      return {
        success: true,
        movedCount: 0,
        closedWindowsCount: 0,
        skippedIncognitoCount,
        destinationWindowId: destWindowId
      }
    }

    let movedCount = 0
    let closedWindowsCount = 0
    const movedTabIds: number[] = []

    // Count pinned tabs in destination window
    let destPinnedCount = targetWin.tabs?.filter((t) => t.pinned).length || 0

    // Filter criteria helper
    const filterLower = options.filter ? options.filter.toLowerCase().trim() : null
    const allowedTabIdSet = options.tabIds ? new Set(options.tabIds) : null

    for (const win of eligibleWindows) {
      const tabs = win.tabs || []
      if (tabs.length === 0) continue

      // Filter tabs in this window based on criteria
      const candidateTabs = tabs.filter((t) => {
        if (typeof t.id !== 'number') return false
        if (allowedTabIdSet && !allowedTabIdSet.has(t.id)) return false
        if (filterLower) {
          const title = (t.title || '').toLowerCase()
          const url = (t.url || '').toLowerCase()
          return title.includes(filterLower) || url.includes(filterLower)
        }
        return true
      })

      if (candidateTabs.length === 0) continue

      const pinnedTabIds = candidateTabs.filter((t) => t.pinned).map((t) => t.id as number)
      const unpinnedTabIds = candidateTabs.filter((t) => !t.pinned).map((t) => t.id as number)

      // Move pinned tabs safely to the pinned section of destination window
      if (pinnedTabIds.length > 0) {
        try {
          await new Promise<void>((resolve, reject) => {
            browserApi.tabs.move(
              pinnedTabIds,
              { windowId: destWindowId, index: destPinnedCount },
              () => {
                if (browserApi.runtime?.lastError) reject(new Error(browserApi.runtime.lastError.message))
                else resolve()
              }
            )
          })
          destPinnedCount += pinnedTabIds.length
          movedCount += pinnedTabIds.length
          movedTabIds.push(...pinnedTabIds)
        } catch (err) {
          console.warn('[windowManagerService] Warning moving pinned tabs:', err)
        }
      }

      // Move unpinned tabs to the end of destination window
      if (unpinnedTabIds.length > 0) {
        try {
          await new Promise<void>((resolve, reject) => {
            browserApi.tabs.move(
              unpinnedTabIds,
              { windowId: destWindowId, index: -1 },
              () => {
                if (browserApi.runtime?.lastError) reject(new Error(browserApi.runtime.lastError.message))
                else resolve()
              }
            )
          })
          movedCount += unpinnedTabIds.length
          movedTabIds.push(...unpinnedTabIds)
        } catch (err) {
          console.warn('[windowManagerService] Warning moving unpinned tabs:', err)
        }
      }

      // If all tabs in this window were candidate tabs, Chrome will close it automatically
      if (candidateTabs.length === tabs.length) {
        closedWindowsCount++
      }
    }

    // Optional: Group the gathered tabs if requested
    let createdGroupId: number | undefined
    if (options.groupName && movedTabIds.length > 0 && browserApi.tabs.group) {
      try {
        const gid = await new Promise<number>((resolve, reject) => {
          browserApi.tabs.group({ tabIds: movedTabIds }, (id: number) => {
            if (browserApi.runtime?.lastError) reject(new Error(browserApi.runtime.lastError.message))
            else resolve(id)
          })
        })
        if (gid && browserApi.tabGroups?.update) {
          await browserApi.tabGroups.update(gid, {
            title: options.groupName,
            color: (options.groupColor as any) || 'blue'
          })
        }
        createdGroupId = gid
      } catch (err) {
        console.warn('[windowManagerService] Optional grouping warning:', err)
      }
    }

    // Bring destination window to focus
    browserApi.windows.update(destWindowId, { focused: true }, () => {})

    return {
      success: true,
      movedCount,
      closedWindowsCount,
      skippedIncognitoCount,
      destinationWindowId: destWindowId,
      createdGroupId
    }
  } catch (err: any) {
    return {
      success: false,
      movedCount: 0,
      closedWindowsCount: 0,
      skippedIncognitoCount: 0,
      error: err?.message || 'Failed to combine windows'
    }
  }
}
