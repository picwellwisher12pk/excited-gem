import React, { useState } from 'react'
import {
  LayoutGrid,
  Bookmark,
  BarChart3,
  Zap,
  FolderOpen,
  Settings,
  Sparkles,
  PanelLeftClose,
  PanelLeft
} from 'lucide-react'
import { Tooltip } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import { useTheme } from '../theme/ThemeContext'

export type DesktopNavView =
  | 'workspace'
  | 'bookmarks'
  | 'analytics'
  | 'routines'
  | 'sessions'
  | 'settings'

interface DesktopSidebarProps {
  currentView: DesktopNavView
  onSelectView: (view: DesktopNavView) => void
  onToggleAi: () => void
  aiOpen: boolean
}

const navItems: { id: DesktopNavView; label: string; icon: React.ElementType }[] = [
  { id: 'workspace', label: 'Workspace', icon: LayoutGrid },
  { id: 'bookmarks', label: 'Bookmarks', icon: Bookmark },
  { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  { id: 'routines', label: 'Routines', icon: Zap },
  { id: 'sessions', label: 'Sessions', icon: FolderOpen },
  { id: 'settings', label: 'Settings', icon: Settings }
]

export const DesktopSidebar: React.FC<DesktopSidebarProps> = ({
  currentView,
  onSelectView,
  onToggleAi,
  aiOpen
}) => {
  const { isDark } = useTheme()
  const [collapsed, setCollapsed] = useState(false)

  return (
    <aside
      className="h-full flex flex-col justify-between py-3 select-none shrink-0 transition-all duration-300 ease-[var(--ease-out)]"
      style={{
        width: collapsed ? 56 : 200,
        padding: collapsed ? '12px 8px' : '12px 12px',
        background: 'var(--glass-bg-heavy)',
        backdropFilter: 'blur(var(--glass-blur))',
        WebkitBackdropFilter: 'blur(var(--glass-blur))'
      }}
    >
      {/* Top Section: Toggle + Navigation */}
      <div className="flex flex-col gap-1 w-full">
        {/* Toggle Button */}
        <div
          className="flex items-center justify-between mb-2"
          style={{ padding: collapsed ? '0 2px' : '0 6px' }}
        >
          <button
            type="button"
            onClick={() => setCollapsed(!collapsed)}
            className="rounded-md flex items-center justify-center transition-all duration-200 active:scale-95"
            style={{
              width: 30,
              height: 30,
              color: 'var(--text-tertiary)',
              background: 'transparent'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--surface-4)'
              e.currentTarget.style.color = 'var(--text-primary)'
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent'
              e.currentTarget.style.color = 'var(--text-tertiary)'
            }}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <PanelLeft size={16} /> : <PanelLeftClose size={16} />}
          </button>

          <AnimatePresence>
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="text-[10px] font-semibold uppercase tracking-widest"
                style={{ color: 'var(--text-tertiary)' }}
              >
                Views
              </motion.span>
            )}
          </AnimatePresence>
        </div>

        {/* Navigation Items */}
        <nav className="flex flex-col gap-0.5 w-full">
          {navItems.map((item) => {
            const isActive = currentView === item.id
            const Icon = item.icon

            const button = (
              <button
                key={item.id}
                type="button"
                onClick={() => onSelectView(item.id)}
                className="relative w-full flex items-center rounded-lg text-[13px] font-medium transition-all duration-200 active:scale-[0.97] group"
                style={{
                  gap: collapsed ? 0 : 10,
                  padding: collapsed ? '8px 0' : '8px 12px',
                  justifyContent: collapsed ? 'center' : 'flex-start',
                  color: isActive ? 'var(--text-primary)' : 'var(--text-secondary)',
                  background: isActive
                    ? isDark
                      ? 'var(--surface-4)'
                      : 'var(--surface-2)'
                    : 'transparent',
                  boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                  fontWeight: isActive ? 600 : 500
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'var(--surface-4)'
                    e.currentTarget.style.color = 'var(--text-primary)'
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.background = 'transparent'
                    e.currentTarget.style.color = 'var(--text-secondary)'
                  }
                }}
              >
                {/* Active accent indicator */}
                {isActive && (
                  <motion.span
                    layoutId="sidebar-indicator"
                    className="absolute left-0 rounded-r"
                    style={{
                      width: 3,
                      height: 16,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      background: 'linear-gradient(to bottom, var(--accent-gradient-start), var(--accent-gradient-end))'
                    }}
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                  />
                )}

                <Icon
                  size={18}
                  strokeWidth={isActive ? 2.2 : 1.8}
                  style={{
                    flexShrink: 0,
                    color: isActive ? 'var(--accent)' : undefined
                  }}
                />

                <AnimatePresence>
                  {!collapsed && (
                    <motion.span
                      initial={{ opacity: 0, width: 0 }}
                      animate={{ opacity: 1, width: 'auto' }}
                      exit={{ opacity: 0, width: 0 }}
                      transition={{ duration: 0.15 }}
                      className="truncate whitespace-nowrap overflow-hidden"
                    >
                      {item.label}
                    </motion.span>
                  )}
                </AnimatePresence>
              </button>
            )

            return collapsed ? (
              <Tooltip key={item.id} title={item.label} placement="right">
                {button}
              </Tooltip>
            ) : (
              <React.Fragment key={item.id}>{button}</React.Fragment>
            )
          })}
        </nav>
      </div>

      {/* Bottom: AI Assistant Button */}
      <div
        className="w-full pt-3"
        style={{ borderTop: `1px solid var(--border-subtle)` }}
      >
        <Tooltip title={collapsed ? 'AI Assistant' : ''} placement="right">
          <button
            type="button"
            onClick={onToggleAi}
            className={`relative w-full flex items-center rounded-lg text-[13px] font-medium transition-all duration-200 active:scale-[0.97] ${
              !aiOpen ? 'gradient-border-animated' : ''
            }`}
            style={{
              gap: collapsed ? 0 : 10,
              padding: collapsed ? '8px 0' : '8px 12px',
              justifyContent: collapsed ? 'center' : 'flex-start',
              color: aiOpen ? 'var(--text-on-accent)' : 'var(--text-secondary)',
              background: aiOpen
                ? 'linear-gradient(135deg, var(--accent-gradient-start), var(--accent-gradient-end))'
                : 'transparent',
              boxShadow: aiOpen ? 'var(--shadow-md)' : 'none',
              fontWeight: aiOpen ? 600 : 500
            }}
            onMouseEnter={(e) => {
              if (!aiOpen) {
                e.currentTarget.style.background = 'var(--accent-subtle)'
                e.currentTarget.style.color = 'var(--accent)'
              }
            }}
            onMouseLeave={(e) => {
              if (!aiOpen) {
                e.currentTarget.style.background = 'transparent'
                e.currentTarget.style.color = 'var(--text-secondary)'
              }
            }}
          >
            <Sparkles
              size={18}
              strokeWidth={1.8}
              style={{
                flexShrink: 0,
                color: aiOpen ? 'var(--text-on-accent)' : 'var(--accent)'
              }}
            />
            <AnimatePresence>
              {!collapsed && (
                <motion.span
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: 'auto' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ duration: 0.15 }}
                  className="truncate whitespace-nowrap overflow-hidden"
                >
                  AI Assistant
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </Tooltip>
      </div>
    </aside>
  )
}
