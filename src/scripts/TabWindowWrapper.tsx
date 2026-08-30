import React, { useEffect, useRef } from 'react'
import ContentLoader from 'react-content-loader'
import { useDispatch, useSelector } from 'react-redux'
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { arrayMove } from '@dnd-kit/sortable'
import type { RootState } from '../store/store'
import { SimpleAutoSizer } from '../components/SimpleAutoSizer'
import { SimpleFixedSizeList } from '../components/SimpleFixedSizeList'

import { Tab } from '../components/Tab/Tab'
import { GroupHeader } from '../components/Tab/GroupHeader'
import { TabGroupHeader } from '../components/Tab/TabGroupHeader'
import { asyncFilterTabs, getCurrentWindow } from './general'
import {
  updateFilteredTabs,
  selectAllTabs,
  clearSelectedTabs,
  toggleSelectionMode
} from '../store/tabSlice'
import { setRegex, setSearchIn } from '../store/searchSlice'
import { batchRemoveTabs } from '../utils/bulkOperations'
// @ts-ignore
import { saveSession } from '../components/getsetSessions'
import { useResponsive } from '../hooks/useResponsive'
import { WindowGridView } from '../components/WindowGrid'

const MyLoader = ({ width }: { width: number }) => (
  <ContentLoader
    speed={1}
    width={width}
    height={500}
    viewBox={`0 0 ${width} 500`}
    backgroundColor="#e3e3e3"
    foregroundColor="#ecebeb"
  >
    {[...Array(10)].map((_, i) => {
      const height = 20
      return (
        <g key={i}>
          <rect
            x="10"
            y={15 + i * 40}
            width={height}
            height={height}
            rx={5}
            ry={5}
          />
          <rect
            x={height + 20}
            y={15 + i * 40}
            rx={5}
            ry={5}
            width={width > 0 ? width - height - 50 : 0}
            height={height}
          />
        </g>
      )
    })}
  </ContentLoader>
)

function useTabOperations() {
  return {
    moveTab: (itemId: string, _dragIndex: number, index: number) => {
      chrome.tabs.move(Number(itemId), { index })
    },
    remove: (itemId: number) => {
      chrome.tabs.remove(itemId)
    },
    toggleMuteTab: (itemId: number, status: boolean) => {
      chrome.tabs.update(itemId, { muted: !status })
    },
    togglePinTab: (itemId: number, status: boolean) => {
      chrome.tabs.update(itemId, { pinned: !status })
    },
    discardTab: (itemId: number) => {
      chrome.tabs.discard(itemId)
    }
  }
}

