import React, { useState, useEffect, useMemo } from 'react'
import {
  DndContext,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent
} from '@dnd-kit/core'
import { useSelector, useDispatch } from 'react-redux'
import type { RootState } from '../../store/store'
import { WindowCard, SortableGridTabItem, isWindowPrivate } from './WindowCard'
import { getAllWindows, getCurrentWindow } from '../../scripts/general'
import { updateFilteredTabs } from '../../store/tabSlice'
import { arrayMove } from '@dnd-kit/sortable'
import { LayoutGrid, Layers, Plus, EyeOff } from 'lucide-react'
import { Button, Dropdown } from 'antd'
import type { MenuProps } from 'antd'

interface WindowGridViewProps {
  tabActionButtonsSetting?: 'always' | 'hover'
}

export function WindowGridView({
  tabActionButtonsSetting = 'hover'
}: WindowGridViewProps) {
  const dispatch = useDispatch()
  const filteredTabs = useSelector((state: RootState) => state.tabs.filteredTabs)
  const [windowsList, setWindowsList] = useState<chrome.windows.Window[]>([])
  const [currentWindowId, setCurrentWindowId] = useState<number | null>(null)
  const [tabGroups, setTabGroups] = useState<
    Record<number, chrome.tabGroups.TabGroup>
  >({})
  const [activeDragTab, setActiveDragTab] = useState<any | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5
      }
    }),
    useSensor(KeyboardSensor)
  )

  const refreshWindows = async () => {
    try {
      if (chrome.windows) {
        chrome.windows.getAll({ populate: true }, (wins) => {
          setWindowsList(wins || [])
        })
        chrome.windows.getCurrent({ populate: true }, (curr) => {
          if (curr && typeof curr.id === 'number') {
            setCurrentWindowId(curr.id)
          }
        })
      }
    } catch (err) {
      console.error('Failed to load windows for grid view:', err)
    }
  }

  useEffect(() => {
    refreshWindows()

    // Listen to window events
    const onWinCreated = () => refreshWindows()
    const onWinRemoved = () => refreshWindows()
    chrome.windows.onCreated?.addListener(onWinCreated)
    chrome.windows.onRemoved?.addListener(onWinRemoved)

    // Tab groups
    const fetchGroups = () => {
      if (chrome.tabGroups) {
        chrome.tabGroups.query({}, (groups) => {
          const groupMap: Record<number, chrome.tabGroups.TabGroup> = {}
          groups.forEach((g) => {
            groupMap[g.id] = g
          })
          setTabGroups(groupMap)
        })
      }
    }

    fetchGroups()
    chrome.tabGroups?.onUpdated?.addListener(fetchGroups)
    chrome.tabGroups?.onCreated?.addListener(fetchGroups)
    chrome.tabGroups?.onRemoved?.addListener(fetchGroups)

    return () => {
      chrome.windows.onCreated?.removeListener(onWinCreated)
      chrome.windows.onRemoved?.removeListener(onWinRemoved)
      chrome.tabGroups?.onUpdated?.removeListener(fetchGroups)
      chrome.tabGroups?.onCreated?.removeListener(fetchGroups)
      chrome.tabGroups?.onRemoved?.removeListener(fetchGroups)
    }
  }, [])

  // Group tabs by windowId
  const tabsByWindow = useMemo(() => {
    const map = new Map<number, any[]>()

    // Ensure all known windows exist in map
    windowsList.forEach((win) => {
      if (win.id !== undefined) {
        map.set(win.id, [])
      }
    })

    // Populate with filteredTabs
    filteredTabs.forEach((tab) => {
      if (!map.has(tab.windowId)) {
        map.set(tab.windowId, [])
      }
      map.get(tab.windowId)!.push(tab)
    })

    // Sort tabs inside each window by index
    map.forEach((tabs) => {
      tabs.sort((a, b) => a.index - b.index)
    })

    return map
  }, [filteredTabs, windowsList])

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event
    const tabId = Number(active.id)
    const tab = filteredTabs.find((t) => t.id === tabId)
    if (tab) {
      setActiveDragTab(tab)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    setActiveDragTab(null)

    if (!over || active.id === over.id) return

    const activeTabId = Number(active.id)
    const activeTab = filteredTabs.find((t) => t.id === activeTabId)
    if (!activeTab) return

    // 1. Dropped on another tab
    const overTabId = Number(over.id)
    const overTab = filteredTabs.find((t) => t.id === overTabId)

    if (overTab) {
      const sourceWindowId = activeTab.windowId
      const targetWindowId = overTab.windowId
      const targetIndex = overTab.index

      if (sourceWindowId === targetWindowId) {
        // Reorder within same window
        const oldIndex = filteredTabs.findIndex((t) => t.id === activeTabId)
        const newIndex = filteredTabs.findIndex((t) => t.id === overTabId)
        const newTabs = arrayMove(filteredTabs, oldIndex, newIndex)
        dispatch(updateFilteredTabs(newTabs))
        chrome.tabs.move(activeTabId, { index: targetIndex })
      } else {
        // Move to different window at target index
        try {
          await chrome.tabs.move(activeTabId, {
            windowId: targetWindowId,
            index: targetIndex
          })
        } catch (err) {
          console.error('Failed to move tab between windows:', err)
        }
      }
      return
    }

    // 2. Dropped on a Window Card container directly
    const overData = over.data?.current
    if (overData?.type === 'window-card' && overData.windowId) {
      const targetWindowId = overData.windowId
      if (activeTab.windowId !== targetWindowId) {
        try {
          await chrome.tabs.move(activeTabId, {
            windowId: targetWindowId,
            index: -1
          })
        } catch (err) {
          console.error('Failed to move tab to window container:', err)
        }
      }
    }
  }

  const windowIds = Array.from(tabsByWindow.keys())

  const newWindowItems: MenuProps['items'] = [
    {
      key: 'normal',
      label: 'New Normal Window',
      icon: <Plus size={13} />,
      onClick: () => chrome.windows.create({ focused: true })
    },
    {
      key: 'incognito',
      label: 'New Incognito Window',
      icon: <EyeOff size={13} className="text-purple-500" />,
      onClick: () => chrome.windows.create({ focused: true, incognito: true })
    }
  ]

  return (
    <div className="h-full flex flex-col bg-slate-100/60 overflow-hidden">
      {/* Top Grid Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <LayoutGrid size={16} className="text-blue-600" />
          <span className="font-semibold text-slate-800 text-sm">
            Window Grid View
          </span>
          <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
            {windowIds.length} {windowIds.length === 1 ? 'Window' : 'Windows'} •{' '}
            {filteredTabs.length} {filteredTabs.length === 1 ? 'Tab' : 'Tabs'}
          </span>
        </div>

        <Dropdown menu={{ items: newWindowItems }} placement="bottomRight">
          <Button
            type="default"
            size="small"
            icon={<Plus size={13} />}
            className="flex items-center gap-1 text-xs font-medium"
          >
            New Window
          </Button>
        </Dropdown>
      </div>

      {/* Grid of Window Cards */}
      <div className="flex-1 overflow-y-auto p-4">
        {windowIds.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-sm gap-2">
            <Layers size={32} className="opacity-40" />
            <span>No open windows found</span>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 auto-rows-max pb-12">
              {windowIds.map((winId, index) => {
                const windowTabs = tabsByWindow.get(winId) || []
                const isCurrent = winId === currentWindowId
                const windowObj = windowsList.find((w) => w.id === winId)
                const isIncognito = isWindowPrivate(windowObj, windowTabs)
                return (
                  <WindowCard
                    key={winId}
                    windowId={winId}
                    windowIndex={index + 1}
                    tabs={windowTabs}
                    isCurrentWindow={isCurrent}
                    isIncognito={isIncognito}
                    tabGroups={tabGroups}
                    tabActionButtonsSetting={tabActionButtonsSetting}
                  />
                )
              })}
            </div>

            {/* Drag Overlay for smooth preview */}
            <DragOverlay>
              {activeDragTab ? (
                <div className="w-64 shadow-2xl rounded-lg opacity-90 pointer-events-none scale-105">
                  <SortableGridTabItem
                    tab={activeDragTab}
                    isSelected={false}
                    isSelectionMode={false}
                    isIncognito={isWindowPrivate(undefined, [activeDragTab])}
                    tabActionButtonsSetting={tabActionButtonsSetting}
                    groupInfo={
                      activeDragTab.groupId && activeDragTab.groupId !== -1
                        ? tabGroups[activeDragTab.groupId]
                        : undefined
                    }
                    onCloseTab={() => {}}
                    onTogglePin={() => {}}
                    onToggleMute={() => {}}
                    onDiscardTab={() => {}}
                    onTabClick={() => {}}
                  />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>
    </div>
  )
}
