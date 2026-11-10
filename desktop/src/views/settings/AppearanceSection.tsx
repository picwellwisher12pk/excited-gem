import React from 'react'
import { motion } from 'framer-motion'
import { Sun, Moon, CheckCircle2, Type, Youtube, CircleDashed, RotateCcw } from 'lucide-react'
import { useTabAppearance } from '../workspace/TabAppearanceContext'

interface AppearanceSectionProps {
  themeMode: 'dark' | 'light'
  isDark: boolean
  onSetTheme: (mode: 'dark' | 'light') => void
}

export const AppearanceSection: React.FC<AppearanceSectionProps> = ({
  themeMode,
  isDark,
  onSetTheme
}) => {
  const { fontSize, iconSize, preset, setFontSize, setIconSize, applyPreset, resetDefaults } = useTabAppearance()
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      className={`p-5 rounded-2xl border backdrop-blur-md shadow-sm flex flex-col gap-4 ${
        isDark
          ? 'bg-[#222222]/70 border-[#333333]'
          : 'bg-white/80 border-[#e5e5e5]'
      }`}
    >
      <div className="flex items-center gap-3">
        <div
          className={`w-8 h-8 rounded-lg flex items-center justify-center ${
            isDark ? 'bg-[#2d2d2d] text-[#f0c000]' : 'bg-[#fff7e6] text-[#fa8c16]'
          }`}
        >
          <Sun className="w-4 h-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold m-0">Appearance & Theme</h3>
          <p className={`text-xs m-0 mt-0.5 ${isDark ? 'text-[#888888]' : 'text-[#666666]'}`}>
            Customize visual aesthetics between Windows 11 Fluent Dark or Light theme.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
        {/* Dark Mode Card */}
        <button
          type="button"
          onClick={() => onSetTheme('dark')}
          className={`group relative flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-all ${
            themeMode === 'dark'
              ? 'border-[#0078d4] bg-[#2a2a2a] ring-2 ring-[#0078d4]/30 shadow-md'
              : isDark
              ? 'border-[#333333] bg-[#1c1c1c]/60 hover:bg-[#252525]'
              : 'border-[#e0e0e0] bg-[#f9f9f9] hover:bg-[#f0f0f0]'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-[#141414] border border-[#333333] flex items-center justify-center text-[#f0c000] shadow-inner shrink-0">
            <Moon className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${themeMode === 'dark' ? 'text-[#60cdff]' : ''}`}>
                Fluent Dark
              </span>
              {themeMode === 'dark' && <CheckCircle2 className="w-4 h-4 text-[#0078d4]" />}
            </div>
            <p className="text-[11px] text-[#888888] m-0 mt-0.5">
              Low eye-strain dark palette with acrylic depth
            </p>
          </div>
        </button>

        {/* Light Mode Card */}
        <button
          type="button"
          onClick={() => onSetTheme('light')}
          className={`group relative flex items-center gap-3.5 p-3.5 rounded-xl border text-left transition-all ${
            themeMode === 'light'
              ? 'border-[#0078d4] bg-[#f0f7ff] ring-2 ring-[#0078d4]/30 shadow-md'
              : isDark
              ? 'border-[#333333] bg-[#1c1c1c]/60 hover:bg-[#252525]'
              : 'border-[#e0e0e0] bg-[#f9f9f9] hover:bg-[#f0f0f0]'
          }`}
        >
          <div className="w-10 h-10 rounded-xl bg-white border border-[#d0d0d0] flex items-center justify-center text-[#fa8c16] shadow-inner shrink-0">
            <Sun className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <span className={`text-xs font-semibold ${themeMode === 'light' ? 'text-[#0078d4]' : ''}`}>
                Fluent Light
              </span>
              {themeMode === 'light' && <CheckCircle2 className="w-4 h-4 text-[#0078d4]" />}
            </div>
            <p className="text-[11px] text-[#666666] m-0 mt-0.5">
              Clean, high-clarity daylight aesthetic
            </p>
          </div>
        </button>
      </div>

      {/* Tab Sizing & Typography Controls */}
      <div className={`mt-2 pt-4 border-t flex flex-col gap-4 ${isDark ? 'border-[#333333]' : 'border-[#e5e5e5]'}`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                isDark ? 'bg-[#2d2d2d] text-[#60cdff]' : 'bg-[#e6f4ff] text-[#0078d4]'
              }`}
            >
              <Type className="w-4 h-4" />
            </div>
            <div>
              <h4 className="text-xs font-semibold m-0">Tab List Typography & Icon Sizing</h4>
              <p className={`text-[11px] m-0 mt-0.5 ${isDark ? 'text-[#888888]' : 'text-[#666666]'}`}>
                Tweak title font size, badge scale, and icon sizes across workspace tab lists.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={resetDefaults}
            className={`flex items-center gap-1 text-xs px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
              isDark
                ? 'bg-[#2a2a2a] border-[#3a3a3a] text-[#888888] hover:text-white'
                : 'bg-[#f5f5f5] border-[#dcdcdc] text-[#666666] hover:text-black'
            }`}
          >
            <RotateCcw className="w-3 h-3" />
            <span>Reset Defaults</span>
          </button>
        </div>

        {/* Size Presets */}
        <div className="flex flex-col gap-1.5">
          <span className={`text-[11px] font-medium ${isDark ? 'text-[#aaaaaa]' : 'text-[#555555]'}`}>
            Size Presets
          </span>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {(['compact', 'normal', 'large', 'xlarge'] as const).map((p) => {
              const active = preset === p
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => applyPreset(p)}
                  className={`py-2 px-3 rounded-xl border text-xs font-medium capitalize transition-all cursor-pointer ${
                    active
                      ? 'border-[#0078d4] bg-[#0078d4]/10 text-[#0078d4] dark:text-[#60cdff] ring-1 ring-[#0078d4]/30'
                      : isDark
                      ? 'border-[#333333] bg-[#1a1a1a] hover:bg-[#252525] text-[#cccccc]'
                      : 'border-[#e0e0e0] bg-[#f9f9f9] hover:bg-[#f0f0f0] text-[#333333]'
                  }`}
                >
                  {p === 'xlarge' ? 'Extra Large' : p}
                </button>
              )
            })}
          </div>
        </div>

        {/* Sliders Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${isDark ? 'text-[#aaaaaa]' : 'text-[#555555]'}`}>
                Title Font Size
              </span>
              <span className="font-mono font-semibold text-[#0078d4] dark:text-[#60cdff]">
                {fontSize}px
              </span>
            </div>
            <input
              type="range"
              min={11}
              max={22}
              step={1}
              value={fontSize}
              onChange={(e) => setFontSize(Number(e.target.value))}
              className="w-full accent-[#0078d4] cursor-pointer h-2 rounded-lg bg-zinc-300 dark:bg-zinc-700"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className={`font-medium ${isDark ? 'text-[#aaaaaa]' : 'text-[#555555]'}`}>
                Badge & Icon Size
              </span>
              <span className="font-mono font-semibold text-[#0078d4] dark:text-[#60cdff]">
                {iconSize}px
              </span>
            </div>
            <input
              type="range"
              min={11}
              max={24}
              step={1}
              value={iconSize}
              onChange={(e) => setIconSize(Number(e.target.value))}
              className="w-full accent-[#0078d4] cursor-pointer h-2 rounded-lg bg-zinc-300 dark:bg-zinc-700"
            />
          </div>
        </div>

        {/* Live Preview Card */}
        <div
          className={`p-3 rounded-xl border flex items-center gap-3 ${
            isDark ? 'bg-[#181818] border-[#333333]' : 'bg-[#f8f9fa] border-[#e5e5e5]'
          }`}
        >
          <div
            className="rounded bg-red-600 flex items-center justify-center text-white shrink-0 font-bold"
            style={{
              width: `${Math.max(16, Math.round(iconSize * 1.15))}px`,
              height: `${Math.max(16, Math.round(iconSize * 1.15))}px`,
              fontSize: `${Math.max(9, Math.round(iconSize * 0.6))}px`
            }}
          >
            ▶
          </div>

          <div className="flex-1 min-w-0 flex flex-col justify-center">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="font-semibold truncate"
                style={{
                  fontSize: `${fontSize}px`,
                  color: isDark ? '#ffffff' : '#111111'
                }}
              >
                Quantum Mechanics Eyes-On Experiment - YouTube
              </span>

              <span
                className="flex items-center gap-1 font-mono rounded bg-red-500/10 text-red-500 font-semibold shrink-0 border border-red-500/20"
                style={{
                  fontSize: `${Math.max(10, Math.round(fontSize * 0.8))}px`,
                  padding: `${Math.max(1, Math.round(iconSize * 0.1))}px ${Math.max(4, Math.round(iconSize * 0.35))}px`
                }}
              >
                <Youtube size={iconSize} className="shrink-0" />
                <span>12:45</span>
              </span>

              <span
                className={`flex items-center gap-1 font-mono rounded shrink-0 font-medium border ${
                  isDark ? 'bg-zinc-800 text-zinc-400 border-zinc-700' : 'bg-zinc-200 text-zinc-600 border-zinc-300'
                }`}
                style={{
                  fontSize: `${Math.max(10, Math.round(fontSize * 0.8))}px`,
                  padding: `${Math.max(1, Math.round(iconSize * 0.1))}px ${Math.max(4, Math.round(iconSize * 0.35))}px`
                }}
              >
                <CircleDashed size={iconSize} strokeWidth={1.75} />
                <span>sleep</span>
              </span>
            </div>

            <span
              className="truncate font-mono"
              style={{
                fontSize: `${Math.max(10, Math.round(fontSize * 0.85))}px`,
                color: isDark ? '#888888' : '#777777'
              }}
            >
              https://www.youtube.com/watch?v=KfODG5Reyss
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  )
}
