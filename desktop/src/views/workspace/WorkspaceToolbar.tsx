import React from 'react'
import { Tooltip, Popover } from 'antd'
import {
  Search,
  X,
  SlidersHorizontal,
  LayoutGrid,
  List,
  Columns3,
  Sparkles,
  BrainCircuit,
  Youtube,
  Type,
  CircleDashed,
  RotateCcw
} from 'lucide-react'
import type { DesktopSearchFilters, WorkspaceLayoutMode, GridDensity, GridColumns } from './types'
import { WorkspaceFilterButtons } from './WorkspaceFilterButtons'
import { useTabAppearance } from './TabAppearanceContext'

interface WorkspaceToolbarProps {
  filters: DesktopSearchFilters
  onFiltersChange: React.Dispatch<React.SetStateAction<DesktopSearchFilters>>
  matchedTabsCount: number
  totalTabsCount: number
  windowsCount: number
  youtubeTabsCount?: number
  showOfflineBrowsers: boolean
  onToggleOfflineBrowsers: () => void
  onOpenDeduplicate: () => void
  onOpenCluster: () => void
  onOpenYoutube?: () => void
  layoutMode: WorkspaceLayoutMode
  onLayoutModeChange: (mode: WorkspaceLayoutMode) => void
  gridDensity: GridDensity
  onGridDensityChange: (density: GridDensity) => void
  gridColumns: GridColumns
  onGridColumnsChange: (cols: GridColumns) => void
  onOpenCommandPalette?: () => void
}

