import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Layers,
  Clock,
  Trash2,
  ChevronDown,
  ChevronUp,
  Download,
  Play
} from 'lucide-react'
import { Tooltip } from 'antd'
import { SessionWindowPreview } from './SessionWindowPreview'
import type { SavedSession } from './types'
import type { UnifiedWindow } from '../../../src/adapter/types'

interface SessionCardProps {
  session: SavedSession
  isDark: boolean
  onOpenUrl?: (url: string) => void
  onDeleteSession: (id: string, name: string) => void
  onRestoreSession: (session: SavedSession) => void
  onRestoreWindow: (win: UnifiedWindow) => void
  onExportSession: (session: SavedSession) => void
}

const SessionCardComponent: React.FC<SessionCardProps> = ({
  session,
  isDark,
  onOpenUrl,
  onDeleteSession,
  onRestoreSession,
  onRestoreWindow,
  onExportSession
}) => {
  const [isExpanded, setIsExpanded] = useState(false)

  const formatRelativeTime = (ts: number) => {
    const diff = Date.now() - ts
    const mins = Math.floor(diff / 60000)
    if (mins < 1) return 'Just now'
    if (mins < 60) return `${mins}m ago`
    const hours = Math.floor(mins / 60)
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    return `${days}d ago`
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.98 }}
      className={`rounded-2xl border transition-all overflow-hidden backdrop-blur-md shadow-sm ${
        isDark
          ? 'bg-[#222222]/80 border-[#333333] hover:border-[#444444]'
          : 'bg-white/90 border-[#e5e5e5] hover:border-[#d0d0d0]'
      }`}
    >
      {/* Session Card Header */}
      <div className="p-4 flex items-center justify-between gap-4">
        <div
          className="flex items-center gap-3.5 min-w-0 flex-1 cursor-pointer select-none"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border ${
              isDark
                ? 'bg-[#2b2b2b] text-[#0078d4] border-[#383838]'
                : 'bg-[#edf4fb] text-[#0078d4] border-[#d4e4f5]'
            }`}
          >
            <Layers className="w-5 h-5" />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-sm font-bold tracking-tight m-0 truncate" title={session.name}>
                {session.name}
              </h3>
              <span className="text-[10px] px-2 py-0.5 rounded-full font-semibold bg-[#0078d4]/10 text-[#0078d4] border border-[#0078d4]/20">
                {session.totalTabs} tabs
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                  isDark ? 'bg-[#2e2e2e] text-[#888888]' : 'bg-[#f0f0f0] text-[#666666]'
                }`}
              >
                {session.totalWindows} windows
              </span>
            </div>

            <div
              className={`flex items-center gap-1.5 mt-1 text-[11px] ${
                isDark ? 'text-[#777777]' : 'text-[#888888]'
              }`}
            >
              <Clock className="w-3 h-3" />
              <span>{formatRelativeTime(session.timestamp)}</span>
              <span className="mx-0.5">·</span>
              <span>{new Date(session.timestamp).toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={() => onRestoreSession(session)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0078d4] to-[#106ebe] hover:brightness-110 active:scale-95 shadow-sm shadow-[#0078d4]/30 transition-all"
            title="Restore all windows and tabs from this snapshot"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Restore All</span>
          </button>

          <Tooltip title="Export session JSON">
            <button
              type="button"
              onClick={() => onExportSession(session)}
              className={`p-2 rounded-xl border transition-colors ${
                isDark
                  ? 'bg-[#2a2a2a] border-[#383838] text-[#888888] hover:text-white'
                  : 'bg-[#f8f8f8] border-[#e0e0e0] text-[#666666] hover:text-[#111111]'
              }`}
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <Tooltip title="Delete session">
            <button
              type="button"
              onClick={() => onDeleteSession(session.id, session.name)}
              className="p-2 rounded-xl text-[#ff4d4f] hover:bg-[#ff4d4f]/10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </Tooltip>

          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className={`p-2 rounded-xl border transition-colors ${
              isDark
                ? 'bg-[#2a2a2a] border-[#383838] text-[#888888] hover:text-white'
                : 'bg-[#f8f8f8] border-[#e0e0e0] text-[#666666] hover:text-[#111111]'
            }`}
            title={isExpanded ? 'Collapse' : 'Expand'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Windows Preview */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="px-4 pb-4 pt-1 border-t border-black/5 dark:border-white/5 flex flex-col gap-3"
          >
            {session.windows.map((win, idx) => (
              <SessionWindowPreview
                key={win.id || idx}
                window={win}
                index={idx}
                isDark={isDark}
                onOpenUrl={onOpenUrl}
                onRestoreWindow={onRestoreWindow}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

export const SessionCard = React.memo(SessionCardComponent)
