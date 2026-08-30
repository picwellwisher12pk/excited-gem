import React, { useState, useMemo } from 'react'
import { useDroppable } from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { Button, Tooltip, Input, Checkbox, message, Popconfirm } from 'antd'
import {
  Eye,
  EyeOff,
  Plus,
  Save,
  Moon,
  X,
  Search,
  Pin,
  Volume2,
  VolumeX,
  GripVertical,
  ArrowDownToLine,
  ExternalLink,
  Globe
} from 'lucide-react'
import { useDispatch, useSelector } from 'react-redux'
import type { RootState } from '../../store/store'
import {
  updateSelectedTabs,
  selectTabRange
} from '../../store/tabSlice'
import { batchMoveTabs } from '../../utils/bulkOperations'
// @ts-ignore
import { saveSession } from '../getsetSessions'
import { faviconCache } from '../../utils/faviconCache'
import { TabContextMenu } from '../Tab/ContextMenu'

export function isWindowPrivate(
  windowObj?: chrome.windows.Window,
  tabs: any[] = []
): boolean {
  if (windowObj?.incognito) return true
  return tabs.some((tab) => {
    if (tab?.incognito) return true
    const title = (tab?.title || '').toLowerCase()
    const url = (tab?.url || '').toLowerCase()
    return (
      title.includes('inprivate') ||
      title.includes('incognito') ||
      title.includes('private browsing') ||
      url.includes('inprivate') ||
      url.includes('incognito') ||
      url.includes('privatebrowsing') ||
      url.startsWith('edge://inprivate') ||
      url.startsWith('chrome://incognito') ||
      url.startsWith('about:inprivate') ||
      url.startsWith('about:privatebrowsing')
    )
  })
}

interface WindowCardProps {
  windowId: number
  windowIndex: number
  tabs: any[]
  isCurrentWindow: boolean
  isIncognito?: boolean
  tabGroups?: Record<number, chrome.tabGroups.TabGroup>
  tabActionButtonsSetting?: 'always' | 'hover'
}

interface SortableGridTabItemProps {
  tab: any
  isSelected: boolean
  isSelectionMode: boolean
  isIncognito?: boolean
  tabActionButtonsSetting?: 'always' | 'hover'
  groupInfo?: chrome.tabGroups.TabGroup
  onCloseTab: (id: number) => void
  onTogglePin: (id: number, pinned: boolean) => void
  onToggleMute: (id: number, muted: boolean) => void
  onDiscardTab: (id: number) => void
  onTabClick: (tab: any) => void
}

