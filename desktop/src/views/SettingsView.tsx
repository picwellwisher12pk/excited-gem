import React, { useState } from 'react'
import { Settings } from 'lucide-react'
import { notification } from 'antd'
import { useTheme } from '../theme/ThemeContext'
import { AppearanceSection } from './settings/AppearanceSection'
import { YoutubeSettingsSection } from './settings/YoutubeSettingsSection'
import { ShortcutsSection } from './settings/ShortcutsSection'
import { BrowserStatusSection } from './settings/BrowserStatusSection'
import { AboutSection } from './settings/AboutSection'
import type { ConnectedBrowser } from '../../src/adapter/types'

interface SettingsViewProps {
  browsers: ConnectedBrowser[]
}

const SHORTCUT_OPTIONS = [
  { value: 'CommandOrControl+Shift+E', label: 'Ctrl + Shift + E (Default)' },
  { value: 'CommandOrControl+Alt+E', label: 'Ctrl + Alt + E' },
  { value: 'Alt+Shift+E', label: 'Alt + Shift + E' },
  { value: 'F10', label: 'F10' },
  { value: 'disabled', label: 'Disabled' }
]

export const SettingsView: React.FC<SettingsViewProps> = ({ browsers }) => {
  const { themeMode, isDark, setTheme } = useTheme()
  const [globalShortcut, setGlobalShortcut] = useState(
    () => localStorage.getItem('excited_gem_global_shortcut') || 'CommandOrControl+Shift+E'
  )
  const [minimizeToTray, setMinimizeToTray] = useState(
    () => localStorage.getItem('excited_gem_minimize_tray') !== 'false'
  )
  const [launchAtLogin, setLaunchAtLogin] = useState(
    () => localStorage.getItem('excited_gem_launch_login') === 'true'
  )
  const [api, contextHolder] = notification.useNotification()

  const handleShortcutChange = (val: string) => {
    setGlobalShortcut(val)
    localStorage.setItem('excited_gem_global_shortcut', val)
    api.success({
      message: 'Global Shortcut Updated',
      description: `Quick switcher shortcut set to "${val}".`,
      placement: 'bottomRight'
    })
  }

  const handleTrayChange = (val: boolean) => {
    setMinimizeToTray(val)
    localStorage.setItem('excited_gem_minimize_tray', String(val))
  }

  const handleLaunchAtLoginChange = (val: boolean) => {
    setLaunchAtLogin(val)
    localStorage.setItem('excited_gem_launch_login', String(val))
  }

  return (
    <div
      className={`flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-4xl font-sans transition-colors ${
        isDark ? 'bg-[#181818] text-white' : 'bg-[#f4f4f4] text-[#1a1a1a]'
      }`}
    >
      {contextHolder}

      {/* Header */}
      <div>
        <div className="flex items-center gap-2.5">
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shadow-sm ${
              isDark
                ? 'bg-gradient-to-br from-[#0078d4]/30 to-[#005a9e]/20 text-[#60cdff] border border-[#0078d4]/30'
                : 'bg-gradient-to-br from-[#0078d4]/10 to-[#0078d4]/20 text-[#0078d4] border border-[#0078d4]/20'
            }`}
          >
            <Settings className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight m-0">Settings</h2>
            <p className={`text-xs m-0 mt-0.5 ${isDark ? 'text-[#888888]' : 'text-[#666666]'}`}>
              Application preferences, theme appearance, hotkeys, and browser connections.
            </p>
          </div>
        </div>
      </div>

      {/* Appearance Section */}
      <AppearanceSection
        themeMode={themeMode}
        isDark={isDark}
        onSetTheme={setTheme}
      />

      {/* YouTube Video Duration & API Key */}
      <YoutubeSettingsSection isDark={isDark} />

      {/* Shortcuts & Background Section */}
      <ShortcutsSection
        globalShortcut={globalShortcut}
        shortcutOptions={SHORTCUT_OPTIONS}
        minimizeToTray={minimizeToTray}
        launchAtLogin={launchAtLogin}
        isDark={isDark}
        onShortcutChange={handleShortcutChange}
        onTrayChange={handleTrayChange}
        onLaunchAtLoginChange={handleLaunchAtLoginChange}
      />

      {/* Connected Browsers Real Status */}
      <BrowserStatusSection browsers={browsers} isDark={isDark} />

      {/* App Version Info & Updates */}
      <AboutSection isDark={isDark} />
    </div>
  )
}
