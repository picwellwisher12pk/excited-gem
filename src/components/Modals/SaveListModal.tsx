import {
  Modal,
  Input,
  Radio,
  Select,
  Checkbox,
  Space,
  Typography,
  Tag,
  Alert,
  TreeSelect,
  Button,
  Tooltip,
  message
} from 'antd'
import {
  BookmarkPlus,
  FolderOpen,
  Library as LibraryIcon,
  Bookmark,
  HardDrive,
  CheckCircle2,
  Search,
  X,
  CheckSquare,
  Square
} from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'
// @ts-ignore
import {
  getLists,
  saveList,
  saveListAsBookmarks
} from '../../components/getsetSessions'
import { clearSelectedTabs } from '../../store/tabSlice'

const { Text } = Typography
const browserApi = (typeof window !== 'undefined' && (window as any).browser) || chrome

interface TabData {
  id: number
  url: string
  title: string
  favIconUrl?: string
  windowId?: number
}

interface ListItem {
  id: string
  name: string
  created: number
  tabs: { url: string; title: string }[]
}

interface Library {
  id: string
  name: string
  created: number
  lists: ListItem[]
}

interface BookmarkNode {
  id: string
  parentId?: string
  title: string
  url?: string
  children?: BookmarkNode[]
}

interface SaveListModalProps {
  open: boolean
  selectedTabIds: number[]
  onClose: () => void
  onSaved?: () => void
}

function buildBookmarkTree(nodes: BookmarkNode[]): any[] {
  return nodes
    .filter((n) => !n.url) // folders only
    .map((n) => ({
      title: n.title || 'Bookmarks Bar',
      value: n.id,
      key: n.id,
      children: n.children ? buildBookmarkTree(n.children) : []
    }))
}

