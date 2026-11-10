import React, { useState, useMemo } from 'react'
import { Tooltip, Modal, Checkbox, message, } from 'antd'

const EMPTY_TABS: UnifiedTab[] = []
import {
  ChevronDown,
  ChevronRight,
  Focus,
  Plus,
  CircleDashed,
  X,
  Sparkles,
  ExternalLink
} from 'lucide-react'
import {
  type UnifiedWindow,
  type ConnectedBrowser,
  type UnifiedTab
} from '../../../../src/adapter/types'
import { UnifiedTabRow } from './UnifiedTabRow'
import { BrowserIcon } from '../../components/BrowserIcon'
import {
  getBrowserBadge,
  type SelectedTabIdentifier,
  type DesktopSearchFilters
} from './types'
import { launchBrowserWindow } from '../../services/desktopLauncher'

interface UnifiedListViewProps {
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
}

const UnifiedListViewComponent: React.FC<UnifiedListViewProps> = ({
  windows,
  allWindows,
  browsers,
  searchFilters,
  selectedTabs,
  selectedTabsList = [],
  isSelectionActive = false,
  onToggleSelectTab,
  onSelectRangeInWindow,
  onInvertSelectionInWindow: _onInvertSelectionInWindow,
  onSelectAllInWindow,
  onFocusTab,
  onFocusWindow,
  onCloseTab,
  onCloseWindow,
  onCreateTab,
  onDiscardTab,
  onMigrateTab,
  onMoveTabs,
  onOpenDeduplicate
}) => {
  // Collapsed windows state (by default all open)
  const [collapsedWindows, setCollapsedWindows] = useState<Set<string>>(() => new Set())

  const toggleWindowCollapse = (key: string) => {
    setCollapsedWindows((prev) => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Filter tabs according to search query, audible, pinned, suspended, and regex
  const visibleTabsMap = useMemo(() => {
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

    const filterTabs = (tabs: UnifiedTab[]): UnifiedTab[] => {
      return (tabs || []).filter((t) => {
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
    }

    const map = new Map<string, UnifiedTab[]>()
    for (const win of windows) {
      const winKey = `${win.browserId}-${win.id}`
      map.set(winKey, filterTabs(win.tabs || []))
    }
    return map
  }, [windows, searchFilters])

  return (
    <div className="flex flex-col w-full max-w-6xl mx-auto pb-12 select-none">
      {windows.map((win) => {
        const winKey = `${win.browserId}-${win.id}`
        const isCollapsed = collapsedWindows.has(winKey)
        const badge = getBrowserBadge(win.browserId)
        const isOffline = Boolean((win as unknown as { isOffline?: boolean }).isOffline)
        const visibleTabs = visibleTabsMap.get(winKey) || EMPTY_TABS

        const allVisibleSelected =
          visibleTabs.length > 0 &&
          visibleTabs.every((t) => selectedTabs.has(`${win.browserId}:${t.id}`))
        const someVisibleSelected =
          visibleTabs.some((t) => selectedTabs.has(`${win.browserId}:${t.id}`)) &&
          !allVisibleSelected
        const selectedInWindowCount = visibleTabs.filter((t) =>
          selectedTabs.has(`${win.browserId}:${t.id}`)
        ).length

        const handleConfirmClose = () => {
          Modal.confirm({
            title: `Close Window #${win.id}`,
            content: `Close window #${win.id} and all ${(win.tabs || []).length} tabs?`,
            okText: 'Close Window',
            okType: 'danger',
            cancelText: 'Cancel',
            onOk: () => onCloseWindow(win.browserId, win.id)
          })
        }

        const handleDiscardInactive = () => {
          const inactive = (win.tabs || []).filter((t) => !t.active && !t.discarded)
          for (const t of inactive) {
            onDiscardTab(win.browserId, t.id)
          }
          message.success(`Put ${inactive.length} tabs to sleep`)
        }

        return (
          <div
            key={winKey}
            className="flex flex-col mb-4 overflow-hidden rounded-xl transition-all duration-150"
            style={{
              background: 'var(--surface-1)',
              border: '1px solid var(--border-subtle)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            {/* Window Header Row (matching extension GroupHeader UI) */}
            <div
              onClick={() => toggleWindowCollapse(winKey)}
              className="flex items-center px-4 py-2.5 h-[48px] cursor-pointer transition-colors border-b select-none group"
              style={{
                background: 'var(--surface-2)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              {/* Chevron Toggle */}
              <div className="mr-2 text-[var(--text-tertiary)] group-hover:text-[var(--text-primary)] transition-colors">
                {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
              </div>

              {/* Window Selection Checkbox */}
              <div
                className="mr-2.5 flex items-center justify-center cursor-pointer"
                onClick={(e) => e.stopPropagation()}
              >
                <Checkbox
                  checked={allVisibleSelected}
                  indeterminate={someVisibleSelected}
                  disabled={visibleTabs.length === 0}
                  onChange={(e) => onSelectAllInWindow(win, e.target.checked, visibleTabs)}
                />
              </div>

              {/* Browser Logo */}
              <div className="mr-2 flex items-center shrink-0">
                <BrowserIcon browserId={win.browserId} size={16} />
              </div>

              {/* Window Title & Indicators */}
              <span
                className="font-semibold text-sm mr-2 truncate flex items-center gap-1.5"
                style={{ color: 'var(--text-primary)' }}
              >
                <span>Window {win.id}</span>
                {win.focused && (
                  <span
                    className="text-xs font-normal px-1.5 py-0.2 rounded"
                    style={{ background: 'var(--accent-subtle)', color: 'var(--accent)' }}
                  >
                    (Current)
                  </span>
                )}
                {isOffline && (
                  <span className="text-[10px] font-normal px-1.5 py-0.2 rounded bg-indigo-500/15 text-indigo-500">
                    Closed
                  </span>
                )}
              </span>

              {/* Tab Count */}
              <span className="text-xs font-mono" style={{ color: 'var(--text-tertiary)' }}>
                ({visibleTabs.length}
                {visibleTabs.length !== (win.tabs || []).length && ` of ${(win.tabs || []).length}`} tabs)
              </span>

              {/* Selected Count Badge */}
              {selectedInWindowCount > 0 && (
                <span
                  className="ml-2 text-[11px] font-medium font-mono px-2 py-0.5 rounded-full"
                  style={{ background: 'var(--accent)', color: 'var(--text-on-accent)' }}
                >
                  {selectedInWindowCount} selected
                </span>
              )}

              {/* Right: Window Action Buttons (visible on hover) */}
              <div
                className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                onClick={(e) => e.stopPropagation()}
              >
                {isOffline ? (
                  <Tooltip title="Restore window in browser">
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
                    <Tooltip title="Focus Window">
                      <button
                        type="button"
                        onClick={() => onFocusWindow(win.browserId, win.id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 active:scale-95 text-[var(--text-tertiary)] hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
                      >
                        <Focus size={14} />
                      </button>
                    </Tooltip>

                    <Tooltip title="New Tab in this Window">
                      <button
                        type="button"
                        onClick={() => onCreateTab(win.browserId, win.id)}
                        className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 active:scale-95 text-[var(--text-tertiary)] hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
                      >
                        <Plus size={14} />
                      </button>
                    </Tooltip>

                    {onOpenDeduplicate && (
                      <Tooltip title="Deduplicate Window Tabs">
                        <button
                          type="button"
                          onClick={onOpenDeduplicate}
                          className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 active:scale-95 text-[var(--text-tertiary)] hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
                        >
                          <Sparkles size={14} />
                        </button>
                      </Tooltip>
                    )}

                    <Tooltip title="Suspend Inactive Tabs in Window">
                      <button
                        type="button"
                        onClick={handleDiscardInactive}
                        className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 active:scale-95 text-[var(--text-tertiary)] hover:bg-[var(--surface-4)] hover:text-amber-500"
                      >
                        <CircleDashed size={14} strokeWidth={1.75} />
                      </button>
                    </Tooltip>

                    <Tooltip title="Close Window">
                      <button
                        type="button"
                        onClick={handleConfirmClose}
                        className="w-7 h-7 rounded-md flex items-center justify-center transition-all duration-150 active:scale-95 text-[var(--text-tertiary)] hover:bg-red-500/15 hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </Tooltip>
                  </>
                )}
              </div>
            </div>

            {/* Tab Rows List (Under Window Header) */}
            {!isCollapsed && (
              <div className="flex flex-col divide-y divide-[var(--border-subtle)]">
                {visibleTabs.length === 0 ? (
                  <div
                    className="py-6 text-center text-xs"
                    style={{ color: 'var(--text-tertiary)' }}
                  >
                    No matching tabs in this window
                  </div>
                ) : (
                  visibleTabs.map((tab, tabIdx) => (
                    <UnifiedTabRow
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
                      allWindows={allWindows}
                      onToggleSelect={onToggleSelectTab}
                      onSelectRange={onSelectRangeInWindow}
                      onFocusTab={onFocusTab}
                      onCloseTab={onCloseTab}
                      onDiscardTab={onDiscardTab}
                      onCreateTab={onCreateTab}
                      onMigrateTab={onMigrateTab}
                      onMoveTabs={onMoveTabs}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}

export const UnifiedListView = React.memo(UnifiedListViewComponent)

