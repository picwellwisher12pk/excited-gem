import React, { useState, useMemo } from 'react'
import { notification } from 'antd'
import { AnimatePresence } from 'framer-motion'
import { useTheme } from '../theme/ThemeContext'
import { BookmarkCard } from './bookmarks/BookmarkCard'
import { BookmarkFolderNav } from './bookmarks/BookmarkFolderNav'
import { BrowserFilterNav } from './bookmarks/BrowserFilterNav'
import { AddBookmarkModal } from './bookmarks/AddBookmarkModal'
import { BookmarkToolbar } from './bookmarks/BookmarkToolbar'
import { EmptyBookmarksView } from './bookmarks/EmptyBookmarksView'
import { useBookmarksManager } from './bookmarks/useBookmarksManager'
import { launchBrowserUrl } from '../services/desktopLauncher'
import {
  type BookmarksViewProps,
  DEFAULT_FOLDERS
} from './bookmarks/types'

export type { BookmarkItem, BookmarksViewProps } from './bookmarks/types'

export const BookmarksView: React.FC<BookmarksViewProps> = ({
  onOpenUrl,
  windows = []
}) => {
  const { isDark } = useTheme()
  const [api, contextHolder] = notification.useNotification()

  const {
    savedBookmarks,
    browserBookmarks,
    allBookmarks,
    isScanning,
    scanBrowsers,
    saveLocalBookmarks,
    addBookmark,
    deleteBookmark,
    saveToFavorites
  } = useBookmarksManager(api)

  const [search, setSearch] = useState('')
  const [activeBrowser, setActiveBrowser] = useState('All Browsers')
  const [activeProfile, setActiveProfile] = useState('All Profiles')
  const [activeFolder, setActiveFolder] = useState('All')
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newUrl, setNewUrl] = useState('')
  const [newFolder, setNewFolder] = useState('Favorites')
  const [selectedFromTab, setSelectedFromTab] = useState<string>('')

  // Available browsers
  const availableBrowsers = useMemo(() => {
    const set = new Set<string>(['All Browsers'])
    browserBookmarks.forEach((b) => {
      if (b.browser) set.add(b.browser)
    })
    set.add('App Favorites')
    return Array.from(set)
  }, [browserBookmarks])

  // Available profiles for current activeBrowser
  const availableProfiles = useMemo(() => {
    if (activeBrowser === 'All Browsers' || activeBrowser === 'App Favorites') return []
    const set = new Set<string>(['All Profiles'])
    browserBookmarks
      .filter((b) => b.browser === activeBrowser)
      .forEach((b) => {
        if (b.profile) set.add(b.profile)
      })
    return Array.from(set)
  }, [browserBookmarks, activeBrowser])

  // Collect unique open tabs for quick bookmarking
  const openTabs = useMemo(() => {
    const list: { title: string; url: string; favIconUrl?: string }[] = []
    const seen = new Set<string>()
    for (const win of windows) {
      for (const tab of win.tabs) {
        if (tab.url && !tab.url.startsWith('chrome://') && !seen.has(tab.url)) {
          seen.add(tab.url)
          list.push({ title: tab.title, url: tab.url, favIconUrl: tab.favIconUrl })
        }
      }
    }
    return list
  }, [windows])

  const handleAddSubmit = () => {
    const success = addBookmark(newTitle, newUrl, newFolder)
    if (success) {
      setIsAddModalOpen(false)
      setNewTitle('')
      setNewUrl('')
      setSelectedFromTab('')
    }
  }

  const filteredBookmarks = useMemo(() => {
    const query = search.toLowerCase()
    return allBookmarks.filter((b) => {
      const matchesSearch =
        search === '' ||
        b.title.toLowerCase().includes(query) ||
        b.url.toLowerCase().includes(query) ||
        (b.browser && b.browser.toLowerCase().includes(query)) ||
        b.folder.toLowerCase().includes(query)

      const matchesBrowser =
        activeBrowser === 'All Browsers' ||
        (activeBrowser === 'App Favorites' ? b.source === 'app' : b.browser === activeBrowser)

      const matchesProfile =
        activeProfile === 'All Profiles' || b.profile === activeProfile

      const matchesFolder = activeFolder === 'All' || b.folder === activeFolder

      return matchesSearch && matchesBrowser && matchesProfile && matchesFolder
    })
  }, [allBookmarks, search, activeBrowser, activeProfile, activeFolder])

  const folders = useMemo(() => {
    const set = new Set<string>(DEFAULT_FOLDERS)
    allBookmarks.forEach((b) => {
      if (b.folder) set.add(b.folder)
    })
    return Array.from(set)
  }, [allBookmarks])

  return (
    <div
      className={`flex-1 overflow-y-auto p-6 flex flex-col gap-5 max-w-6xl font-sans transition-colors ${
        isDark ? 'bg-[#181818] text-white' : 'bg-[#f4f4f4] text-[#1a1a1a]'
      }`}
    >
      {contextHolder}

      {/* Header Toolbar */}
      <BookmarkToolbar
        search={search}
        viewMode={viewMode}
        isDark={isDark}
        bookmarks={allBookmarks}
        isScanning={isScanning}
        totalScannedCount={browserBookmarks.length}
        onSearchChange={setSearch}
        onViewModeChange={setViewMode}
        onOpenAddModal={() => setIsAddModalOpen(true)}
        onImportBookmarks={(items) => saveLocalBookmarks([...items, ...savedBookmarks])}
        onScanBrowsers={scanBrowsers}
      />

      {/* Browser Filter Navigator */}
      <BrowserFilterNav
        browsers={availableBrowsers}
        activeBrowser={activeBrowser}
        activeProfile={activeProfile}
        availableProfiles={availableProfiles}
        bookmarks={allBookmarks}
        isDark={isDark}
        onSelectBrowser={(b) => {
          setActiveBrowser(b)
          setActiveProfile('All Profiles')
        }}
        onSelectProfile={setActiveProfile}
      />

      {/* Folders Filter Pills */}
      <BookmarkFolderNav
        folders={folders}
        activeFolder={activeFolder}
        bookmarks={allBookmarks}
        isDark={isDark}
        onSelectFolder={setActiveFolder}
      />

      {/* Bookmarks Grid / List */}
      {filteredBookmarks.length === 0 ? (
        <EmptyBookmarksView
          search={search}
          isDark={isDark}
          onOpenAddModal={() => setIsAddModalOpen(true)}
        />
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          <AnimatePresence>
            {filteredBookmarks.slice(0, 150).map((bm, idx) => (
              <BookmarkCard
                key={bm.id}
                bookmark={bm}
                viewMode="grid"
                index={idx}
                isDark={isDark}
                onOpenUrl={onOpenUrl}
                onDeleteBookmark={deleteBookmark}
                onSaveToFavorites={saveToFavorites}
                onLaunchInBrowser={launchBrowserUrl}
              />
            ))}
          </AnimatePresence>
        </div>
      ) : (
        <div
          className={`rounded-xl border overflow-hidden backdrop-blur-sm shadow-sm ${
            isDark ? 'bg-[#222222]/70 border-[#333333]' : 'bg-white/80 border-[#e5e5e5]'
          }`}
        >
          <AnimatePresence>
            {filteredBookmarks.slice(0, 150).map((bm, idx) => (
              <BookmarkCard
                key={bm.id}
                bookmark={bm}
                viewMode="list"
                index={idx}
                isDark={isDark}
                onOpenUrl={onOpenUrl}
                onDeleteBookmark={deleteBookmark}
                onSaveToFavorites={saveToFavorites}
                onLaunchInBrowser={launchBrowserUrl}
              />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Add Bookmark Modal */}
      <AddBookmarkModal
        visible={isAddModalOpen}
        folders={folders}
        openTabs={openTabs}
        newTitle={newTitle}
        newUrl={newUrl}
        newFolder={newFolder}
        selectedFromTab={selectedFromTab}
        onClose={() => {
          setIsAddModalOpen(false)
          setSelectedFromTab('')
        }}
        onSave={handleAddSubmit}
        onTitleChange={setNewTitle}
        onUrlChange={setNewUrl}
        onFolderChange={setNewFolder}
        onSelectTab={(url) => {
          setSelectedFromTab(url)
          const match = openTabs.find((t) => t.url === url)
          if (match) {
            setNewUrl(match.url)
            setNewTitle(match.title)
          }
        }}
      />
    </div>
  )
}
