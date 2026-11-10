import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

export type TabSizePreset = 'compact' | 'normal' | 'large' | 'xlarge' | 'custom'

export interface TabAppearanceSettings {
  fontSize: number // px for title
  iconSize: number // px for badges & icons
  preset: TabSizePreset
  setFontSize: (size: number) => void
  setIconSize: (size: number) => void
  applyPreset: (preset: Exclude<TabSizePreset, 'custom'>) => void
  resetDefaults: () => void
}

const PRESETS: Record<Exclude<TabSizePreset, 'custom'>, { fontSize: number; iconSize: number }> = {
  compact: { fontSize: 12, iconSize: 12 },
  normal: { fontSize: 13, iconSize: 14 },
  large: { fontSize: 15, iconSize: 16 },
  xlarge: { fontSize: 17, iconSize: 18 }
}

const DEFAULT_FONT_SIZE = 13
const DEFAULT_ICON_SIZE = 14

const TabAppearanceContext = createContext<TabAppearanceSettings>({
  fontSize: DEFAULT_FONT_SIZE,
  iconSize: DEFAULT_ICON_SIZE,
  preset: 'normal',
  setFontSize: () => {},
  setIconSize: () => {},
  applyPreset: () => {},
  resetDefaults: () => {}
})

function determinePreset(font: number, icon: number): TabSizePreset {
  for (const [key, val] of Object.entries(PRESETS)) {
    if (val.fontSize === font && val.iconSize === icon) {
      return key as TabSizePreset
    }
  }
  return 'custom'
}

export const TabAppearanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [fontSize, setFontSizeState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('excited_gem_tab_font_size')
      if (saved) {
        const parsed = parseInt(saved, 10)
        if (!isNaN(parsed) && parsed >= 10 && parsed <= 24) return parsed
      }
    } catch {}
    return DEFAULT_FONT_SIZE
  })

  const [iconSize, setIconSizeState] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('excited_gem_tab_icon_size')
      if (saved) {
        const parsed = parseInt(saved, 10)
        if (!isNaN(parsed) && parsed >= 10 && parsed <= 24) return parsed
      }
    } catch {}
    return DEFAULT_ICON_SIZE
  })

  const [preset, setPreset] = useState<TabSizePreset>(() => determinePreset(fontSize, iconSize))

  const setFontSize = useCallback((size: number) => {
    const clamped = Math.max(10, Math.min(24, Math.round(size)))
    setFontSizeState(clamped)
    try {
      localStorage.setItem('excited_gem_tab_font_size', String(clamped))
    } catch {}
  }, [])

  const setIconSize = useCallback((size: number) => {
    const clamped = Math.max(10, Math.min(24, Math.round(size)))
    setIconSizeState(clamped)
    try {
      localStorage.setItem('excited_gem_tab_icon_size', String(clamped))
    } catch {}
  }, [])

  useEffect(() => {
    setPreset(determinePreset(fontSize, iconSize))
  }, [fontSize, iconSize])

  const applyPreset = useCallback((p: Exclude<TabSizePreset, 'custom'>) => {
    const target = PRESETS[p]
    if (target) {
      setFontSizeState(target.fontSize)
      setIconSizeState(target.iconSize)
      try {
        localStorage.setItem('excited_gem_tab_font_size', String(target.fontSize))
        localStorage.setItem('excited_gem_tab_icon_size', String(target.iconSize))
      } catch {}
    }
  }, [])

  const resetDefaults = useCallback(() => {
    applyPreset('normal')
  }, [applyPreset])

  return (
    <TabAppearanceContext.Provider
      value={{
        fontSize,
        iconSize,
        preset,
        setFontSize,
        setIconSize,
        applyPreset,
        resetDefaults
      }}
    >
      {children}
    </TabAppearanceContext.Provider>
  )
}

export const useTabAppearance = () => useContext(TabAppearanceContext)

