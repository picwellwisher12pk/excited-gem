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

interface WindowCardProps {
  windowId: number
  windowIndex: number
  tabs: any[]
  isCurrentWindow: boolean
  tabGroups?: Record<number, chrome.tabGroups.TabGroup>
  tabActionButtonsSetting?: 'always' | 'hover'
}

interface SortableGridTabItemProps {
  tab: any
  isSelected: boolean
  isSelectionMode: boolean
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

  return (
    <TabContextMenu tab={tab}>
      <div
        ref={setNodeRef}
        style={style}
        className={`
          group relative flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-xs
          border transition-all duration-150 select-none cursor-pointer
          ${
            isSelected
              ? 'bg-blue-50/90 border-blue-300 shadow-sm'
              : tab.active
              ? 'bg-blue-50/50 border-blue-400/80 shadow-xs'
              : 'bg-white border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/80'
          }
        `}
        onClick={() => onTabClick(tab)}
      >
        {/* Drag handle */}
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing text-slate-400 hover:text-slate-600 -ml-1 p-0.5"
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
              className={`text-slate-400 transition-opacity ${
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
            <Pin size={11} className="text-amber-600 fill-amber-600 shrink-0" />
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
            className={`truncate font-medium ${
              tab.active ? 'text-blue-700 font-semibold' : 'text-slate-700'
            }`}
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
          className="p-1 text-slate-500 hover:text-slate-700 rounded transition-colors"
          title={tab.mutedInfo?.muted ? 'Unmute tab' : 'Mute tab'}
        >
          {tab.mutedInfo?.muted ? <VolumeX size={12} /> : <Volume2 size={12} className="text-blue-600 animate-pulse" />}
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
              className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
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
            className="p-1 text-slate-400 hover:text-slate-600 rounded transition-colors"
          >
            <Pin size={12} className={tab.pinned ? 'fill-current text-amber-600' : ''} />
          </button>
        </Tooltip>
        <Tooltip title="Close tab">
          <button
            onClick={(e) => {
              e.stopPropagation()
              onCloseTab(tab.id)
            }}
            className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
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
  tabGroups = {},
  tabActionButtonsSetting = 'hover'
}: WindowCardProps) {
  const [localSearch, setLocalSearch] = useState('')
  const [isMovingBatch, setIsMovingBatch] = useState(false)
  const selectedTabs = useSelector((state: RootState) => state.tabs.selectedTabs)
  const isSelectionMode = useSelector(
    (state: RootState) => state.tabs.isSelectionMode
  )

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

  return (
    <div
      ref={setNodeRef}
      className={`
        flex flex-col bg-white rounded-xl border shadow-xs transition-all duration-200
        overflow-hidden max-h-[580px] h-[520px]
        ${
          isOver
            ? 'border-blue-500 ring-2 ring-blue-400/40 bg-blue-50/20'
            : isCurrentWindow
            ? 'border-blue-300 ring-1 ring-blue-100'
            : 'border-slate-200 hover:border-slate-300'
        }
      `}
    >
      {/* Window Header */}
      <div
        className={`
          flex items-center justify-between px-3.5 py-2.5 border-b select-none
          ${
            isCurrentWindow
              ? 'bg-gradient-to-r from-blue-50/90 via-slate-50 to-white border-blue-200/80'
              : 'bg-slate-50/90 border-slate-200'
          }
        `}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span
            className={`w-2.5 h-2.5 rounded-full shrink-0 ${
              isCurrentWindow ? 'bg-blue-600 animate-pulse' : 'bg-slate-400'
            }`}
          />
          <div className="flex items-center gap-1.5 truncate">
            <span className="font-semibold text-slate-800 text-sm">
              Window {windowIndex}
            </span>
            {isCurrentWindow && (
              <span className="bg-blue-100 text-blue-700 text-[11px] font-medium px-1.5 py-0.2 rounded-full">
                Current
              </span>
            )}
          </div>
          <span
            className={`text-xs px-2 py-0.5 rounded-full font-medium shrink-0 ${
              tabs.length > 30
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
              icon={<Eye size={14} className="text-slate-600" />}
              onClick={handleFocusWindow}
              className="flex items-center justify-center w-7 h-7 min-w-0 hover:bg-slate-200/70"
            />
          </Tooltip>
          <Tooltip title="New Tab">
            <Button
              type="text"
              size="small"
              icon={<Plus size={14} className="text-slate-600" />}
              onClick={handleNewTab}
              className="flex items-center justify-center w-7 h-7 min-w-0 hover:bg-slate-200/70"
            />
          </Tooltip>
          <Tooltip title="Save Window">
            <Button
              type="text"
              size="small"
              icon={<Save size={14} className="text-slate-600" />}
              onClick={handleSaveWindow}
              className="flex items-center justify-center w-7 h-7 min-w-0 hover:bg-slate-200/70"
            />
          </Tooltip>
          <Tooltip title="Discard Inactive Tabs">
            <Button
              type="text"
              size="small"
              icon={<Moon size={14} className="text-slate-600" />}
              onClick={handleDiscardWindow}
              className="flex items-center justify-center w-7 h-7 min-w-0 hover:bg-slate-200/70"
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
                className="flex items-center justify-center w-7 h-7 min-w-0 hover:bg-red-50 text-slate-400 hover:text-red-500"
              />
            </Tooltip>
          </Popconfirm>
        </div>
      </div>

      {/* Local In-Window Search Bar */}
      <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/40">
        <Input
          prefix={<Search size={13} className="text-slate-400 mr-1" />}
          allowClear
          placeholder={`Filter in Window ${windowIndex}...`}
          size="small"
          value={localSearch}
          onChange={(e) => setLocalSearch(e.target.value)}
          className="rounded-md text-xs"
        />
      </div>

      {/* Move Selected Tabs Banner (if tabs selected elsewhere) */}
      {otherSelectedTabs.length > 0 && (
        <div className="px-3 py-1.5 bg-blue-50 border-b border-blue-100 flex items-center justify-between">
          <span className="text-[11px] text-blue-800 font-medium">
            {otherSelectedTabs.length} selected elsewhere
          </span>
          <Button
            type="primary"
            size="small"
            icon={<ArrowDownToLine size={12} />}
            loading={isMovingBatch}
            onClick={handleMoveSelectedHere}
            className="!h-6 !text-[11px] !px-2 flex items-center gap-1"
          >
            Move Here
          </Button>
        </div>
      )}

      {/* Scrollable Tab List */}
      <div className="flex-1 overflow-y-auto p-2.5 space-y-1.5 focus:outline-none">
        {displayedTabs.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 text-xs py-8 text-center">
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
      <div className="px-3 py-1.5 bg-slate-50/80 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          {localSearch ? `${displayedTabs.length} of ${tabs.length} tabs` : `${tabs.length} tabs`}
        </span>
        <button
          onClick={handleFocusWindow}
          className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition-colors cursor-pointer"
        >
          <span>Switch Window</span>
          <ExternalLink size={11} />
        </button>
      </div>
    </div>
  )
}