const WorkspaceToolbarComponent: React.FC<WorkspaceToolbarProps> = ({
  filters,
  onFiltersChange,
  matchedTabsCount,
  totalTabsCount,
  windowsCount: _windowsCount,
  youtubeTabsCount,
  showOfflineBrowsers: _showOfflineBrowsers,
  onToggleOfflineBrowsers: _onToggleOfflineBrowsers,
  onOpenDeduplicate,
  onOpenCluster,
  onOpenYoutube,
  layoutMode,
  onLayoutModeChange,
  gridDensity,
  onGridDensityChange,
  gridColumns,
  onGridColumnsChange,
  onOpenCommandPalette
}) => {
  const { fontSize, iconSize, preset, setFontSize, setIconSize, applyPreset, resetDefaults } = useTabAppearance()

  const layoutModes: { mode: WorkspaceLayoutMode; label: string; icon: React.ElementType }[] = [
    { mode: 'grid', label: 'Windowed Grid View', icon: LayoutGrid },
    { mode: 'list', label: 'Unified List View', icon: List },
    { mode: 'columns', label: 'Horizontal Columns (Kanban)', icon: Columns3 }
  ]

  return (
    <div
      className="flex flex-wrap items-center justify-between gap-3 px-4 py-2 shrink-0 border-b select-none transition-colors"
      style={{
        background: 'var(--surface-1)',
        borderColor: 'var(--border-subtle)'
      }}
    >
      {/* LEFT: Search Trigger Component moved from topbar as is */}
      <button
        type="button"
        onClick={onOpenCommandPalette}
        className="flex items-center justify-between gap-2.5 text-xs rounded-xl px-3 py-1.5 transition-all duration-150 group active:scale-95 cursor-pointer min-w-[210px] sm:min-w-[250px] shadow-sm"
        style={{
          background: 'var(--surface-2)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-tertiary)'
        }}
        title="Open Command Palette (Ctrl+K)"
      >
        <div className="flex items-center gap-2 overflow-hidden flex-1">
          <Search
            size={13}
            className="shrink-0 transition-colors group-hover:text-[var(--accent)]"
            style={{ color: 'var(--text-tertiary)' }}
          />
          <span className="truncate text-[11px] font-sans text-[var(--text-secondary)]">
            {filters.query ? filters.query : 'Search tabs, views...'}
          </span>
        </div>
        {filters.query ? (
          <span
            onClick={(e) => {
              e.stopPropagation()
              onFiltersChange((prev) => ({ ...prev, query: '' }))
            }}
            className="p-0.5 rounded-full hover:bg-[var(--surface-4)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            title="Clear search"
          >
            <X size={12} strokeWidth={2} />
          </span>
        ) : (
          <kbd
            className="text-[9px] px-1 py-0.5 rounded font-mono shrink-0"
            style={{
              background: 'var(--surface-4)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-tertiary)'
            }}
          >
            Ctrl K
          </kbd>
        )}
      </button>

      {/* RIGHT: Status Filter Buttons, Layout Switcher, Grid Options, Tab Counter & Action Buttons */}
      <div className="flex flex-wrap items-center gap-2.5">
        {/* Status Filter Buttons (Audible, Pinned, Suspended) */}
        <WorkspaceFilterButtons
          filters={filters}
          onFiltersChange={onFiltersChange}
        />

        {/* Accent Divider */}
        <div
          className="h-4 w-px hidden sm:block"
          style={{ background: 'var(--border-subtle)' }}
        />

        {/* Layout Switcher (Grid, Stacked List, By Browser, Columns) */}
        <div
          className="flex items-center gap-0.5 p-0.5 rounded-lg"
          style={{
            background: 'var(--surface-2)',
            border: '1px solid var(--border-subtle)'
          }}
        >
          {layoutModes.map((item) => {
            const Icon = item.icon
            const isSelected = layoutMode === item.mode
            return (
              <Tooltip key={item.mode} title={item.label}>
                <button
                  type="button"
                  onClick={() => onLayoutModeChange(item.mode)}
                  className="p-1 rounded-md transition-all active:scale-95 cursor-pointer"
                  style={{
                    background: isSelected ? 'var(--surface-4)' : 'transparent',
                    color: isSelected ? 'var(--accent)' : 'var(--text-tertiary)',
                    boxShadow: isSelected ? 'var(--shadow-sm)' : 'none'
                  }}
                >
                  <Icon size={14} strokeWidth={isSelected ? 2 : 1.7} />
                </button>
              </Tooltip>
            )
          })}
        </div>

        {/* Grid density & column customization (visible when Grid is active) */}
        {layoutMode === 'grid' && (
          <Popover
            trigger="click"
            placement="bottomRight"
            title={
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                Grid Options
              </span>
            }
            content={
              <div className="flex flex-col gap-3 p-1 min-w-[210px]" style={{ fontFamily: 'var(--font-sans)' }}>
                {/* Spacing / Density */}
                <div>
                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    Spacing & Density
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['comfortable', 'compact'] as const).map((d) => (
                      <button
                        key={d}
                        type="button"
                        onClick={() => onGridDensityChange(d)}
                        className="py-1 px-2 text-xs rounded-md font-medium text-center transition-all cursor-pointer"
                        style={{
                          background: gridDensity === d ? 'var(--accent)' : 'var(--surface-3)',
                          color: gridDensity === d ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                          border: gridDensity === d ? '1px solid var(--accent)' : '1px solid var(--border-subtle)'
                        }}
                      >
                        {d === 'comfortable' ? 'Comfortable' : 'Compact'}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Column Count / Widths */}
                <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                  <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                    Columns / Card Width
                  </div>
                  <div className="grid grid-cols-5 gap-1">
                    {(['auto', '2', '3', '4', '5'] as const).map((cols) => (
                      <button
                        key={cols}
                        type="button"
                        onClick={() => onGridColumnsChange(cols)}
                        className="py-1 text-xs rounded-md font-medium text-center transition-all cursor-pointer"
                        style={{
                          background: gridColumns === cols ? 'var(--accent)' : 'var(--surface-3)',
                          color: gridColumns === cols ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                          border: gridColumns === cols ? '1px solid var(--accent)' : '1px solid var(--border-subtle)'
                        }}
                      >
                        {cols.toUpperCase()}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            }
          >
            <Tooltip title="Customize grid spacing, padding & column widths">
              <button
                type="button"
                className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer"
                style={{
                  background: 'var(--surface-2)',
                  border: '1px solid var(--border-subtle)',
                  color: gridDensity === 'compact' || gridColumns !== 'auto' ? 'var(--accent)' : 'var(--text-secondary)'
                }}
              >
                <SlidersHorizontal size={12} strokeWidth={1.75} />
                <span className="text-[11px]">
                  {gridDensity === 'compact' ? 'Compact' : 'Grid'}{gridColumns !== 'auto' ? ` (${gridColumns})` : ''}
                </span>
              </button>
            </Tooltip>
          </Popover>
        )}

        {/* Text & Icon Sizing Adjuster (Available in both List and Grid views) */}
        <Popover
          trigger="click"
          placement="bottomRight"
          title={
            <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: 'var(--border-subtle)' }}>
              <span className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>
                Text & Icon Sizing
              </span>
              <button
                type="button"
                onClick={resetDefaults}
                className="flex items-center gap-1 text-[10px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors cursor-pointer"
                title="Reset to default sizes"
              >
                <RotateCcw size={10} />
                <span>Reset</span>
              </button>
            </div>
          }
          content={
            <div className="flex flex-col gap-3.5 p-1 min-w-[240px]" style={{ fontFamily: 'var(--font-sans)' }}>
              {/* Presets */}
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider mb-1.5" style={{ color: 'var(--text-tertiary)' }}>
                  Size Presets
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(['compact', 'normal', 'large', 'xlarge'] as const).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => applyPreset(p)}
                      className="py-1 px-1.5 text-xs rounded-md font-medium text-center transition-all cursor-pointer capitalize"
                      style={{
                        background: preset === p ? 'var(--accent)' : 'var(--surface-3)',
                        color: preset === p ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                        border: preset === p ? '1px solid var(--accent)' : '1px solid var(--border-subtle)'
                      }}
                    >
                      {p === 'xlarge' ? 'XL' : p.slice(0, 4)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title Font Size Slider */}
              <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Title Font Size
                  </span>
                  <span className="text-[11px] font-mono font-semibold" style={{ color: 'var(--accent)' }}>
                    {fontSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={11}
                  max={20}
                  step={1}
                  value={fontSize}
                  onChange={(e) => setFontSize(Number(e.target.value))}
                  className="w-full accent-[var(--accent)] cursor-pointer h-1.5 rounded-lg bg-[var(--surface-4)]"
                />
              </div>

              {/* Icon & Badge Size Slider */}
              <div className="pt-2 border-t" style={{ borderColor: 'var(--border-subtle)' }}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[11px] font-medium" style={{ color: 'var(--text-secondary)' }}>
                    Badges & Icons Size
                  </span>
                  <span className="text-[11px] font-mono font-semibold" style={{ color: 'var(--accent)' }}>
                    {iconSize}px
                  </span>
                </div>
                <input
                  type="range"
                  min={11}
                  max={22}
                  step={1}
                  value={iconSize}
                  onChange={(e) => setIconSize(Number(e.target.value))}
                  className="w-full accent-[var(--accent)] cursor-pointer h-1.5 rounded-lg bg-[var(--surface-4)]"
                />
              </div>

              {/* Live Mini Preview */}
              <div
                className="pt-2.5 pb-1 px-2.5 rounded-lg border flex items-center gap-2"
                style={{
                  background: 'var(--surface-2)',
                  borderColor: 'var(--border-subtle)'
                }}
              >
                <div
                  className="rounded-sm bg-red-600 flex items-center justify-center text-white shrink-0 font-bold"
                  style={{ width: `${Math.max(14, Math.round(iconSize * 1.15))}px`, height: `${Math.max(14, Math.round(iconSize * 1.15))}px`, fontSize: '10px' }}
                >
                  Y
                </div>
                <span
                  className="truncate font-semibold flex-1 min-w-0"
                  style={{ fontSize: `${fontSize}px`, color: 'var(--text-primary)' }}
                >
                  Sample Tab Title
                </span>
                <span
                  className="flex items-center gap-1 font-mono rounded bg-red-500/10 text-red-500 shrink-0 font-semibold px-1.5 py-0.5 border border-red-500/20"
                  style={{ fontSize: `${Math.max(10, Math.round(fontSize * 0.8))}px` }}
                >
                  <Youtube size={iconSize} className="shrink-0" />
                  <span>14:20</span>
                </span>
              </div>
            </div>
          }
        >
          <Tooltip title="Customize font size and badge/icon size">
            <button
              type="button"
              className="flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-medium transition-all active:scale-95 cursor-pointer"
              style={{
                background: 'var(--surface-2)',
                border: '1px solid var(--border-subtle)',
                color: preset !== 'normal' ? 'var(--accent)' : 'var(--text-secondary)'
              }}
            >
              <Type size={12} strokeWidth={1.75} />
              <span className="text-[11px]">
                Size ({fontSize}px)
              </span>
            </button>
          </Tooltip>
        </Popover>

        {/* Accent Divider */}
        <div
          className="h-4 w-px hidden sm:block"
          style={{ background: 'var(--border-subtle)' }}
        />

        {/* Tab Counter */}
        <span
          className="text-xs font-mono font-medium"
          style={{ color: 'var(--text-secondary)' }}
        >
          {matchedTabsCount} / {totalTabsCount} tabs
        </span>

        {/* Deduplicate Button */}
        <Tooltip title="Scan & deduplicate tabs across browsers">
          <button
            type="button"
            onClick={onOpenDeduplicate}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-sm"
            style={{
              background: 'var(--accent-subtle)',
              color: 'var(--accent)',
              border: '1px solid var(--border-accent)'
            }}
          >
            <Sparkles size={13} strokeWidth={1.75} />
            <span className="hidden md:inline">Deduplicate</span>
          </button>
        </Tooltip>

        {/* AI Auto-Group Button */}
        <Tooltip title="Categorize tabs into semantic topic clusters">
          <button
            type="button"
            onClick={onOpenCluster}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-sm text-purple-600 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20"
          >
            <BrainCircuit size={13} strokeWidth={1.75} />
            <span className="hidden md:inline">AI Group</span>
          </button>
        </Tooltip>

        {/* YouTube Manager */}
        {onOpenYoutube && (
          <Tooltip title="Manage & sort YouTube tabs by video duration">
            <button
              type="button"
              onClick={onOpenYoutube}
              className="relative flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all active:scale-95 cursor-pointer shadow-sm text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20"
            >
              <Youtube size={13} strokeWidth={1.75} />
              <span className="hidden md:inline">YouTube</span>
              {(youtubeTabsCount || 0) > 0 && (
                <span className="ml-0.5 px-1 py-0.2 rounded-full text-[10px] font-mono bg-red-500 text-white font-bold">
                  {youtubeTabsCount}
                </span>
              )}
            </button>
          </Tooltip>
        )}
      </div>
    </div>
  )
}

export const WorkspaceToolbar = React.memo(WorkspaceToolbarComponent)
