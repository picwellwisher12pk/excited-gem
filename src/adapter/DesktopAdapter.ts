import {
  type IBrowserAdapter,
  type ConnectedBrowser,
  type UnifiedWindow,
  type UnifiedTab,
  normalizeBrowserEngine,
  isSameBrowserEngine
} from './types'
import { desktopYoutubeService } from '../../desktop/src/services/desktopYoutubeService'

export class DesktopAdapter implements IBrowserAdapter {
  private socket: WebSocket | null = null
  private connectedBrowsers: ConnectedBrowser[] = []
  private windowsByBrowser: Map<string, UnifiedWindow[]> = new Map()
  private tabChangeListeners: Set<(browserId: string) => void> = new Set()
  private browserChangeListeners: Set<(browsers: ConnectedBrowser[]) => void> =
    new Set()
  private recentlyClosedTabIds: Map<number, number> = new Map()
  private port: number = 49221
  private reconnectTimer: any = null

  constructor(port = 49221) {
    this.port = port
    this.initSocket()
  }

  private initSocket() {
    try {
      this.socket = new WebSocket(`ws://127.0.0.1:${this.port}/desktop-client`)

      this.socket.onopen = () => {
        // Request initial handshake, state, and YouTube cache
        this.send({ type: 'GET_CONNECTED_BROWSERS' })
        this.send({ type: 'GET_ALL_WINDOWS' })
        this.send({ type: 'GET_YOUTUBE_CACHE' })
      }

      this.socket.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data)
          this.handleMessage(message)
        } catch (e) {
          console.error('Failed to parse desktop bridge message', e)
        }
      }

      this.socket.onclose = () => {
        this.scheduleReconnect()
      }

      this.socket.onerror = () => {
        this.scheduleReconnect()
      }
    } catch {
      this.scheduleReconnect()
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null
      this.initSocket()
    }, 3000)
  }

  private handleMessage(message: any) {
    switch (message.type) {
      case 'CONNECTED_BROWSERS_UPDATE': {
        const incoming: ConnectedBrowser[] = message.browsers || []
        const currentMap = new Map<string, ConnectedBrowser>(
          this.connectedBrowsers.map((b) => [b.id, b])
        )
        for (const b of incoming) {
          currentMap.set(b.id, { ...(currentMap.get(b.id) || {}), ...b, isConnected: true })
        }
        this.connectedBrowsers = Array.from(currentMap.values())
        this.browserChangeListeners.forEach((fn) => fn(this.connectedBrowsers))
        break
      }

      case 'YOUTUBE_CACHE_UPDATE':
        if (message.payload) {
          const { youtubeApiCache, youtubeInfoMap, youtubeApiKey } = message.payload
          desktopYoutubeService.importExtensionCache(youtubeApiCache, youtubeInfoMap, youtubeApiKey)
          this.enrichTabsWithYoutubeCache()
        }
        break

      case 'WINDOWS_UPDATE':
        if (message.browserId && message.windows) {
          const now = Date.now()
          for (const [id, ts] of this.recentlyClosedTabIds.entries()) {
            if (now - ts > 4000) {
              this.recentlyClosedTabIds.delete(id)
            }
          }
          const filteredWindows = (message.windows as UnifiedWindow[]).map((win) => ({
            ...win,
            tabs: (win.tabs || []).filter((tab) => !this.recentlyClosedTabIds.has(tab.id))
          }))
          const enrichedWindows = filteredWindows.map((win) => ({
            ...win,
            tabs: (win.tabs || []).map((tab) => {
              if (tab.url && (!tab.youtubeInfo?.duration || tab.youtubeInfo.duration <= 0)) {
                const dur = desktopYoutubeService.getDurationForUrl(tab.url)
                if (dur) {
                  return {
                    ...tab,
                    youtubeInfo: {
                      ...(tab.youtubeInfo || {}),
                      duration: dur
                    }
                  }
                }
              }
              return tab
            })
          }))
          this.windowsByBrowser.set(message.browserId, enrichedWindows)
          const tabCount = enrichedWindows.reduce(
            (sum: number, w: any) => sum + (w.tabs?.length || 0),
            0
          )
          const existing = this.connectedBrowsers.find((b) => b.id === message.browserId)
          if (existing) {
            existing.isConnected = true
            existing.windowCount = message.windows.length
            existing.tabCount = tabCount
          } else {
            const engine = normalizeBrowserEngine(message.browserId)
            const engineNames: Record<string, string> = {
              opera: 'Opera',
              edge: 'Microsoft Edge',
              brave: 'Brave',
              firefox: 'Mozilla Firefox',
              chrome: 'Google Chrome',
              safari: 'Safari'
            }
            const name = engineNames[engine] || 'Browser'
            this.connectedBrowsers.push({
              id: message.browserId,
              name,
              engine,
              isConnected: true,
              windowCount: message.windows.length,
              tabCount
            })
          }
          this.browserChangeListeners.forEach((fn) => fn(this.connectedBrowsers))
          this.tabChangeListeners.forEach((fn) => fn(message.browserId))
        }
        break

      case 'TABS_CHANGED':
        if (message.browserId) {
          this.tabChangeListeners.forEach((fn) => fn(message.browserId))
        }
        break
    }
  }

  private send(data: any) {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data))
    }
  }

  async getConnectedBrowsers(): Promise<ConnectedBrowser[]> {
    return this.connectedBrowsers
  }

  syncNow(): void {
    this.send({ type: 'GET_CONNECTED_BROWSERS' })
    this.send({ type: 'GET_ALL_WINDOWS' })
  }

  async getAllWindows(browserId?: string): Promise<UnifiedWindow[]> {
    const all: UnifiedWindow[] = []
    for (const wins of this.windowsByBrowser.values()) {
      all.push(...wins)
    }
    if (!browserId || browserId === 'all') {
      return all
    }
    return all.filter((w) => isSameBrowserEngine(w.browserId, browserId))
  }

  async getTabs(
    browserId?: string,
    windowId?: number | string
  ): Promise<UnifiedTab[]> {
    const windows = await this.getAllWindows(browserId)
    const tabs: UnifiedTab[] = []
    for (const win of windows) {
      if (!windowId || windowId === 'all' || win.id === Number(windowId)) {
        tabs.push(...win.tabs)
      }
    }
    return tabs
  }

  async focusTab(
    browserId: string,
    windowId: number,
    tabId: number
  ): Promise<void> {
    this.send({
      type: 'FOCUS_TAB',
      browserId,
      windowId,
      tabId
    })
  }

  async focusWindow(browserId: string, windowId: number): Promise<void> {
    this.send({
      type: 'FOCUS_WINDOW',
      browserId,
      windowId
    })
  }

  async closeTab(browserId: string, tabId: number): Promise<void> {
    this.recentlyClosedTabIds.set(tabId, Date.now())
    for (const [bId, windows] of this.windowsByBrowser.entries()) {
      if (isSameBrowserEngine(bId, browserId) || bId === browserId) {
        const updatedWindows = windows.map((w) => ({
          ...w,
          tabs: (w.tabs || []).filter((t) => t.id !== tabId)
        }))
        this.windowsByBrowser.set(bId, updatedWindows)
      }
    }
    this.tabChangeListeners.forEach((fn) => fn(browserId))
    this.send({
      type: 'CLOSE_TAB',
      browserId,
      tabId
    })
  }

  async closeWindow(browserId: string, windowId: number): Promise<void> {
    for (const [bId, windows] of this.windowsByBrowser.entries()) {
      if (isSameBrowserEngine(bId, browserId) || bId === browserId) {
        this.windowsByBrowser.set(
          bId,
          windows.filter((w) => w.id !== windowId)
        )
      }
    }
    this.tabChangeListeners.forEach((fn) => fn(browserId))
    this.send({
      type: 'CLOSE_WINDOW',
      browserId,
      windowId
    })
  }

  async createTab(
    browserId: string,
    windowId?: number,
    url?: string
  ): Promise<UnifiedTab | null> {
    this.send({
      type: 'CREATE_TAB',
      browserId,
      windowId,
      url: url || 'about:blank'
    })
    return null
  }

  async moveTab(
    browserId: string,
    tabId: number,
    targetWindowId: number,
    targetIndex?: number
  ): Promise<void> {
    this.send({
      type: 'MOVE_TAB',
      browserId,
      tabId,
      windowId: targetWindowId,
      index: targetIndex
    })
  }

  async moveTabs(
    browserId: string,
    tabIds: number[],
    targetWindowId: number,
    targetIndex?: number
  ): Promise<void> {
    this.send({
      type: 'MOVE_TABS',
      browserId,
      tabIds,
      windowId: targetWindowId,
      index: targetIndex
    })
  }

  async discardTab(browserId: string, tabId: number): Promise<void> {
    this.send({
      type: 'DISCARD_TAB',
      browserId,
      tabId
    })
  }

  async migrateTab(
    sourceBrowserId: string,
    targetBrowserId: string,
    tabId: number,
    url: string,
    targetWindowId?: number
  ): Promise<void> {
    this.send({
      type: 'MIGRATE_TAB',
      sourceBrowserId,
      targetBrowserId,
      tabId,
      url,
      targetWindowId
    })
  }

  async sortWindowTabs(
    browserId: string,
    windowId: number,
    sortBy: string,
    direction: 'asc' | 'desc' = 'asc'
  ): Promise<void> {
    this.send({
      type: 'SORT_TABS',
      browserId,
      windowId,
      sortBy,
      direction
    })
  }

  public enrichTabsWithYoutubeCache() {
    let anyUpdated = false
    for (const [_, windows] of this.windowsByBrowser.entries()) {
      for (const win of windows) {
        for (const tab of win.tabs) {
          if (tab.url) {
            const cachedDuration = desktopYoutubeService.getDurationForUrl(tab.url)
            if (cachedDuration && (!tab.youtubeInfo?.duration || tab.youtubeInfo.duration <= 0)) {
              tab.youtubeInfo = {
                ...(tab.youtubeInfo || {}),
                duration: cachedDuration
              }
              anyUpdated = true
            }
          }
        }
      }
    }
    if (anyUpdated) {
      this.tabChangeListeners.forEach((fn) => fn('all'))
    }
  }

  public requestYoutubeCache(): void {
    this.send({ type: 'GET_YOUTUBE_CACHE' })
  }

  public fetchYoutubeDurations(videoIds?: string[]): void {
    this.send({ type: 'FETCH_YOUTUBE_DURATIONS', videoIds })
  }

  public setYoutubeApiKey(apiKey: string): void {
    this.send({ type: 'SET_YOUTUBE_API_KEY', apiKey })
  }

  onTabsChanged(listener: (browserId: string) => void): () => void {
    this.tabChangeListeners.add(listener)
    return () => this.tabChangeListeners.delete(listener)
  }

  onBrowsersChanged(
    listener: (browsers: ConnectedBrowser[]) => void
  ): () => void {
    this.browserChangeListeners.add(listener)
    return () => this.browserChangeListeners.delete(listener)
  }
}
