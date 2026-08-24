import { getTabs, setBadge, setTabCountInBadge } from './scripts/browserActions'
import { preferences } from './scripts/defaultPreferences'
import { extractVideoId, parseIsoDuration } from './utils/youtube'
import { getRoutines, syncRoutineAlarms } from './services/routineStorage'
import { executeRoutine } from './services/routineEngine'
import debounce from 'lodash/debounce'

const browser = (typeof window !== 'undefined' ? window.browser : (globalThis as any).browser) || chrome

console.log('DEBUG: Background script loaded')

// --- Storage Debouncing & Cache Management ---
const MAX_CACHE_SIZE = 1000
const youtubeVideoInfo = new Map<any, any>()
const youtubeApiCache = new Map<string, any>()

function pruneCache() {
  if (youtubeApiCache.size <= MAX_CACHE_SIZE) return

  // Sort by timestamp and keep only the newest ones
  const entries = Array.from(youtubeApiCache.entries())
  entries.sort((a, b) => (b[1].timestamp || 0) - (a[1].timestamp || 0))

  const kept = entries.slice(0, MAX_CACHE_SIZE)
  youtubeApiCache.clear()
  kept.forEach(([id, info]) => youtubeApiCache.set(id, info))
}

// Debounce storage writes to avoid IO errors during bulk updates
let saveTimeout: any = null
function debouncedSaveYoutubeCache() {
  if (saveTimeout) clearTimeout(saveTimeout)
  saveTimeout = setTimeout(() => {
    pruneCache()
    browser.storage.local.set({
      youtubeApiCache: Object.fromEntries(youtubeApiCache)
    })
    saveTimeout = null
  }, 1000)
}

let saveInfoMapTimeout: any = null
function debouncedSaveYoutubeInfoMap() {
  if (saveInfoMapTimeout) clearTimeout(saveInfoMapTimeout)
  saveInfoMapTimeout = setTimeout(() => {
    browser.storage.local.set({
      youtubeInfoMap: Object.fromEntries(youtubeVideoInfo)
    })
    saveInfoMapTimeout = null
  }, 1000)
}
// --------------------------

function onRemoved(tabId, removeInfo) {
  getTabs().then((tabs) => {
    // window.tabs = tabs;
  })
}

browser.runtime.onInstalled.addListener(() => {
  let jsonObj = {}
  jsonObj['preferences'] = preferences
  browser.storage.local.set(jsonObj).then((result) => {
    browser.storage.local.get('preferences').then((result) => {})
  })
  getTabs('current').then((tabs) => setBadge(tabs.length))
  syncRoutineAlarms().catch((err) => console.error('Error syncing routine alarms:', err))
})

// --- Routine Automation Handlers ---
if (browser.alarms) {
  browser.alarms.onAlarm.addListener(async (alarm: any) => {
    if (alarm?.name?.startsWith('routine_alarm_')) {
      const routineId = alarm.name.replace('routine_alarm_', '')
      try {
        const routines = await getRoutines()
        const routine = routines.find((r) => r.id === routineId)
        if (routine && routine.enabled) {
          console.log(`[Routine Alarm] Running "${routine.name}"`)
          await executeRoutine(routine, { targetScope: routine.targetScope })
        }
      } catch (err) {
        console.error('[Routine Alarm Error]', err)
      }
    }
  })
}

browser.runtime.onStartup.addListener(async () => {
  try {
    const routines = await getRoutines()
    await syncRoutineAlarms(routines)
    for (const routine of routines) {
      if (routine.enabled && routine.triggers?.onStartup) {
        console.log(`[Routine Startup] Running "${routine.name}"`)
        await executeRoutine(routine, { targetScope: routine.targetScope })
      }
    }
  } catch (err) {
    console.error('[Routine Startup Error]', err)
  }
})
browser.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log('Excited Gem: Tab Removed/Closed.')
  onRemoved(tabId, removeInfo)
  setTabCountInBadge(tabId, true)
})

browser.tabs.onDetached.addListener(onRemoved)

browser.tabs.onCreated.addListener((tab) => {
  getTabs('current').then((tabs) => setBadge(tabs.length))
  if (tab.url) handleTabForYouTubeApi(tab.url)
})
browser.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    handleTabForYouTubeApi(changeInfo.url)
  }
})

