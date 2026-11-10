import React from 'react'
import { motion } from 'framer-motion'
import { Bookmark, Plus } from 'lucide-react'

interface EmptyBookmarksViewProps {
  search: string
  isDark: boolean
  onOpenAddModal: () => void
}

export const EmptyBookmarksView: React.FC<EmptyBookmarksViewProps> = ({
  search,
  isDark,
  onOpenAddModal
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className={`flex-1 flex flex-col items-center justify-center p-12 border rounded-2xl text-center backdrop-blur-md shadow-sm ${
        isDark ? 'bg-[#222222]/40 border-[#333333]' : 'bg-white/70 border-[#e5e5e5]'
      }`}
    >
      <div
        className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-4 shadow-inner ${
          isDark
            ? 'bg-gradient-to-br from-[#2a2a2a] to-[#1c1c1c] text-[#0078d4] border border-[#383838]'
            : 'bg-gradient-to-br from-[#eef3f8] to-[#e1ebf4] text-[#0078d4] border border-[#d6e4f0]'
        }`}
      >
        <Bookmark className="w-8 h-8 opacity-90 stroke-[1.5]" />
      </div>
      <h3 className="text-base font-semibold m-0 tracking-tight">
        {search ? 'No Matching Bookmarks' : 'No Bookmarks Found'}
      </h3>
      <p className={`text-xs max-w-md mt-1.5 mb-5 leading-relaxed ${isDark ? 'text-[#888888]' : 'text-[#666666]'}`}>
        {search
          ? `No bookmarks match "${search}". Try another search term or click "Scan Browsers".`
          : 'Click "Scan Browsers" to discover bookmarks from installed Chrome, Edge, and Firefox profiles.'}
      </p>
      <button
        type="button"
        onClick={onOpenAddModal}
        className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-[#0078d4] hover:bg-[#106ebe] transition-all shadow-md shadow-[#0078d4]/20"
      >
        <Plus className="w-4 h-4" />
        <span>Create Bookmark</span>
      </button>
    </motion.div>
  )
}
