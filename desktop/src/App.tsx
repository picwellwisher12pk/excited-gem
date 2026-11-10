import { useState, useEffect, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { App as AntApp, ConfigProvider, theme } from 'antd'
import { AnimatePresence, motion } from 'framer-motion'

import { DesktopTitlebar } from './components/DesktopTitlebar'
import { DesktopSidebar, type DesktopNavView } from './components/DesktopSidebar'
import { WorkspaceView } from './views/WorkspaceView'
import { AnalyticsView } from './views/AnalyticsView'
import { BookmarksView } from './views/BookmarksView'
import { RoutinesView } from './views/RoutinesView'
import { SessionsView } from './views/SessionsView'
import { SettingsView } from './views/SettingsView'
import { KeyboardShortcutsModal } from './components/KeyboardShortcutsModal'
import { DesktopCommandPalette } from './components/DesktopCommandPalette'
import { useGlobalShortcuts } from './hooks/useGlobalShortcuts'
import { useWorkspaceActions } from './hooks/useWorkspaceActions'
import { AIDrawer } from '../../src/components/AI/AIDrawer'

import { getBrowserAdapter } from '../../src/adapter'
import {
  setSelectedBrowserId,
  setIsDesktopMode
} from '../../src/store/browserSlice'
import { toggleDrawer } from '../../src/store/aiSlice'
import type { RootState, AppDispatch } from '../../src/store/store'
import { ThemeProvider, useTheme } from './theme/ThemeContext'
import { TabAppearanceProvider } from './views/workspace/TabAppearanceContext'

const viewTransition = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -6 },
  transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as any }
}

