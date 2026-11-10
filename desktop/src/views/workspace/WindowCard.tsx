import React, { useState, useMemo, useDeferredValue } from 'react'
import { Tooltip, Modal, Checkbox, Dropdown, message, } from 'antd'
import type { MenuProps } from 'antd'
import { motion } from 'framer-motion'
import {
  Focus,
  Plus,
  X,
  Search,
  CheckSquare,
  Layers,
  Sparkles,
  Trash2,
  ExternalLink,
  Youtube,
  ChevronDown,
  ChevronRight
} from 'lucide-react'
import {
  type UnifiedWindow,
  type ConnectedBrowser,
  isSameBrowserEngine
} from '../../../../src/adapter/types'
import { TabCard } from './TabCard'
import {
  getBrowserBadge,
  type SelectedTabIdentifier,
  type DesktopSearchFilters,
  type WorkspaceLayoutMode,
  type GridDensity
} from './types'
import { getTabDragPayload, clearTabDragPayload, } from './dragState'
import { launchBrowserWindow } from '../../services/desktopLauncher'
import { BrowserIcon } from '../../components/BrowserIcon'

interface WindowCardProps {
  window: UnifiedWindow
  allWindows: UnifiedWindow[]
  browsers: ConnectedBrowser[]
  index: number
  searchFilters: DesktopSearchFilters
  selectedTabs: Map<string, SelectedTabIdentifier>
  selectedTabsList?: SelectedTabIdentifier[]
  isSelectionActive?: boolean
  onToggleSelectTab: (browserId: string, tabId: number, windowId: number, title: string, url: string) => void
  onSelectRangeInWindow?: (
    win: UnifiedWindow,
    clickedTab: { id: number; title: string; url: string },
    tabsToUse?: { id: number; title: string; url: string }[]
  ) => void
  onInvertSelectionInWindow?: (
    win: UnifiedWindow,
    tabsToUse?: { id: number; title: string; url: string }[]
  ) => void
  onSelectAllInWindow: (
    window: UnifiedWindow,
    select: boolean,
    tabsToUse?: { id: number; title: string; url: string }[]
  ) => void
  onFocusTab: (browserId: string, windowId: number, tabId: number) => void
  onFocusWindow: (browserId: string, windowId: number) => void
  onCloseTab: (browserId: string, tabId: number) => void
  onCloseWindow: (browserId: string, windowId: number) => void
  onCreateTab: (browserId: string, windowId?: number, url?: string) => void
  onDiscardTab: (browserId: string, tabId: number) => void
  onMigrateTab?: (
    sourceBrowserId: string,
    targetBrowserId: string,
    tabId: number,
    url: string,
    targetWindowId?: number
  ) => void | Promise<void>
  onMoveTabs?: (browserId: string, tabIds: number[], targetWindowId: number, targetIndex?: number) => Promise<void>
  onOpenDeduplicate?: () => void
  onSortWindowByDuration?: (browserId: string, windowId: number, sortBy: string, direction?: 'asc' | 'desc') => Promise<void>
  layoutMode?: WorkspaceLayoutMode
  gridDensity?: GridDensity
}

