import { useState, useEffect } from 'react'
import type { NotificationInstance } from 'antd/es/notification/interface'
import { launchBrowserWindow } from '../../services/desktopLauncher'
import { SESSIONS_STORAGE_KEY } from '../sessions/types'
import { type CustomRoutine, type RoutineStatus, CUSTOM_ROUTINES_KEY } from './types'
import type { UnifiedWindow } from '../../../src/adapter/types'

export function useRoutinesManager(
  api: NotificationInstance,
  windows: UnifiedWindow[],
  onDiscardTab: (browserId: string, tabId: number) => void,
  onCloseTab: (browserId: string, tabId: number) => void
) {
  const [customRoutines, setCustomRoutines] = useState<CustomRoutine[]>([])
  const [routineStatus, setRoutineStatus] = useState<Record<string, RoutineStatus>>({})

  useEffect(() => {
    try {
      const stored = localStorage.getItem(CUSTOM_ROUTINES_KEY)
      if (stored) {
        setCustomRoutines(JSON.parse(stored))
      }
    } catch {
      // ignore
    }
  }, [])

  const saveCustomRoutines = (items: CustomRoutine[]) => {
    setCustomRoutines(items)
    localStorage.setItem(CUSTOM_ROUTINES_KEY, JSON.stringify(items))
  }

  const runWithAnimation = async (id: string, action: () => Promise<void> | void) => {
    setRoutineStatus((prev) => ({ ...prev, [id]: 'running' }))
    await new Promise((r) => setTimeout(r, 600))
    await action()
    setRoutineStatus((prev) => ({ ...prev, [id]: 'done' }))
    setTimeout(() => {
      setRoutineStatus((prev) => ({ ...prev, [id]: 'idle' }))
    }, 2000)
  }

  const handleRunMemorySaver = () => {
    let suspended = 0
    windows.forEach((win) => {
      win.tabs.forEach((tab) => {
        if (!tab.active && !tab.audible && !tab.pinned && !tab.discarded) {
          onDiscardTab(win.browserId, tab.id)
          suspended++
        }
      })
    })

    api.success({
      message: 'Memory Saver Completed',
      description: `Suspended ${suspended} inactive tabs across all browsers.`
    })
  }

  const handleRunDeduplication = () => {
    const seen = new Set<string>()
    let closed = 0

    windows.forEach((win) => {
      win.tabs.forEach((tab) => {
        if (tab.url && tab.url !== 'about:blank') {
          if (seen.has(tab.url) && !tab.active && !tab.pinned) {
            onCloseTab(win.browserId, tab.id)
            closed++
          } else {
            seen.add(tab.url)
          }
        }
      })
    })

    api.success({
      message: 'Deduplication Completed',
      description: `Closed ${closed} duplicate tabs across your browsers.`
    })
  }

  const handleRunFocusMode = () => {
    const distractionPatterns = [
      'youtube.com',
      'twitter.com',
      'x.com',
      'reddit.com',
      'twitch.tv',
      'instagram.com',
      'facebook.com',
      'tiktok.com',
      'netflix.com'
    ]

    let silenced = 0
    windows.forEach((win) => {
      win.tabs.forEach((tab) => {
        const isDistraction = distractionPatterns.some((pattern) => tab.url.includes(pattern))
        if (isDistraction && !tab.pinned && !tab.discarded) {
          onDiscardTab(win.browserId, tab.id)
          silenced++
        }
      })
    })

    api.success({
      message: 'Focus Mode Activated',
      description: `Suspended ${silenced} social & media distraction tabs.`
    })
  }

  const handleRunEndOfDay = () => {
    const dateStr = new Date().toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric'
    })
    const snapshotName = `End of Day (${dateStr})`

    const newSession = {
      id: `session_${Date.now()}`,
      name: snapshotName,
      timestamp: Date.now(),
      totalWindows: windows.length,
      totalTabs: windows.reduce((acc, w) => acc + w.tabs.length, 0),
      windows
    }

    try {
      const stored = localStorage.getItem(SESSIONS_STORAGE_KEY)
      const existing = stored ? JSON.parse(stored) : []
      localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify([newSession, ...existing]))
    } catch {
      // ignore
    }

    // Suspend inactive tabs
    let suspended = 0
    windows.forEach((win) => {
      win.tabs.forEach((tab) => {
        if (!tab.pinned && !tab.discarded) {
          onDiscardTab(win.browserId, tab.id)
          suspended++
        }
      })
    })

    api.success({
      message: 'End-of-Day Archived',
      description: `Saved snapshot "${snapshotName}" and suspended ${suspended} tabs.`
    })
  }

  const handleRunCustomRoutine = async (routine: CustomRoutine) => {
    if (routine.urls.length === 0) return
    await launchBrowserWindow(routine.targetBrowser || 'chrome', routine.urls)
    api.success({
      message: `Routine Executed: ${routine.name}`,
      description: `Launched ${routine.urls.length} tabs in ${routine.targetBrowser || 'browser'}.`
    })
  }

  const addCustomRoutine = (routine: CustomRoutine) => {
    const updated = [routine, ...customRoutines]
    saveCustomRoutines(updated)
    api.success({ message: 'Custom Routine Created', description: `Added "${routine.name}".` })
  }

  const deleteCustomRoutine = (id: string) => {
    const updated = customRoutines.filter((r) => r.id !== id)
    saveCustomRoutines(updated)
  }

  return {
    customRoutines,
    routineStatus,
    runWithAnimation,
    handleRunMemorySaver,
    handleRunDeduplication,
    handleRunFocusMode,
    handleRunEndOfDay,
    handleRunCustomRoutine,
    addCustomRoutine,
    deleteCustomRoutine
  }
}
