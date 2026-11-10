import { useState, useEffect } from 'react'
import type { NotificationInstance } from 'antd/es/notification/interface'
import { launchBrowserWindow } from '../../services/desktopLauncher'
import { type SavedSession, SESSIONS_STORAGE_KEY } from './types'
import type { UnifiedWindow, ConnectedBrowser } from '../../../src/adapter/types'

export function useSessionsManager(
  api: NotificationInstance,
  connectedBrowsers: ConnectedBrowser[] = [],
  onCreateTab?: (browserId: string, windowId?: number, url?: string) => void
) {
  const [sessions, setSessions] = useState<SavedSession[]>([])

  useEffect(() => {
    try {
      const stored = localStorage.getItem(SESSIONS_STORAGE_KEY)
      if (stored) {
        setSessions(JSON.parse(stored))
      }
    } catch {
      // ignore
    }
  }, [])

  const saveSessions = (items: SavedSession[]) => {
    setSessions(items)
    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(items))
  }

  const saveCurrentSnapshot = (name: string, windows: UnifiedWindow[]) => {
    if (!windows || windows.length === 0) {
      api.warning({
        message: 'No Active Windows',
        description: 'Cannot save an empty session.'
      })
      return
    }

    const cleanName =
      name.trim() || `Workspace Snapshot ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`

    const newSession: SavedSession = {
      id: `session_${Date.now()}`,
      name: cleanName,
      timestamp: Date.now(),
      totalWindows: windows.length,
      totalTabs: windows.reduce((acc, w) => acc + w.tabs.length, 0),
      windows
    }

    const updated = [newSession, ...sessions]
    saveSessions(updated)

    api.success({
      message: 'Snapshot Saved',
      description: `Saved "${cleanName}" with ${newSession.totalTabs} tabs across ${newSession.totalWindows} windows.`
    })
  }

  const deleteSession = (id: string, name: string) => {
    const updated = sessions.filter((s) => s.id !== id)
    saveSessions(updated)
    api.info({
      message: 'Snapshot Deleted',
      description: `"${name}" was removed.`
    })
  }

  const restoreSingleWindow = async (win: UnifiedWindow) => {
    const urls = win.tabs.map((t) => t.url).filter((u) => u && !u.startsWith('chrome://'))
    if (urls.length === 0) return

    const isConnected = connectedBrowsers.some((b) => b.id === win.browserId)

    if (isConnected && onCreateTab) {
      for (const u of urls) {
        onCreateTab(win.browserId, undefined, u)
      }
      api.success({
        message: 'Window Restored',
        description: `Restored ${urls.length} tabs into active ${win.browserId}.`
      })
    } else {
      await launchBrowserWindow(win.browserId || 'chrome', urls)
      api.success({
        message: 'Window Launched',
        description: `Launched ${urls.length} tabs in ${win.browserId || 'browser'}.`
      })
    }
  }

  const restoreEntireSession = async (session: SavedSession) => {
    api.info({
      message: 'Restoring Session',
      description: `Restoring ${session.totalTabs} tabs across ${session.windows.length} windows...`
    })

    for (const win of session.windows) {
      await restoreSingleWindow(win)
    }
  }

  const exportSession = (session: SavedSession) => {
    try {
      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(session, null, 2))
      const downloadAnchor = document.createElement('a')
      downloadAnchor.setAttribute('href', dataStr)
      downloadAnchor.setAttribute(
        'download',
        `session_${session.name.replace(/[^a-z0-9_-]/gi, '_')}_${new Date().toISOString().slice(0, 10)}.json`
      )
      document.body.appendChild(downloadAnchor)
      downloadAnchor.click()
      downloadAnchor.remove()
    } catch {
      api.error({ message: 'Export Failed', description: 'Could not export session.' })
    }
  }

  const importSessions = (imported: SavedSession[]) => {
    const merged = [...imported, ...sessions]
    saveSessions(merged)
  }

  return {
    sessions,
    saveCurrentSnapshot,
    deleteSession,
    restoreSingleWindow,
    restoreEntireSession,
    exportSession,
    importSessions
  }
}
