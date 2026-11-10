import { useState, useEffect, useCallback, useMemo } from 'react'
import type { NotificationInstance } from 'antd/es/notification/interface'
import { fetchInstalledBrowserBookmarks } from '../../services/browserBookmarksService'
import { type BookmarkItem, STORAGE_KEY } from './types'

export function useBookmarksManager(api: NotificationInstance) {
  const [savedBookmarks, setSavedBookmarks] = useState<BookmarkItem[]>([])
  const [browserBookmarks, setBrowserBookmarks] = useState<BookmarkItem[]>([])
  const [isScanning, setIsScanning] = useState(false)

  // Load saved bookmarks from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY)
      if (stored) {
        setSavedBookmarks(JSON.parse(stored))
      }
    } catch {
      // ignore
    }
  }, [])

  // Scan installed browsers on mount
  const scanBrowsers = useCallback(async () => {
    setIsScanning(true)
    try {
      const reports = await fetchInstalledBrowserBookmarks()
      const collected: BookmarkItem[] = []
      for (const rep of reports) {
        for (const bm of rep.bookmarks) {
          collected.push({
            id: bm.id,
            title: bm.title,
            url: bm.url,
            folder: bm.folder || 'Bookmarks Bar',
            createdAt: bm.date_added || Date.now(),
            browser: rep.browser,
            profile: rep.profile,
            source: 'browser'
          })
        }
      }
      setBrowserBookmarks(collected)
    } finally {
      setIsScanning(false)
    }
  }, [])

  useEffect(() => {
    scanBrowsers()
  }, [scanBrowsers])

  const saveLocalBookmarks = (items: BookmarkItem[]) => {
    setSavedBookmarks(items)
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  }

  const allBookmarks = useMemo(() => {
    return [
      ...savedBookmarks.map((b) => ({ ...b, source: 'app' as const })),
      ...browserBookmarks
    ]
  }, [savedBookmarks, browserBookmarks])

  const addBookmark = (title: string, url: string, folder: string) => {
    if (!url.trim()) {
      api.error({ message: 'URL required', description: 'Please provide a valid URL.' })
      return false
    }

    let formattedUrl = url.trim()
    if (!/^https?:\/\//i.test(formattedUrl)) {
      formattedUrl = `https://${formattedUrl}`
    }

    const cleanTitle = title.trim() || new URL(formattedUrl).hostname
    const newItem: BookmarkItem = {
      id: `bm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: cleanTitle,
      url: formattedUrl,
      folder,
      createdAt: Date.now(),
      source: 'app'
    }

    saveLocalBookmarks([newItem, ...savedBookmarks])
    api.success({
      message: 'Bookmark Saved',
      description: `"${cleanTitle}" has been added to ${folder}.`
    })
    return true
  }

  const deleteBookmark = (id: string, title: string) => {
    const next = savedBookmarks.filter((b) => b.id !== id)
    saveLocalBookmarks(next)
    api.info({
      message: 'Bookmark Removed',
      description: `"${title}" was removed from your bookmarks.`
    })
  }

  const saveToFavorites = (bm: BookmarkItem) => {
    if (savedBookmarks.some((b) => b.url === bm.url)) {
      api.info({
        message: 'Already in Favorites',
        description: `"${bm.title}" is already in your app favorites.`
      })
      return
    }
    const newItem: BookmarkItem = {
      id: `bm-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      title: bm.title,
      url: bm.url,
      folder: 'Favorites',
      createdAt: Date.now(),
      browser: bm.browser,
      profile: bm.profile,
      source: 'app'
    }
    saveLocalBookmarks([newItem, ...savedBookmarks])
    api.success({
      message: 'Saved to Favorites',
      description: `"${bm.title}" added to Excited Gem favorites.`
    })
  }

  return {
    savedBookmarks,
    browserBookmarks,
    allBookmarks,
    isScanning,
    scanBrowsers,
    saveLocalBookmarks,
    addBookmark,
    deleteBookmark,
    saveToFavorites
  }
}
