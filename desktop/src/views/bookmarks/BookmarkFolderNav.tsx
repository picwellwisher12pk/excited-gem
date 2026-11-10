import React from 'react'
import { Folder } from 'lucide-react'
import type { BookmarkItem } from './types'

interface BookmarkFolderNavProps {
  folders: string[]
  activeFolder: string
  bookmarks: BookmarkItem[]
  isDark: boolean
  onSelectFolder: (folder: string) => void
}

export const BookmarkFolderNav: React.FC<BookmarkFolderNavProps> = ({
  folders,
  activeFolder,
  bookmarks,
  isDark,
  onSelectFolder
}) => {
  return (
    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
      {folders.map((folder) => {
        const isActive = activeFolder === folder
        const count =
          folder === 'All'
            ? bookmarks.length
            : bookmarks.filter((b) => b.folder === folder).length

        return (
          <button
            key={folder}
            type="button"
            onClick={() => onSelectFolder(folder)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
              isActive
                ? 'bg-[#0078d4] text-white shadow-sm shadow-[#0078d4]/30'
                : isDark
                ? 'bg-[#222222]/80 text-[#aaaaaa] hover:bg-[#2a2a2a] hover:text-white border border-[#333333]'
                : 'bg-white text-[#555555] hover:bg-[#f0f0f0] hover:text-[#111111] border border-[#e0e0e0]'
            }`}
          >
            <Folder className="w-3.5 h-3.5 opacity-80" />
            <span>{folder}</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-semibold ${
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
  )
}
