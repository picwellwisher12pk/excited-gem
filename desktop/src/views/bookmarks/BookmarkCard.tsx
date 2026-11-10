import React from 'react'
import { motion } from 'framer-motion'
import { Trash2, ExternalLink, Tag, Globe, Star } from 'lucide-react'
import { Tooltip } from 'antd'
import type { BookmarkItem } from './types'

interface BookmarkCardProps {
  bookmark: BookmarkItem
  viewMode: 'grid' | 'list'
  index: number
  isDark: boolean
  onOpenUrl: (url: string) => void
  onDeleteBookmark: (id: string, title: string) => void
  onSaveToFavorites?: (bm: BookmarkItem) => void
  onLaunchInBrowser?: (engine: string, url: string) => void
}

const BookmarkCardComponent: React.FC<BookmarkCardProps> = ({
  bookmark: bm,
  viewMode,
  index,
  isDark,
  onOpenUrl,
  onDeleteBookmark,
  onSaveToFavorites,
  onLaunchInBrowser
}) => {
  let host = bm.url
  try {
    host = new URL(bm.url).hostname
  } catch {
    // keep as is
  }

  const faviconUrl = `https://www.google.com/s2/favicons?domain=${host}&sz=${viewMode === 'grid' ? 64 : 32}`
  const isFromBrowser = bm.source === 'browser' || !!bm.browser

  if (viewMode === 'grid') {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        whileHover={{ y: -2 }}
        transition={{ duration: 0.2 }}
        className={`group relative p-4 rounded-xl border flex flex-col justify-between transition-all backdrop-blur-sm shadow-sm hover:shadow-md ${
          isDark
            ? 'bg-[#222222]/70 border-[#333333] hover:border-[#0078d4]/50 hover:bg-[#252525]'
            : 'bg-white/80 border-[#e5e5e5] hover:border-[#0078d4]/40 hover:bg-white'
        }`}
      >
        <div>
          {/* Top row: Favicon + Folder/Browser tag + Actions */}
          <div className="flex items-start justify-between gap-2 mb-2.5">
            <div className="flex items-center gap-2 flex-wrap">
              <img
                src={faviconUrl}
                alt=""
                className="w-7 h-7 rounded-lg object-contain bg-black/5 dark:bg-white/5 p-0.5"
                onError={(e) => {
                  ;(e.target as HTMLImageElement).style.display = 'none'
                }}
              />
              {bm.browser && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 bg-[#0078d4]/10 text-[#0078d4] border border-[#0078d4]/20"
                  title={`${bm.browser} (${bm.profile || 'Default'})`}
                >
                  <Globe className="w-2.5 h-2.5" />
                  {bm.browser.replace('Browser', '').trim()}
                </span>
              )}
              <span
                className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                  isDark
                    ? 'bg-[#2a2a2a] text-[#888888] border border-[#383838]'
                    : 'bg-[#f0f0f0] text-[#666666] border border-[#e0e0e0]'
                }`}
              >
                <Tag className="w-2.5 h-2.5" />
                {bm.folder}
              </span>
            </div>

            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {isFromBrowser && onSaveToFavorites && (
                <Tooltip title="Save to App Favorites">
                  <button
                    type="button"
                    onClick={() => onSaveToFavorites(bm)}
                    className="p-1 rounded-md text-[#faad14] hover:bg-[#faad14]/10 transition-colors"
                  >
                    <Star className="w-3.5 h-3.5" />
                  </button>
                </Tooltip>
              )}
              {!isFromBrowser && (
                <button
                  type="button"
                  onClick={() => onDeleteBookmark(bm.id, bm.title)}
                  className="p-1 rounded-md text-[#ff4d4f] hover:bg-[#ff4d4f]/10 transition-colors"
                  title="Delete Bookmark"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Bookmark Title */}
          <h4
            className="text-sm font-semibold m-0 line-clamp-1 group-hover:text-[#0078d4] transition-colors"
            title={bm.title}
          >
            {bm.title}
          </h4>

          {/* Hostname */}
          <p
            className={`text-[11px] m-0 mt-0.5 line-clamp-1 font-mono ${
              isDark ? 'text-[#777777]' : 'text-[#888888]'
            }`}
          >
            {host}
          </p>
        </div>

        {/* Action Row */}
        <div className="mt-4 pt-3 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
          <span className={`text-[10px] ${isDark ? 'text-[#666666]' : 'text-[#999999]'}`}>
            {bm.createdAt ? new Date(bm.createdAt).toLocaleDateString() : ''}
          </span>
          <div className="flex items-center gap-2">
            {bm.browser && onLaunchInBrowser && (
              <button
                type="button"
                onClick={() => onLaunchInBrowser(bm.browser || 'default', bm.url)}
                className="text-[11px] font-medium text-[#107c41] hover:text-[#0b5a2f] transition-colors"
                title={`Launch in ${bm.browser}`}
              >
                Launch
              </button>
            )}
            <button
              type="button"
              onClick={() => onOpenUrl(bm.url)}
              className="flex items-center gap-1.5 text-xs font-medium text-[#0078d4] hover:text-[#2890e2] transition-colors"
            >
              <span>Open</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </motion.div>
    )
  }

  // List View
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={`group flex items-center justify-between p-3.5 transition-colors ${
        index !== 0
          ? isDark
            ? 'border-t border-[#2a2a2a]'
            : 'border-t border-[#f0f0f0]'
          : ''
      } ${
        isDark ? 'hover:bg-[#282828]' : 'hover:bg-[#f8f9fa]'
      }`}
    >
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <img
          src={faviconUrl}
          alt=""
          className="w-5 h-5 rounded object-contain shrink-0"
          onError={(e) => {
            ;(e.target as HTMLImageElement).style.display = 'none'
          }}
        />
        <div className="min-w-0 flex-1 pr-4">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-semibold truncate group-hover:text-[#0078d4] transition-colors">
              {bm.title}
            </span>
            {bm.browser && (
              <span className="text-[9px] px-1.5 py-0.5 rounded font-medium shrink-0 bg-[#0078d4]/10 text-[#0078d4] border border-[#0078d4]/20">
                {bm.browser.replace('Browser', '').trim()} • {bm.profile || 'Default'}
              </span>
            )}
            <span
              className={`text-[9px] px-1.5 py-0.2 rounded font-medium shrink-0 ${
                isDark ? 'bg-[#2d2d2d] text-[#888888]' : 'bg-[#eeeeee] text-[#666666]'
              }`}
            >
              {bm.folder}
            </span>
          </div>
          <div
            className={`text-[11px] truncate mt-0.5 font-mono ${
              isDark ? 'text-[#777777]' : 'text-[#888888]'
            }`}
          >
            {bm.url}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {bm.browser && onLaunchInBrowser && (
          <button
            type="button"
            onClick={() => onLaunchInBrowser(bm.browser || 'default', bm.url)}
            className="px-2 py-1 rounded-lg text-xs font-medium text-[#107c41] hover:bg-[#107c41]/10 transition-colors"
            title={`Launch directly in ${bm.browser}`}
          >
            Launch in {bm.browser.split(' ')[0]}
          </button>
        )}
        {isFromBrowser && onSaveToFavorites && (
          <button
            type="button"
            onClick={() => onSaveToFavorites(bm)}
            className="p-1.5 rounded-lg text-[#faad14] hover:bg-[#faad14]/10 transition-colors"
            title="Save to App Favorites"
          >
            <Star className="w-3.5 h-3.5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => onOpenUrl(bm.url)}
          className="p-1.5 rounded-lg text-xs font-medium text-[#0078d4] hover:bg-[#0078d4]/10 transition-colors flex items-center gap-1"
        >
          <ExternalLink className="w-3.5 h-3.5" />
          <span>Open</span>
        </button>
        {!isFromBrowser && (
          <button
            type="button"
            onClick={() => onDeleteBookmark(bm.id, bm.title)}
            className="p-1.5 rounded-lg text-[#ff4d4f] hover:bg-[#ff4d4f]/10 transition-colors"
            title="Delete"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </motion.div>
  )
}

export const BookmarkCard = React.memo(BookmarkCardComponent)