browser.tabs.onAttached.addListener(() => {
  getTabs('current').then((tabs) => setBadge(tabs.length))
})

/* Browser Actions */

async function openInTab(
  url: string,
  mode: 'single' | 'per-window',
  currentWindowId: number
) {
  if (mode === 'single') {
    const tabs = await browser.tabs.query({ url })
    if (tabs.length > 0) {
      const tab = tabs[0]
      if (tab.id) {
        await browser.tabs.update(tab.id, { active: true })
        await browser.windows.update(tab.windowId, { focused: true })
      }
      return
    }
  } else {
    // per-window
    const tabs = await browser.tabs.query({ url, windowId: currentWindowId })
    if (tabs.length > 0) {
      if (tabs[0].id) {
        await browser.tabs.update(tabs[0].id, { active: true })
      }
      return
    }
  }

  // If not found, create
  await browser.tabs.create({ url, pinned: true })
}

browser.action.onClicked.addListener(async (tab) => {
  // If openPanelOnActionClick is true (sidebar mode), this listener will NOT fire.
  // If popup is set (popup mode), this listener will NOT fire.
  // So this only fires for 'tab' mode or fallback.
  const { tabManagementMode = 'single' } = await browser.storage.local.get([
    'tabManagementMode'
  ])
  const extensionUrl = browser.runtime.getURL('/tabs/home.html')

  console.log('DEBUG: onClicked fired. Assuming Tab Mode.')
  await openInTab(extensionUrl, tabManagementMode, tab.windowId)
})

// Restore state from storage on startup
browser.storage.local
  .get(['youtubeInfoMap', 'youtubeApiCache'])
  .then(({ youtubeInfoMap, youtubeApiCache: savedCache }) => {
    if (youtubeInfoMap) {
      Object.entries(youtubeInfoMap).forEach(([url, info]) => {
        youtubeVideoInfo.set(url, info)
      })
      console.log(
        'DEBUG: Restored youtubeVideoInfo from storage:',
        youtubeVideoInfo
      )
    }
    if (savedCache) {
      Object.entries(savedCache).forEach(([videoId, info]) => {
        youtubeApiCache.set(videoId, info)
      })
      console.log(
        'DEBUG: Restored youtubeApiCache from storage:',
        youtubeApiCache
      )
    }
  })

const fetchingYoutubeApi = new Set<string>()

async function fetchYouTubeApiInfo(videoId: string, force = false) {
  console.log(`DEBUG: fetchYouTubeApiInfo called for ${videoId} (force=${force})`)
  if (!force && youtubeApiCache.has(videoId)) {
    const cached = youtubeApiCache.get(videoId)!
    const isRecent = Date.now() - cached.timestamp < 24 * 60 * 60 * 1000;
    // If it's recent AND actually has a duration (or it's been less than 5 minutes for failures)
    if (isRecent && (cached.duration > 0 || Date.now() - cached.timestamp < 5 * 60 * 1000)) {
      console.log(`DEBUG: Using cached info for ${videoId}`);
      return cached;
    }
  }

  if (fetchingYoutubeApi.has(videoId)) return null
  fetchingYoutubeApi.add(videoId)

  const { youtubeApiKey: customApiKey } =
    await browser.storage.local.get('youtubeApiKey')
  const apiKey = customApiKey || process.env.PLASMO_PUBLIC_YOUTUBE_API_KEY
  if (!apiKey || apiKey === 'YOUR_YOUTUBE_API_KEY_HERE' || apiKey === '') {
    fetchingYoutubeApi.delete(videoId)
    return null
  }

  try {
    const res = await fetch(
      `https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${apiKey}`
    )
    const data = await res.json()
    if (data.items && data.items.length > 0) {
      const item = data.items[0]
      const title = item.snippet.title
      const durationStr = item.contentDetails.duration
      const duration = parseIsoDuration(durationStr)

      const info = { title, duration, timestamp: Date.now() }
      youtubeApiCache.set(videoId, info)
      debouncedSaveYoutubeCache()
      fetchingYoutubeApi.delete(videoId)
      return info
    } else {
      // API request succeeded but returned no items (e.g. video private/deleted)
      const info = {
        title: 'Unknown/Private Video',
        duration: 0,
        timestamp: Date.now()
      }
      youtubeApiCache.set(videoId, info)
      debouncedSaveYoutubeCache()
      fetchingYoutubeApi.delete(videoId)
      return info
    }
  } catch (e) {
    console.error('DEBUG: Failed to fetch YT API', e)
  }

  // Also cache as failed if there's a network error so we don't spam requests
  const info = { title: 'Unknown Video', duration: 0, timestamp: Date.now() }
  youtubeApiCache.set(videoId, info)
  debouncedSaveYoutubeCache()
  fetchingYoutubeApi.delete(videoId)
  return info
}

