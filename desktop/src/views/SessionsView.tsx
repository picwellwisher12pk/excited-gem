import React, { useState, useMemo } from 'react'
import { notification } from 'antd'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderOpen } from 'lucide-react'
import { useTheme } from '../theme/ThemeContext'
import { SessionCard } from './sessions/SessionCard'
import { SessionToolbar } from './sessions/SessionToolbar'
import { useSessionsManager } from './sessions/useSessionsManager'
import type { SessionsViewProps } from './sessions/types'

export type { SavedSession, SessionsViewProps } from './sessions/types'

export const SessionsView: React.FC<SessionsViewProps> = ({
  windows = [],
  connectedBrowsers = [],
  onOpenUrl,
  onCreateTab
}) => {
  const { isDark } = useTheme()
  const [search, setSearch] = useState('')
  const [api, contextHolder] = notification.useNotification()

  const {
    sessions,
    saveCurrentSnapshot,
    deleteSession,
    restoreSingleWindow,
    restoreEntireSession,
    exportSession,
    importSessions
  } = useSessionsManager(api, connectedBrowsers, onCreateTab)

  const activeTabsCount = useMemo(() => {
    return windows.reduce((acc, w) => acc + (w.tabs ? w.tabs.length : 0), 0)
  }, [windows])

  const filteredSessions = useMemo(() => {
    if (!search.trim()) return sessions
    const query = search.toLowerCase()
    return sessions.filter((s) => {
      const matchName = s.name.toLowerCase().includes(query)
      const matchTabs = s.windows.some((w) =>
        w.tabs.some(
          (t) =>
            (t.title && t.title.toLowerCase().includes(query)) ||
            (t.url && t.url.toLowerCase().includes(query))
        )
      )
      return matchName || matchTabs
    })
  }, [sessions, search])

  return (
    <div
      className={`flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-5xl font-sans transition-colors ${
        isDark ? 'bg-[#181818] text-white' : 'bg-[#f4f4f4] text-[#1a1a1a]'
      }`}
    >
      {contextHolder}

      {/* Toolbar & Snapshot Creator */}
      <SessionToolbar
        search={search}
        activeWindowsCount={windows.length}
        activeTabsCount={activeTabsCount}
        isDark={isDark}
        onSearchChange={setSearch}
        onSaveSession={(name) => saveCurrentSnapshot(name, windows)}
        onImportSessions={importSessions}
      />

      {/* Sessions List */}
      <div className="flex flex-col gap-3.5">
        <AnimatePresence>
          {filteredSessions.map((sess) => (
            <SessionCard
              key={sess.id}
              session={sess}
              isDark={isDark}
              onOpenUrl={onOpenUrl}
              onDeleteSession={deleteSession}
              onRestoreSession={restoreEntireSession}
              onRestoreWindow={restoreSingleWindow}
              onExportSession={exportSession}
            />
          ))}
        </AnimatePresence>

        {filteredSessions.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            className={`py-16 px-6 text-center rounded-2xl border flex flex-col items-center justify-center backdrop-blur-md shadow-sm ${
              isDark ? 'bg-[#222222]/40 border-[#333333]' : 'bg-white/70 border-[#e5e5e5]'
            }`}
          >
            <div
              className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-3 shadow-inner ${
                isDark
                  ? 'bg-gradient-to-br from-[#2a2a2a] to-[#1c1c1c] text-[#0078d4] border border-[#383838]'
                  : 'bg-gradient-to-br from-[#eef3f8] to-[#e1ebf4] text-[#0078d4] border border-[#d6e4f0]'
              }`}
            >
              <FolderOpen className="w-7 h-7 opacity-90 stroke-[1.5]" />
            </div>
            <h3 className="text-sm font-semibold m-0 tracking-tight">
              {search ? 'No Matching Snapshots' : 'No Saved Sessions'}
            </h3>
            <p
              className={`text-xs max-w-sm mt-1 mb-0 leading-relaxed ${
                isDark ? 'text-[#888888]' : 'text-[#666666]'
              }`}
            >
              {search
                ? `No sessions match "${search}". Try searching another name or URL.`
                : 'Save your active multi-browser workspace above to easily restore your tabs later.'}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  )
}
