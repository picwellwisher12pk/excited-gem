import React, { useState, useEffect, useMemo, useCallback, useDeferredValue } from 'react'
import { Plus, RotateCw, Sparkles, CloudOff, Cloud, LayoutGrid } from 'lucide-react'
import { AnimatePresence } from 'framer-motion'
import { Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { WindowCard } from './workspace/WindowCard'
import { BatchActionBar } from './workspace/BatchActionBar'
import { WorkspaceToolbar } from './workspace/WorkspaceToolbar'
import { WorkspaceEmptyState } from './workspace/WorkspaceEmptyState'
import { UnifiedListView } from './workspace/UnifiedListView'
import { useWorkspaceSelection } from './workspace/useWorkspaceSelection'
import { DesktopDuplicateTabsModal } from '../components/DesktopDuplicateTabsModal'
import { DesktopClusterModal } from '../components/DesktopClusterModal'
import { DesktopYoutubeModal } from '../components/DesktopYoutubeModal'
import {
  saveBrowsersToCache,
  getOfflineBrowserWindows
} from '../services/desktopBrowserCache'
import { isSameBrowserEngine } from '../../../src/adapter/types'
import type {
  WorkspaceViewProps,
  DesktopSearchFilters,
  WorkspaceLayoutMode,
  GridDensity,
  GridColumns
} from './workspace/types'

export type {
  WorkspaceViewProps,
  DesktopSearchFilters,
  WorkspaceLayoutMode,
  GridDensity,
  GridColumns
} from './workspace/types'

const WorkspaceViewComponent: React.FC<WorkspaceViewProps> = ({
  windows,
  browsers,
  selectedBrowserId,
  searchQuery,
  onFocusTab,
  onFocusWindow,
  onCloseTab,
  onCloseWindow,
  onCreateTab,
  onDiscardTab,
  onMigrateTab,
  onMoveTabs,
  onSortWindowTabs,
  onRefresh,
  onOpenCommandPalette
}) => {
  const [showOfflineBrowsers, setShowOfflineBrowsers] = useState(false)
  const [deduplicateModalOpen, setDeduplicateModalOpen] = useState(false)
  const [clusterModalOpen, setClusterModalOpen] = useState(false)
  const [youtubeModalOpen, setYoutubeModalOpen] = useState(false)

  const handleOpenDeduplicate = useCallback(() => setDeduplicateModalOpen(true), [])
  const handleOpenCluster = useCallback(() => setClusterModalOpen(true), [])
  const handleOpenYoutube = useCallback(() => setYoutubeModalOpen(true), [])
  const handleCloseDeduplicate = useCallback(() => setDeduplicateModalOpen(false), [])
  const handleCloseCluster = useCallback(() => setClusterModalOpen(false), [])
  const handleCloseYoutube = useCallback(() => setYoutubeModalOpen(false), [])
  const handleToggleOfflineBrowsers = useCallback(() => setShowOfflineBrowsers((prev) => !prev), [])

  // Workspace layout view mode (grid, list, columns)
  const [layoutMode, setLayoutMode] = useState<WorkspaceLayoutMode>(() => {
    try {
      const saved = localStorage.getItem('excited_gem_workspace_layout')
      if (saved === 'list' || saved === 'columns') {
        return saved
      }
    } catch {}
    return 'grid'
  })

  const handleLayoutModeChange = (mode: WorkspaceLayoutMode) => {
    setLayoutMode(mode)
    try {
      localStorage.setItem('excited_gem_workspace_layout', mode)
    } catch {}
  }

  // Grid layout options (spacing/density & column widths)
  const [gridDensity, setGridDensity] = useState<GridDensity>(() => {
    try {
      const saved = localStorage.getItem('excited_gem_grid_density')
      if (saved === 'compact' || saved === 'comfortable') return saved
    } catch {}
    return 'comfortable'
  })

  const handleGridDensityChange = (density: GridDensity) => {
    setGridDensity(density)
    try {
      localStorage.setItem('excited_gem_grid_density', density)
    } catch {}
  }

  const [gridColumns, setGridColumns] = useState<GridColumns>(() => {
    try {
      const saved = localStorage.getItem('excited_gem_grid_columns')
      if (saved === 'auto' || saved === '2' || saved === '3' || saved === '4' || saved === '5') {
        return saved
      }
    } catch {}
    return 'auto'
  })

  const handleGridColumnsChange = (cols: GridColumns) => {
    setGridColumns(cols)
    try {
      localStorage.setItem('excited_gem_grid_columns', cols)
    } catch {}
  }

  // Advanced search filters state
  const [filters, setFilters] = useState<DesktopSearchFilters>({
    query: searchQuery || '',
    audibleOnly: false,
    pinnedOnly: false,
    suspendedOnly: false,
    isRegex: false,
    searchInTitle: true,
    searchInUrl: true
  })

  // Synchronize top search query with internal filters
  useEffect(() => {
    setFilters((prev) => ({
      ...prev,
      query: searchQuery
    }))
  }, [searchQuery])

  // Defer search filter changes to keep typing completely responsive and smooth
  const deferredFilters = useDeferredValue(filters)

  // Automatically cache browser windows when active
  useEffect(() => {
    if (browsers.length > 0 && windows.length > 0) {
      saveBrowsersToCache(browsers, windows)
    }
  }, [browsers, windows])

  // Calculate connected and offline windows
  const combinedWindows = useMemo(() => {
    if (!showOfflineBrowsers) return windows

    const connectedIds = new Set(browsers.filter((b) => b.isConnected).map((b) => b.id))
    const offlineWindows = getOfflineBrowserWindows(connectedIds)
    return [...windows, ...offlineWindows]
  }, [windows, browsers, showOfflineBrowsers])

  // Filter windows based on selected browser filter
  const filteredWindows = useMemo(() => {
    return combinedWindows.filter((win) => {
      if (selectedBrowserId === 'all') return true
      return isSameBrowserEngine(win.browserId, selectedBrowserId)
    })
  }, [combinedWindows, selectedBrowserId])

  // Multi-tab selection hook
  const {
    selectedTabs,
    selectedTabsList,
    isSelectionActive,
    handleToggleSelectTab,
    handleSelectRangeInWindow,
    handleInvertSelectionInWindow,
    handleSelectAllInWindow,
    handleClearSelection,
    handleCloseSelected,
    handleDiscardSelected,
    handleMigrateSelected
  } = useWorkspaceSelection({ onCloseTab, onDiscardTab, onMigrateTab })

  // Total tab calculations
  const totalTabsCount = useMemo(() => {
    return filteredWindows.reduce((acc, w) => acc + (w.tabs ? w.tabs.length : 0), 0)
  }, [filteredWindows])

  // Count active YouTube tabs
  const youtubeTabsCount = useMemo(() => {
    let count = 0
    for (const win of filteredWindows) {
      for (const t of win.tabs || []) {
        if (t.url && (t.url.includes('youtube.com') || t.url.includes('youtu.be'))) {
          count++
        }
      }
    }
    return count
  }, [filteredWindows])

  // Dynamic grid column class
  const isSingleWindow = filteredWindows.length === 1
  const gridColsClass = useMemo(() => {
    if (isSingleWindow) return 'h-full flex flex-col min-h-0'
    switch (gridColumns) {
      case '2':
        return 'h-full grid grid-cols-1 md:grid-cols-2 min-h-0'
      case '3':
        return 'h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 min-h-0'
      case '4':
        return 'h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 min-h-0'
      case '5':
        return 'h-full grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 min-h-0'
      default:
        return 'h-full grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 min-h-0'
    }
  }, [gridColumns, isSingleWindow])

  // Canvas Right-Click Context Menu
  const canvasContextMenu: MenuProps['items'] = [
    {
      key: 'new-win',
      label: 'New Window',
      icon: <Plus size={14} />,
      onClick: () => onCreateTab(selectedBrowserId === 'all' ? 'chrome' : selectedBrowserId)
    },
    ...(onRefresh
      ? [
          {
            key: 'refresh',
            label: 'Refresh Browsers',
            icon: <RotateCw size={14} />,
            onClick: onRefresh
          }
        ]
      : []),
    {
      key: 'dedup',
      label: 'Deduplicate Tabs',
      icon: <Sparkles size={14} />,
      onClick: handleOpenDeduplicate
    },
    {
      key: 'cluster',
      label: 'AI Categorize Tabs',
      icon: <LayoutGrid size={14} />,
      onClick: handleOpenCluster
    },
    {
      key: 'toggle-offline',
      label: showOfflineBrowsers ? 'Hide Closed Browsers' : 'Show Closed Browsers',
      icon: showOfflineBrowsers ? <CloudOff size={14} /> : <Cloud size={14} />,
      onClick: () => setShowOfflineBrowsers((prev) => !prev)
    }
  ]

  return (
    <div className="flex-1 flex flex-col h-full min-h-0 overflow-hidden select-none">
      {/* Advanced Search & Filtering Toolbar */}
      <WorkspaceToolbar
        filters={filters}
        onFiltersChange={setFilters}
        matchedTabsCount={totalTabsCount}
        totalTabsCount={combinedWindows.reduce((acc, w) => acc + (w.tabs ? w.tabs.length : 0), 0)}
        windowsCount={filteredWindows.length}
        youtubeTabsCount={youtubeTabsCount}
        showOfflineBrowsers={showOfflineBrowsers}
        onToggleOfflineBrowsers={handleToggleOfflineBrowsers}
        onOpenDeduplicate={handleOpenDeduplicate}
        onOpenCluster={handleOpenCluster}
        onOpenYoutube={handleOpenYoutube}
        layoutMode={layoutMode}
        onLayoutModeChange={handleLayoutModeChange}
        gridDensity={gridDensity}
        onGridDensityChange={handleGridDensityChange}
        gridColumns={gridColumns}
        onGridColumnsChange={handleGridColumnsChange}
        onOpenCommandPalette={onOpenCommandPalette}
      />

      {/* Main Workspace Canvas with Context Menu */}
      <Dropdown
        menu={{ items: canvasContextMenu }}
        trigger={['contextMenu']}
        destroyPopupOnHide
        getPopupContainer={() => document.body}
        overlayClassName="compact-context-menu"
      >
        <div
          className="relative flex-1 h-full min-h-0 overflow-y-auto p-4 transition-colors"
          style={{
            fontFamily: 'var(--font-sans)',
            background: 'var(--surface-0)'
          }}
        >
          {filteredWindows.length === 0 ? (
            <WorkspaceEmptyState
              onResetFilters={() =>
                setFilters({
                  query: '',
                  audibleOnly: false,
                  pinnedOnly: false,
                  suspendedOnly: false,
                  isRegex: false,
                  searchInTitle: true,
                  searchInUrl: true
                })
              }
            />
          ) : layoutMode === 'list' ? (
            /* Unified List View (matching extension UI/UX) */
            <UnifiedListView
              windows={filteredWindows}
              allWindows={combinedWindows}
              browsers={browsers}
              searchFilters={deferredFilters}
              selectedTabs={selectedTabs}
              selectedTabsList={selectedTabsList}
              isSelectionActive={isSelectionActive}
              onToggleSelectTab={handleToggleSelectTab}
              onSelectRangeInWindow={handleSelectRangeInWindow}
              onInvertSelectionInWindow={handleInvertSelectionInWindow}
              onSelectAllInWindow={handleSelectAllInWindow}
              onFocusTab={onFocusTab}
              onFocusWindow={onFocusWindow}
              onCloseTab={onCloseTab}
              onCloseWindow={onCloseWindow}
              onCreateTab={onCreateTab}
              onDiscardTab={onDiscardTab}
              onMigrateTab={onMigrateTab}
              onMoveTabs={onMoveTabs}
              onOpenDeduplicate={handleOpenDeduplicate}
            />
          ) : layoutMode === 'columns' ? (
            /* Horizontal Columns (Kanban) Deck View */
            <div className="flex flex-row gap-4 overflow-x-auto h-full pb-3 items-stretch snap-x">
              {filteredWindows.map((win, winIdx) => (
                <div
                  key={`${win.browserId}-${win.id}`}
                  className="w-[360px] shrink-0 h-full flex flex-col snap-start"
                >
                  <WindowCard
                    window={win}
                    layoutMode="columns"
                    allWindows={combinedWindows}
                    browsers={browsers}
                    index={winIdx}
                    searchFilters={deferredFilters}
                    selectedTabs={selectedTabs}
                    selectedTabsList={selectedTabsList}
                    isSelectionActive={isSelectionActive}
                    onToggleSelectTab={handleToggleSelectTab}
                    onSelectRangeInWindow={handleSelectRangeInWindow}
                    onInvertSelectionInWindow={handleInvertSelectionInWindow}
                    onSelectAllInWindow={handleSelectAllInWindow}
                    onFocusTab={onFocusTab}
                    onFocusWindow={onFocusWindow}
                    onCloseTab={onCloseTab}
                    onCloseWindow={onCloseWindow}
                    onCreateTab={onCreateTab}
                    onDiscardTab={onDiscardTab}
                    onMigrateTab={onMigrateTab}
                    onMoveTabs={onMoveTabs}
                    onOpenDeduplicate={handleOpenDeduplicate}
                    onSortWindowByDuration={onSortWindowTabs}
                  />
                </div>
              ))}
            </div>
          ) : (
            /* Spatial Grid View with customizable density and columns */
            <div
              className={`${gridColsClass} ${
                gridDensity === 'compact' ? 'gap-2.5' : 'gap-4'
              }`}
            >
              {filteredWindows.map((win, winIdx) => (
                <WindowCard
                  key={`${win.browserId}-${win.id}`}
                  window={win}
                  layoutMode="grid"
                  gridDensity={gridDensity}
                  allWindows={combinedWindows}
                  browsers={browsers}
                  index={winIdx}
                  searchFilters={deferredFilters}
                  selectedTabs={selectedTabs}
                  selectedTabsList={selectedTabsList}
                  isSelectionActive={isSelectionActive}
                  onToggleSelectTab={handleToggleSelectTab}
                  onSelectRangeInWindow={handleSelectRangeInWindow}
                  onInvertSelectionInWindow={handleInvertSelectionInWindow}
                  onSelectAllInWindow={handleSelectAllInWindow}
                  onFocusTab={onFocusTab}
                  onFocusWindow={onFocusWindow}
                  onCloseTab={onCloseTab}
                  onCloseWindow={onCloseWindow}
                  onCreateTab={onCreateTab}
                  onDiscardTab={onDiscardTab}
                  onMigrateTab={onMigrateTab}
                  onMoveTabs={onMoveTabs}
                  onOpenDeduplicate={handleOpenDeduplicate}
                  onSortWindowByDuration={onSortWindowTabs}
                />
              ))}
            </div>
          )}

          {/* Floating Batch Action Bar */}
          <AnimatePresence>
            {selectedTabsList.length > 0 && (
              <BatchActionBar
                selectedTabs={selectedTabsList}
                browsers={browsers}
                onClearSelection={handleClearSelection}
                onCloseSelected={handleCloseSelected}
                onDiscardSelected={handleDiscardSelected}
                onMigrateSelected={handleMigrateSelected}
              />
            )}
          </AnimatePresence>
        </div>
      </Dropdown>

      {/* Cross-Browser Tab Deduplication Modal */}
      {deduplicateModalOpen && (
        <DesktopDuplicateTabsModal
          visible={deduplicateModalOpen}
          windows={combinedWindows}
          onClose={handleCloseDeduplicate}
          onCloseTab={onCloseTab}
        />
      )}

      {/* AI Semantic Tab Clustering Modal */}
      {clusterModalOpen && (
        <DesktopClusterModal
          visible={clusterModalOpen}
          windows={combinedWindows}
          onClose={handleCloseCluster}
          onCreateTab={onCreateTab}
          onCloseTab={onCloseTab}
        />
      )}

      {/* YouTube Duration Manager Modal */}
      {youtubeModalOpen && (
        <DesktopYoutubeModal
          visible={youtubeModalOpen}
          windows={combinedWindows}
          browsers={browsers}
          onClose={handleCloseYoutube}
          onFocusTab={onFocusTab}
          onCloseTab={onCloseTab}
          onCreateTab={onCreateTab}
          onSortWindowTabs={onSortWindowTabs}
        />
      )}
    </div>
  )
}

export const WorkspaceView = React.memo(WorkspaceViewComponent)
