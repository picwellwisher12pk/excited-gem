import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Search,
  LayoutGrid,
  Bookmark,
  BarChart3,
  Zap,
  FolderOpen,
  Settings,
  RefreshCw,
  Sparkles,
  Keyboard,
  Globe,
  ArrowRight,
  Command,
  Binary
} from 'lucide-react'
import type { UnifiedWindow, ConnectedBrowser } from '../../../src/adapter/types'
import type { DesktopNavView } from './DesktopSidebar'
import { useTheme } from '../theme/ThemeContext'

interface CommandPaletteProps {
  open: boolean
  onClose: () => void
  windows: UnifiedWindow[]
  browsers: ConnectedBrowser[]
  onFocusTab: (browserId: string, windowId: number, tabId: number) => Promise<void>
  onSelectView: (view: DesktopNavView) => void
  onToggleAi?: () => void
  onOpenShortcuts?: () => void
  onCreateWindow?: () => void
  onRefresh?: () => void
}

type ResultKind = 'tab' | 'view' | 'action'

interface PaletteResult {
  id: string
  kind: ResultKind
  label: string
  sublabel?: string
  icon: React.ReactNode
  onSelect: () => void
  keywords?: string
}

const VIEW_RESULTS = (onSelectView: (v: DesktopNavView) => void): PaletteResult[] => [
  {
    id: 'view-workspace',
    kind: 'view',
    label: 'Workspace',
    sublabel: 'Multi-window tab grid',
    icon: <LayoutGrid size={15} />,
    onSelect: () => onSelectView('workspace'),
    keywords: 'tabs windows grid workspace'
  },
  {
    id: 'view-analytics',
    kind: 'view',
    label: 'Analytics',
    sublabel: 'Domain insights & metrics',
    icon: <BarChart3 size={15} />,
    onSelect: () => onSelectView('analytics'),
    keywords: 'analytics stats metrics domains'
  },
  {
    id: 'view-bookmarks',
    kind: 'view',
    label: 'Bookmarks',
    sublabel: 'Manage saved bookmarks',
    icon: <Bookmark size={15} />,
    onSelect: () => onSelectView('bookmarks'),
    keywords: 'bookmarks saved links'
  },
  {
    id: 'view-routines',
    kind: 'view',
    label: 'Routines',
    sublabel: 'Automation macros',
    icon: <Zap size={15} />,
    onSelect: () => onSelectView('routines'),
    keywords: 'routines automation macros'
  },
  {
    id: 'view-sessions',
    kind: 'view',
    label: 'Sessions',
    sublabel: 'Saved browser sessions',
    icon: <FolderOpen size={15} />,
    onSelect: () => onSelectView('sessions'),
    keywords: 'sessions saved restore'
  },
  {
    id: 'view-settings',
    kind: 'view',
    label: 'Settings',
    sublabel: 'App preferences & AI config',
    icon: <Settings size={15} />,
    onSelect: () => onSelectView('settings'),
    keywords: 'settings preferences config ai'
  }
]

function getFaviconLetter(tab: { title?: string; url?: string }): string {
  const title = tab.title || tab.url || '?'
  return title.trim().charAt(0).toUpperCase()
}

function getDomain(url?: string): string {
  if (!url) return ''
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function fuzzyMatch(query: string, text: string): boolean {
  if (!query) return true
  const q = query.toLowerCase()
  const t = text.toLowerCase()
  // Simple substring match (fast and predictable for a command palette)
  return t.includes(q)
}

const backdropVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1 },
  exit: { opacity: 0 }
}

const panelVariants = {
  hidden: { opacity: 0, scale: 0.95, y: -12 },
  visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.18, ease: [0.16, 1, 0.3, 1] as any } },
  exit: { opacity: 0, scale: 0.96, y: -8, transition: { duration: 0.14 } }
}

