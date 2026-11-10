import React from 'react'
import { motion } from 'framer-motion'
import { Keyboard, Info, Monitor, ShieldCheck } from 'lucide-react'
import { Select, Switch } from 'antd'

interface ShortcutsSectionProps {
  globalShortcut: string
  shortcutOptions: { value: string; label: string }[]
  minimizeToTray: boolean
  launchAtLogin: boolean
  isDark: boolean
  onShortcutChange: (val: string) => void
  onTrayChange: (val: boolean) => void
  onLaunchAtLoginChange: (val: boolean) => void
}

export const ShortcutsSection: React.FC<ShortcutsSectionProps> = ({
  globalShortcut,
  shortcutOptions,
  minimizeToTray,
  launchAtLogin,
  isDark,
  onShortcutChange,
  onTrayChange,
  onLaunchAtLoginChange
}) => {
  const renderShortcutBadges = (shortcut: string) => {
    if (shortcut === 'disabled') {
      return <span className="text-xs text-[#888888]">Disabled</span>
    }
    const parts = shortcut.replace('CommandOrControl', 'Ctrl').split('+')
    return (
      <div className="flex items-center gap-1">
        {parts.map((p) => (
          <kbd
            key={p}
            className={`px-2 py-0.5 rounded text-[11px] font-mono font-semibold shadow-sm border ${
              isDark
                ? 'bg-[#2b2b2b] border-[#3d3d3d] text-[#e0e0e0]'
                : 'bg-[#f0f0f0] border-[#d0d0d0] text-[#333333]'
            }`}
          >
            {p}
          </kbd>
        ))}
      </div>
    )
  }

  return (
    <>
      {/* Global Shortcut Row */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.05 }}
        className={`p-5 rounded-2xl border backdrop-blur-md shadow-sm flex flex-col gap-3.5 ${
          isDark
            ? 'bg-[#222222]/70 border-[#333333]'
            : 'bg-white/80 border-[#e5e5e5]'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDark ? 'bg-[#2d2d2d] text-[#60cdff]' : 'bg-[#e6f4ff] text-[#0078d4]'
              }`}
            >
              <Keyboard className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold m-0">Global Quick Switcher Shortcut</h3>
              <p className={`text-xs m-0 mt-0.5 ${isDark ? 'text-[#888888]' : 'text-[#666666]'}`}>
                Summon the Excited Gem window instantly from anywhere in your OS.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end sm:self-auto">
            {renderShortcutBadges(globalShortcut)}
            <Select
              value={globalShortcut}
              onChange={onShortcutChange}
              className="w-56"
              options={shortcutOptions}
            />
          </div>
        </div>

        <div
          className={`p-3 rounded-xl border text-xs flex items-center gap-2.5 ${
            isDark
              ? 'bg-[#1b1b1b]/80 border-[#2e2e2e] text-[#aaaaaa]'
              : 'bg-[#fafafa] border-[#e8e8e8] text-[#555555]'
          }`}
        >
          <Info className="w-4 h-4 text-[#0078d4] shrink-0" />
          <span>
            Shortcut is globally registered with the desktop OS window manager. Alt+Space is excluded to avoid OS conflicts.
          </span>
        </div>
      </motion.div>

      {/* Window & Background Preferences */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2, delay: 0.1 }}
        className={`p-5 rounded-2xl border backdrop-blur-md shadow-sm flex flex-col gap-4 ${
          isDark
            ? 'bg-[#222222]/70 border-[#333333]'
            : 'bg-white/80 border-[#e5e5e5]'
        }`}
      >
        <div className="flex items-center justify-between pb-3 border-b border-black/5 dark:border-white/5">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDark ? 'bg-[#2d2d2d] text-[#d83b01]' : 'bg-[#fff0ed] text-[#d83b01]'
              }`}
            >
              <Monitor className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold m-0">Minimize to System Tray</h3>
              <p className={`text-xs m-0 mt-0.5 ${isDark ? 'text-[#888888]' : 'text-[#666666]'}`}>
                Keep app running in the background tray when closing the main window.
              </p>
            </div>
          </div>
          <Switch checked={minimizeToTray} onChange={onTrayChange} />
        </div>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className={`w-8 h-8 rounded-lg flex items-center justify-center ${
                isDark ? 'bg-[#2d2d2d] text-[#107c41]' : 'bg-[#e6f9ed] text-[#107c41]'
              }`}
            >
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold m-0">Launch on System Startup</h3>
              <p className={`text-xs m-0 mt-0.5 ${isDark ? 'text-[#888888]' : 'text-[#666666]'}`}>
                Automatically start Excited Gem in tray when you log in.
              </p>
            </div>
          </div>
          <Switch checked={launchAtLogin} onChange={onLaunchAtLoginChange} />
        </div>
      </motion.div>
    </>
  )
}