function handleTabForYouTubeApi(url?: string) {
  if (url && (url.includes('youtube.com/') || url.includes('youtu.be/'))) {
    const videoId = extractVideoId(url)
    if (videoId) {
      fetchYouTubeApiInfo(videoId)
    }
  }
}

// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Handle messages from YouTube content script
  if (message.type === 'YOUTUBE_VIDEO_INFO' && message.url) {
    // console.log("DEBUG: Background received YOUTUBE_VIDEO_INFO", message.data);
    const url = message.url
    youtubeVideoInfo.set(url, message.data)

    // Store in local storage so UI components can pick it up
    debouncedSaveYoutubeInfoMap()
  }

  // Handle requests for YouTube info
  if (message.type === 'GET_ALL_YOUTUBE_INFO') {
    sendResponse(Array.from(youtubeVideoInfo.entries()))
    return true
  }

  // Handle on-demand requests for YouTube API info (e.g. unloaded tabs)
  if (message.type === 'FETCH_YOUTUBE_API_INFO' && message.videoId) {
    console.log(
      'DEBUG: Background received FETCH_YOUTUBE_API_INFO for',
      message.videoId,
      'force:',
      !!message.force
    )
    fetchYouTubeApiInfo(message.videoId, !!message.force)
  }

  if (message.type === 'REFRESH_YOUTUBE_DATA') {
    console.log('DEBUG: Background received REFRESH_YOUTUBE_DATA')
    chrome.tabs.query({}).then((tabs) => {
      tabs.forEach((tab) => {
        if (tab.url && (tab.url.includes('youtube.com/') || tab.url.includes('youtu.be/'))) {
          const videoId = extractVideoId(tab.url)
          if (videoId) {
            fetchYouTubeApiInfo(videoId, true)
          }
        }
      })
    })
  }

  // Handle Routine Run message
  if (message.type === 'RUN_ROUTINE') {
    getRoutines().then((routines) => {
      const routine = routines.find((r) => r.id === message.routineId)
      if (routine) {
        executeRoutine(routine, message.context || {}).then((result) => {
          sendResponse(result)
        })
      } else {
        sendResponse({ success: false, error: 'Routine not found' })
      }
    })
    return true
  }

  if (message.type === 'SYNC_ROUTINE_ALARMS') {
    syncRoutineAlarms().then(() => sendResponse({ success: true }))
    return true
  }

  // ─── AI Action Handlers ─────────────────────────────────────────────────
  if (message.type === 'AI_SAVE_SESSION') {
    // Delegate to existing session save logic
    chrome.storage.local.get(['sessions', 'pref'], (result) => {
      const sessions = result.sessions ?? {}
      const sessionName = message.name || `Session ${new Date().toLocaleDateString()}`
      chrome.tabs.query({}).then((tabs) => {
        const targetTabs = message.tabIds 
          ? tabs.filter((t) => message.tabIds.includes(t.id))
          : tabs

        const byWindow: Record<number, any[]> = {}
        targetTabs.forEach((t) => {
          if (t.windowId && t.url) {
            if (!byWindow[t.windowId]) byWindow[t.windowId] = []
            byWindow[t.windowId].push({ url: t.url, title: t.title ?? '' })
          }
        })
        sessions[Date.now()] = { name: sessionName, created: Date.now(), windows: byWindow }
        chrome.storage.local.set({ sessions })
        sendResponse({ success: true })
      })
    })
    return true // async
  }

  if (message.type === 'AI_SAVE_TO_LIST') {
    chrome.storage.local.get(['lists'], (result) => {
      const lists = result.lists ?? {}
      const listName = message.listName || 'AI Saved Tabs'
      if (!lists[listName]) lists[listName] = []
      chrome.tabs.query({}).then((tabs) => {
        const tabsToSave = tabs.filter((t) => message.tabIds.includes(t.id))
        tabsToSave.forEach((t) => {
          lists[listName].push({ url: t.url, title: t.title, added: Date.now() })
        })
        chrome.storage.local.set({ lists })
        sendResponse({ success: true })
      })
    })
    return true
  }
  if (message.type === 'AI_RESTORE_SESSION') {
    chrome.storage.local.get(['sessions'], (result) => {
      const sessions = result.sessions ?? {}
      const session = Object.values(sessions).find((s: any) => s.name === message.sessionName) as any
      if (session) {
        Object.values(session.windows).forEach((tabs: any) => {
          tabs.forEach((t: any) => chrome.tabs.create({ url: t.url }))
        })
        sendResponse({ success: true })
      } else {
        sendResponse({ success: false, error: 'Session not found' })
      }
    })
    return true
  }

  if (message.type === 'AI_LIST_SESSIONS') {
    chrome.storage.local.get(['sessions'], (result) => {
      const sessions = result.sessions ?? {}
      sendResponse({ success: true, sessions: Object.values(sessions) })
    })
    return true
  }

  if (message.type === 'AI_DELETE_SESSION') {
    chrome.storage.local.get(['sessions'], (result) => {
      const sessions = result.sessions ?? {}
      const keyToDelete = Object.keys(sessions).find((k) => sessions[k].name === message.sessionName)
      if (keyToDelete) {
        delete sessions[keyToDelete]
        chrome.storage.local.set({ sessions })
        sendResponse({ success: true })
      } else {
        sendResponse({ success: false, error: 'Session not found' })
      }
    })
    return true
  }

  if (message.type === 'AI_RENAME_SESSION') {
    chrome.storage.local.get(['sessions'], (result) => {
      const sessions = result.sessions ?? {}
      const keyToRename = Object.keys(sessions).find((k) => sessions[k].name === message.oldName)
      if (keyToRename) {
        sessions[keyToRename].name = message.newName
        chrome.storage.local.set({ sessions })
        sendResponse({ success: true })
      } else {
        sendResponse({ success: false, error: 'Session not found' })
      }
    })
    return true
  }
  // ────────────────────────────────────────────────────────────────────────
})

