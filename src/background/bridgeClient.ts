/**
 * Excited Gem Companion Bridge Client
 * Connects the browser extension to the local Excited Gem Desktop App (ws://127.0.0.1:49221)
 */

import { extractVideoId } from '../utils/youtube'
import { isSameBrowserEngine, normalizeBrowserEngine } from '../adapter/types'

let socket: WebSocket | null = null
let reconnectTimer: any = null
let heartbeatInterval: any = null
const BRIDGE_PORT = 49221

function detectBrowserEngine(): { engine: string; name: string; id: string } {
  const ua = (typeof navigator !== 'undefined' ? navigator.userAgent : '').toLowerCase()
  const engine = normalizeBrowserEngine(ua)
  const engineNames: Record<string, string> = {
    opera: 'Opera',
    edge: 'Microsoft Edge',
    brave: 'Brave',
    firefox: 'Mozilla Firefox',
    chrome: 'Google Chrome',
    safari: 'Safari'
  }
  const name = engineNames[engine] || 'Google Chrome'
  const id = `${engine === 'other' ? 'chrome' : engine}-main`
  return { engine: engine === 'other' ? 'chrome' : engine, name, id }
}

function matchesBrowser(targetId: string | undefined, currentId: string, engine: string): boolean {
  if (!targetId || targetId === 'all') return true
  return isSameBrowserEngine(targetId, currentId) || isSameBrowserEngine(targetId, engine)
}

export interface BridgeClientOptions {
  fetchYouTubeApiInfo?: (videoId: string, force?: boolean) => Promise<any>
}