export const DesktopCommandPalette: React.FC<CommandPaletteProps> = ({
  open,
  onClose,
  windows,
  browsers,
  onFocusTab,
  onSelectView,
  onToggleAi,
  onOpenShortcuts,
  onCreateWindow,
  onRefresh
}) => {
  const { isDark } = useTheme()
  const [query, setQuery] = useState('')
  const [isRegex, setIsRegex] = useState(false)
  const [searchTarget, setSearchTarget] = useState<'both' | 'title' | 'url'>('both')
  const [activeIndex, setActiveIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  // Reset query and selection when palette opens
  useEffect(() => {
    if (open) {
      setQuery('')
      setActiveIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Build all results
  const allResults = useMemo((): PaletteResult[] => {
    const q = query.trim()
    const qLower = q.toLowerCase()

    let regexObj: RegExp | null = null
    if (isRegex && q) {
      try {
        regexObj = new RegExp(q, 'i')
      } catch {}
    }

    // Tab results
    const tabResults: PaletteResult[] = []
    for (const win of windows) {
      if (tabResults.length >= 40) break
      for (const tab of win.tabs || []) {
        if (tabResults.length >= 40) break
        const title = tab.title || ''
        const url = tab.url || ''
        const domain = getDomain(url)

        const targetText =
          searchTarget === 'title'
            ? title
            : searchTarget === 'url'
            ? url
            : `${title} ${url} ${domain}`

        const isMatch = !q
          ? true
          : regexObj
          ? regexObj.test(targetText)
          : fuzzyMatch(qLower, targetText)

        if (isMatch) {
          const browser = browsers.find((b) => b.id === tab.browserId)
          tabResults.push({
            id: `tab-${tab.id}`,
            kind: 'tab',
            label: tab.title || domain || 'Untitled',
            sublabel: domain,
            icon: (
              <span
                style={{
                  width: 20,
                  height: 20,
                  borderRadius: 4,
                  background: 'var(--accent-subtle)',
                  color: 'var(--accent)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0
                }}
              >
                {tab.favIconUrl ? (
                  <img
                    src={tab.favIconUrl}
                    alt=""
                    width={14}
                    height={14}
                    style={{ borderRadius: 2 }}
                    onError={(e) => {
                      ; (e.currentTarget as HTMLImageElement).style.display = 'none'
                    }}
                  />
                ) : (
                  getFaviconLetter(tab)
                )}
              </span>
            ),
            onSelect: () => onFocusTab(tab.browserId, tab.windowId, tab.id),
            keywords: targetText
          })
        }
      }
    }

    // View results
    const viewResults = VIEW_RESULTS(onSelectView).filter(
      (r) => !q || fuzzyMatch(q, `${r.label} ${r.sublabel || ''} ${r.keywords || ''}`)
    )

    // Action results
    const rawActionItems: PaletteResult[] = [
      {
        id: 'action-ai',
        kind: 'action',
        label: 'Toggle AI Assistant',
        sublabel: 'Open or close the AI assistant drawer',
        icon: <Sparkles size={15} style={{ color: 'var(--accent)' }} />,
        onSelect: () => {
          onToggleAi?.()
        }
      },
      {
        id: 'action-new-window',
        kind: 'action',
        label: 'New Browser Window',
        sublabel: 'Open a new window in the selected browser',
        icon: <LayoutGrid size={15} />,
        onSelect: () => {
          onCreateWindow?.()
        }
      },
      {
        id: 'action-refresh',
        kind: 'action',
        label: 'Sync Connected Browsers',
        sublabel: 'Poll active windows and tabs from all browsers',
        icon: <RefreshCw size={15} />,
        onSelect: () => {
          onRefresh?.()
        }
      },
      {
        id: 'action-shortcuts',
        kind: 'action',
        label: 'Keyboard Shortcuts',
        sublabel: 'View all keyboard shortcuts cheatsheet',
        icon: <Keyboard size={15} />,
        onSelect: () => {
          onOpenShortcuts?.()
        }
      }
    ]
    const actionItems = rawActionItems.filter((r) => !q || fuzzyMatch(q, `${r.label} ${r.sublabel || ''}`))

    return [...tabResults.slice(0, 40), ...viewResults, ...actionItems]
  }, [query, windows, browsers, onFocusTab, onSelectView, onClose])

  // Keep active index clamped
  useEffect(() => {
    setActiveIndex((prev) => Math.min(prev, Math.max(0, allResults.length - 1)))
  }, [allResults.length])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${activeIndex}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [activeIndex])

  const handleSelect = useCallback(
    (result: PaletteResult) => {
      result.onSelect()
      onClose()
    },
    [onClose]
  )

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setActiveIndex((prev) => Math.min(prev + 1, allResults.length - 1))
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setActiveIndex((prev) => Math.max(prev - 1, 0))
        return
      }
      if (e.key === 'Enter') {
        e.preventDefault()
        const result = allResults[activeIndex]
        if (result) handleSelect(result)
        return
      }
    },
    [allResults, activeIndex, handleSelect, onClose]
  )

  // Group by kind
  const groups: { kind: ResultKind; label: string; items: PaletteResult[] }[] = []
  const tabItems = allResults.filter((r) => r.kind === 'tab')
  const viewItems = allResults.filter((r) => r.kind === 'view')
  const actionItems = allResults.filter((r) => r.kind === 'action')
  if (tabItems.length > 0) groups.push({ kind: 'tab', label: 'Open Tabs', items: tabItems })
  if (viewItems.length > 0) groups.push({ kind: 'view', label: 'Views', items: viewItems })
  if (actionItems.length > 0) groups.push({ kind: 'action', label: 'Actions', items: actionItems })

  // Build flat ordered list for keyboard nav
  let flatIdx = 0

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="cp-backdrop"
          variants={backdropVariants}
          initial="hidden"
          animate="visible"
          exit="exit"
          transition={{ duration: 0.15 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: isDark ? 'rgba(0,0,0,0.65)' : 'rgba(0,0,0,0.3)',
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'center',
            paddingTop: '15vh',
            backdropFilter: 'blur(2px)'
          }}
        >
          <motion.div
            key="cp-panel"
            variants={panelVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            onClick={(e) => e.stopPropagation()}
            style={{
              width: '100%',
              maxWidth: 580,
              borderRadius: 14,
              overflow: 'hidden',
              background: isDark ? '#1a1a1a' : '#ffffff',
              border: `1px solid var(--border-subtle)`,
              boxShadow: 'var(--shadow-md)',
              display: 'flex',
              flexDirection: 'column',
              maxHeight: '65vh'
            }}
          >
            {/* Search Input */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 16px',
                borderBottom: `1px solid var(--border-subtle)`
              }}
            >
              <Search size={16} style={{ color: 'var(--text-tertiary)', flexShrink: 0 }} />
              <input
                ref={inputRef}
                type="text"
                placeholder="Search tabs, views, actions…"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value)
                  setActiveIndex(0)
                }}
                onKeyDown={handleKeyDown}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: 'none',
                  outline: 'none',
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  fontFamily: 'var(--font-sans)'
                }}
              />
              <kbd
                style={{
                  fontSize: 10,
                  padding: '2px 6px',
                  borderRadius: 5,
                  background: 'var(--surface-4)',
                  color: 'var(--text-tertiary)',
                  border: '1px solid var(--border-subtle)',
                  fontFamily: 'var(--font-mono)',
                  flexShrink: 0
                }}
              >
                ESC
              </kbd>
            </div>

            {/* Scope & Regex Filter Bar */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '6px 14px',
                borderBottom: `1px solid var(--border-subtle)`,
                background: 'var(--surface-2)',
                fontSize: 11
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ color: 'var(--text-tertiary)', marginRight: 2 }}>Search:</span>
                {(['both', 'title', 'url'] as const).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSearchTarget(t)}
                    style={{
                      padding: '2px 8px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontWeight: searchTarget === t ? 600 : 400,
                      background: searchTarget === t ? 'var(--accent-subtle)' : 'transparent',
                      color: searchTarget === t ? 'var(--accent)' : 'var(--text-secondary)',
                      border: searchTarget === t ? '1px solid var(--accent)' : '1px solid transparent',
                      cursor: 'pointer',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {t === 'both' ? 'Title & URL' : t === 'title' ? 'Title Only' : 'URL Only'}
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setIsRegex(!isRegex)}
                title="Toggle Regular Expression search"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  padding: '2px 8px',
                  borderRadius: 4,
                  fontSize: 11,
                  fontWeight: isRegex ? 600 : 400,
                  background: isRegex ? 'var(--accent-subtle)' : 'transparent',
                  color: isRegex ? 'var(--accent)' : 'var(--text-tertiary)',
                  border: isRegex ? '1px solid var(--accent)' : '1px solid var(--border-subtle)',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                <Binary size={12} strokeWidth={1.75} />
                <span>Regex {isRegex ? 'ON' : '.*'}</span>
              </button>
            </div>

            {/* Results List */}
            <div
              ref={listRef}
              style={{
                overflowY: 'auto',
                padding: '8px 6px'
              }}
            >
              {allResults.length === 0 ? (
                <div
                  style={{
                    padding: '32px 16px',
                    textAlign: 'center',
                    color: 'var(--text-tertiary)',
                    fontSize: 13
                  }}
                >
                  <Globe size={24} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <p>No results for &ldquo;{query}&rdquo;</p>
                </div>
              ) : (
                groups.map((group) => (
                  <div key={group.kind}>
                    <div
                      style={{
                        fontSize: 10,
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'var(--text-tertiary)',
                        padding: '6px 10px 4px',
                        marginTop: 4
                      }}
                    >
                      {group.label}
                    </div>
                    {group.items.map((result) => {
                      const idx = flatIdx++
                      const isActive = idx === activeIndex
                      return (
                        <button
                          key={result.id}
                          type="button"
                          data-idx={idx}
                          onClick={() => handleSelect(result)}
                          onMouseEnter={() => setActiveIndex(idx)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: 10,
                            width: '100%',
                            padding: '7px 10px',
                            borderRadius: 8,
                            border: 'none',
                            cursor: 'pointer',
                            textAlign: 'left',
                            background: isActive ? 'var(--accent-subtle)' : 'transparent',
                            color: 'var(--text-primary)',
                            transition: 'background 0.1s'
                          }}
                        >
                          <span style={{ color: isActive ? 'var(--accent)' : 'var(--text-secondary)', flexShrink: 0 }}>
                            {result.icon}
                          </span>
                          <span style={{ flex: 1, minWidth: 0 }}>
                            <span
                              style={{
                                display: 'block',
                                fontSize: 13,
                                fontWeight: 500,
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                color: isActive ? 'var(--accent)' : 'var(--text-primary)'
                              }}
                            >
                              {result.label}
                            </span>
                            {result.sublabel && (
                              <span
                                style={{
                                  display: 'block',
                                  fontSize: 11,
                                  color: 'var(--text-tertiary)',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                              >
                                {result.sublabel}
                              </span>
                            )}
                          </span>
                          {isActive && (
                            <ArrowRight size={13} style={{ color: 'var(--accent)', flexShrink: 0 }} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hint */}
            <div
              style={{
                padding: '8px 16px',
                borderTop: `1px solid var(--border-subtle)`,
                display: 'flex',
                gap: 16,
                alignItems: 'center'
              }}
            >
              {[
                ['↑↓', 'Navigate'],
                ['↵', 'Select'],
                ['Esc', 'Close']
              ].map(([key, hint]) => (
                <span
                  key={key}
                  style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--text-tertiary)' }}
                >
                  <kbd
                    style={{
                      padding: '1px 5px',
                      borderRadius: 4,
                      background: 'var(--surface-4)',
                      border: '1px solid var(--border-subtle)',
                      fontFamily: 'var(--font-mono)',
                      fontSize: 10
                    }}
                  >
                    {key}
                  </kbd>
                  {hint}
                </span>
              ))}
              <span style={{ flex: 1 }} />
              <span style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--text-tertiary)' }}>
                <Command size={11} />
                <span>Excited Gem</span>
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