export function SortableGridTabItem({
  tab,
  isSelected,
  isSelectionMode,
  isIncognito = false,
  tabActionButtonsSetting = 'hover',
  groupInfo,
  onCloseTab,
  onTogglePin,
  onToggleMute,
  onDiscardTab,
  onTabClick
}: SortableGridTabItemProps) {
  const dispatch = useDispatch()
  const [imgError, setImgError] = useState(false)
  const isPrivateTab = isIncognito || isWindowPrivate(undefined, [tab])

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({
      id: tab.id,
      data: {
        tab,
        windowId: tab.windowId
      }
    })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : tab.discarded ? 0.65 : 1,
    zIndex: isDragging ? 999 : 'auto'
  }

  const cachedFavicon = useMemo(() => {
    return faviconCache.getOrSet(tab.url, tab.favIconUrl)
  }, [tab.url, tab.favIconUrl])

  const handleCheckbox = (e: React.MouseEvent) => {
    e.stopPropagation()
    const nativeEvent = e.nativeEvent as MouseEvent
    if (nativeEvent.shiftKey) {
      dispatch(selectTabRange(tab.id))
    } else {
      dispatch(updateSelectedTabs({ id: tab.id, selected: !isSelected }))
    }
  }

  const itemBgClass = isPrivateTab
    ? isSelected
      ? 'bg-purple-900/60 border-purple-400 text-purple-100 shadow-sm'
      : tab.active
      ? 'bg-purple-950/70 border-purple-500/80 text-purple-200 shadow-xs ring-1 ring-purple-500/30'
      : 'bg-zinc-800/90 border-zinc-700/80 text-zinc-200 hover:border-zinc-500 hover:bg-zinc-750'
    : isSelected
    ? 'bg-blue-50/90 border-blue-300 shadow-sm'
    : tab.active
    ? 'bg-blue-50/50 border-blue-400/80 shadow-xs'
    : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80'

  const titleClass = isPrivateTab
    ? tab.active
      ? 'text-purple-300 font-semibold'
      : 'text-zinc-200'
    : tab.active
    ? 'text-blue-700 font-semibold'
    : 'text-slate-700'

  const actionBtnClass = isPrivateTab
    ? 'p-1 text-zinc-400 hover:text-zinc-200 rounded transition-colors hover:bg-zinc-700/60'
    : 'p-1 text-slate-400 hover:text-slate-600 rounded transition-colors'

  const closeBtnClass = isPrivateTab
    ? 'p-1 text-zinc-400 hover:text-red-400 rounded transition-colors hover:bg-red-950/60'
    : 'p-1 text-slate-400 hover:text-red-600 rounded transition-colors'

  return (
    <TabContextMenu tab={tab}>
      <div
        ref={setNodeRef}
        style={style}
        className={`
          group relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs
          border transition-all duration-150 select-none cursor-pointer
          ${itemBgClass}
        `}
        onClick={() => onTabClick(tab)}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className={`cursor-grab active:cursor-grabbing -ml-1 p-0.5 ${
            isIncognito
              ? 'text-zinc-500 hover:text-zinc-300'
              : 'text-slate-400 hover:text-slate-600'
          }`}
          title="Drag tab to reorder or move to another window"
        >
          <GripVertical size={13} />
        </div>

        {/* Favicon & Checkbox container */}
        <div
          className="relative flex items-center justify-center w-4 h-4 shrink-0 cursor-pointer"
          onClick={handleCheckbox}
        >
          <div
            className={`absolute inset-0 flex items-center justify-center transition-opacity ${
              isSelected || isSelectionMode
                ? 'opacity-100 z-10'
                : 'opacity-0 group-hover:opacity-100 z-10'
            }`}
          >
            <Checkbox
              checked={isSelected}
              className="scale-90"
              onChange={(e) => {
                e.stopPropagation()
              }}
            />
          </div>
          {cachedFavicon && !imgError ? (
            <img
              src={cachedFavicon}
              alt=""
              className={`w-3.5 h-3.5 object-contain rounded-xs transition-opacity ${
                isSelected || isSelectionMode ? 'opacity-0' : 'group-hover:opacity-0'
              }`}
              onError={() => setImgError(true)}
            />
          ) : (
            <Globe
              size={14}
              className={`${
                isIncognito ? 'text-zinc-500' : 'text-slate-400'
              } transition-opacity ${
                isSelected || isSelectionMode ? 'opacity-0' : 'group-hover:opacity-0'
              }`}
            />
          )}
        </div>

      {/* Tab Title & URL */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={() => onTabClick(tab)}
      >
        <div className="flex items-center gap-1.5">
          {tab.pinned && (
            <Pin size={11} className="text-amber-500 fill-amber-500 shrink-0" />
          )}
          {groupInfo && (
            <span
              className="px-1 py-0.2 rounded text-[10px] font-semibold text-white truncate max-w-[70px]"
              style={{ backgroundColor: groupInfo.color || '#6b7280' }}
              title={`Group: ${groupInfo.title || 'Untitled'}`}
            >
              {groupInfo.title || 'Group'}
            </span>
          )}
          <span
            className={`truncate ${titleClass}`}
            title={tab.title}
          >
            {tab.title || 'Untitled Tab'}
          </span>
        </div>
      </div>

      {/* Audio Indicator */}
      {(tab.audible || tab.mutedInfo?.muted) && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            onToggleMute(tab.id, tab.mutedInfo?.muted)
          }}
          className={`p-1 rounded transition-colors ${
            isIncognito
              ? 'text-zinc-400 hover:text-zinc-200'
              : 'text-slate-500 hover:text-slate-700'
          }`}
          title={tab.mutedInfo?.muted ? 'Unmute tab' : 'Mute tab'}
        >
          {tab.mutedInfo?.muted ? (
            <VolumeX size={12} />
          ) : (
            <Volume2
              size={12}
              className={
                isIncognito
                  ? 'text-purple-400 animate-pulse'
                  : 'text-blue-600 animate-pulse'
              }
            />
          )}
        </button>
      )}

      {/* Actions (Discard, Pin, Close) */}
      <div
        className={`
          flex items-center gap-0.5 transition-opacity
          ${
            tabActionButtonsSetting === 'always'
              ? 'opacity-100'
              : 'opacity-0 group-hover:opacity-100'
          }
        `}
      >
        {!tab.discarded && (
          <Tooltip title="Discard tab (free memory)">
            <button
              onClick={(e) => {
                e.stopPropagation()
                onDiscardTab(tab.id)
              }}
              className={actionBtnClass}
            >
              <Moon size={12} />
            </button>
          </Tooltip>
        )}
        <Tooltip title={tab.pinned ? 'Unpin tab' : 'Pin tab'}>
          <button
            onClick={(e) => {
              e.stopPropagation()
              onTogglePin(tab.id, tab.pinned)
            }}
            className={actionBtnClass}
          >
            <Pin size={12} className={tab.pinned ? 'fill-current text-amber-500' : ''} />
          </button>
        </Tooltip>
        <Tooltip title="Close tab">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCloseTab(tab.id)
            }}
            className={closeBtnClass}
          >
            <X size={12} />
          </button>
        </Tooltip>
      </div>
    </div>
    </TabContextMenu>
  )
}