const WindowCardComponent: React.FC<WindowCardProps> = ({
  window: win,
  allWindows,
  browsers,
  index,
  searchFilters,
  selectedTabs,
  selectedTabsList = [],
  isSelectionActive = false,
  onToggleSelectTab,
  onSelectRangeInWindow,
  onInvertSelectionInWindow,
  onSelectAllInWindow,
  onFocusTab,
  onFocusWindow,
  onCloseTab,
  onCloseWindow,
  onCreateTab,
  onDiscardTab,
  onMigrateTab,
  onMoveTabs,
  onOpenDeduplicate,
  onSortWindowByDuration,
  layoutMode = 'grid',
  gridDensity = 'comfortable'
}) => {
  const [localSearch, setLocalSearch] = useState('')
  const [isCollapsed, setIsCollapsed] = useState(false)
  const deferredLocalSearch = useDeferredValue(localSearch)
  const badge = getBrowserBadge(win.browserId)
  const isOffline = Boolean((win as unknown as { isOffline?: boolean }).isOffline)

  // Filter tabs using searchFilters and local search (hoisting regex/lowercasing outside loop for high performance)
  const visibleTabs = useMemo(() => {
    const lLocalQuery = deferredLocalSearch.toLowerCase().trim()
    const query = searchFilters.query.trim()
    const isAudibleOnly = searchFilters.audibleOnly || query.includes('is:audible')
    const isPinnedOnly = searchFilters.pinnedOnly || query.includes('is:pinned')
    const isSuspendedOnly = searchFilters.suspendedOnly || query.includes('is:suspended')

    const cleanQuery = query
      .replace(/is:audible/g, '')
      .replace(/is:pinned/g, '')
      .replace(/is:suspended/g, '')
      .trim()

    let regex: RegExp | null = null
    if (cleanQuery && searchFilters.isRegex) {
      try {
        regex = new RegExp(cleanQuery, 'i')
      } catch {
        regex = null
      }
    }
    const lowerQuery = cleanQuery.toLowerCase()
    const searchInTitle = searchFilters.searchInTitle
    const searchInUrl = searchFilters.searchInUrl

    return (win.tabs || []).filter((t) => {
      // Local in-window search override
      if (lLocalQuery) {
        const titleMatch = t.title ? t.title.toLowerCase().includes(lLocalQuery) : false
        const urlMatch = t.url ? t.url.toLowerCase().includes(lLocalQuery) : false
        if (!titleMatch && !urlMatch) return false
      }

      // Audible / Pinned / Suspended toggles
      if (isAudibleOnly && !t.audible) return false
      if (isPinnedOnly && !t.pinned) return false
      if (isSuspendedOnly && !t.discarded) return false

      if (!cleanQuery) return true

      if (regex) {
        if (searchInTitle && t.title && regex.test(t.title)) return true
        if (searchInUrl && t.url && regex.test(t.url)) return true
        return false
      } else {
        if (searchInTitle && t.title && t.title.toLowerCase().includes(lowerQuery)) return true
        if (searchInUrl && t.url && t.url.toLowerCase().includes(lowerQuery)) return true
        return false
      }
    })
  }, [win.tabs, deferredLocalSearch, searchFilters])

  // Check selection state
  const allVisibleSelected =
    visibleTabs.length > 0 &&
    visibleTabs.every((t) => selectedTabs.has(`${win.browserId}:${t.id}`))
  const someVisibleSelected =
    visibleTabs.some((t) => selectedTabs.has(`${win.browserId}:${t.id}`)) &&
    !allVisibleSelected
  const selectedInThisWindowCount = useMemo(() => {
    return visibleTabs.filter((t) => selectedTabs.has(`${win.browserId}:${t.id}`)).length
  }, [visibleTabs, selectedTabs, win.browserId])

  const handleConfirmClose = () => {
    Modal.confirm({
      title: 'Close Window',
      content: `Are you sure you want to close window #${win.id}? All ${(win.tabs || []).length} tabs will be closed.`,
      okText: 'Close Window',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => onCloseWindow(win.browserId, win.id)
    })
  }

  // Target windows for merge
  const otherWindows = allWindows.filter(
    (w) => w.id !== win.id && !(w as unknown as { isOffline?: boolean }).isOffline
  )

  const handleMergeIntoWindow = async (targetWin: UnifiedWindow) => {
    Modal.confirm({
      title: 'Merge Window',
      content: `Merge all ${(win.tabs || []).length} tabs from window #${win.id} into window #${targetWin.id}?`,
      okText: 'Merge',
      onOk: async () => {
        try {
          for (const t of win.tabs || []) {
            if (t.url) {
              await onCreateTab(targetWin.browserId, targetWin.id, t.url)
              if (!isOffline) {
                await onCloseTab(win.browserId, t.id)
              }
            }
          }
          message.success(`Merged window #${win.id} into window #${targetWin.id}`)
        } catch (err) {
          console.error('Failed to merge windows:', err)
          message.error('Merge operation failed')
        }
      }
    })
  }

  const windowContextMenu: MenuProps['items'] = [
    {
      key: 'new-tab',
      label: 'New Tab',
      icon: <Plus size={14} />,
      disabled: isOffline,
      onClick: () => onCreateTab(win.browserId, win.id)
    },
    {
      key: 'focus-win',
      label: 'Focus Window',
      icon: <Focus size={14} />,
      disabled: isOffline,
      onClick: () => onFocusWindow(win.browserId, win.id)
    },
    {
      key: 'select-all',
      label: allVisibleSelected ? 'Deselect All Tabs' : 'Select All Tabs',
      icon: <CheckSquare size={14} />,
      onClick: () => onSelectAllInWindow(win, !allVisibleSelected, visibleTabs)
    },
    ...(onInvertSelectionInWindow
      ? [
          {
            key: 'invert-selection',
            label: 'Invert Selection in Window',
            icon: <CheckSquare size={14} />,
            onClick: () => onInvertSelectionInWindow(win, visibleTabs)
          }
        ]
      : []),
    ...(otherWindows.length > 0
      ? [
          {
            key: 'merge-win',
            label: 'Merge into Window',
            icon: <Layers size={14} />,
            popupOffset: [4, -4] as [number, number],
            children: otherWindows.map((tw) => ({
              key: `merge-${tw.id}`,
              label: `${getBrowserBadge(tw.browserId).name} Window #${tw.id} (${(tw.tabs || []).length} tabs)`,
              onClick: () => handleMergeIntoWindow(tw)
            }))
          }
        ]
      : []),
    ...(onOpenDeduplicate
      ? [
          {
            key: 'dedup',
            label: 'Deduplicate Window Tabs',
            icon: <Sparkles size={14} />,
            onClick: onOpenDeduplicate
          }
        ]
      : []),
    ...(onSortWindowByDuration && !isOffline
      ? [
          {
            key: 'sort-youtube',
            label: 'Sort by Video Duration',
            icon: <Youtube size={14} className="text-red-500" />,
            popupOffset: [4, -4] as [number, number],
            children: [
              {
                key: 'yt-asc',
                label: 'Shortest First (Ascending)',
                onClick: () => onSortWindowByDuration(win.browserId, win.id, 'duration', 'asc')
              },
              {
                key: 'yt-desc',
                label: 'Longest First (Descending)',
                onClick: () => onSortWindowByDuration(win.browserId, win.id, 'duration', 'desc')
              }
            ]
          }
        ]
      : []),
    { type: 'divider' },
    {
      key: 'close-win',
      label: 'Close Window',
      icon: <Trash2 size={14} />,
      danger: true,
      disabled: isOffline,
      onClick: handleConfirmClose
    }
  ]

  const [isDragOver, setIsDragOver] = useState(false)

  const handleDrop = async (e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
    if (isOffline) return

    try {
      let data: any = getTabDragPayload()
      if (!data) {
        try {
          const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain')
          if (raw && (raw.startsWith('{') || raw.startsWith('['))) {
            data = JSON.parse(raw)
          }
        } catch {}
      }
      clearTabDragPayload()

      if (!data) return

      // Collect tabs to process (supports multi-tab drop or single tab)
      const tabsToMove = Array.isArray(data.tabs) && data.tabs.length > 0
        ? data.tabs
        : data.tabId && data.browserId
        ? [{
            browserId: data.browserId,
            windowId: data.windowId ?? 0,
            tabId: data.tabId,
            url: data.url || '',
            title: data.title || ''
          }]
        : []

      if (tabsToMove.length === 0) return

      // Filter out tabs that already belong to this exact window
      const validTabs = tabsToMove.filter(
        (t) => !(isSameBrowserEngine(t.browserId, win.browserId) && Number(t.windowId) === Number(win.id))
      )

      if (validTabs.length === 0) return

      // 1. Cross-browser tabs
      const crossBrowserTabs = validTabs.filter(
        (t) => !isSameBrowserEngine(t.browserId, win.browserId)
      )
      for (const t of crossBrowserTabs) {
        if (onMigrateTab && t.url) {
          await onMigrateTab(t.browserId, win.browserId, t.tabId, t.url, win.id)
        }
      }

      // 2. Same browser, different window tabs
      const sameBrowserTabs = validTabs.filter(
        (t) => isSameBrowserEngine(t.browserId, win.browserId)
      )
      if (sameBrowserTabs.length > 0) {
        const tabIds = sameBrowserTabs.map((t) => Number(t.tabId)).filter((id) => !isNaN(id) && id > 0)
        if (onMoveTabs) {
          await onMoveTabs(win.browserId, tabIds, Number(win.id))
        } else {
          for (const t of sameBrowserTabs) {
            await onCreateTab(win.browserId, Number(win.id), t.url)
            await onCloseTab(t.browserId, t.tabId)
          }
        }
      }

      const count = validTabs.length
      message.success(
        `Moved ${count} ${count === 1 ? 'tab' : 'tabs'} to ${badge.name} Window #${win.id}`
      )
    } catch (err) {
      console.error('Drop error:', err)
      message.error('Failed to move tabs to window')
    }
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.25,
        ease: [0.16, 1, 0.3, 1]
      }}
      onDragEnter={(e) => {
        if (!isOffline) {
          e.preventDefault()
          setIsDragOver(true)
        }
      }}
      onDragOver={(e) => {
        if (!isOffline) {
          e.preventDefault()
          e.dataTransfer.dropEffect = 'move'
          if (!isDragOver) setIsDragOver(true)
        }
      }}
      onDragLeave={(e) => {
        if (!e.currentTarget.contains(e.relatedTarget as Node)) {
          setIsDragOver(false)
        }
      }}
      onDrop={(e) => {
        setIsDragOver(false)
        handleDrop(e)
      }}
      onContextMenu={(e) => {
        e.stopPropagation()
      }}
      className={`relative flex flex-col ${
        isCollapsed
          ? 'shrink-0'
          : layoutMode === 'list'
          ? 'max-h-[580px] min-h-[160px]'
          : 'h-full min-h-0'
      } rounded-xl overflow-hidden transition-all duration-200`}
      style={{
        background: 'var(--surface-2)',
        border: isDragOver
          ? '2px dashed var(--accent)'
          : `1px solid ${isOffline ? 'rgba(99, 102, 241, 0.3)' : 'var(--border)'}`,
        boxShadow: isDragOver ? 'var(--shadow-glow)' : 'var(--shadow-sm)',
        opacity: isOffline ? 0.85 : 1,
        transform: isDragOver ? 'scale(1.01)' : 'none'
      }}
      onMouseEnter={(e) => {
        if (!isDragOver) {
          e.currentTarget.style.boxShadow = 'var(--shadow-md)'
          e.currentTarget.style.borderColor = 'var(--border-strong)'
        }
      }}
      onMouseLeave={(e) => {
        if (!isDragOver) {
          e.currentTarget.style.boxShadow = 'var(--shadow-sm)'
          e.currentTarget.style.borderColor = isOffline ? 'rgba(99, 102, 241, 0.3)' : 'var(--border)'
        }
      }}
    >
      {/* Top Accent Stripe */}
      <div
        className="h-[2px] shrink-0"
        style={{
          background: isOffline
            ? 'linear-gradient(to right, #6366f1, transparent)'
            : `linear-gradient(to right, ${badge.color}, transparent)`
        }}
      />

      {/* Card Header with Context Menu */}
      <Dropdown
        menu={{ items: windowContextMenu }}
        trigger={['contextMenu']}
        destroyPopupOnHide
        getPopupContainer={() => document.body}
        overlayClassName="compact-context-menu"
      >
        <div
          onContextMenu={(e) => {
            e.stopPropagation()
          }}
          className={`${
            gridDensity === 'compact' ? 'px-2.5 py-1.5' : 'px-3.5 py-2.5'
          } flex items-center justify-between shrink-0 select-none cursor-default`}
          style={{
            borderBottom: '1px solid var(--border-subtle)',
            background: 'var(--surface-3)'
          }}
        >
          <div className="flex items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                setIsCollapsed((prev) => !prev)
              }}
              className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-4)] transition-all cursor-pointer"
              title={isCollapsed ? 'Expand window' : 'Collapse window'}
            >
              {isCollapsed ? <ChevronRight size={14} /> : <ChevronDown size={14} />}
            </button>

            <Tooltip
              title={
                allVisibleSelected
                  ? `Deselect all ${visibleTabs.length} tabs in this window`
                  : `Select all ${visibleTabs.length} tabs (or Shift-click tabs to range-select)`
              }
            >
              <div className="flex items-center shrink-0 cursor-pointer">
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  onChange={(e) => onSelectAllInWindow(win, e.target.checked, visibleTabs)}
                />
              </div>
            </Tooltip>

            <Tooltip title={isOffline ? `${badge.name} (Closed)` : badge.name}>
              <div className="flex items-center shrink-0 hover:scale-105 transition-transform cursor-pointer">
                <BrowserIcon browserId={win.browserId} size={18} />
              </div>
            </Tooltip>

            {isOffline && (
              <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-indigo-500/15 text-indigo-500 shrink-0">
                Closed
              </span>
            )}

            <Tooltip title={`Window ID: #${win.id}`}>
              <span
                className="text-[11px] shrink-0 font-mono max-w-[85px] truncate"
                style={{ color: 'var(--text-tertiary)' }}
              >
                #{win.id}
              </span>
            </Tooltip>

            <span
              className="text-[11px] px-2 py-0.5 rounded-full shrink-0 font-medium font-mono"
              style={{
                background: 'var(--accent-subtle)',
                color: 'var(--accent)'
              }}
            >
              {visibleTabs.length} tabs
            </span>

            {selectedInThisWindowCount > 0 && (
              <span
                className="text-[10px] px-1.5 py-0.5 rounded-full shrink-0 font-medium font-mono"
                style={{
                  background: 'var(--accent)',
                  color: 'var(--text-on-accent)'
                }}
              >
                {selectedInThisWindowCount} sel
              </span>
            )}
          </div>

          <div className="flex items-center gap-0.5 shrink-0">
            {isOffline ? (
              <Tooltip title="Launch browser and restore these tabs in a new window">
                <button
                  type="button"
                  onClick={() => {
                    const urls = (win.tabs || []).map((t) => t.url).filter(Boolean)
                    launchBrowserWindow(win.browserId, urls)
                    message.success(`Restoring ${urls.length} tabs in ${badge.name}...`)
                  }}
                  className="flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-md bg-indigo-500/15 text-indigo-500 hover:bg-indigo-500/25 transition-all"
                >
                  <ExternalLink size={12} />
                  <span>Restore</span>
                </button>
              </Tooltip>
            ) : (
              <>
                <Tooltip title="Focus window">
                  <button
                    type="button"
                    onClick={() => onFocusWindow(win.browserId, win.id)}
                    className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 active:scale-95 text-[var(--text-tertiary)] hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
                  >
                    <Focus size={14} />
                  </button>
                </Tooltip>

                <Tooltip title="New tab">
                  <button
                    type="button"
                    onClick={() => onCreateTab(win.browserId, win.id)}
                    className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 active:scale-95 text-[var(--text-tertiary)] hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
                  >
                    <Plus size={14} />
                  </button>
                </Tooltip>

                <Tooltip title="Close window">
                  <button
                    type="button"
                    onClick={handleConfirmClose}
                    className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 active:scale-95 text-[var(--text-tertiary)] hover:bg-red-500/10 hover:text-red-500"
                  >
                    <X size={14} />
                  </button>
                </Tooltip>
              </>
            )}
          </div>
        </div>
      </Dropdown>

      {/* In-Window Filter & Tab Content (Collapsible) */}
      {!isCollapsed && (
        <>
          {/* In-Window Filter */}
          <div
            className={`${gridDensity === 'compact' ? 'px-2.5 py-1' : 'px-3 py-2'} shrink-0`}
            style={{
              background: 'var(--surface-2)',
              borderBottom: '1px solid var(--border-subtle)'
            }}
          >
            <div
              className="flex items-center gap-2 rounded-lg px-2.5"
              style={{
                background: 'var(--surface-3)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <Search size={12} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <input
                type="text"
                placeholder="Filter in this window..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full bg-transparent border-none outline-none text-xs py-1.5"
                style={{
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)'
                }}
              />
              {localSearch && (
                <button
                  type="button"
                  onClick={() => setLocalSearch('')}
                  className="p-0.5 rounded-full hover:bg-[var(--surface-4)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
                  title="Clear window filter"
                >
                  <X size={11} />
                </button>
              )}
            </div>
          </div>

          {/* Tab List */}
          <div
            className={
              layoutMode === 'list'
                ? 'flex-1 min-h-0 overflow-y-auto p-3 grid grid-cols-1 md:grid-cols-2 gap-2'
                : gridDensity === 'compact'
                ? 'flex-1 min-h-0 overflow-y-auto p-1.5 flex flex-col gap-0.5'
                : 'flex-1 min-h-0 overflow-y-auto p-2 flex flex-col gap-0.5'
            }
            style={{ background: 'var(--surface-2)' }}
            onDragOver={(e) => {
              if (!isOffline) {
                e.preventDefault()
                e.dataTransfer.dropEffect = 'move'
                if (!isDragOver) setIsDragOver(true)
              }
            }}
            onDrop={(e) => {
              setIsDragOver(false)
              handleDrop(e)
            }}
          >
            {visibleTabs.length === 0 ? (
              <div
                className="py-8 text-center text-xs col-span-full"
                style={{ color: 'var(--text-tertiary)' }}
              >
                No matching tabs in this window
              </div>
            ) : (
              visibleTabs.map((tab, tabIdx) => (
                <TabCard
                  key={`${win.browserId}-${tab.id}`}
                  tab={tab}
                  browserId={win.browserId}
                  windowId={win.id}
                  window={win}
                  visibleTabs={visibleTabs}
                  index={tabIdx}
                  isSelected={selectedTabs.has(`${win.browserId}:${tab.id}`)}
                  isSelectionActive={isSelectionActive}
                  selectedTabsList={selectedTabsList}
                  isOffline={isOffline}
                  browsers={browsers}
                  onToggleSelect={onToggleSelectTab}
                  onSelectRange={onSelectRangeInWindow}
                  onFocusTab={onFocusTab}
                  onCloseTab={onCloseTab}
                  onDiscardTab={onDiscardTab}
                  onCreateTab={onCreateTab}
                  onMigrateTab={onMigrateTab}
                  allWindows={allWindows}
                  onMoveTabs={onMoveTabs}
                />
              ))
            )}
          </div>
        </>
      )}
    </motion.div>
  )
}

export const WindowCard = React.memo(WindowCardComponent)