export function initBridgeClient(options?: BridgeClientOptions) {
  if (typeof WebSocket === 'undefined') return

  const browserInfo = detectBrowserEngine()

  async function sendYoutubeCache() {
    try {
      if (typeof chrome === 'undefined' || !chrome.storage?.local) return
      const storageData = await chrome.storage.local.get(['youtubeInfoMap', 'youtubeApiCache', 'youtubeApiKey'])
      send({
        type: 'YOUTUBE_CACHE_UPDATE',
        payload: {
          youtubeInfoMap: storageData.youtubeInfoMap || {},
          youtubeApiCache: storageData.youtubeApiCache || {},
          youtubeApiKey: storageData.youtubeApiKey || ''
        }
      })
    } catch (e) {
      console.error('[Bridge] Error sending YouTube cache:', e)
    }
  }

  function connect() {
    try {
      socket = new WebSocket(`ws://127.0.0.1:${BRIDGE_PORT}`)

      socket.onopen = async () => {
        console.log('[Excited Gem Bridge] Connected to Desktop App')
        sendHandshake()
        await broadcastWindowState()
        if (heartbeatInterval) clearInterval(heartbeatInterval)
        heartbeatInterval = setInterval(() => {
          if (socket && socket.readyState === WebSocket.OPEN) {
            send({ type: 'HEARTBEAT', browserId: browserInfo.id })
          }
        }, 20000)
      }

      socket.onmessage = async (event) => {
        try {
          const msg = JSON.parse(event.data)
          await handleDesktopCommand(msg)
        } catch (e) {
          console.error('[Bridge] Failed to handle message:', e)
        }
      }

      socket.onclose = () => {
        if (heartbeatInterval) clearInterval(heartbeatInterval)
        scheduleReconnect()
      }

      socket.onerror = () => {
        // Desktop app might not be running; will retry silently
        if (heartbeatInterval) clearInterval(heartbeatInterval)
        scheduleReconnect()
      }
    } catch {
      scheduleReconnect()
    }
  }

  function scheduleReconnect() {
    socket = null
    if (reconnectTimer) return
    reconnectTimer = setTimeout(() => {
      reconnectTimer = null
      connect()
    }, 5000)
  }

  function send(data: any) {
    if (socket && socket.readyState === WebSocket.OPEN) {
      socket.send(JSON.stringify(data))
    }
  }

  function sendHandshake() {
    send({
      type: 'CONNECTED_BROWSERS_UPDATE',
      browsers: [
        {
          id: browserInfo.id,
          name: browserInfo.name,
          engine: browserInfo.engine,
          isConnected: true,
          windowCount: 1,
          tabCount: 0
        }
      ]
    })
    sendYoutubeCache()
  }

  async function broadcastWindowState(excludeTabId?: number, excludeWindowId?: number) {
    if (typeof chrome === 'undefined' || !chrome.windows) return
    try {
      const [windows, storageData] = await Promise.all([
        chrome.windows.getAll({
          populate: true,
          windowTypes: ['normal']
        }),
        chrome.storage?.local
          ? chrome.storage.local.get(['youtubeInfoMap', 'youtubeApiCache', 'youtubeApiKey'])
          : Promise.resolve({} as any)
      ])

      const youtubeInfoMap = storageData?.youtubeInfoMap || {}
      const youtubeApiCache = storageData?.youtubeApiCache || {}
      const youtubeApiKey = storageData?.youtubeApiKey || ''

      const unifiedWindows = windows
        .filter((win) => (excludeWindowId ? win.id !== excludeWindowId : true))
        .map((win) => ({
          id: win.id ?? 0,
          browserId: browserInfo.id,
          focused: Boolean(win.focused),
          incognito: Boolean(win.incognito),
          tabs: (win.tabs || [])
            .filter((t) => (excludeTabId ? t.id !== excludeTabId : true))
            .map((t, idx) => {
          let youtubeInfo = (t as any).youtubeInfo || (t.url ? youtubeInfoMap[t.url] : undefined)
          if (!youtubeInfo && t.url) {
            const vId = extractVideoId(t.url)
            if (vId) {
              if (youtubeApiCache[vId]) {
                youtubeInfo = {
                  title: youtubeApiCache[vId].title,
                  duration: youtubeApiCache[vId].duration || 0
                }
              } else if (youtubeApiKey && options?.fetchYouTubeApiInfo) {
                // Auto trigger background fetch in extension if missing
                options.fetchYouTubeApiInfo(vId).then(() => {
                  debouncedBroadcast(300)
                }).catch(() => {})
              }
            }
          }

          return {
            id: t.id ?? 0,
            browserId: browserInfo.id,
            windowId: t.windowId ?? win.id ?? 0,
            index: t.index ?? idx,
            title: t.title || 'Untitled Tab',
            url: t.url || '',
            favIconUrl: t.favIconUrl,
            active: Boolean(t.active),
            pinned: Boolean(t.pinned),
            audible: Boolean(t.audible),
            discarded: Boolean(t.discarded),
            status: t.status,
            groupId: t.groupId,
            incognito: Boolean(t.incognito),
            youtubeInfo
          }
        })
      }))

      send({
        type: 'WINDOWS_UPDATE',
        browserId: browserInfo.id,
        windows: unifiedWindows
      })
    } catch (e) {
      console.error('[Bridge] Error broadcasting windows:', e)
    }
  }

  async function moveTabSafely(tabId: number, targetWindowId: number, index: number = -1): Promise<void> {
    try {
      await chrome.tabs.move(tabId, { windowId: targetWindowId, index })
      return
    } catch {
      // Attempt unpinning if it was pinned (Chromium throws if moving pinned tab to index -1 after unpinned)
      try {
        await chrome.tabs.update(tabId, { pinned: false })
        await chrome.tabs.move(tabId, { windowId: targetWindowId, index })
        return
      } catch {}

      // Fallback: recreate in target window and remove old tab (e.g. across incognito boundaries)
      try {
        const tab = await chrome.tabs.get(tabId)
        if (tab?.url) {
          await chrome.tabs.create({ windowId: targetWindowId, url: tab.url, active: false })
          await chrome.tabs.remove(tabId)
        }
      } catch (finalErr) {
        console.warn('[Bridge] moveTabSafely failed for tab:', tabId, finalErr)
      }
    }
  }

  async function handleDesktopCommand(cmd: any) {
    if (cmd.browserId && !matchesBrowser(cmd.browserId, browserInfo.id, browserInfo.engine)) {
      return // Not for this browser
    }

    switch (cmd.type) {
      case 'GET_ALL_WINDOWS':
      case 'GET_CONNECTED_BROWSERS':
        sendHandshake()
        await broadcastWindowState()
        break

      case 'GET_YOUTUBE_CACHE':
        await sendYoutubeCache()
        break

      case 'FETCH_YOUTUBE_DURATIONS':
        if (options?.fetchYouTubeApiInfo) {
          const videoIds: string[] = Array.isArray(cmd.videoIds) ? cmd.videoIds : []
          if (videoIds.length === 0 && chrome.tabs) {
            const ytTabs = await chrome.tabs.query({})
            for (const t of ytTabs) {
              if (t.url) {
                const vid = extractVideoId(t.url)
                if (vid && !videoIds.includes(vid)) videoIds.push(vid)
              }
            }
          }
          for (const vId of videoIds) {
            try {
              await options.fetchYouTubeApiInfo(vId)
            } catch {}
          }
          await sendYoutubeCache()
          await broadcastWindowState()
        }
        break

      case 'FOCUS_TAB':
        try {
          if (cmd.windowId) {
            await chrome.windows.update(Number(cmd.windowId), { focused: true })
          }
          if (cmd.tabId) {
            await chrome.tabs.update(Number(cmd.tabId), { active: true })
          }
          await broadcastWindowState()
        } catch (e) {
          console.error('[Bridge] Error focusing tab:', e)
        }
        break

      case 'FOCUS_WINDOW':
        try {
          if (cmd.windowId) {
            await chrome.windows.update(Number(cmd.windowId), { focused: true })
          }
        } catch (e) {
          console.error('[Bridge] Error focusing window:', e)
        }
        break

      case 'CLOSE_TAB':
        try {
          if (cmd.tabId) {
            const numericTabId = Number(cmd.tabId)
            await chrome.tabs.remove(numericTabId)
            await broadcastWindowState(numericTabId)
          }
        } catch (e) {
          console.error('[Bridge] Error closing tab:', e)
        }
        break

      case 'CLOSE_WINDOW':
        try {
          if (cmd.windowId) {
            const numericWinId = Number(cmd.windowId)
            await chrome.windows.remove(numericWinId)
            await broadcastWindowState(undefined, numericWinId)
          }
        } catch (e) {
          console.error('[Bridge] Error closing window:', e)
        }
        break

      case 'CREATE_TAB':
        try {
          const createProps: chrome.tabs.CreateProperties = {
            url: cmd.url || 'about:blank'
          }
          if (cmd.windowId) {
            createProps.windowId = Number(cmd.windowId)
          }
          await chrome.tabs.create(createProps)
          await broadcastWindowState()
        } catch (e) {
          console.error('[Bridge] Error creating tab:', e)
        }
        break

      case 'MOVE_TAB':
        if (cmd.tabId && cmd.windowId) {
          await moveTabSafely(Number(cmd.tabId), Number(cmd.windowId), cmd.index ?? -1)
          await broadcastWindowState()
        }
        break

      case 'MOVE_TABS':
        if (Array.isArray(cmd.tabIds) && cmd.tabIds.length > 0 && cmd.windowId) {
          const targetWinId = Number(cmd.windowId)
          const numericTabIds = cmd.tabIds.map(Number).filter((id: number) => !isNaN(id) && id > 0)
          try {
            await chrome.tabs.move(numericTabIds, {
              windowId: targetWinId,
              index: cmd.index ?? -1
            })
          } catch {
            // Fallback: move one by one safely if batch move fails
            for (const tid of numericTabIds) {
              await moveTabSafely(tid, targetWinId, cmd.index ?? -1)
            }
          }
          await broadcastWindowState()
        }
        break

      case 'DISCARD_TAB':
        try {
          if (cmd.tabId && chrome.tabs.discard) {
            await chrome.tabs.discard(Number(cmd.tabId))
            await broadcastWindowState()
          }
        } catch (e) {
          console.error('[Bridge] Error discarding tab:', e)
        }
        break

      case 'MIGRATE_TAB':
        // If this browser is target
        if (matchesBrowser(cmd.targetBrowserId, browserInfo.id, browserInfo.engine) && cmd.url) {
          try {
            const createProps: chrome.tabs.CreateProperties = { url: cmd.url }
            if (cmd.targetWindowId) {
              createProps.windowId = Number(cmd.targetWindowId)
            }
            await chrome.tabs.create(createProps)
          } catch {
            await chrome.tabs.create({ url: cmd.url })
          }
          await broadcastWindowState()
        }
        // If this browser is source
        if (matchesBrowser(cmd.sourceBrowserId, browserInfo.id, browserInfo.engine) && cmd.tabId) {
          try {
            await chrome.tabs.remove(Number(cmd.tabId))
          } catch (e) {
            console.warn('[Bridge] Tab already removed or missing on source browser:', e)
          }
          await broadcastWindowState()
        }
        break

      case 'SORT_TABS':
        if (cmd.windowId && cmd.sortBy) {
          try {
            const winTabs = await chrome.tabs.query({ windowId: Number(cmd.windowId) })
            const { executeTabSort } = await import('../utils/tabSort')
            await executeTabSort(winTabs, {
              sortBy: cmd.sortBy,
              direction: cmd.direction || 'asc'
            })
            await broadcastWindowState()
          } catch (e) {
            console.error('[Bridge] Error sorting tabs:', e)
          }
        }
        break
    }
  }

  // Debounce broadcast to prevent flooding when multiple tabs detach/attach simultaneously
  let broadcastTimer: ReturnType<typeof setTimeout> | null = null
  const debouncedBroadcast = (delayMs = 60) => {
    if (broadcastTimer) clearTimeout(broadcastTimer)
    broadcastTimer = setTimeout(() => {
      broadcastWindowState()
    }, delayMs)
  }

  // Hook into Chrome extension events to push updates in real-time
  if (typeof chrome !== 'undefined' && chrome.tabs && chrome.windows) {
    const pushUpdate = () => {
      debouncedBroadcast(60)
    }

    chrome.tabs.onCreated.addListener(pushUpdate)
    chrome.tabs.onRemoved.addListener(pushUpdate)
    chrome.tabs.onUpdated.addListener(pushUpdate)
    chrome.tabs.onMoved.addListener(pushUpdate)
    if (chrome.tabs.onAttached) {
      chrome.tabs.onAttached.addListener(pushUpdate)
    }
    if (chrome.tabs.onDetached) {
      chrome.tabs.onDetached.addListener(pushUpdate)
    }
    if (chrome.tabs.onActivated) {
      chrome.tabs.onActivated.addListener(pushUpdate)
    }
    chrome.windows.onCreated.addListener(pushUpdate)
    chrome.windows.onRemoved.addListener(pushUpdate)
  }

  // Chrome MV3 KeepAlive via alarm
  if (typeof chrome !== 'undefined' && chrome.alarms) {
    try {
      chrome.alarms.create('excitedGemBridgeKeepAlive', { periodInMinutes: 0.5 })
      chrome.alarms.onAlarm.addListener((alarm) => {
        if (alarm.name === 'excitedGemBridgeKeepAlive') {
          if (!socket || socket.readyState !== WebSocket.OPEN) {
            connect()
          } else {
            broadcastWindowState()
          }
        }
      })
    } catch {
      // Ignore if alarms API is not available
    }
  }

  if (typeof chrome !== 'undefined' && chrome.runtime) {
    if (chrome.runtime.onStartup) {
      chrome.runtime.onStartup.addListener(() => {
        connect()
      })
    }
    if (chrome.runtime.onInstalled) {
      chrome.runtime.onInstalled.addListener(() => {
        connect()
      })
    }
  }

  connect()
}
