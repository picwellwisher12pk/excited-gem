import React from 'react'
import { ExternalLink, Globe, Layers } from 'lucide-react'
import { Tooltip } from 'antd'
import type { UnifiedWindow } from '../../../src/adapter/types'

interface SessionWindowPreviewProps {
  window: UnifiedWindow
  index: number
  isDark: boolean
  onOpenUrl?: (url: string) => void
  onRestoreWindow: (win: UnifiedWindow) => void
}

export const SessionWindowPreview: React.FC<SessionWindowPreviewProps> = ({
  window: win,
  index,
  isDark,
  onOpenUrl,
  onRestoreWindow
}) => {
  const browserLabel = win.browserId || 'Browser'

  return (
    <div
      className={`rounded-xl border p-3 flex flex-col gap-2 transition-all ${
        isDark ? 'bg-[#1e1e1e]/80 border-[#333333]' : 'bg-[#fcfcfc] border-[#e5e5e5]'
      }`}
    >
      {/* Window Header */}
      <div className="flex items-center justify-between pb-2 border-b border-black/5 dark:border-white/5">
        <div className="flex items-center gap-2">
          <Layers className="w-3.5 h-3.5 text-[#0078d4]" />
          <span className="text-xs font-semibold">
            Window {index + 1}
          </span>
          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-[#0078d4]/10 text-[#0078d4] border border-[#0078d4]/20 flex items-center gap-1">
            <Globe className="w-2.5 h-2.5" />
            {browserLabel}
          </span>
          <span className={`text-[10px] ${isDark ? 'text-[#888888]' : 'text-[#666666]'}`}>
            {win.tabs.length} tabs
          </span>
        </div>

        <button
          type="button"
          onClick={() => onRestoreWindow(win)}
          className="px-2.5 py-1 rounded-lg text-xs font-medium text-white bg-[#0078d4] hover:bg-[#106ebe] transition-all flex items-center gap-1 shadow-sm shadow-[#0078d4]/20"
        >
          <ExternalLink className="w-3 h-3" />
          <span>Restore Window</span>
        </button>
      </div>

      {/* Tab previews */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 max-h-48 overflow-y-auto scrollbar-thin pr-1">
        {win.tabs.map((tab) => {
          let host = tab.url
          try {
            host = new URL(tab.url).hostname
          } catch {
            // keep
          }
          const favicon =
            tab.favIconUrl ||
            `https://www.google.com/s2/favicons?domain=${host}&sz=32`

          return (
            <div
              key={tab.id}
              className={`flex items-center justify-between p-1.5 rounded-lg border transition-colors ${
                isDark
                  ? 'bg-[#252525]/60 border-[#383838] hover:bg-[#2a2a2a]'
                  : 'bg-white border-[#ececec] hover:bg-[#f4f4f4]'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0 flex-1 mr-2">
                <img
                  src={favicon}
                  alt=""
                  className="w-4 h-4 rounded object-contain shrink-0"
                  onError={(e) => {
                    ;(e.target as HTMLImageElement).style.display = 'none'
                  }}
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate m-0 leading-tight" title={tab.title}>
                    {tab.title || tab.url}
                  </p>
                  <p
                    className={`text-[10px] truncate m-0 font-mono ${
                      isDark ? 'text-[#777777]' : 'text-[#999999]'
                    }`}
                  >
                    {host}
                  </p>
                </div>
              </div>

              {onOpenUrl && (
                <Tooltip title="Open this tab">
                  <button
                    type="button"
                    onClick={() => onOpenUrl(tab.url)}
                    className="p-1 rounded text-[#0078d4] hover:bg-[#0078d4]/10 transition-colors shrink-0"
                  >
                    <ExternalLink className="w-3 h-3" />
                  </button>
                </Tooltip>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}