export function WindowCard({
  windowId,
  windowIndex,
  tabs,
  isCurrentWindow,
  isIncognito = false,
  tabGroups = {},
  tabActionButtonsSetting = 'hover'
}: WindowCardProps) {
  const [localSearch, setLocalSearch] = useState('')
  const [isMovingBatch, setIsMovingBatch] = useState(false)
  const selectedTabs = useSelector((state: RootState) => state.tabs.selectedTabs)
  const isSelectionMode = useSelector(
    (state: RootState) => state.tabs.isSelectionMode
  )

  const isPrivateWindow = isIncognito || isWindowPrivate(undefined, tabs)
  const isEdgeInPrivate = tabs.some(
    (t) =>
      (t.title && t.title.toLowerCase().includes('inprivate')) ||
      (t.url && t.url.toLowerCase().includes('inprivate'))
  )
  const privateBadgeLabel = isEdgeInPrivate ? 'InPrivate' : 'Incognito'

  // Droppable container for whole window card
  const { setNodeRef, isOver } = useDroppable({
    id: `window-card-${windowId}`,
    data: {
      type: 'window-card',
      windowId
    }
  })

  // Selected tabs that belong to OTHER windows
  const otherSelectedTabs = useMemo(() => {
    return selectedTabs.filter(
      (tabId) => !tabs.some((t) => t.id === Number(tabId))
    )
  }, [selectedTabs, tabs])

  // Filter tabs by local search query
  const displayedTabs = useMemo(() => {
    if (!localSearch.trim()) return tabs
    const q = localSearch.toLowerCase()
    return tabs.filter(
      (tab) =>
        (tab.title && tab.title.toLowerCase().includes(q)) ||
        (tab.url && tab.url.toLowerCase().includes(q))
    )
  }, [tabs, localSearch])

  // Window Action Handlers
  const handleFocusWindow = () => {
    chrome.windows.update(windowId, { focused: true })
  }

  const handleNewTab = () => {
    chrome.tabs.create({ windowId })
  }

  const handleSaveWindow = async () => {
    if (tabs.length > 0) {
      await saveSession(tabs, `Window ${windowId}`)
      message.success(`Saved Window ${windowIndex} session!`)
    }
  }

  const handleDiscardWindow = () => {
    const inactiveTabs = tabs.filter((t) => !t.active).map((t) => t.id)
    if (inactiveTabs.length > 0) {
      inactiveTabs.forEach((id) => {
        chrome.tabs.discard(id)
      })
      message.info(`Discarded ${inactiveTabs.length} inactive tabs in Window ${windowIndex}`)
    }
  }

  const handleCloseWindow = () => {
    chrome.windows.remove(windowId)
  }

  const handleTabClick = async (tab: any) => {
    try {
      await chrome.windows.update(windowId, { focused: true })
      await chrome.tabs.update(tab.id, { active: true })
    } catch (err) {
      console.error('Failed to focus tab:', err)
    }
  }

  const handleCloseTab = (id: number) => {
    chrome.tabs.remove(id)
  }

  const handleTogglePin = (id: number, pinned: boolean) => {
    chrome.tabs.update(id, { pinned: !pinned })
  }

  const handleToggleMute = (id: number, muted: boolean) => {
    chrome.tabs.update(id, { muted: !muted })
  }

  const handleDiscardTab = (id: number) => {
    chrome.tabs.discard(id)
  }

  const handleMoveSelectedHere = async () => {
    if (otherSelectedTabs.length === 0 || isMovingBatch) return
    try {
      setIsMovingBatch(true)
      await batchMoveTabs(otherSelectedTabs.map(Number), {
        windowId,
        index: -1
      })
      message.success(`Moved ${otherSelectedTabs.length} tabs to Window ${windowIndex}`)
    } catch (err) {
      console.error('Error moving selected tabs:', err)
      message.error('Failed to move tabs')
    } finally {
      setIsMovingBatch(false)
    }
  }

  const cardContainerClass = isPrivateWindow
    ? `flex flex-col bg-zinc-900 rounded-xl border shadow-md transition-all duration-200 overflow-hidden max-h-[580px] h-[520px] ${
        isOver
          ? 'border-purple-500 ring-2 ring-purple-500/50 bg-purple-950/20'
          : isCurrentWindow
          ? 'border-purple-500/80 ring-2 ring-purple-500/30 shadow-purple-950/20'
          : 'border-zinc-800 hover:border-zinc-700'
      }`
    : `flex flex-col bg-white rounded-xl border shadow-xs transition-all duration-200 overflow-hidden max-h-[580px] h-[520px] ${
        isOver
          ? 'border-blue-500 ring-2 ring-blue-400/40 bg-blue-50/20'
          : isCurrentWindow
          ? 'border-blue-300 ring-1 ring-blue-100'
          : 'border-slate-200 hover:border-slate-300'
      }`

  const headerClass = isPrivateWindow
    ? 'flex items-center justify-between px-3.5 py-2.5 border-b select-none bg-gradient-to-r from-zinc-900 via-zinc-850 to-zinc-900 border-zinc-800 text-zinc-100'
    : isCurrentWindow
    ? 'flex items-center justify-between px-3.5 py-2.5 border-b select-none bg-gradient-to-r from-blue-50/90 via-slate-50 to-white border-blue-200/80'
    : 'flex items-center justify-between px-3.5 py-2.5 border-b select-none bg-slate-50/90 border-slate-200'

  const dotClass = isPrivateWindow
    ? isCurrentWindow
      ? 'bg-purple-500 animate-pulse ring-2 ring-purple-400/40'
      : 'bg-zinc-600'
    : isCurrentWindow
    ? 'bg-blue-600 animate-pulse'
    : 'bg-slate-400'

  const headerBtnClass = isPrivateWindow
    ? 'flex items-center justify-center w-7 h-7 min-w-0 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800'
    : 'flex items-center justify-center w-7 h-7 min-w-0 hover:bg-slate-200/70'

  const headerCloseBtnClass = isPrivateWindow
    ? 'flex items-center justify-center w-7 h-7 min-w-0 hover:bg-red-950/60 text-zinc-400 hover:text-red-400'
    : 'flex items-center justify-center w-7 h-7 min-w-0 hover:bg-red-50 text-slate-400 hover:text-red-500'

  return (
    <div
      ref={setNodeRef}
      className={cardContainerClass}
    >
      {/* Window Header */}
      <div className={headerClass}>
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${dotClass}`} />
          <div className="flex items-center gap-1.5 truncate">
            <span
              className={`font-semibold text-sm ${
                isPrivateWindow ? 'text-zinc-100' : 'text-slate-800'
              }`}
            >
              Window {windowIndex}
            </span>
            {isPrivateWindow && (
              <span className="flex items-center gap-1 bg-purple-950/90 text-purple-300 border border-purple-800/80 text-[11px] font-medium px-1.5 py-0.2 rounded-full">
                <EyeOff size={11} />
                <span>{privateBadgeLabel}</span>
              </span>
            )}
            {isCurrentWindow && (
              <span
                className={
                  isPrivateWindow
                    ? 'bg-purple-900/60 text-purple-300 border border-purple-700/60 text-[11px] font-medium px-1.5 py-0.2 rounded-full'
                    : 'bg-blue-100 text-blue-700 text-[11px] font-medium px-1.5 py-0.2 rounded-full'
                }
              >
                Current
              </span>
            )}
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
              isPrivateWindow
                ? tabs.length > 30
                  ? 'bg-amber-950 text-amber-300 border border-amber-800'
                  : 'bg-zinc-800 text-zinc-300 border border-zinc-700/80'
                : tabs.length > 30
                ? 'bg-amber-100 text-amber-700'
                : 'bg-slate-200/70 text-slate-600'
            }`}
          >
            {tabs.length} {tabs.length === 1 ? 'tab' : 'tabs'}
          </span>
        </div>

        {/* Header Action Buttons */}
        <div className="flex items-center gap-0.5 shrink-0">
          <Tooltip title="Focus Window">
            <Button
              type="text"
              size="small"
              icon={<Eye size={14} className={isPrivateWindow ? 'text-zinc-300' : 'text-slate-600'} />}
              onClick={handleFocusWindow}
              className={headerBtnClass}
            />
          </Tooltip>
          <Tooltip title="New Tab">
            <Button
              type="text"
              size="small"
              icon={<Plus size={14} className={isPrivateWindow ? 'text-zinc-300' : 'text-slate-600'} />}
              onClick={handleNewTab}
              className={headerBtnClass}
            />
          </Tooltip>
          <Tooltip title="Save Window">
            <Button
              type="text"
              size="small"
              icon={<Save size={14} className={isPrivateWindow ? 'text-zinc-300' : 'text-slate-600'} />}
              onClick={handleSaveWindow}
              className={headerBtnClass}
            />
          </Tooltip>
          <Tooltip title="Discard Inactive Tabs">
            <Button
              type="text"
              size="small"
              icon={<Moon size={14} className={isPrivateWindow ? 'text-zinc-300' : 'text-slate-600'} />}
              onClick={handleDiscardWindow}
              className={headerBtnClass}
            />
          </Tooltip>
          <Popconfirm
            title={`Close Window ${windowIndex}?`}
            description={`This will close all ${tabs.length} tabs in this window.`}
            onConfirm={handleCloseWindow}
            okText="Close Window"
            okButtonProps={{ danger: true, size: 'small' }}
            cancelText="Cancel"
            cancelButtonProps={{ size: 'small' }}
            placement="bottomRight"
          >
            <Tooltip title="Close Window">
              <Button
                type="text"
                size="small"
                danger
                icon={<X size={14} />}
                className={headerCloseBtnClass}
              />
            </Tooltip>
          </Popconfirm>
        </div>
      </div>

      {/* Local In-Window Search Bar */}
      <div
        className={`px-3 py-2 border-b ${
          isPrivateWindow
            ? 'bg-zinc-900 border-zinc-800/80'
            : 'border-slate-100 bg-slate-50/40'
        }`}
      >
        <Input
          prefix={
            <Search
              size={13}
              className={isPrivateWindow ? 'text-zinc-500 mr-1' : 'text-slate-400 mr-1'}
            />
          }
          allowClear
          placeholder={`Filter in Window ${windowIndex}...`}
          size="small"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className={`rounded-md text-xs ${
            isPrivateWindow
              ? '!bg-zinc-800 !border-zinc-700 !text-zinc-100 placeholder:!text-zinc-500 hover:!border-zinc-600'
              : ''
          }`}
        />
      </div>

      {/* Move Selected Tabs Banner (if tabs selected elsewhere) */}
      {otherSelectedTabs.length > 0 && (
        <div
          className={`px-3 py-1.5 border-b flex items-center justify-between ${
            isPrivateWindow
              ? 'bg-purple-950/70 border-purple-900 text-purple-200'
              : 'bg-blue-50 border-blue-100'
          }`}
        >
          <span
            className={`text-[11px] font-medium ${
              isPrivateWindow ? 'text-purple-200' : 'text-blue-800'
            }`}
          >
            {otherSelectedTabs.length} selected elsewhere
          </span>
          <Button
            type="primary"
            size="small"
            icon={<ArrowDownToLine size={12} />}
            loading={isMovingBatch}
            onClick={handleMoveSelectedHere}
            className={`!h-6 !text-[11px] !px-2 flex items-center gap-1 ${
              isPrivateWindow ? '!bg-purple-600 hover:!bg-purple-500 !border-purple-600' : ''
            }`}
          >
            Move Here
          </Button>
        </div>
      )}

      {/* Scrollable Tab List */}
      <div
        className={`flex-1 overflow-y-auto p-2.5 space-y-1.5 focus:outline-none ${
          isPrivateWindow ? 'bg-zinc-900' : 'bg-white'
        }`}
      >
        {displayedTabs.length === 0 ? (
          <div
            className={`flex flex-col items-center justify-center h-full text-xs py-8 text-center ${
              isPrivateWindow ? 'text-zinc-500' : 'text-slate-400'
            }`}
          >
            {localSearch ? (
              <span>No tabs matching &ldquo;{localSearch}&rdquo;</span>
            ) : (
              <span>No tabs in this window</span>
            )}
          </div>
        ) : (
          <SortableContext
            items={displayedTabs.map((t) => t.id)}
            strategy={verticalListSortingStrategy}
          >
            {displayedTabs.map((tab) => (
              <SortableGridTabItem
                key={tab.id}
                tab={tab}
                isSelected={selectedTabs.includes(tab.id)}
                isSelectionMode={isSelectionMode}
                isIncognito={isPrivateWindow}
                tabActionButtonsSetting={tabActionButtonsSetting}
                groupInfo={
                  tab.groupId && tab.groupId !== -1
                    ? tabGroups[tab.groupId]
                    : undefined
                }
                onCloseTab={handleCloseTab}
                onTogglePin={handleTogglePin}
                onToggleMute={handleToggleMute}
                onDiscardTab={handleDiscardTab}
                onTabClick={handleTabClick}
              />
            ))}
          </SortableContext>
        )}
      </div>

      {/* Footer / Status bar for window tile */}
      <div
        className={`px-3 py-1.5 border-t flex items-center justify-between text-[11px] ${
          isPrivateWindow
            ? 'bg-zinc-950/90 border-zinc-800 text-zinc-400'
            : 'bg-slate-50/80 border-slate-100 text-slate-500'
        }`}
      >
        <span>
          {localSearch ? `${displayedTabs.length} of ${tabs.length} tabs` : `${tabs.length} tabs`}
        </span>
        <button
          onClick={handleFocusWindow}
          className={`flex items-center gap-1 transition-colors cursor-pointer ${
            isPrivateWindow
              ? 'text-zinc-400 hover:text-purple-300'
              : 'text-slate-500 hover:text-blue-600'
          }`}
        >
          <span>Switch Window</span>
          <ExternalLink size={11} />
        </button>
      </div>
    </div>
  )
}
