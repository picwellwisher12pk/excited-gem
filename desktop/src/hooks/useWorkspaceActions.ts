import React, { useCallback, useState, useRef, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { Modal } from 'antd'
import { getBrowserAdapter } from '../../../src/adapter'
import type { UnifiedWindow, UnifiedTab, ConnectedBrowser } from '../../../src/adapter/types'
import { setConnectedBrowsers } from '../../../src/store/browserSlice'
import type { RootState, AppDispatch } from '../../../src/store/store'

export interface WorkspaceActionsReturn {
  windows: UnifiedWindow[]
  browsers: ConnectedBrowser[]
  totalTabs: number
  refreshData: () => Promise<void>
  handleFocusTab: (browserId: string, windowId: number, tabId: number) => Promise<void>
  handleFocusWindow: (browserId: string, windowId: number) => Promise<void>
  handleCloseTab: (browserId: string, tabId: number) => Promise<void>
  handleCloseWindow: (browserId: string, windowId: number) => void
  handleCreateTab: (browserId: string, windowId?: number, url?: string) => Promise<void>
  handleCreateWindow: () => Promise<void>
  handleDiscardTab: (browserId: string, tabId: number) => Promise<void>
  handleMoveTabs: (browserId: string, tabIds: number[], targetWindowId: number, targetIndex?: number) => Promise<void>
  handleMigrateTab: (sourceBrowserId: string, targetBrowserId: string, tabId: number, url: string, targetWindowId?: number) => Promise<void>
  handleSortWindowTabs: (browserId: string, windowId: number, sortBy: string, direction?: 'asc' | 'desc') => Promise<void>
  setWindows: React.Dispatch<React.SetStateAction<UnifiedWindow[]>>
  setBrowsers: React.Dispatch<React.SetStateAction<ConnectedBrowser[]>>
}

export function useWorkspaceActions(): WorkspaceActionsReturn {
  const dispatch = useDispatch<AppDispatch>()
  const adapter = getBrowserAdapter()
  const selectedBrowserId = useSelector(
    (state: RootState) => state.browsers?.selectedBrowserId || 'all'
  )

  const [windows, setWindows] = useState<UnifiedWindow[]>([])
  const [browsers, setBrowsers] = useState<ConnectedBrowser[]>([])

  const refreshTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isRefreshingRef = useRef(false)
  const pendingRefreshRef = useRef(false)
  const pendingResolversRef = useRef<Array<() => void>>([])

  const performFetch = useCallback(async () => {
    if (isRefreshingRef.current) {
      pendingRefreshRef.current = true
      return
    }
    isRefreshingRef.current = true
    try {
      const [fetchedWindows, fetchedBrowsers] = await Promise.all([
        adapter.getAllWindows(),
        adapter.getConnectedBrowsers()
      ])
      setWindows(fetchedWindows)
      setBrowsers(fetchedBrowsers)
      dispatch(setConnectedBrowsers(fetchedBrowsers))
    } catch (err) {
      console.error('Error refreshing desktop data:', err)
    } finally {
      isRefreshingRef.current = false
      const resolvers = pendingResolversRef.current
      pendingResolversRef.current = []
      resolvers.forEach((r) => r())

      if (pendingRefreshRef.current) {
        pendingRefreshRef.current = false
        performFetch()
      }
    }
  }, [adapter, dispatch])

  const refreshData = useCallback((): Promise<void> => {
    return new Promise<void>((resolve) => {
      pendingResolversRef.current.push(resolve)
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
      refreshTimeoutRef.current = setTimeout(() => {
        refreshTimeoutRef.current = null
        performFetch()
      }, 50)
    })
  }, [performFetch])

  useEffect(() => {
    return () => {
      if (refreshTimeoutRef.current) {
        clearTimeout(refreshTimeoutRef.current)
      }
    }
  }, [])

  const handleFocusTab = useCallback(async (browserId: string, windowId: number, tabId: number) => {
    await adapter.focusTab(browserId, windowId, tabId)
  }, [adapter])

  const handleFocusWindow = useCallback(async (browserId: string, windowId: number) => {
    await adapter.focusWindow(browserId, windowId)
  }, [adapter])

  const handleCloseTab = useCallback(async (browserId: string, tabId: number) => {
    await adapter.closeTab(browserId, tabId)
    await refreshData()
  }, [adapter, refreshData])

  const handleCloseWindow = useCallback((browserId: string, windowId: number) => {
    Modal.confirm({
      title: 'Close Window',
      content: `Are you sure you want to close window #${windowId}? All tabs inside will be closed.`,
      okText: 'Close Window',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        await adapter.closeWindow(browserId, windowId)
        await refreshData()
      }
    })
  }, [adapter, refreshData])

  const handleCreateTab = useCallback(async (browserId: string, windowId?: number, url?: string) => {
    await adapter.createTab(browserId, windowId, url)
    await refreshData()
  }, [adapter, refreshData])

  const handleCreateWindow = useCallback(async () => {
    const targetBrowser = selectedBrowserId === 'all' ? 'chrome' : selectedBrowserId
    await adapter.createTab(targetBrowser)
    await refreshData()
  }, [adapter, selectedBrowserId, refreshData])

  const handleDiscardTab = useCallback(async (browserId: string, tabId: number) => {
    await adapter.discardTab(browserId, tabId)
    await refreshData()
  }, [adapter, refreshData])

  const handleMoveTabs = useCallback(async (
    browserId: string,
    tabIds: number[],
    targetWindowId: number,
    targetIndex?: number
  ) => {
    // Optimistic UI update so tabs move instantaneously
    setWindows((prev) => {
      const movedTabs: UnifiedTab[] = []
      const updated = prev.map((win) => {
        const remainingTabs = win.tabs.filter((t) => {
          if (tabIds.includes(t.id)) {
            movedTabs.push({ ...t, windowId: targetWindowId, browserId })
            return false
          }
          return true
        })
        return { ...win, tabs: remainingTabs }
      })
      return updated.map((win) => {
        if (win.id === targetWindowId) {
          const newTabs = [...win.tabs]
          if (typeof targetIndex === 'number' && targetIndex >= 0 && targetIndex <= newTabs.length) {
            newTabs.splice(targetIndex, 0, ...movedTabs)
          } else {
            newTabs.push(...movedTabs)
          }
          return { ...win, tabs: newTabs }
        }
        return win
      })
    })

    try {
      if (adapter.moveTabs) {
        await adapter.moveTabs(browserId, tabIds, targetWindowId, targetIndex)
      } else if (adapter.moveTab) {
        for (const id of tabIds) {
          await adapter.moveTab(browserId, id, targetWindowId, targetIndex)
        }
      }
    } catch (err) {
      console.error('Error in handleMoveTabs:', err)
      // Roll back optimistic update on error
      await refreshData()
      return
    }

    // Reconcile after a short delay to pick up any server-side reordering
    setTimeout(() => refreshData(), 300)
  }, [adapter, refreshData])

  const handleMigrateTab = useCallback(async (
    sourceBrowserId: string,
    targetBrowserId: string,
    tabId: number,
    url: string,
    targetWindowId?: number
  ) => {
    // Optimistic UI update
    setWindows((prev) =>
      prev.map((win) => ({
        ...win,
        tabs: win.tabs.filter((t) => t.id !== tabId)
      }))
    )
    try {
      await adapter.migrateTab(sourceBrowserId, targetBrowserId, tabId, url, targetWindowId)
    } catch (err) {
      console.error('Error migrating tab:', err)
      // Roll back optimistic update on error
      await refreshData()
      return
    }
    setTimeout(() => refreshData(), 400)
  }, [adapter, refreshData])

  const handleSortWindowTabs = useCallback(async (
    browserId: string,
    windowId: number,
    sortBy: string,
    direction: 'asc' | 'desc' = 'asc'
  ) => {
    if (adapter.sortWindowTabs) {
      await adapter.sortWindowTabs(browserId, windowId, sortBy, direction)
      await refreshData()
    }
  }, [adapter, refreshData])

  const totalTabs = windows.reduce((acc, win) => acc + win.tabs.length, 0)

  return {
    windows,
    browsers,
    totalTabs,
    refreshData,
    handleFocusTab,
    handleFocusWindow,
    handleCloseTab,
    handleCloseWindow,
    handleCreateTab,
    handleCreateWindow,
    handleDiscardTab,
    handleMoveTabs,
    handleMigrateTab,
    handleSortWindowTabs,
    setWindows,
    setBrowsers
  }
}
