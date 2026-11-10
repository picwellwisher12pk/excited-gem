import React from 'react'
import { motion } from 'framer-motion'
import { Sparkles, ExternalLink } from 'lucide-react'
import pkg from '../../../../package.json'

interface AboutSectionProps {
  isDark: boolean
}

export const AboutSection: React.FC<AboutSectionProps> = ({ isDark }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.2 }}
      className={`p-4 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
        isDark
          ? 'bg-[#1b1b1b]/80 border-[#2d2d2d] text-[#777777]'
          : 'bg-[#f7f7f7] border-[#e8e8e8] text-[#666666]'
      }`}
    >
      <div className="flex items-center gap-2.5">
        <Sparkles className="w-4 h-4 text-[#0078d4]" />
        <div>
          <span className="font-semibold text-white/90 dark:text-white">Excited Gem Desktop</span>
          <span className="mx-2">•</span>
          <span>Multi-Browser Workspace & Tab Manager</span>
        </div>
      </div>

      <div className="flex items-center gap-3">
        <span
          className={`font-mono px-2.5 py-1 rounded-lg text-xs font-semibold ${
            isDark
              ? 'bg-[#282828] text-[#60cdff] border border-[#383838]'
              : 'bg-[#e6f4ff] text-[#0078d4] border border-[#bae0ff]'
          }`}
        >
          v{pkg.version}
        </span>

        <a
          href="https://github.com/picwellwisher12pk/excited-gem/releases"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-[#0078d4] hover:underline text-xs"
        >
          <span>Changelog</span>
          <ExternalLink className="w-3.5 h-3.5" />
        </a>
      </div>
    </motion.div>
  )
}
