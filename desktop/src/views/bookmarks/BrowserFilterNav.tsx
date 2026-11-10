import React from 'react'
import { Globe, Star } from 'lucide-react'
import { BrowserIcon } from '../../components/BrowserIcon'
import type { BookmarkItem } from './types'

interface BrowserFilterNavProps {
  browsers: string[]
  activeBrowser: string
  activeProfile: string
  availableProfiles: string[]
  bookmarks: BookmarkItem[]
  isDark: boolean
  onSelectBrowser: (browser: string) => void
  onSelectProfile: (profile: string) => void
}

export const BrowserFilterNav: React.FC<BrowserFilterNavProps> = ({
  browsers,
  activeBrowser,
  activeProfile,
  availableProfiles,
  bookmarks,
  isDark,
  onSelectBrowser,
  onSelectProfile
}) => {
  const getBrowserIcon = (bName: string) => {
    const lower = bName.toLowerCase()
    if (
      lower.includes('chrome') ||
      lower.includes('edge') ||
      lower.includes('firefox') ||
      lower.includes('brave') ||
      lower.includes('opera') ||
      lower.includes('safari')
    ) {
      return <BrowserIcon browserId={bName} size={14} />
    }
    if (lower.includes('app') || lower.includes('excited')) return <Star className="w-3.5 h-3.5 text-[#faad14]" />
    return <Globe className="w-3.5 h-3.5 text-slate-400" />
  }

  return (
    <div className="flex flex-col gap-2">
      {/* Browser Selector Pills */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {browsers.map((bName) => {
          const isActive = activeBrowser === bName
          const count =
            bName === 'All Browsers'
              ? bookmarks.length
              : bName === 'App Favorites'
              ? bookmarks.filter((b) => b.source === 'app' || !b.browser).length
              : bookmarks.filter((b) => b.browser === bName).length

          return (
            <button
              key={bName}
              type="button"
              onClick={() => onSelectBrowser(bName)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-[#0078d4] to-[#106ebe] text-white shadow-sm shadow-[#0078d4]/30'
                  : isDark
                  ? 'bg-[#222222]/90 text-[#aaaaaa] hover:bg-[#2a2a2a] hover:text-white border border-[#333333]'
                  : 'bg-white text-[#555555] hover:bg-[#f0f0f0] hover:text-[#111111] border border-[#e0e0e0]'
              }`}
            >
              {getBrowserIcon(bName)}
              <span>{bName}</span>
              <span
                className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                  isActive
                    ? 'bg-white/20 text-white'
                    : isDark
                    ? 'bg-[#2e2e2e] text-[#888888]'
                    : 'bg-[#eeeeee] text-[#666666]'
                }`}
              >
                {count}
              </span>
            </button>
          )
        })}
      </div>

      {/* Profile Selector (shown if multiple profiles available for selected browser) */}
      {availableProfiles.length > 1 && (
        <div className="flex items-center gap-1.5 text-xs">
          <span className={`text-[11px] font-medium mr-1 ${isDark ? 'text-[#777777]' : 'text-[#888888]'}`}>
            Profile:
          </span>
          <div className="flex items-center gap-1 overflow-x-auto scrollbar-none">
            {availableProfiles.map((prof) => {
              const isProfActive = activeProfile === prof
              return (
                <button
                  key={prof}
                  type="button"
                  onClick={() => onSelectProfile(prof)}
                  className={`px-2.5 py-0.5 rounded-lg text-[11px] font-medium transition-all ${
                    isProfActive
                      ? isDark
                        ? 'bg-[#333333] text-white border border-[#555555]'
                        : 'bg-[#e5eff8] text-[#0078d4] border border-[#b8d6f0]'
                      : isDark
                      ? 'text-[#888888] hover:text-white'
                      : 'text-[#666666] hover:text-[#111111]'
                  }`}
                >
                  {prof}
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