const Row = ({
  index,
  style,
  data
}: {
  index: number
  style: React.CSSProperties
  data: any
}) => {
  const {
    displayItems,
    collapsedGroups,
    collapsedTabGroups,
    selectedTabs,
    tabActionButtonsSetting,
    tabOperations,
    toggleGroup,
    toggleTabGroup,
    handleSaveWindow,
    handleDiscardWindow,
    handleCloseWindow,
    handleFocusWindow,
    handleSaveTabGroup,
    handleDiscardTabGroup,
    handleCloseTabGroup,
    handleFocusTabGroup,
    isCompact,
    isSelectionMode
  } = data

  const item = displayItems[index]

  // Always call hooks
  const sortableId = item ? item.id : `dummy-${index}`
  const sortableDisabled =
    !item || item.type === 'header' || item.type === 'tab-group-header'

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: sortableId, disabled: sortableDisabled })

  if (!item) return null

  const dndStyle: React.CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 9999 : 'auto'
  }

  if (item.type === 'header') {
    return (
      <div ref={setNodeRef} style={dndStyle}>
        <GroupHeader
          windowId={item.windowId}
          tabCount={item.tabCount}
          isCurrentWindow={item.isCurrentWindow}
          collapsed={collapsedGroups.has(item.windowId)}
          onToggle={() => toggleGroup(item.windowId)}
          onSave={() => handleSaveWindow(item.windowId)}
          onDiscard={() => handleDiscardWindow(item.windowId)}
          onClose={() => handleCloseWindow(item.windowId)}
          onFocus={() => handleFocusWindow(item.windowId)}
        />
      </div>
    )
  }

  if (item.type === 'domain-header') {
    return (
      <div
        style={style}
        className="px-4 py-2 bg-slate-100 flex items-center justify-between cursor-pointer border-b border-white"
        onClick={() => toggleGroup(`domain-${item.title}`)}
      >
        <span className="font-bold text-slate-700">{item.title}</span>
        <span className="text-xs text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
          {item.count}
        </span>
      </div>
    )
  }

  if (item.type === 'tab-group-header') {
    return (
      <div ref={setNodeRef} style={dndStyle}>
        <TabGroupHeader
          key={item.id}
          id={item.groupId}
          title={item.title}
          color={item.color}
          tabCount={item.tabCount}
          collapsed={collapsedTabGroups.has(item.groupId)}
          onToggle={() => toggleTabGroup(item.groupId)}
          onSave={() => handleSaveTabGroup(item.groupId)}
          onDiscard={() => handleDiscardTabGroup(item.groupId)}
          onClose={() => handleCloseTabGroup(item.groupId)}
          onFocus={() => handleFocusTabGroup(item.groupId)}
        />
      </div>
    )
  }

  return (
    <div ref={setNodeRef} style={dndStyle} {...attributes} {...listeners}>
      <Tab
        {...item}
        key={item.id}
        activeTab={true}
        selected={selectedTabs.includes(item.id)}
        tabActionButtons={tabActionButtonsSetting}
        isCompact={isCompact}
        isSelectionMode={isSelectionMode}
        {...tabOperations}
      />
    </div>
  )
}

