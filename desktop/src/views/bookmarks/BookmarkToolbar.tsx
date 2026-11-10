import React from 'react'
import { Search, Grid, List, Plus, Download, Upload, RefreshCw, } from 'lucide-react'
import { Tooltip, message } from 'antd'
import type { BookmarkItem } from './types'

interface BookmarkToolbarProps {
  search: string
  viewMode: 'grid' | 'list'
  isDark: boolean
  bookmarks: BookmarkItem[]
  isScanning?: boolean
  totalScannedCount?: number
  onSearchChange: (val: string) => void
  onViewModeChange: (mode: 'grid' | 'list') => void
  onOpenAddModal: () => void
  onImportBookmarks: (imported: BookmarkItem[]) => void
  onScanBrowsers?: () => void
}

export const BookmarkToolbar: React.FC<BookmarkToolbarProps> = ({
  search,
  viewMode,
  isDark,
  bookmarks,
  isScanning = false,
  totalScannedCount = 0,
  onSearchChange,
  onViewModeChange,
  onOpenAddModal,
  onImportBookmarks,
  onScanBrowsers
}) => {
  const handleExport = () => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(bookmarks, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute('download', `excited_gem_bookmarks_${new Date().toISOString().slice(0, 10)}.json`)
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
      message.success(`Exported ${bookmarks.length} bookmarks`)
    } catch {
      message.error('Failed to export bookmarks')
    }
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string)
        if (Array.isArray(parsed)) {
          onImportBookmarks(parsed)
          message.success(`Imported ${parsed.length} bookmarks`)
        } else {
          message.error('Invalid bookmarks file format')
        }
      } catch {
        message.error('Could not parse JSON bookmarks file')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      {/* Title */}
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-bold tracking-tight m-0">Universal Bookmarks</h2>
          {totalScannedCount > 0 && (
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-[#107c41]/10 text-[#107c41] border border-[#107c41]/20">
              {totalScannedCount} disk bookmarks
            </span>
          )}
        </div>
        <p className={`text-xs m-0 mt-0.5 ${isDark ? 'text-[#888888]' : 'text-[#666666]'}`}>
          View & search bookmarks from Chrome, Edge, Firefox, Brave, and offline browsers.
        </p>
      </div>

      {/* Action Controls */}
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search Bar */}
        <div className="relative w-48 sm:w-60">
          <Search
            className={`absolute left-3 top-2.5 w-4 h-4 pointer-events-none ${
              isDark ? 'text-[#777777]' : 'text-[#999999]'
            }`}
          />
          <input
            type="text"
            placeholder="Search across all browsers..."
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className={`w-full text-xs pl-9 pr-3 py-2 rounded-xl border outline-none transition-all ${
              isDark
                ? 'bg-[#222222]/80 border-[#333333] text-white placeholder-[#777777] focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]'
                : 'bg-white border-[#d8d8d8] text-[#111111] placeholder-[#999999] focus:border-[#0078d4] focus:ring-1 focus:ring-[#0078d4]'
            }`}
          />
        </div>

        {/* Scan All Installed Browsers */}
        {onScanBrowsers && (
          <Tooltip title="Scan bookmarks directly from Chrome, Edge, Firefox, and offline browsers">
            <button
              type="button"
              onClick={onScanBrowsers}
              disabled={isScanning}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                isDark
                  ? 'bg-[#222222] border-[#383838] text-white hover:bg-[#2a2a2a] disabled:opacity-50'
                  : 'bg-white border-[#d8d8d8] text-[#111] hover:bg-[#f5f5f5] disabled:opacity-50'
              }`}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin text-[#0078d4]' : 'text-[#107c41]'}`} />
              <span className="hidden md:inline">{isScanning ? 'Scanning...' : 'Scan Browsers'}</span>
            </button>
          </Tooltip>
        )}

        {/* View Mode Toggle */}
        <div
          className={`flex items-center p-0.5 rounded-xl border ${
            isDark ? 'bg-[#222222] border-[#383838]' : 'bg-white border-[#d8d8d8]'
          }`}
        >
          <button
            type="button"
            onClick={() => onViewModeChange('grid')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'grid'
                ? isDark
                  ? 'bg-[#333333] text-white'
                  : 'bg-[#eef3f8] text-[#0078d4]'
                : isDark
                ? 'text-[#777777] hover:text-white'
                : 'text-[#888888] hover:text-[#111111]'
            }`}
            title="Grid View"
          >
            <Grid className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => onViewModeChange('list')}
            className={`p-1.5 rounded-lg transition-colors ${
              viewMode === 'list'
                ? isDark
                  ? 'bg-[#333333] text-white'
                  : 'bg-[#eef3f8] text-[#0078d4]'
                : isDark
                ? 'text-[#777777] hover:text-white'
                : 'text-[#888888] hover:text-[#111111]'
            }`}
            title="List View"
          >
            <List className="w-4 h-4" />
          </button>
        </div>

        {/* Export / Import */}
        <Tooltip title="Export bookmarks as JSON">
          <button
            type="button"
            onClick={handleExport}
            className={`p-2 rounded-xl border transition-colors ${
              isDark ? 'bg-[#222222] border-[#383838] text-[#aaa] hover:text-white' : 'bg-white border-[#d8d8d8] text-[#666] hover:text-[#111]'
            }`}
          >
            <Download className="w-4 h-4" />
          </button>
        </Tooltip>

        <label
          title="Import bookmarks JSON"
          className={`cursor-pointer p-2 rounded-xl border transition-colors flex items-center justify-center ${
            isDark ? 'bg-[#222222] border-[#383838] text-[#aaa] hover:text-white' : 'bg-white border-[#d8d8d8] text-[#666] hover:text-[#111]'
          }`}
        >
          <Upload className="w-4 h-4" />
          <input type="file" accept=".json" onChange={handleImportFile} className="hidden" />
        </label>

        {/* Add Bookmark CTA */}
        <button
          type="button"
          onClick={onOpenAddModal}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0078d4] to-[#005a9e] hover:brightness-110 active:scale-95 shadow-md shadow-[#0078d4]/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Add</span>
        </button>
      </div>
    </div>
  )
}