export function SaveListModal({
  open,
  selectedTabIds,
  onClose,
  onSaved
}: SaveListModalProps) {
  const dispatch = useDispatch()
  const { tabs } = useSelector((state: any) => state.tabs)

  // Configuration states
  const [storageType, setStorageType] = useState<'extension' | 'bookmarks'>('extension')
  const [listName, setListName] = useState('')
  const [libraryMode, setLibraryMode] = useState<'new' | 'existing'>('new')
  const [newLibraryName, setNewLibraryName] = useState('')
  const [existingLibraryId, setExistingLibraryId] = useState<string | null>(null)
  const [listMode, setListMode] = useState<'new' | 'existing'>('new')
  const [existingListId, setExistingListId] = useState<string | null>(null)

  // Bookmarks specific states
  const [bookmarkFolders, setBookmarkFolders] = useState<any[]>([])
  const [selectedBookmarkParent, setSelectedBookmarkParent] = useState<string>('1')
  const [bookmarkLibraryName, setBookmarkLibraryName] = useState('My Library')
  const [useRootFolder, setUseRootFolder] = useState(false)
  const [rootFolderName, setRootFolderName] = useState('Excited Gem Lists')

  // Behavior states
  const [closeTabs, setCloseTabs] = useState(false)
  const [clearSelection, setClearSelection] = useState(true)
  const [loading, setLoading] = useState(false)
  const [libraries, setLibraries] = useState<Library[]>([])

  // Preview filtering and tab exclusion
  const [searchPreview, setSearchPreview] = useState('')
  const [excludedTabIds, setExcludedTabIds] = useState<Set<number>>(new Set())

  // Hydrate selected tab data
  const rawSelectedTabs: TabData[] = useMemo(() => {
    return selectedTabIds
      .map((id) => tabs.find((t: any) => t.id === id))
      .filter(Boolean)
  }, [selectedTabIds, tabs])

  // Reset/populate data on modal open
  useEffect(() => {
    if (!open) return

    setExcludedTabIds(new Set())
    setSearchPreview('')

    getLists().then((libs: Library[]) => {
      setLibraries(libs || [])
      if (libs && libs.length > 0) {
        setExistingLibraryId(libs[0].id)
        if (libs[0].lists && libs[0].lists.length > 0) {
          setExistingListId(libs[0].lists[0].id)
        }
      }
    })

    if (browserApi?.bookmarks) {
      browserApi.bookmarks.getTree((tree: any) => {
        const rootChildren = tree?.[0]?.children || []
        const treeData = buildBookmarkTree(rootChildren)
        setBookmarkFolders(treeData)
        if (treeData.length > 0) {
          setSelectedBookmarkParent(treeData[0].value)
        }
      })
    }
  }, [open])

  // Track URLs already in selected library
  const urlsInSelectedLibrary = useMemo(() => {
    const set = new Set<string>()
    if (storageType === 'extension' && libraryMode === 'existing' && existingLibraryId) {
      const lib = libraries.find((l) => l.id === existingLibraryId)
      lib?.lists?.forEach((l) => l.tabs?.forEach((t) => t.url && set.add(t.url)))
    }
    return set
  }, [storageType, libraryMode, existingLibraryId, libraries])

  // Deduplicate and decorate tabs
  const processedTabs = useMemo(() => {
    const seen = new Set<string>()
    return rawSelectedTabs.map((tab) => {
      const isDupeInSelection = seen.has(tab.url)
      if (!isDupeInSelection && tab.url) seen.add(tab.url)
      const isDupeInLibrary = urlsInSelectedLibrary.has(tab.url)
      const isExcluded = excludedTabIds.has(tab.id)
      return {
        ...tab,
        isDupeInSelection,
        isDupeInLibrary,
        isExcluded
      }
    })
  }, [rawSelectedTabs, urlsInSelectedLibrary, excludedTabIds])

  // Effective tabs that will actually be saved
  const effectiveTabs = useMemo(() => {
    return processedTabs.filter(
      (t) => !t.isExcluded && !t.isDupeInSelection && !t.isDupeInLibrary
    )
  }, [processedTabs])

  // Filtered tabs for the UI preview
  const displayedPreviewTabs = useMemo(() => {
    if (!searchPreview.trim()) return processedTabs
    const q = searchPreview.toLowerCase()
    return processedTabs.filter(
      (t) =>
        t.title?.toLowerCase().includes(q) || t.url?.toLowerCase().includes(q)
    )
  }, [processedTabs, searchPreview])

  const dupeCount = processedTabs.filter(
    (t) => t.isDupeInSelection || t.isDupeInLibrary
  ).length

  // Handlers for excluding tabs
  const handleToggleExcludeTab = (tabId: number) => {
    setExcludedTabIds((prev) => {
      const next = new Set(prev)
      if (next.has(tabId)) next.delete(tabId)
      else next.add(tabId)
      return next
    })
  }

  // Selection toggles for preview tabs
  const visibleSelectableTabs = useMemo(() => {
    return displayedPreviewTabs.filter((t) => !t.isDupeInSelection && !t.isDupeInLibrary)
  }, [displayedPreviewTabs])

  const allVisibleSelected =
    visibleSelectableTabs.length > 0 &&
    visibleSelectableTabs.every((t) => !t.isExcluded)

  const someVisibleSelected =
    visibleSelectableTabs.some((t) => !t.isExcluded) && !allVisibleSelected

  const handleToggleVisibleSelection = (checked: boolean) => {
    setExcludedTabIds((prev) => {
      const next = new Set(prev)
      visibleSelectableTabs.forEach((t) => {
        if (checked) next.delete(t.id)
        else next.add(t.id)
      })
      return next
    })
  }

  const handleSelectAll = () => {
    setExcludedTabIds(new Set())
  }

  const handleDeselectAll = () => {
    setExcludedTabIds(new Set(rawSelectedTabs.map((t) => t.id)))
  }

  const handleSave = async () => {
    if (effectiveTabs.length === 0) {
      message.warning('No valid tabs to save')
      return
    }

    setLoading(true)
    try {
      const tabsPayload = effectiveTabs.map((t) => ({
        url: t.url,
        title: t.title,
        windowId: t.windowId
      }))

      if (storageType === 'bookmarks') {
        const finalLibName = bookmarkLibraryName?.trim() || 'My Library'
        await saveListAsBookmarks(
          tabsPayload,
          listName?.trim(),
          finalLibName,
          selectedBookmarkParent,
          useRootFolder ? rootFolderName : null
        )
        message.success(
          `Saved ${effectiveTabs.length} tabs to Browser Bookmarks!`
        )
      } else {
        const targetList =
          libraryMode === 'existing' && listMode === 'existing'
            ? existingListId
            : null

        await saveList(
          tabsPayload,
          listName?.trim(),
          libraryMode === 'existing' ? existingLibraryId : null,
          newLibraryName?.trim() || undefined,
          targetList
        )
        message.success(
          `Saved ${effectiveTabs.length} tabs to Extension Storage!`
        )
      }

      if (clearSelection) {
        dispatch(clearSelectedTabs())
      }

      if (closeTabs) {
        const idsToClose = effectiveTabs.map((t) => t.id)
        if (idsToClose.length > 0) {
          try {
            await browserApi.tabs.remove(idsToClose)
          } catch (e) {
            console.error('Error closing tabs:', e)
          }
        }
      }

      onSaved?.()
      onClose()
    } catch (err) {
      console.error('Failed to save list:', err)
      message.error('Failed to save tabs')
    } finally {
      setLoading(false)
    }
  }

  const selectedLib = libraries.find((l) => l.id === existingLibraryId)

  return (
    <Modal
      open={open}
      centered
      title={
        <div className="flex items-center gap-2 text-slate-800">
          <BookmarkPlus size={20} className="text-blue-600" />
          <span className="font-bold text-base">
            Save {rawSelectedTabs.length} Tabs as List
          </span>
        </div>
      }
      onCancel={onClose}
      footer={
        <div className="flex items-center justify-between w-full pt-1.5">
          <div className="text-xs text-slate-500 flex items-center gap-1.5 truncate">
            <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
            <span className="truncate">
              Ready to save{' '}
              <strong className="text-slate-700 font-semibold">
                {effectiveTabs.length} tabs
              </strong>{' '}
              to{' '}
              <strong className="text-blue-600 font-semibold">
                {storageType === 'extension'
                  ? 'Extension Storage'
                  : 'Browser Bookmarks'}
              </strong>
            </span>
          </div>
          <Space>
            <Button key="cancel" onClick={onClose}>
              Cancel
            </Button>
            <Button
              key="save"
              type="primary"
              onClick={handleSave}
              disabled={effectiveTabs.length === 0 || loading}
              loading={loading}
              className="!bg-blue-600 hover:!bg-blue-500 font-medium px-5"
            >
              Save List ({effectiveTabs.length})
            </Button>
          </Space>
        </div>
      }
      width={1200}
      style={{ maxWidth: '94vw', width: '94vw' }}
      styles={{
        body: {
          height: '72vh',
          maxHeight: '640px',
          minHeight: '450px',
          overflow: 'hidden',
          padding: '12px 18px'
        }
      }}
      destroyOnClose
    >
      <div className="flex gap-6 h-full overflow-hidden">
        {/* Left Column - Options & Config */}
        <div className="w-[360px] flex-shrink-0 flex flex-col justify-between h-full overflow-y-auto pr-3 space-y-3.5 border-r border-slate-200">
          <div className="space-y-3">
            {/* Storage Type Switcher */}
            <div>
              <Text strong className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1.5 font-semibold">
                1. Save Location
              </Text>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  className={`flex flex-col items-start p-2 rounded-lg border text-left cursor-pointer transition-all ${
                    storageType === 'extension'
                      ? 'border-blue-500 bg-blue-50/60 shadow-sm ring-1 ring-blue-400 text-blue-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                  onClick={() => setStorageType('extension')}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-blue-600 mb-0.5">
                    <HardDrive size={13} />
                    <span>Extension</span>
                  </div>
                  <span className="text-[10px] text-slate-500 leading-tight">
                    Saved in Lists page
                  </span>
                </button>

                <button
                  type="button"
                  className={`flex flex-col items-start p-2 rounded-lg border text-left cursor-pointer transition-all ${
                    storageType === 'bookmarks'
                      ? 'border-amber-500 bg-amber-50/60 shadow-sm ring-1 ring-amber-400 text-amber-900'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                  onClick={() => setStorageType('bookmarks')}
                >
                  <div className="flex items-center gap-1.5 font-semibold text-xs text-amber-600 mb-0.5">
                    <Bookmark size={13} />
                    <span>Bookmarks</span>
                  </div>
                  <span className="text-[10px] text-slate-500 leading-tight">
                    Native browser folder
                  </span>
                </button>
              </div>
            </div>

            {/* List Details & Organization */}
            <div className="space-y-2.5">
              <Text strong className="text-[11px] uppercase tracking-wider text-slate-500 block font-semibold">
                2. Organization & Details
              </Text>

              {/* List Name */}
              <div>
                <span className="text-xs font-semibold text-slate-700 block mb-1">
                  List Title{' '}
                  <span className="font-normal text-slate-400 text-[10px]">
                    (auto-dated if empty)
                  </span>
                </span>
                <Input
                  size="small"
                  placeholder="e.g. Research Tabs, or leave blank"
                  value={listName}
                  onChange={(e) => setListName(e.target.value)}
                  className="rounded-md text-xs"
                />
              </div>

              {/* Extension Storage Details */}
              {storageType === 'extension' && (
                <div className="bg-slate-50/80 p-2.5 rounded-lg border border-slate-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700">
                    <LibraryIcon size={13} className="text-blue-500" />
                    <span>Library Folder</span>
                  </div>

                  <Radio.Group
                    value={libraryMode}
                    onChange={(e) => setLibraryMode(e.target.value)}
                    className="w-full text-xs"
                  >
                    <Space direction="vertical" className="w-full">
                      <Radio value="new">
                        <span className="text-xs font-medium">Create New Library</span>
                      </Radio>
                      {libraryMode === 'new' && (
                        <Input
                          size="small"
                          placeholder="Library name (e.g. Work, Reading)"
                          value={newLibraryName}
                          onChange={(e) => setNewLibraryName(e.target.value)}
                          className="ml-6 w-[86%] text-xs"
                          prefix={<FolderOpen size={12} className="text-slate-400" />}
                        />
                      )}

                      <Radio value="existing" disabled={libraries.length === 0}>
                        <span className="text-xs font-medium">
                          Add to Existing Library{' '}
                          {libraries.length === 0 && (
                            <span className="text-slate-400 text-[10px]">
                              (none yet)
                            </span>
                          )}
                        </span>
                      </Radio>

                      {libraryMode === 'existing' && libraries.length > 0 && (
                        <div className="ml-6 space-y-1.5 w-[86%]">
                          <Select
                            size="small"
                            className="w-full text-xs"
                            value={existingLibraryId}
                            onChange={(val) => {
                              setExistingLibraryId(val)
                              const lib = libraries.find((l) => l.id === val)
                              if (lib && lib.lists && lib.lists.length > 0) {
                                setExistingListId(lib.lists[0].id)
                              } else {
                                setExistingListId(null)
                              }
                            }}
                            options={libraries.map((lib) => ({
                              label: `${lib.name || 'Unnamed Library'} (${lib.lists?.length || 0} lists)`,
                              value: lib.id
                            }))}
                          />

                          {selectedLib && selectedLib.lists && selectedLib.lists.length > 0 && (
                            <div className="pt-0.5">
                              <Radio.Group
                                size="small"
                                value={listMode}
                                onChange={(e) => setListMode(e.target.value)}
                                className="text-[11px]"
                              >
                                <Space direction="vertical">
                                  <Radio value="new">
                                    <span className="text-[11px]">New List in Library</span>
                                  </Radio>
                                  <Radio value="existing">
                                    <span className="text-[11px]">Append to Existing List</span>
                                  </Radio>
                                </Space>
                              </Radio.Group>

                              {listMode === 'existing' && (
                                <Select
                                  size="small"
                                  className="w-full mt-1 text-xs"
                                  value={existingListId}
                                  onChange={setExistingListId}
                                  options={selectedLib.lists.map((l) => ({
                                    label: `${l.name || 'Unnamed List'} (${l.tabs?.length || 0} tabs)`,
                                    value: l.id
                                  }))}
                                />
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </Space>
                  </Radio.Group>
                </div>
              )}

              {/* Browser Bookmarks Details */}
              {storageType === 'bookmarks' && (
                <div className="bg-amber-50/50 p-2.5 rounded-lg border border-amber-200 space-y-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-amber-800">
                    <Bookmark size={13} className="text-amber-600" />
                    <span>Bookmarks Location</span>
                  </div>

                  {bookmarkFolders.length > 0 && (
                    <div>
                      <span className="text-[10px] font-medium text-slate-600 block mb-0.5">
                        Parent Folder
                      </span>
                      <TreeSelect
                        size="small"
                        className="w-full text-xs"
                        treeData={bookmarkFolders}
                        value={selectedBookmarkParent}
                        onChange={setSelectedBookmarkParent}
                        placeholder="Select bookmark folder"
                        treeDefaultExpandAll
                        showSearch
                        treeLine
                      />
                    </div>
                  )}

                  <div>
                    <span className="text-[10px] font-medium text-slate-600 block mb-0.5">
                      Library Subfolder
                    </span>
                    <Input
                      size="small"
                      value={bookmarkLibraryName}
                      onChange={(e) => setBookmarkLibraryName(e.target.value)}
                      placeholder="e.g. My Library"
                      prefix={<FolderOpen size={12} className="text-amber-500" />}
                      className="text-xs"
                    />
                  </div>

                  <div className="pt-0.5">
                    <Checkbox
                      checked={useRootFolder}
                      onChange={(e) => setUseRootFolder(e.target.checked)}
                      className="text-xs"
                    >
                      <span className="text-[10px] text-slate-600">
                        Nest inside root folder
                      </span>
                    </Checkbox>
                    {useRootFolder && (
                      <Input
                        size="small"
                        className="mt-1 text-xs"
                        value={rootFolderName}
                        onChange={(e) => setRootFolderName(e.target.value)}
                        placeholder="Excited Gem Lists"
                      />
                    )}
                  </div>

                  <div className="bg-white/90 p-1.5 rounded border border-amber-100 text-[10px] text-slate-600 font-mono leading-tight">
                    Path: 📁{' '}
                    {bookmarkFolders.find((f) => f.value === selectedBookmarkParent)
                      ?.title || 'Bookmarks Bar'}{' '}
                    {useRootFolder && rootFolderName ? `→ 📁 ${rootFolderName} ` : ''}
                    → 📁 {bookmarkLibraryName || 'My Library'} → 📁{' '}
                    {listName || 'Saved List'}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* After Saving Actions */}
          <div className="border-t border-slate-200 pt-2.5">
            <Text strong className="text-[11px] uppercase tracking-wider text-slate-500 block mb-1 font-semibold">
              3. After Saving
            </Text>
            <div className="space-y-1">
              <Checkbox
                checked={clearSelection}
                onChange={(e) => setClearSelection(e.target.checked)}
                className="text-xs"
              >
                <span className="text-xs text-slate-700">Clear selection</span>
              </Checkbox>
              <br />
              <Checkbox
                checked={closeTabs}
                onChange={(e) => setCloseTabs(e.target.checked)}
                className="text-xs"
              >
                <span className="text-xs text-slate-700">
                  Close tabs after saving
                </span>
              </Checkbox>
            </div>
          </div>
        </div>

        {/* Right Column - Tabs Preview & Selection */}
        <div className="flex-1 flex flex-col min-w-0 bg-slate-50/80 border border-slate-200 rounded-xl p-2.5 h-full overflow-hidden">
          {/* Preview Toolbar Header */}
          <div className="flex items-center justify-between gap-3 mb-2 flex-shrink-0">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-xs text-slate-800">
                Tabs Preview
              </span>
              <Tag color="blue" className="text-xs font-semibold m-0">
                {effectiveTabs.length} / {rawSelectedTabs.length} to save
              </Tag>
              {dupeCount > 0 && (
                <Tag color="orange" className="text-xs m-0">
                  {dupeCount} duplicates
                </Tag>
              )}
            </div>

            <div className="w-56">
              <Input
                size="small"
                placeholder="Search preview tabs..."
                value={searchPreview}
                onChange={(e) => setSearchPreview(e.target.value)}
                prefix={<Search size={12} className="text-slate-400" />}
                allowClear
                className="text-xs rounded-md"
              />
            </div>
          </div>

          {/* Sub-bar: Master Selection & Batch Controls */}
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-white border border-slate-200/90 rounded-md mb-2 flex-shrink-0 text-xs text-slate-600">
            <div className="flex items-center gap-2">
              <Checkbox
                checked={allVisibleSelected}
                indeterminate={someVisibleSelected}
                onChange={(e) => handleToggleVisibleSelection(e.target.checked)}
              >
                <span className="text-xs font-semibold text-slate-700">
                  {searchPreview ? 'Select All Filtered' : 'Select All Tabs'}
                </span>
              </Checkbox>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400">
                {displayedPreviewTabs.length} visible
              </span>
              <div className="h-3 w-px bg-slate-200" />
              <button
                type="button"
                className="text-[11px] text-blue-600 hover:text-blue-700 cursor-pointer font-medium bg-transparent border-0 p-0"
                onClick={handleSelectAll}
              >
                Select All
              </button>
              <span className="text-slate-300">·</span>
              <button
                type="button"
                className="text-[11px] text-slate-500 hover:text-slate-700 cursor-pointer font-medium bg-transparent border-0 p-0"
                onClick={handleDeselectAll}
              >
                Deselect All
              </button>
            </div>
          </div>

          {/* Duplicates notice */}
          {dupeCount > 0 && (
            <Alert
              type="info"
              message={
                <span className="text-xs">
                  <strong>{dupeCount} duplicate URLs</strong> in selection/library will be skipped.
                </span>
              }
              className="mb-2 py-0.5 px-2 flex-shrink-0"
              showIcon
            />
          )}

          {/* Scrollable Tab List Container */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-1">
            {displayedPreviewTabs.length === 0 ? (
              <div className="text-center py-12 text-slate-400 text-xs">
                No matching tabs found.
              </div>
            ) : (
              displayedPreviewTabs.map((tab) => {
                const isDupe = tab.isDupeInSelection || tab.isDupeInLibrary
                const isChecked = !tab.isExcluded

                return (
                  <div
                    key={tab.id}
                    className={`flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border transition-colors ${
                      isDupe
                        ? 'opacity-40 bg-slate-100 border-slate-200'
                        : isChecked
                        ? 'bg-white border-slate-200/90 hover:border-blue-300 shadow-[0_1px_2px_rgba(0,0,0,0.02)]'
                        : 'bg-slate-100/70 border-slate-200 opacity-60'
                    }`}
                  >
                    <div className="flex items-center gap-2 flex-1 min-w-0">
                      <Checkbox
                        checked={isChecked}
                        onChange={() => handleToggleExcludeTab(tab.id)}
                        disabled={isDupe}
                      />

                      {tab.favIconUrl ? (
                        <img
                          src={tab.favIconUrl}
                          alt=""
                          className="w-4 h-4 rounded-sm flex-shrink-0"
                        />
                      ) : (
                        <div className="w-4 h-4 rounded-sm bg-slate-200 flex items-center justify-center text-[9px] font-bold text-slate-500 flex-shrink-0">
                          {tab.title?.[0]?.toUpperCase() || 'T'}
                        </div>
                      )}

                      <div className="flex flex-col min-w-0 flex-1">
                        <span
                          className="text-xs font-semibold text-slate-800 truncate leading-tight"
                          title={tab.title}
                        >
                          {tab.title || tab.url}
                        </span>
                        <span
                          className="text-[10px] text-slate-400 truncate leading-none mt-0.5"
                          title={tab.url}
                        >
                          {tab.url}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      {isDupe && (
                        <Tag color="default" className="text-[10px] m-0">
                          {tab.isDupeInLibrary ? 'In Library' : 'Duplicate'}
                        </Tag>
                      )}
                      <Tooltip title={isChecked ? 'Exclude tab' : 'Include tab'}>
                        <Button
                          type="text"
                          size="small"
                          icon={<X size={12} className="text-slate-400 hover:text-red-500" />}
                          onClick={() => handleToggleExcludeTab(tab.id)}
                          className="w-5 h-5 flex items-center justify-center p-0"
                        />
                      </Tooltip>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      </div>
    </Modal>
  )
}