function TabList() {
  const dispatch = useDispatch()
  const { tabs, filteredTabs, selectedTabs, selectedWindow, isSelectionMode } =
    useSelector((state: RootState) => state.tabs)
  const { isCompact } = useResponsive()
  const searchState = useSelector((state: RootState) => state.search)
  const tabOperations = useTabOperations()
  const [isLoading, setIsLoading] = React.useState(false)
  const listRef = useRef<any>(null)
  const [groupedTabsSetting, setGroupedTabsSetting] = React.useState(true)
  const [allWindowsViewMode, setAllWindowsViewMode] = React.useState<
    'grid' | 'list'
  >('grid')
  const [tabActionButtonsSetting, setTabActionButtonsSetting] = React.useState<
    'always' | 'hover'
  >('hover')
  const [currentWindowId, setCurrentWindowId] = React.useState<number | null>(
    null
  )
  const [collapsedGroups, setCollapsedGroups] = React.useState<
    Set<number | string>
  >(new Set())
  const [collapsedTabGroups, setCollapsedTabGroups] = React.useState<
    Set<number>
  >(new Set())
  const [tabGroups, setTabGroups] = React.useState<
    Record<number, chrome.tabGroups.TabGroup>
  >({})

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8
      }
    }),
    useSensor(KeyboardSensor)
  )

  const toggleGroup = (windowId: number | string) => {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(windowId)) next.delete(windowId)
      else next.add(windowId)
      return next
    })
  }

  const toggleTabGroup = (groupId: number) => {
    setCollapsedTabGroups((prev) => {
      const next = new Set(prev)
      if (next.has(groupId)) next.delete(groupId)
      else next.add(groupId)
      return next
    })
  }

  // Action Handlers
  const handleSaveWindow = async (windowId: number) => {
    const tabsToSave = filteredTabs.filter((t: any) => t.windowId === windowId)
    if (tabsToSave.length > 0) {
      await saveSession(tabsToSave, `Window ${windowId}`)
    }
  }

  const handleCloseWindow = (windowId: number) => {
    chrome.windows.remove(windowId)
  }

  const handleDiscardWindow = (windowId: number) => {
    const tabsToDiscard = filteredTabs
      .filter((t: any) => t.windowId === windowId && !t.active)
      .map((t: any) => t.id)
    if (tabsToDiscard.length > 0) {
      tabsToDiscard.forEach((id: number) => {
        chrome.tabs.discard(id)
      })
    }
  }

  const handleFocusWindow = (windowId: number) => {
    chrome.windows.update(windowId, { focused: true })
  }

  const handleSaveTabGroup = async (groupId: number) => {
    const group = tabGroups[groupId]
    const tabsToSave = filteredTabs.filter((t: any) => t.groupId === groupId)
    if (tabsToSave.length > 0) {
      await saveSession(tabsToSave, group?.title || `Group ${groupId}`)
    }
  }

  const handleCloseTabGroup = (groupId: number) => {
    const tabsToClose = filteredTabs
      .filter((t: any) => t.groupId === groupId)
      .map((t: any) => t.id)
    if (tabsToClose.length > 0) {
      chrome.tabs.remove(tabsToClose)
    }
  }

  const handleDiscardTabGroup = (groupId: number) => {
    const tabsToDiscard = filteredTabs
      .filter((t: any) => t.groupId === groupId && !t.active)
      .map((t: any) => t.id)
    if (tabsToDiscard.length > 0) {
      tabsToDiscard.forEach((id: number) => {
        chrome.tabs.discard(id)
      })
    }
  }

  const handleFocusTabGroup = (groupId: number) => {
    const firstTab = filteredTabs.find((t: any) => t.groupId === groupId)
    if (firstTab) {
      chrome.windows.update(firstTab.windowId, { focused: true })
      chrome.tabs.update(firstTab.id, { active: true })
    }
  }

  useEffect(() => {
    const fetchGroups = () => {
      if (!chrome.tabGroups) {
        console.warn('⚠️ chrome.tabGroups API is not available')
        return
      }
      chrome.tabGroups.query({}, (groups) => {
        const groupMap: Record<number, chrome.tabGroups.TabGroup> = {}
        groups.forEach((g) => {
          groupMap[g.id] = g
        })
        setTabGroups(groupMap)
      })
    }

    fetchGroups()

    // Listen for group updates
    const onGroupUpdated = () => fetchGroups()
    chrome.tabGroups.onUpdated.addListener(onGroupUpdated)
    chrome.tabGroups.onCreated.addListener(onGroupUpdated)
    chrome.tabGroups.onRemoved.addListener(onGroupUpdated)

    chrome.storage.local.get(
      ['groupedTabs', 'tabActionButtons', 'allWindowsViewMode'],
      (result) => {
        if (result.groupedTabs !== undefined)
          setGroupedTabsSetting(result.groupedTabs)
        if (result.tabActionButtons)
          setTabActionButtonsSetting(result.tabActionButtons)
        if (result.allWindowsViewMode)
          setAllWindowsViewMode(result.allWindowsViewMode)
      }
    )

    // Listen for storage changes
    const handleStorageChange = (changes: any, area: string) => {
      if (area === 'local') {
        if (changes.groupedTabs)
          setGroupedTabsSetting(changes.groupedTabs.newValue)
        if (changes.tabActionButtons)
          setTabActionButtonsSetting(changes.tabActionButtons.newValue)
        if (changes.allWindowsViewMode)
          setAllWindowsViewMode(changes.allWindowsViewMode.newValue)
        if (changes.regex) dispatch(setRegex(changes.regex.newValue))
        if (changes.searchIn) dispatch(setSearchIn(changes.searchIn.newValue))
      }
    }
    chrome.storage.onChanged.addListener(handleStorageChange)

    // Load initial values
    chrome.storage.local.get(['regex', 'searchIn'], (result) => {
      if (result.regex !== undefined) dispatch(setRegex(result.regex))
      if (result.searchIn) dispatch(setSearchIn(result.searchIn))
    })

    getCurrentWindow().then((win) => {
      if (win && typeof win.id === 'number') {
        setCurrentWindowId(win.id)
      }
    })

    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
      chrome.tabGroups.onUpdated.removeListener(onGroupUpdated)
      chrome.tabGroups.onCreated.removeListener(onGroupUpdated)
      chrome.tabGroups.onRemoved.removeListener(onGroupUpdated)
    }
  }, [dispatch])

  // Global Keyboard Shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      if (
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable
      ) {
        if (e.key === 'Escape') {
          target.blur()
        }
        return
      }

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'a') {
        e.preventDefault()
        dispatch(toggleSelectionMode(true))
        dispatch(selectAllTabs())
      } else if (e.key === 'Escape') {
        dispatch(clearSelectedTabs())
        dispatch(toggleSelectionMode(false))
      } else if (
        (e.key === 'Delete' || e.key === 'Backspace') &&
        selectedTabs.length > 0
      ) {
        e.preventDefault()
        if (confirm(`Close ${selectedTabs.length} selected tabs?`)) {
          batchRemoveTabs(selectedTabs)
          dispatch(clearSelectedTabs())
          dispatch(toggleSelectionMode(false))
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [dispatch, selectedTabs])

  const displayItems = React.useMemo(() => {
    // 1. Filter tabs based on selectedWindow
    let tabsToDisplay = filteredTabs
    if ((selectedWindow as any) === 'current') {
      tabsToDisplay = filteredTabs.filter(
        (t: any) => t.windowId === currentWindowId
      )
    } else if ((selectedWindow as any) !== 'all') {
      tabsToDisplay = filteredTabs.filter(
        (t: any) => t.windowId === Number(selectedWindow)
      )
    }

    // 2. Sort tabs by windowId then index
    const sortedTabs = [...tabsToDisplay].sort((a: any, b: any) => {
      if (a.windowId !== b.windowId) return a.windowId - b.windowId
      return a.index - b.index
    })

    const items: any[] = []
    let lastWindowId = -1
    let lastGroupId = -1

    // Calculate counts
    const windowCounts: Record<number, number> = {}
    const groupCounts: Record<number, number> = {}

    sortedTabs.forEach((tab: any) => {
      windowCounts[tab.windowId] = (windowCounts[tab.windowId] || 0) + 1
      if (tab.groupId && tab.groupId !== -1) {
        groupCounts[tab.groupId] = (groupCounts[tab.groupId] || 0) + 1
      }
    })

    // 3. Build display list
    sortedTabs.forEach((tab: any) => {
      // Window Header (Only if showing all windows AND grouping is enabled)
      const showWindowHeader =
        (selectedWindow as any) === 'all' && groupedTabsSetting

      if (showWindowHeader && tab.windowId !== lastWindowId) {
        lastWindowId = tab.windowId
        lastGroupId = -1 // Reset group when window changes

        items.push({
          type: 'header',
          windowId: tab.windowId,
          tabCount: windowCounts[tab.windowId],
          isCurrentWindow: tab.windowId === currentWindowId,
          id: `header-${tab.windowId}`
        })
      }

      // If window is collapsed (only relevant if headers are shown), skip tabs
      if (showWindowHeader && collapsedGroups.has(tab.windowId)) return

      // Tab Group Header
      const currentGroupId =
        tab.groupId && tab.groupId !== -1 ? tab.groupId : -1

      if (
        currentGroupId !== lastGroupId ||
        (showWindowHeader && tab.windowId !== lastWindowId)
      ) {
        lastGroupId = currentGroupId

        if (currentGroupId !== -1) {
          const groupInfo = tabGroups[currentGroupId]
          items.push({
            type: 'tab-group-header',
            id: `group-header-${currentGroupId}`,
            groupId: currentGroupId,
            title: groupInfo?.title,
            color: groupInfo?.color || 'grey',
            tabCount: groupCounts[currentGroupId]
          })
        }
      }

      // If tab group is collapsed, skip tabs
      if (currentGroupId !== -1 && collapsedTabGroups.has(currentGroupId))
        return

      // Tab Item
      const groupInfo =
        currentGroupId !== -1 ? tabGroups[currentGroupId] : undefined
      items.push({
        ...tab,
        type: 'tab',
        isGrouped: currentGroupId !== -1,
        groupColor: groupInfo?.color
      })
    })

    return items
  }, [
    filteredTabs,
    selectedWindow,
    groupedTabsSetting,
    currentWindowId,
    collapsedGroups,
    collapsedTabGroups,
    tabGroups
  ])

  useEffect(() => {
    const filterAndUpdate = async () => {
      try {
        setIsLoading(true)
        const filtered = await asyncFilterTabs(
          {
            searchTerm: searchState.searchTerm,
            audibleSearch: searchState.audibleSearch,
            pinnedSearch: searchState.pinnedSearch,
            searchIn: searchState.searchIn
          },
          {
            ignoreCase: true,
            regex: searchState.regex
          },
          tabs
        )
        dispatch(updateFilteredTabs(filtered || tabs))
      } catch (error) {
        console.error('❌ Error filtering tabs:', error)
        dispatch(updateFilteredTabs(tabs))
      } finally {
        setIsLoading(false)
      }
    }

    if (tabs.length > 0) {
      filterAndUpdate()
    } else {
      setIsLoading(false)
    }
  }, [searchState, tabs, dispatch])

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const activeId = active.id
    const overId = over.id

    const activeItem = displayItems.find((item) => item.id === activeId)
    const overItem = displayItems.find((item) => item.id === overId)

    if (!activeItem || !overItem) return

    if (activeItem.type === 'header' || activeItem.type === 'tab-group-header')
      return

    let targetWindowId = overItem.windowId
    let targetIndex = -1

    if (overItem.type === 'header') {
      targetWindowId = overItem.windowId
      targetIndex = 0
    } else if (overItem.type === 'tab-group-header') {
      const firstTabInGroup = filteredTabs.find(
        (t: any) => t.groupId === overItem.groupId
      )
      if (firstTabInGroup) {
        targetWindowId = firstTabInGroup.windowId
        targetIndex = firstTabInGroup.index
      } else {
        targetWindowId = overItem.windowId
      }
    } else {
      targetWindowId = overItem.windowId
      targetIndex = overItem.index
    }

    const oldIndex = filteredTabs.findIndex((tab: any) => tab.id === activeId)
    const newIndex = filteredTabs.findIndex((tab: any) => tab.id === overId)

    if (activeItem.windowId === targetWindowId) {
      const newTabs = arrayMove(filteredTabs, oldIndex, newIndex)
      dispatch(updateFilteredTabs(newTabs))
    }

    if (activeItem.windowId !== targetWindowId) {
      chrome.tabs.move(Number(activeId), {
        windowId: targetWindowId,
        index: targetIndex
      })
    } else {
      chrome.tabs.move(Number(activeId), { index: targetIndex })
    }
  }

  if (isLoading) {
    return <MyLoader width={400} />
  }

  const itemData = React.useMemo(
    () => ({
      displayItems,
      collapsedGroups,
      collapsedTabGroups,
      selectedTabs,
      tabActionButtonsSetting,
      tabOperations,
      toggleGroup,
      toggleTabGroup,
      handleSaveWindow,
      handleDiscardWindow,
      handleCloseWindow,
      handleFocusWindow,
      handleSaveTabGroup,
      handleDiscardTabGroup,
      handleCloseTabGroup,
      handleFocusTabGroup,
      isCompact,
      isSelectionMode
    }),
    [
      displayItems,
      collapsedGroups,
      collapsedTabGroups,
      selectedTabs,
      tabActionButtonsSetting,
      tabOperations,
      isCompact,
      isSelectionMode
    ]
  )

  if (String(selectedWindow) === 'all' && allWindowsViewMode === 'grid') {
    return <WindowGridView tabActionButtonsSetting={tabActionButtonsSetting} />
  }

  return (
    <div className="absolute inset-0 overflow-hidden">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SimpleAutoSizer>
          {({ height, width }: { height: number; width: number }) => (
            <SortableContext
              items={displayItems.map((i) => i.id)}
              strategy={verticalListSortingStrategy}
            >
              <SimpleFixedSizeList
                ref={listRef}
                height={height}
                itemCount={displayItems?.length || 0}
                itemSize={50}
                width={width}
                itemData={itemData}
              >
                {Row}
              </SimpleFixedSizeList>
            </SortableContext>
          )}
        </SimpleAutoSizer>
      </DndContext>
    </div>
  )
}

export default TabList
