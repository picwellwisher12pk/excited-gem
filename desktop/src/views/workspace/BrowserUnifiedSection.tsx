import React, { useState, useMemo } from 'react'
import { Tooltip, Modal, message } from 'antd'
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Volume2,
  CircleDashed,
  Rows,
  LayoutGrid
} from 'lucide-react'
import {
  type UnifiedWindow,
  type ConnectedBrowser
} from '../../../../src/adapter/types'
import { WindowCard } from './WindowCard'
import { TabCard } from './TabCard'
import { BrowserIcon } from '../../components/BrowserIcon'
import {
  getBrowserBadge,
  type SelectedTabIdentifier,
  type DesktopSearchFilters
} from './types'

interface BrowserUnifiedSectionProps {
  browserId: string
  windows: UnifiedWindow[]
  allWindows: UnifiedWindow[]
  browsers: ConnectedBrowser[]
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
  onSortWindowTabs?: (browserId: string, windowId: number, sortBy: string, direction?: 'asc' | 'desc') => Promise<void>
}

export const BrowserUnifiedSection: React.FC<BrowserUnifiedSectionProps> = ({
  browserId,
  windows,
  allWindows,
  browsers,
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
  onSortWindowTabs
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [viewMode, setViewMode] = useState<'windows' | 'flat'>('windows')

  const badge = getBrowserBadge(browserId)
  const connectedBrowser = browsers.find((b) => b.id === browserId)
  const isOffline = connectedBrowser ? !connectedBrowser.isConnected : false

  const totalTabs = useMemo(() => {
    return windows.reduce((acc, w) => acc + (w.tabs ? w.tabs.length : 0), 0)
  }, [windows])

  const audibleCount = useMemo(() => {
    return windows.reduce(
      (acc, w) => acc + (w.tabs ? w.tabs.filter((t) => t.audible).length : 0),
      0
    )
  }, [windows])

  const suspendedCount = useMemo(() => {
    return windows.reduce(
      (acc, w) => acc + (w.tabs ? w.tabs.filter((t) => t.discarded).length : 0),
      0
    )
  }, [windows])

  // Flattened tabs for the "flat" unified listing mode
  const allTabsFlattened = useMemo(() => {
    return windows.flatMap((w) =>
      (w.tabs || []).map((t) => ({
        tab: t,
        window: w
      }))
    )
  }, [windows])

  const handleCloseAllInBrowser = () => {
    Modal.confirm({
      title: `Close all ${badge.name} Windows`,
      content: `Are you sure you want to close all ${windows.length} windows (${totalTabs} tabs) in ${badge.name}?`,
      okText: 'Close All',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: async () => {
        try {
          for (const win of windows) {
            await onCloseWindow(browserId, win.id)
          }
          message.success(`Closed all windows in ${badge.name}`)
        } catch {
          message.error(`Failed to close windows in ${badge.name}`)
        }
      }
    })
  }

  return (
    <div
      className="flex flex-col rounded-2xl overflow-hidden transition-all duration-200"
      style={{
        background: 'var(--surface-1)',
        border: '1px solid var(--border-subtle)',
        boxShadow: 'var(--shadow-sm)'
      }}
    >
      {/* Browser Group Header Strip */}
      <div
        className="px-4 py-3 flex items-center justify-between gap-3 border-b select-none transition-colors"
        style={{
          background: 'var(--surface-2)',
          borderColor: 'var(--border-subtle)'
        }}
      >
        {/* Left: Collapse toggle, Icon, Name, and Badges */}
        <div className="flex items-center gap-2.5 min-w-0">
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="p-1 rounded-md text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-4)] transition-all cursor-pointer"
            title={isCollapsed ? 'Expand browser listing' : 'Collapse browser listing'}
          >
            {isCollapsed ? <ChevronRight size={15} /> : <ChevronDown size={15} />}
          </button>

          <div className="flex items-center gap-2 shrink-0">
            <BrowserIcon browserId={browserId} size={22} />
            <span
              className="text-sm font-bold font-sans tracking-tight"
              style={{ color: 'var(--text-primary)' }}
            >
              {badge.name}
            </span>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-mono font-semibold"
              style={{
                background: 'var(--accent-subtle)',
                color: 'var(--accent)'
              }}
            >
              {totalTabs} tabs
            </span>

            <span
              className="text-[11px] px-2 py-0.5 rounded-full font-mono font-medium hidden sm:inline-block"
              style={{
                background: 'var(--surface-3)',
                color: 'var(--text-secondary)'
              }}
            >
              {windows.length} {windows.length === 1 ? 'window' : 'windows'}
            </span>

            {audibleCount > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 bg-amber-500/10 text-amber-600 dark:text-amber-400">
                <Volume2 size={11} /> {audibleCount}
              </span>
            )}

            {suspendedCount > 0 && (
              <span className="text-[11px] px-2 py-0.5 rounded-full font-medium flex items-center gap-1 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
                <CircleDashed size={11} strokeWidth={1.75} /> {suspendedCount}
              </span>
            )}

            {isOffline && (
              <span className="text-[10px] px-1.5 py-0.2 rounded font-medium bg-indigo-500/15 text-indigo-500">
                Closed
              </span>
            )}
          </div>
        </div>

        {/* Right: View Toggle (Windows vs Flat Tabs) & Actions */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Sub-view toggle: Containers vs Unified List */}
          <div
            className="flex items-center gap-0.5 p-0.5 rounded-lg"
            style={{
              background: 'var(--surface-3)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <Tooltip title="View as Window Containers">
              <button
                type="button"
                onClick={() => setViewMode('windows')}
                className="p-1 rounded-md transition-all active:scale-95 cursor-pointer"
                style={{
                  background: viewMode === 'windows' ? 'var(--surface-4)' : 'transparent',
                  color: viewMode === 'windows' ? 'var(--accent)' : 'var(--text-tertiary)'
                }}
              >
                <LayoutGrid size={13} strokeWidth={viewMode === 'windows' ? 2 : 1.7} />
              </button>
            </Tooltip>
            <Tooltip title="View all tabs in unified flat stream">
              <button
                type="button"
                onClick={() => setViewMode('flat')}
                className="p-1 rounded-md transition-all active:scale-95 cursor-pointer"
                style={{
                  background: viewMode === 'flat' ? 'var(--surface-4)' : 'transparent',
                  color: viewMode === 'flat' ? 'var(--accent)' : 'var(--text-tertiary)'
                }}
              >
                <Rows size={13} strokeWidth={viewMode === 'flat' ? 2 : 1.7} />
              </button>
            </Tooltip>
          </div>

          {/* New Window in this browser */}
          {!isOffline && (
            <Tooltip title={`Open new window in ${badge.name}`}>
              <button
                type="button"
                onClick={() => onCreateTab(browserId)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer"
                style={{
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent)',
                  border: '1px solid var(--border-accent)'
                }}
              >
                <Plus size={13} strokeWidth={2} />
                <span className="hidden md:inline">New Window</span>
              </button>
            </Tooltip>
          )}

          {/* Close all windows in this browser */}
          {!isOffline && windows.length > 1 && (
            <Tooltip title={`Close all ${windows.length} windows in ${badge.name}`}>
              <button
                type="button"
                onClick={handleCloseAllInBrowser}
                className="px-2 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer hover:bg-red-500/10 hover:text-red-500"
                style={{
                  background: 'var(--surface-3)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-tertiary)'
                }}
              >
                Close All
              </button>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Browser Body */}
      {!isCollapsed && (
        <div className="p-4">
          {viewMode === 'windows' ? (
            /* Window Containers Grid for this Browser */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {windows.map((win, winIdx) => (
                <WindowCard
                  key={`${win.browserId}-${win.id}`}
                  window={win}
                  layoutMode="list"
                  allWindows={allWindows}
                  browsers={browsers}
                  index={winIdx}
                  searchFilters={searchFilters}
                  selectedTabs={selectedTabs}
                  selectedTabsList={selectedTabsList}
                  isSelectionActive={isSelectionActive}
                  onToggleSelectTab={onToggleSelectTab}
                  onSelectRangeInWindow={onSelectRangeInWindow}
                  onInvertSelectionInWindow={onInvertSelectionInWindow}
                  onSelectAllInWindow={onSelectAllInWindow}
                  onFocusTab={onFocusTab}
                  onFocusWindow={onFocusWindow}
                  onCloseTab={onCloseTab}
                  onCloseWindow={onCloseWindow}
                  onCreateTab={onCreateTab}
                  onDiscardTab={onDiscardTab}
                  onMigrateTab={onMigrateTab}
                  onMoveTabs={onMoveTabs}
                  onOpenDeduplicate={onOpenDeduplicate}
                  onSortWindowByDuration={onSortWindowTabs}
                />
              ))}
            </div>
          ) : (
            /* All Tabs Unified Stream for this Browser */
            <div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[640px] overflow-y-auto p-2 rounded-xl"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              {allTabsFlattened.length === 0 ? (
                <div
                  className="py-8 text-center text-xs col-span-full"
                  style={{ color: 'var(--text-tertiary)' }}
                >
                  No tabs in {badge.name}
                </div>
              ) : (
                allTabsFlattened.map(({ tab, window: win }, tabIdx) => (
                  <TabCard
                    key={`${win.browserId}-${tab.id}`}
                    tab={tab}
                    browserId={win.browserId}
                    windowId={win.id}
                    window={win}
                    visibleTabs={win.tabs || []}
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
          )}
        </div>
      )}
    </div>
  )
}