function AppContent() {
  const dispatch = useDispatch<AppDispatch>()
  const adapter = getBrowserAdapter()
  const { isDark } = useTheme()

  const [currentView, setCurrentView] = useState<DesktopNavView>('workspace')
  const [searchQuery, setSearchQuery] = useState('')
  const [isShortcutsHelpOpen, setIsShortcutsHelpOpen] = useState(false)
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false)

  const handleOpenCommandPalette = useCallback(() => setIsCommandPaletteOpen(true), [])
  const handleCloseCommandPalette = useCallback(() => setIsCommandPaletteOpen(false), [])
  const handleToggleShortcutsHelp = useCallback(() => setIsShortcutsHelpOpen((prev) => !prev), [])
  const handleOpenShortcutsHelp = useCallback(() => setIsShortcutsHelpOpen(true), [])
  const handleCloseShortcutsHelp = useCallback(() => setIsShortcutsHelpOpen(false), [])

  const selectedBrowserId = useSelector(
    (state: RootState) => state.browsers?.selectedBrowserId || 'all'
  )
  const isAiOpen = useSelector((state: RootState) => state.ai?.drawerOpen || false)

  // All workspace state and handlers extracted to dedicated hook
  const {
    windows,
    browsers,
    totalTabs,
    refreshData,
    setBrowsers,
    handleFocusTab,
    handleFocusWindow,
    handleCloseTab,
    handleCloseWindow,
    handleCreateTab,
    handleCreateWindow,
    handleDiscardTab,
    handleMoveTabs,
    handleMigrateTab,
    handleSortWindowTabs
  } = useWorkspaceActions()

  // Global Keyboard Shortcuts — Ctrl+K now opens Command Palette
  useGlobalShortcuts({
    onToggleShortcutsHelp: handleToggleShortcutsHelp,
    onOpenShortcutsHelp: handleOpenShortcutsHelp,
    onSelectView: setCurrentView,
    onOpenCommandPalette: handleOpenCommandPalette
  })

  useEffect(() => {
    dispatch(setIsDesktopMode(true))
    refreshData()

    const unsubTabs = adapter.onTabsChanged(() => {
      refreshData()
    })
    const unsubBrowsers = adapter.onBrowsersChanged((b) => {
      setBrowsers(b)
    })

    return () => {
      unsubTabs()
      unsubBrowsers()
    }
  }, [adapter, refreshData, dispatch, setBrowsers])

  const renderCurrentView = () => {
    switch (currentView) {
      case 'workspace':
        return (
          <WorkspaceView
            windows={windows}
            browsers={browsers}
            selectedBrowserId={selectedBrowserId}
            searchQuery={searchQuery}
            onFocusTab={handleFocusTab}
            onFocusWindow={handleFocusWindow}
            onCloseTab={handleCloseTab}
            onCloseWindow={handleCloseWindow}
            onCreateTab={handleCreateTab}
            onDiscardTab={handleDiscardTab}
            onMigrateTab={handleMigrateTab}
            onMoveTabs={handleMoveTabs}
            onSortWindowTabs={handleSortWindowTabs}
            onRefresh={refreshData}
            onOpenCommandPalette={handleOpenCommandPalette}
          />
        )
      case 'analytics':
        return <AnalyticsView windows={windows} browsers={browsers} />
      case 'bookmarks':
        return (
          <BookmarksView
            windows={windows}
            onOpenUrl={(url) =>
              adapter.createTab(
                selectedBrowserId === 'all' ? 'chrome' : selectedBrowserId,
                undefined,
                url
              )
            }
          />
        )
      case 'routines':
        return (
          <RoutinesView
            windows={windows}
            onDiscardTab={handleDiscardTab}
            onCloseTab={handleCloseTab}
          />
        )
      case 'sessions':
        return (
          <SessionsView
            windows={windows}
            connectedBrowsers={browsers}
            onOpenUrl={(url) =>
              adapter.createTab(
                selectedBrowserId === 'all' ? 'chrome' : selectedBrowserId,
                undefined,
                url
              )
            }
            onCreateTab={(browserId, windowId, url) =>
              adapter.createTab(browserId, windowId, url)
            }
          />
        )
      case 'settings':
        return <SettingsView browsers={browsers} />
      default:
        return null
    }
  }

  return (
    <ConfigProvider
      theme={{
        algorithm: isDark ? theme.darkAlgorithm : theme.defaultAlgorithm,
        token: {
          colorPrimary: isDark ? '#60cdff' : '#0078d4',
          colorInfo: isDark ? '#60cdff' : '#0078d4',
          colorBgBase: isDark ? '#1a1a1a' : '#f8f9fa',
          colorBgContainer: isDark ? '#1a1a1a' : '#ffffff',
          colorBgElevated: isDark ? '#212121' : '#ffffff',
          colorBorder: isDark ? '#2d2d2d' : '#d8dee4',
          colorText: isDark ? '#f0f2f5' : '#0f1419',
          colorTextSecondary: isDark ? '#a0aab4' : '#536471',
          borderRadius: 8,
          borderRadiusSM: 6,
          borderRadiusLG: 12,
          fontFamily: 'var(--font-sans)'
        }
      }}
    >
      <AntApp>
        <div
          className="flex flex-col h-screen w-screen overflow-hidden transition-colors duration-300"
          style={{
            fontFamily: 'var(--font-sans)',
            background: 'var(--surface-0)',
            color: 'var(--text-primary)'
          }}
        >
          {/* Titlebar / Header */}
          <DesktopTitlebar
            browsers={browsers}
            windows={windows}
            selectedBrowserId={selectedBrowserId}
            onSelectBrowser={(id) => dispatch(setSelectedBrowserId(id))}
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            onRefresh={refreshData}
            onCreateWindow={handleCreateWindow}
            onMigrateTab={handleMigrateTab}
            totalTabs={totalTabs}
            onOpenCommandPalette={handleOpenCommandPalette}
          />

          {/* Main Body Area */}
          <div className="flex-1 flex min-h-0 overflow-hidden">
            {/* Sidebar */}
            <DesktopSidebar
              currentView={currentView}
              onSelectView={setCurrentView}
              onToggleAi={() => dispatch(toggleDrawer())}
              aiOpen={isAiOpen}
            />

            {/* Accent divider between sidebar and content */}
            <div
              className="w-px shrink-0"
              style={{
                background: isDark
                  ? 'linear-gradient(to bottom, var(--border), transparent)'
                  : 'linear-gradient(to bottom, var(--border-subtle), transparent)'
              }}
            />

            {/* Main Content Pane with animated view transitions */}
            <main
              className="flex-1 flex flex-col min-w-0 h-full overflow-hidden relative"
              style={{ background: 'var(--surface-0)' }}
            >
              <AnimatePresence>
                <motion.div
                  key={currentView}
                  className="flex-1 flex flex-col min-h-0 overflow-hidden"
                  {...viewTransition}
                >
                  {renderCurrentView()}
                </motion.div>
              </AnimatePresence>

              {/* AI Assistant Overlay Drawer */}
              <AIDrawer />

              {/* Keyboard Shortcuts Cheatsheet Modal */}
              <KeyboardShortcutsModal
                open={isShortcutsHelpOpen}
                onClose={handleCloseShortcutsHelp}
              />
            </main>
          </div>
        </div>

        {/* Command Palette — rendered at root level so it overlays everything */}
        <DesktopCommandPalette
          open={isCommandPaletteOpen}
          onClose={handleCloseCommandPalette}
          windows={windows}
          browsers={browsers}
          onFocusTab={handleFocusTab}
          onSelectView={setCurrentView}
          onToggleAi={() => dispatch(toggleDrawer())}
          onOpenShortcuts={handleOpenShortcutsHelp}
          onCreateWindow={handleCreateWindow}
          onRefresh={refreshData}
        />
      </AntApp>
    </ConfigProvider>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <TabAppearanceProvider>
        <AppContent />
      </TabAppearanceProvider>
    </ThemeProvider>
  )
}
