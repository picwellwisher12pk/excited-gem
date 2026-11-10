import React from 'react'
import { RotateCw, Plus, Sun, Moon } from 'lucide-react'
import { Tooltip } from 'antd'
import { ExcitedGemLogo } from './ExcitedGemLogo'
import { useTheme } from '../theme/ThemeContext'
import { BrowserFilters } from './titlebar/BrowserFilters'
import { WindowControls } from './titlebar/WindowControls'
import type { ConnectedBrowser, UnifiedWindow } from '../../src/adapter/types'
import pkg from '../../../package.json'

interface DesktopTitlebarProps {
  browsers: ConnectedBrowser[]
  windows: UnifiedWindow[]
  selectedBrowserId: string
  onSelectBrowser: (id: string) => void
  searchQuery: string
  onSearchChange: (query: string) => void
  onRefresh: () => void
  onCreateWindow: () => void
  onMigrateTab?: (sourceBrowserId: string, targetBrowserId: string, tabId: number, url: string, targetWindowId?: number) => void | Promise<void>
  totalTabs: number
  onOpenCommandPalette?: () => void
}

export const DesktopTitlebar: React.FC<DesktopTitlebarProps> = ({
  browsers,
  windows,
  selectedBrowserId,
  onSelectBrowser,
  searchQuery,
  onSearchChange,
  onRefresh,
  onCreateWindow,
  onMigrateTab,
  totalTabs,
  onOpenCommandPalette
}) => {
  const { isDark, toggleTheme } = useTheme()

  const activeBrowsersCount = browsers.filter((b) => b.isConnected).length

  return (
    <header
      data-tauri-drag-region
      className="flex items-center justify-between select-none shrink-0 z-30 transition-colors duration-300"
      style={{
        height: 48,
        padding: '0 14px',
        fontFamily: 'var(--font-sans)',
        background: 'var(--glass-bg-heavy)',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))',
        borderBottom: '1px solid var(--border-subtle)'
      }}
    >
      {/* Left: App Identity */}
      <div
        data-tauri-drag-region
        className="flex items-center gap-3 shrink-0 pr-3 pointer-events-none"
      >
        <ExcitedGemLogo size={24} className="pointer-events-auto" />
        <span
          className="font-semibold text-sm tracking-tight select-none pointer-events-none"
          style={{ color: 'var(--text-primary)' }}
        >
          Excited Gem
        </span>
        <span
          className="text-[10px] px-1.5 py-0.5 rounded-md pointer-events-none"
          style={{
            fontFamily: 'var(--font-mono)',
            background: 'var(--surface-4)',
            color: 'var(--text-tertiary)'
          }}
        >
          v{pkg.version}
        </span>
      </div>

      {/* Center: Browser Filters Segmented Control */}
      <BrowserFilters
        windows={windows}
        browsers={browsers}
        totalTabs={totalTabs}
        selectedBrowserId={selectedBrowserId}
        onSelectBrowser={onSelectBrowser}
        onMigrateTab={onMigrateTab}
      />

      {/* Right: Actions & Window Controls */}
      <div className="flex items-center gap-2 shrink-0">
        {/* Refresh */}
        <Tooltip title="Sync with active browsers">
          <button
            type="button"
            onClick={onRefresh}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-95"
            style={{ color: 'var(--text-secondary)' }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-4)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-secondary)'
            }}
          >
            <RotateCw size={15} strokeWidth={2} />
          </button>
        </Tooltip>

        {/* New Window */}
        <Tooltip title="Open new browser window">
          <button
            type="button"
            onClick={onCreateWindow}
            className="h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 active:scale-95"
            style={{
              background:
                'linear-gradient(135deg, var(--accent-gradient-start), var(--accent-gradient-end))',
              color: 'var(--text-on-accent)',
              boxShadow: 'var(--shadow-sm)'
            }}
          >
            <Plus size={14} strokeWidth={2.5} />
            <span className="hidden sm:inline">New Window</span>
          </button>
        </Tooltip>

        {/* Theme Toggle */}
        <Tooltip title={isDark ? 'Light Mode' : 'Dark Mode'}>
          <button
            type="button"
            onClick={toggleTheme}
            className="h-8 w-8 rounded-lg flex items-center justify-center transition-all duration-200 active:scale-95"
            style={{
              color: isDark ? 'var(--gem-gold)' : 'var(--accent)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-4)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
            }}
          >
            {isDark ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </Tooltip>

        {/* Window Controls (Minimize, Maximize, Close) */}
        <WindowControls />
      </div>
    </header>
  )
}