// Clean up data when tabs are closed (debounced to avoid storage write storms)
const debouncedCleanupYouTubeInfo = debounce(async () => {
  try {
    const tabs = await chrome.tabs.query({})
    const activeUrls = new Set(tabs.map((t) => t.url).filter(Boolean))
    let changed = false
    for (const url of youtubeVideoInfo.keys()) {
      if (!activeUrls.has(url)) {
        youtubeVideoInfo.delete(url)
        changed = true
      }
    }
    if (changed) {
      debouncedSaveYoutubeInfoMap()
    }
  } catch (e) {
    console.error('Error cleaning up youtubeVideoInfo', e)
  }
}, 300)

chrome.tabs.onRemoved.addListener(() => {
  debouncedCleanupYouTubeInfo()
})

// Update Action Popup state based on settings
// Update Action Popup and SidePanel behavior based on settings
const updateActionState = async (mode: string) => {
  console.log('DEBUG: Updating action state to:', mode)

  // 1. Configure SidePanel Behavior (if supported)
  // @ts-ignore
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    try {
      // @ts-ignore
      await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: mode === 'sidebar'
      })
      console.log('DEBUG: setPanelBehavior success')
    } catch (e) {
      console.error('DEBUG: setPanelBehavior failed', e)
    }
  }

  // 2. Configure Popup
  if (mode === 'popup') {
    await chrome.action.setPopup({ popup: 'tabs/home.html' })
  } else {
    // For 'sidebar' (native open) or 'tab' (handled by onClicked), remove popup
    await chrome.action.setPopup({ popup: '' })
  }
}

chrome.storage.local.get('displayMode').then(({ displayMode }) => {
  updateActionState(displayMode || 'tab')
})

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.displayMode) {
    updateActionState(changes.displayMode.newValue)
  }
})

// Dynamic Content Script Registration removed as we are using host_permissions and static declaration
