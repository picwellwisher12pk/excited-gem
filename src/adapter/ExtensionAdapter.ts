import type {
  IBrowserAdapter,
  ConnectedBrowser,
  UnifiedWindow,
  UnifiedTab
} from './types'

export class ExtensionAdapter implements IBrowserAdapter {
  async getConnectedBrowsers(): Promise<ConnectedBrowser[]> {
    const isFirefox = typeof browser !== 'undefined'
    return [
      {
        id: 'local-browser',
        name: isFirefox ? 'Mozilla Firefox' : 'Google Chrome',
        engine: isFirefox ? 'firefox' : 'chrome',
        isConnected: true,
        windowCount: 1,
        tabCount: 0
      }
    ]
  }

  async getAllWindows(): Promise<UnifiedWindow[]> {
    if (typeof chrome === 'undefined' || !chrome.windows) return []
    const windows = await chrome.windows.getAll({
      populate: true,
      windowTypes: ['normal']
    })

    return windows.map((win) => ({
      id: win.id ?? 0,
      browserId: 'local-browser',
      focused: Boolean(win.focused),
      incognito: Boolean(win.incognito),
      type: win.type,
      tabs: (win.tabs || []).map((t, idx) => ({
        id: t.id ?? 0,
        browserId: 'local-browser',
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
        incognito: Boolean(t.incognito)
      }))
    }))
  }

  async getTabs(
    _browserId?: string,
    windowId?: number | string
  ): Promise<UnifiedTab[]> {
    if (typeof chrome === 'undefined' || !chrome.tabs) return []
    const query: chrome.tabs.QueryInfo = {}
    if (windowId && windowId !== 'all') {
      query.windowId = Number(windowId)
    }
    const tabs = await chrome.tabs.query(query)
    return tabs.map((t, idx) => ({
      id: t.id ?? 0,
      browserId: 'local-browser',
      windowId: t.windowId ?? 0,
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
      incognito: Boolean(t.incognito)
    }))
  }

  async focusTab(
    _browserId: string,
    windowId: number,
    tabId: number
  ): Promise<void> {
    if (typeof chrome === 'undefined') return
    await chrome.windows.update(windowId, { focused: true })
    await chrome.tabs.update(tabId, { active: true })
  }

  async focusWindow(_browserId: string, windowId: number): Promise<void> {
    if (typeof chrome === 'undefined') return
    await chrome.windows.update(windowId, { focused: true })
  }

  async closeTab(_browserId: string, tabId: number): Promise<void> {
    if (typeof chrome === 'undefined') return
    await chrome.tabs.remove(tabId)
  }

  async closeWindow(_browserId: string, windowId: number): Promise<void> {
    if (typeof chrome === 'undefined') return
    await chrome.windows.remove(windowId)
  }

  async createTab(
    _browserId: string,
    windowId?: number,
    url?: string
  ): Promise<UnifiedTab | null> {
    if (typeof chrome === 'undefined') return null
    const created = await chrome.tabs.create({
      windowId: windowId,
      url: url || 'chrome://newtab'
    })
    return {
      id: created.id ?? 0,
      browserId: 'local-browser',
      windowId: created.windowId ?? 0,
      index: created.index ?? 0,
      title: created.title || '',
      url: created.url || '',
      favIconUrl: created.favIconUrl,
      active: Boolean(created.active),
      pinned: Boolean(created.pinned),
      audible: Boolean(created.audible),
      discarded: Boolean(created.discarded),
      incognito: Boolean(created.incognito)
    }
  }

  async moveTab(
    _browserId: string,
    tabId: number,
    targetWindowId: number,
    targetIndex?: number
  ): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.tabs) return
    await chrome.tabs.move(tabId, {
      windowId: targetWindowId,
      index: targetIndex ?? -1
    })
  }

  async moveTabs(
    _browserId: string,
    tabIds: number[],
    targetWindowId: number,
    targetIndex?: number
  ): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.tabs || tabIds.length === 0) return
    await chrome.tabs.move(tabIds, {
      windowId: targetWindowId,
      index: targetIndex ?? -1
    })
  }

  async discardTab(_browserId: string, tabId: number): Promise<void> {
    if (typeof chrome !== 'undefined' && chrome.tabs.discard) {
      await chrome.tabs.discard(tabId)
    }
  }

  async migrateTab(
    _sourceBrowserId: string,
    _targetBrowserId: string,
    tabId: number,
    url: string,
    targetWindowId?: number
  ): Promise<void> {
    // In extension mode, migration just duplicates or opens in new window
    await this.closeTab('local-browser', tabId)
    await this.createTab('local-browser', targetWindowId, url)
  }

  async sortWindowTabs(
    _browserId: string,
    windowId: number,
    sortBy: string,
    direction: 'asc' | 'desc' = 'asc'
  ): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.tabs) return
    const tabs = await chrome.tabs.query({ windowId })
    const { executeTabSort } = await import('../utils/tabSort')
    await executeTabSort(tabs, {
      sortBy: sortBy as any,
      direction
    })
  }

  onTabsChanged(listener: (browserId: string) => void): () => void {
    if (typeof chrome === 'undefined' || !chrome.tabs) return () => {}
    const handler = () => listener('local-browser')
    chrome.tabs.onCreated.addListener(handler)
    chrome.tabs.onRemoved.addListener(handler)
    chrome.tabs.onUpdated.addListener(handler)
    return () => {
      chrome.tabs.onCreated.removeListener(handler)
      chrome.tabs.onRemoved.removeListener(handler)
      chrome.tabs.onUpdated.removeListener(handler)
    }
  }

  onBrowsersChanged(
    listener: (browsers: ConnectedBrowser[]) => void
  ): () => void {
    this.getConnectedBrowsers().then(listener)
    return () => {}
  }
}
