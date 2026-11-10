import { useState, useCallback, useMemo, useRef } from 'react'
import type { SelectedTabIdentifier } from './types'
import type { UnifiedWindow } from '../../../src/adapter/types'

const EMPTY_LIST: SelectedTabIdentifier[] = []

interface UseWorkspaceSelectionProps {
  onCloseTab: (browserId: string, tabId: number) => Promise<void>
  onDiscardTab: (browserId: string, tabId: number) => Promise<void>
  onMigrateTab?: (
    sourceBrowserId: string,
    targetBrowserId: string,
    tabId: number,
    url: string
  ) => Promise<void>
}

export function useWorkspaceSelection({
  onCloseTab,
  onDiscardTab,
  onMigrateTab
}: UseWorkspaceSelectionProps) {
  const [selectedTabs, setSelectedTabs] = useState<Map<string, SelectedTabIdentifier>>(
    () => new Map()
  )
  const lastAnchorRef = useRef<string | null>(null)

  const handleToggleSelectTab = useCallback(
    (browserId: string, tabId: number, windowId: number, title: string, url: string) => {
      const key = `${browserId}:${tabId}`
      setSelectedTabs((prev) => {
        const next = new Map(prev)
        if (next.has(key)) {
          next.delete(key)
        } else {
          next.set(key, { browserId, tabId, windowId, title, url })
        }
        return next
      })
      lastAnchorRef.current = key
    },
    []
  )

  const handleSelectRangeInWindow = useCallback(
    (
      win: UnifiedWindow,
      clickedTab: { id: number; title: string; url: string },
      tabsToUse?: { id: number; title: string; url: string }[]
    ) => {
      const targetTabs = tabsToUse && tabsToUse.length > 0 ? tabsToUse : win.tabs
      const clickedIdx = targetTabs.findIndex((t) => t.id === clickedTab.id)
      if (clickedIdx === -1) return

      let anchorIdx = -1
      const anchorKey = lastAnchorRef.current
      if (anchorKey) {
        const [anchorBrowserId, anchorTabIdStr] = anchorKey.split(':')
        if (anchorBrowserId === win.browserId) {
          const anchorId = Number(anchorTabIdStr)
          anchorIdx = targetTabs.findIndex((t) => t.id === anchorId)
        }
      }

      // If no valid anchor in this window, select from start to clickedTab
      const start = anchorIdx !== -1 ? Math.min(anchorIdx, clickedIdx) : 0
      const end = anchorIdx !== -1 ? Math.max(anchorIdx, clickedIdx) : clickedIdx

      setSelectedTabs((prev) => {
        const next = new Map(prev)
        for (let i = start; i <= end; i++) {
          const t = targetTabs[i]
          const key = `${win.browserId}:${t.id}`
          next.set(key, {
            browserId: win.browserId,
            tabId: t.id,
            windowId: win.id,
            title: t.title,
            url: t.url
          })
        }
        return next
      })

      lastAnchorRef.current = `${win.browserId}:${clickedTab.id}`
    },
    []
  )

  const handleInvertSelectionInWindow = useCallback(
    (win: UnifiedWindow, tabsToUse?: { id: number; title: string; url: string }[]) => {
      const targetTabs = tabsToUse && tabsToUse.length > 0 ? tabsToUse : win.tabs
      setSelectedTabs((prev) => {
        const next = new Map(prev)
        for (const t of targetTabs) {
          const key = `${win.browserId}:${t.id}`
          if (next.has(key)) {
            next.delete(key)
          } else {
            next.set(key, {
              browserId: win.browserId,
              tabId: t.id,
              windowId: win.id,
              title: t.title,
              url: t.url
            })
          }
        }
        return next
      })
    },
    []
  )

  const handleSelectAllInWindow = useCallback(
    (win: UnifiedWindow, select: boolean, tabsToUse?: { id: number; title: string; url: string }[]) => {
      const targetTabs = tabsToUse && tabsToUse.length > 0 ? tabsToUse : win.tabs
      setSelectedTabs((prev) => {
        const next = new Map(prev)
        for (const tab of targetTabs) {
          const key = `${win.browserId}:${tab.id}`
          if (select) {
            next.set(key, {
              browserId: win.browserId,
              tabId: tab.id,
              windowId: win.id,
              title: tab.title,
              url: tab.url
            })
          } else {
            next.delete(key)
          }
        }
        return next
      })
      if (select && targetTabs.length > 0) {
        lastAnchorRef.current = `${win.browserId}:${targetTabs[0].id}`
      }
    },
    []
  )

  const handleClearSelection = useCallback(() => {
    setSelectedTabs(new Map())
    lastAnchorRef.current = null
  }, [])

  const handleCloseSelected = useCallback(async () => {
    const tabsToClose = Array.from(selectedTabs.values())
    for (const item of tabsToClose) {
      await onCloseTab(item.browserId, item.tabId)
    }
    setSelectedTabs(new Map())
  }, [selectedTabs, onCloseTab])

  const handleDiscardSelected = useCallback(async () => {
    const tabsToDiscard = Array.from(selectedTabs.values())
    for (const item of tabsToDiscard) {
      await onDiscardTab(item.browserId, item.tabId)
    }
    setSelectedTabs(new Map())
  }, [selectedTabs, onDiscardTab])

  const handleMigrateSelected = useCallback(
    async (targetBrowserId: string) => {
      if (!onMigrateTab) return
      const tabsToMigrate = Array.from(selectedTabs.values())
      for (const item of tabsToMigrate) {
        if (item.browserId !== targetBrowserId && item.url) {
          await onMigrateTab(item.browserId, targetBrowserId, item.tabId, item.url)
        }
      }
      setSelectedTabs(new Map())
    },
    [selectedTabs, onMigrateTab]
  )

  const selectedTabsList = useMemo(() => {
    if (selectedTabs.size === 0) return EMPTY_LIST
    return Array.from(selectedTabs.values())
  }, [selectedTabs])

  return {
    selectedTabs,
    selectedTabsList,
    isSelectionActive: selectedTabs.size > 0,
    handleToggleSelectTab,
    handleSelectRangeInWindow,
    handleInvertSelectionInWindow,
    handleSelectAllInWindow,
    handleClearSelection,
    handleCloseSelected,
    handleDiscardSelected,
    handleMigrateSelected
  }
}
