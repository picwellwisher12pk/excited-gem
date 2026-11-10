import React, { useState } from 'react'
import { Search, Save, Upload, FolderOpen } from 'lucide-react'
import { Tooltip, message } from 'antd'
import type { SavedSession } from './types'

interface SessionToolbarProps {
  search: string
  activeWindowsCount: number
  activeTabsCount: number
  isDark: boolean
  onSearchChange: (val: string) => void
  onSaveSession: (name: string) => void
  onImportSessions: (sessions: SavedSession[]) => void
}

export const SessionToolbar: React.FC<SessionToolbarProps> = ({
  search,
  activeWindowsCount,
  activeTabsCount,
  isDark,
  onSearchChange,
  onSaveSession,
  onImportSessions
}) => {
  const [snapshotName, setSnapshotName] = useState('')

  const handleSave = () => {
    onSaveSession(snapshotName)
    setSnapshotName('')
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        if (Array.isArray(parsed)) {
          onImportSessions(parsed)
          message.success(`Imported ${parsed.length} sessions`)
        } else if (parsed && parsed.windows && Array.isArray(parsed.windows)) {
          onImportSessions([parsed])
          message.success('Imported 1 session snapshot')
        } else {
          message.error('Invalid session file format')
        }
      } catch {
        message.error('Failed to parse session JSON file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Title & Live Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-bold tracking-tight m-0 flex items-center gap-2">
              <FolderOpen className="w-5 h-5 text-[#0078d4]" />
              Multi-Browser Sessions
            </h2>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#0078d4]/10 text-[#0078d4] border border-[#0078d4]/20">
              {activeTabsCount} tabs live ({activeWindowsCount} wins)
            </span>
          </div>
          <p className={`text-xs m-0 mt-0.5 ${isDark ? 'text-[#888888]' : 'text-[#666666]'}`}>
            Save snapshots of open windows across browsers, and restore them anytime.
          </p>
        </div>

        {/* Search & Import */}
        <div className="flex items-center gap-2">
          <div className="relative w-48 sm:w-56">
            <Search
              className={`absolute left-3 top-2.5 w-4 h-4 pointer-events-none ${
                isDark ? 'text-[#777777]' : 'text-[#999999]'
              }`}
            />
            <input
              type="text"
              placeholder="Search snapshots..."
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              className={`w-full text-xs pl-9 pr-3 py-2 rounded-xl border outline-none transition-all ${
                isDark
                  ? 'bg-[#222222]/80 border-[#333333] text-white placeholder-[#777777] focus:border-[#0078d4]'
                  : 'bg-white border-[#d8d8d8] text-[#111111] placeholder-[#999999] focus:border-[#0078d4]'
              }`}
            />
          </div>

          <Tooltip title="Import session backup JSON">
            <label
              className={`cursor-pointer p-2 rounded-xl border transition-colors flex items-center justify-center ${
                isDark
                  ? 'bg-[#222222] border-[#383838] text-[#aaa] hover:text-white'
                  : 'bg-white border-[#d8d8d8] text-[#666] hover:text-[#111]'
              }`}
            >
              <Upload className="w-4 h-4" />
              <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
            </label>
          </Tooltip>
        </div>
      </div>

      {/* Snapshot Creator Box */}
      <div
        className={`p-3.5 rounded-2xl border flex items-center gap-2.5 backdrop-blur-md shadow-sm ${
          isDark ? 'bg-[#222222]/70 border-[#333333]' : 'bg-white/80 border-[#e5e5e5]'
        }`}
      >
        <input
          type="text"
          placeholder="Snapshot name (e.g. Work Morning, Dev Setup, Weekly Research)..."
          value={snapshotName}
          onChange={(e) => setSnapshotName(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSave()}
          className={`flex-1 text-xs px-3.5 py-2 rounded-xl border outline-none transition-all ${
            isDark
              ? 'bg-[#1e1e1e] border-[#333333] text-white placeholder-[#777777] focus:border-[#0078d4]'
              : 'bg-[#fbfbfb] border-[#d8d8d8] text-[#111111] placeholder-[#999999] focus:border-[#0078d4]'
          }`}
        />
        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0078d4] to-[#005a9e] hover:brightness-110 active:scale-95 shadow-sm shadow-[#0078d4]/30 transition-all shrink-0"
        >
          <Save className="w-3.5 h-3.5" />
          <span>Save Workspace Snapshot</span>
        </button>
      </div>
    </div>
  )
}
