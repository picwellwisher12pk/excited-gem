import React from 'react'
import { motion } from 'framer-motion'
import { Globe } from 'lucide-react'
import type { ConnectedBrowser } from '../../../src/adapter/types'

interface BrowserStatusSectionProps {
  browsers: ConnectedBrowser[]
  isDark: boolean
}

export const BrowserStatusSection: React.FC<BrowserStatusSectionProps> = ({
  browsers,
  isDark
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.15 }}
      className={`p-5 rounded-2xl border backdrop-blur-md shadow-sm flex flex-col gap-4 ${
        isDark
          ? 'bg-[#222222]/70 border-[#333333]'
          : 'bg-white/80 border-[#e5e5e5]'
      }`}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isDark ? 'bg-[#2d2d2d] text-[#0078d4]' : 'bg-[#e6f4ff] text-[#0078d4]'
            }`}
          >
            <Globe className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold m-0">Browser Integration Status</h3>
            <p className={`text-xs m-0 mt-0.5 ${isDark ? 'text-[#888888]' : 'text-[#666666]'}`}>
              Multi-browser communication bridge and active instance monitoring.
            </p>
          </div>
        </div>

        <span
          className={`text-xs px-2.5 py-1 rounded-full font-medium flex items-center gap-1.5 ${
            browsers.length > 0
              ? 'bg-[#107c41]/10 text-[#107c41] border border-[#107c41]/20'
              : 'bg-[#d83b01]/10 text-[#d83b01] border border-[#d83b01]/20'
          }`}
        >
          <span
            className={`w-2 h-2 rounded-full ${
              browsers.length > 0 ? 'bg-[#107c41] animate-pulse' : 'bg-[#d83b01]'
            }`}
          />
          <span>
            {browsers.length > 0
              ? `${browsers.length} Connected`
              : 'Bridge Awaiting Connection'}
          </span>
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
        {['chrome', 'edge', 'firefox'].map((browserEngine) => {
          const detected = browsers.find(
            (b) => b.engine === browserEngine || b.id.toLowerCase().includes(browserEngine)
          )
          const engineNames: Record<string, string> = {
            chrome: 'Google Chrome',
            edge: 'Microsoft Edge',
            firefox: 'Mozilla Firefox'
          }
          const displayName = detected?.name || engineNames[browserEngine] || browserEngine

          return (
            <div
              key={browserEngine}
              className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                detected?.isConnected
                  ? isDark
                    ? 'bg-[#1e1e1e] border-[#107c41]/40 shadow-sm'
                    : 'bg-white border-[#107c41]/30 shadow-sm'
                  : isDark
                  ? 'bg-[#1b1b1b]/60 border-[#2d2d2d]'
                  : 'bg-[#fafafa] border-[#e8e8e8]'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-semibold">{displayName}</span>
                {detected?.isConnected ? (
                  <span className="text-[10px] bg-[#107c41]/20 text-[#107c41] px-2 py-0.5 rounded-full font-medium">
                    Active
                  </span>
                ) : (
                  <span className="text-[10px] bg-black/5 dark:bg-white/5 text-[#888888] px-2 py-0.5 rounded-full font-medium">
                    Standby
                  </span>
                )}
              </div>

              <div className="text-[11px] text-[#888888] flex items-center justify-between">
                <span>
                  {detected
                    ? `${detected.tabCount} tabs across ${detected.windowCount} win`
                    : 'Extension Bridge Ready'}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </motion.div>
  )
}
