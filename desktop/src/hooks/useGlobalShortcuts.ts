import { useEffect } from 'react'
import type { DesktopNavView } from '../components/DesktopSidebar'

interface UseGlobalShortcutsProps {
  onToggleShortcutsHelp: () => void
  onOpenShortcutsHelp: () => void
  onSelectView: (view: DesktopNavView) => void
  onOpenCommandPalette: () => void
}

export function useGlobalShortcuts({
  onToggleShortcutsHelp,
  onOpenShortcutsHelp,
  onSelectView,
  onOpenCommandPalette
}: UseGlobalShortcutsProps) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement
      const isInput =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable)

      // Ctrl + / or ? toggles shortcuts modal
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault()
        onToggleShortcutsHelp()
        return
      }
      if (e.key === '?' && !isInput) {
        e.preventDefault()
        onOpenShortcutsHelp()
        return
      }

      // Ctrl + K → Command Palette
      if ((e.ctrlKey || e.metaKey) && (e.key === 'k' || e.key === 'K')) {
        e.preventDefault()
        onOpenCommandPalette()
        return
      }

      // View switching Ctrl + 1..6
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        if (e.key === '1') {
          e.preventDefault()
          onSelectView('workspace')
        } else if (e.key === '2') {
          e.preventDefault()
          onSelectView('analytics')
        } else if (e.key === '3') {
          e.preventDefault()
          onSelectView('bookmarks')
        } else if (e.key === '4') {
          e.preventDefault()
          onSelectView('routines')
        } else if (e.key === '5') {
          e.preventDefault()
          onSelectView('sessions')
        } else if (e.key === '6') {
          e.preventDefault()
          onSelectView('settings')
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)

    const handleContextMenu = (e: MouseEvent) => {
      // Suppress default webview context menu globally
      e.preventDefault()
    }
    window.addEventListener('contextmenu', handleContextMenu)

    return () => {
      window.removeEventListener('keydown', handleKeyDown)
      window.removeEventListener('contextmenu', handleContextMenu)
    }
  }, [onToggleShortcutsHelp, onOpenShortcutsHelp, onSelectView, onOpenCommandPalette])
}
