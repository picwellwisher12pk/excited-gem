import { useEffect, useState } from 'react'
import { Provider } from 'react-redux'
import {
    Button,
    Input,
    Space,
    Tag,
    Tooltip,
    Popconfirm,
    message,
    ConfigProvider,
    Empty,
    Tabs
} from 'antd'
import {
    FolderOpen,
    Trash2,
    ChevronDown,
    ChevronUp,
    Edit2,
    ExternalLink,
    Library,
    BookOpen,
    X,
    Bookmark
} from 'lucide-react'
// @ts-ignore
import {
    getLists,
    getBookmarkLists,
    removeLibrary,
    removeList,
    renameLibrary,
    renameTabList
} from '../components/getsetSessions'
import Sidebar, { SidebarToggleButton } from '../components/Sidebar'
import Brand from '../components/Header/Brand'
import logo from '../assets/logo.svg'
import store from '../store/store'
import { useSelector } from 'react-redux'
import { analytics } from '../utils/analytics'
import { usePageTracking } from '../components/Analytics/usePageTracking'
import UnifiedSearch from '../components/Search'
import { RoutineQuickMenu } from '../components/Routines/RoutineQuickMenu'
import 'antd/dist/reset.css'
import '../styles/index.css'

import { useDispatch } from 'react-redux'
import type { AppDispatch, RootState } from '../store/store'
import { toggleDrawer, setProviderStatus } from '../store/aiSlice'
import { AIDrawer } from '../components/AI/AIDrawer'
import { AIProviderBadge } from '../components/AI/AIProviderBadge'
import { getAIService } from '../ai/AIService'

const browser = chrome

interface TabData {
    url: string
    title: string
}
interface ListItem {
    id: string
    name: string
    created: number
    tabs: TabData[]
}
interface LibraryData {
    id: string
    name: string
    created: number
    storageType?: 'extension' | 'bookmarks' | string
    bookmarkRootId?: string
    lists: ListItem[]
}

function getTabCount(lib: LibraryData) {
    return lib.lists.reduce((sum, l) => sum + l.tabs.length, 0)
}

function formatDate(ts: number) {
    return new Date(ts).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    })
}

function LibraryList({
    libraries,
    isBookmarks,
    onReload
}: {
    libraries: LibraryData[]
    isBookmarks: boolean
    onReload: () => void
}) {
    const [expandedLibs, setExpandedLibs] = useState<Set<string>>(new Set())
    const [expandedLists, setExpandedLists] = useState<Set<string>>(new Set())
    const [editingLibId, setEditingLibId] = useState<string | null>(null)
    const [editingListKey, setEditingListKey] = useState<string | null>(null)
    const [editName, setEditName] = useState('')

    const toggleLib = (id: string) => {
        const s = new Set(expandedLibs)
        s.has(id) ? s.delete(id) : s.add(id)
        setExpandedLibs(s)
    }
    const toggleList = (key: string) => {
        const s = new Set(expandedLists)
        s.has(key) ? s.delete(key) : s.add(key)
        setExpandedLists(s)
    }

    const openAllTabs = (tabs: TabData[]) => {
        tabs.forEach((t) => browser.tabs.create({ url: t.url }))
        message.success(`${tabs.length} tabs opened`)
        analytics.trackEvent('Lists', 'Open All Tabs')
    }

    const handleDeleteLibrary = async (libId: string) => {
        if (isBookmarks) {
            await new Promise<void>((res) => browser.bookmarks.removeTree(libId, res))
        } else {
            await removeLibrary(libId)
        }
        onReload()
        message.success('Library deleted')
    }

    const handleDeleteList = async (libId: string, listId: string) => {
        if (isBookmarks) {
            await new Promise<void>((res) => browser.bookmarks.removeTree(listId, res))
        } else {
            await removeList(libId, listId)
        }
        onReload()
        message.success('List deleted')
    }

    const commitRenameLib = async (libId: string) => {
        if (!editName.trim()) { setEditingLibId(null); return }
        if (isBookmarks) {
            await new Promise<void>((res) => browser.bookmarks.update(libId, { title: editName.trim() }, () => res()))
        } else {
            await renameLibrary(libId, editName.trim())
        }
        onReload()
        setEditingLibId(null)
        message.success('Library renamed')
    }

    const commitRenameList = async (libId: string, listId: string) => {
        if (!editName.trim()) { setEditingListKey(null); return }
        if (isBookmarks) {
            await new Promise<void>((res) => browser.bookmarks.update(listId, { title: editName.trim() }, () => res()))
        } else {
            await renameTabList(libId, listId, editName.trim())
        }
        onReload()
        setEditingListKey(null)
        message.success('List renamed')
    }

    if (libraries.length === 0) {
        return (
            <Empty
                description={isBookmarks
                    ? 'No bookmark lists saved yet — choose "Browser Bookmarks" when saving a list'
                    : 'No extension lists yet — select tabs and click "Save as List"'
                }
                className="mt-16"
            />
        )
    }

    return (
        <div className="space-y-3">
            {libraries.map((lib) => {
                const isLibExpanded = expandedLibs.has(lib.id)
                const totalTabs = getTabCount(lib)
                const isEditingLib = editingLibId === lib.id

                return (
                    <div key={lib.id} className="bg-white rounded-lg shadow-sm hover:shadow transition-shadow">
                        {/* Library header */}
                        <div
                            className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50 rounded-t-lg"
                            onClick={() => toggleLib(lib.id)}
                        >
                            <div className="flex items-center gap-3 flex-1 min-w-0">
                                <Button type="text" size="small"
                                    icon={isLibExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                                    className="flex items-center justify-center shrink-0"
                                />
                                <Library size={16} className={isBookmarks ? 'text-amber-500 shrink-0' : 'text-blue-500 shrink-0'} />
                                {isEditingLib ? (
                                    <Input autoFocus size="small" value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onPressEnter={() => commitRenameLib(lib.id)}
                                        onBlur={() => commitRenameLib(lib.id)}
                                        onClick={(e) => e.stopPropagation()}
                                        className="w-48"
                                    />
                                ) : (
                                    <span className="font-semibold truncate">{lib.name || 'Unnamed Library'}</span>
                                )}
                                <Tag color={isBookmarks ? 'gold' : 'blue'}>{formatDate(lib.created)}</Tag>
                                <Tag color="green">{lib.lists.length} lists · {totalTabs} tabs</Tag>
                            </div>

                            <Space size="small" onClick={(e) => e.stopPropagation()}>
                                <Tooltip title="Open all tabs">
                                    <Button type="primary" size="small" icon={<FolderOpen size={15} />}
                                        onClick={(e) => { e.stopPropagation(); openAllTabs(lib.lists.flatMap((l) => l.tabs)) }}
                                        className="flex items-center justify-center"
                                    />
                                </Tooltip>
                                <Tooltip title="Rename">
                                    <Button size="small" icon={<Edit2 size={15} />}
                                        onClick={(e) => { e.stopPropagation(); setEditingLibId(lib.id); setEditingListKey(null); setEditName(lib.name || '') }}
                                        className="flex items-center justify-center text-gray-500"
                                    />
                                </Tooltip>
                                <Popconfirm title="Delete this entire library and all its lists?"
                                    onConfirm={() => handleDeleteLibrary(lib.id)}
                                    okText="Delete" cancelText="Cancel"
                                >
                                    <Button danger size="small" icon={<Trash2 size={15} />}
                                        onClick={(e) => e.stopPropagation()}
                                        className="flex items-center justify-center"
                                    />
                                </Popconfirm>
                            </Space>
                        </div>

                        {/* Lists */}
                        {isLibExpanded && (
                            <div className="border-t bg-gray-50 rounded-b-lg px-4 py-3 space-y-2">
                                {lib.lists.length === 0
                                    ? <div className="text-gray-400 text-sm text-center py-2">No lists in this library</div>
                                    : lib.lists.map((list) => {
                                        const listKey = `${lib.id}:${list.id}`
                                        const isListExpanded = expandedLists.has(listKey)
                                        const isEditingList = editingListKey === listKey

                                        return (
                                            <div key={list.id} className="bg-white rounded border border-gray-100 shadow-sm">
                                                <div
                                                    className="flex items-center justify-between px-3 py-2 cursor-pointer hover:bg-blue-50 rounded"
                                                    onClick={() => toggleList(listKey)}
                                                >
                                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                                        <Button type="text" size="small"
                                                            icon={isListExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                                                            className="flex items-center justify-center shrink-0"
                                                        />
                                                        <BookOpen size={14} className="text-indigo-400 shrink-0" />
                                                        {isEditingList ? (
                                                            <Input autoFocus size="small" value={editName}
                                                                onChange={(e) => setEditName(e.target.value)}
                                                                onPressEnter={() => commitRenameList(lib.id, list.id)}
                                                                onBlur={() => commitRenameList(lib.id, list.id)}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="w-40"
                                                            />
                                                        ) : (
                                                            <span className="font-medium text-sm truncate">
                                                                {list.name || <span className="italic text-gray-400">Unnamed List</span>}
                                                            </span>
                                                        )}
                                                        <Tag>{formatDate(list.created)}</Tag>
                                                        <Tag color="cyan">{list.tabs.length} tabs</Tag>
                                                    </div>

                                                    <Space size="small" onClick={(e) => e.stopPropagation()}>
                                                        <Tooltip title="Open all tabs in list">
                                                            <Button type="primary" size="small" icon={<ExternalLink size={13} />}
                                                                onClick={(e) => { e.stopPropagation(); openAllTabs(list.tabs) }}
                                                                className="flex items-center justify-center"
                                                            />
                                                        </Tooltip>
                                                        <Tooltip title="Rename list">
                                                            <Button size="small" icon={<Edit2 size={13} />}
                                                                onClick={(e) => { e.stopPropagation(); setEditingListKey(listKey); setEditingLibId(null); setEditName(list.name || '') }}
                                                                className="flex items-center justify-center text-gray-500"
                                                            />
                                                        </Tooltip>
                                                        <Popconfirm title="Delete this list?"
                                                            onConfirm={() => handleDeleteList(lib.id, list.id)}
                                                            okText="Delete" cancelText="Cancel"
                                                        >
                                                            <Button danger size="small" icon={<X size={13} />}
                                                                onClick={(e) => e.stopPropagation()}
                                                                className="flex items-center justify-center"
                                                            />
                                                        </Popconfirm>
                                                    </Space>
                                                </div>

                                                {isListExpanded && (
                                                    <div className="border-t px-3 pb-2 pt-1 space-y-1">
                                                        {list.tabs.map((tab, i) => (
                                                            <div key={i} className="flex items-center justify-between bg-gray-50 px-2 py-1 rounded text-sm hover:bg-blue-50">
                                                                <div className="flex-1 truncate">
                                                                    <a href={tab.url} target="_blank" rel="noopener noreferrer"
                                                                        className="text-blue-600 hover:underline text-xs"
                                                                    >
                                                                        {tab.title || tab.url}
                                                                    </a>
                                                                    <div className="text-[10px] text-gray-400 truncate">{tab.url}</div>
                                                                </div>
                                                                <Button type="link" size="small"
                                                                    onClick={() => browser.tabs.create({ url: tab.url })}
                                                                    className="shrink-0"
                                                                >
                                                                    Open
                                                                </Button>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        )
                                    })
                                }
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

function ListsPageContent() {
    const [extLibraries, setExtLibraries] = useState<LibraryData[]>([])
    const [bmLibraries, setBmLibraries] = useState<LibraryData[]>([])
    const [filteredExt, setFilteredExt] = useState<LibraryData[]>([])
    const [filteredBm, setFilteredBm] = useState<LibraryData[]>([])
    const [loading, setLoading] = useState(false)
    const [activeTab, setActiveTab] = useState('extension')
    const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
    const dispatch = useDispatch<AppDispatch>()
    const { drawerOpen, isLoading: aiLoading, status } = useSelector((s: RootState) => s.ai)

    usePageTracking('/lists', 'Lists')

    const fetchAll = async () => {
        setLoading(true)
        try {
            const [ext, bm] = await Promise.all([getLists(), getBookmarkLists()])
            setExtLibraries(ext || [])
            setBmLibraries(bm || [])
            setFilteredExt(ext || [])
            setFilteredBm(bm || [])
        } finally {
            setLoading(false)
        }
    }

    const { regex: isRegex } = useSelector((state: any) => state.search || { regex: false })

    useEffect(() => {
        const checkAI = async () => {
            try {
                const service = await getAIService()
                const status = await service.getStatus()
                dispatch(setProviderStatus(status))
            } catch (e) {
                dispatch(setProviderStatus({ connected: false, error: 'AI Service unavailable' }))
            }
        }
        checkAI()
    }, [dispatch])

    useEffect(() => {
        fetchAll()

        const onStorageChanged = (changes: any, area: string) => {
            if (area === 'local' && (changes.libraries || changes.urlBank || changes.bookmarkLibraryIds)) {
                fetchAll()
            }
        }

        browser.storage.onChanged.addListener(onStorageChanged)

        if (browser.bookmarks) {
            const onBmChanged = () => { fetchAll() }
            browser.bookmarks.onCreated.addListener(onBmChanged)
            browser.bookmarks.onRemoved.addListener(onBmChanged)
            browser.bookmarks.onChanged.addListener(onBmChanged)
            browser.bookmarks.onMoved.addListener(onBmChanged)

            return () => {
                browser.storage.onChanged.removeListener(onStorageChanged)
                browser.bookmarks.onCreated.removeListener(onBmChanged)
                browser.bookmarks.onRemoved.removeListener(onBmChanged)
                browser.bookmarks.onChanged.removeListener(onBmChanged)
                browser.bookmarks.onMoved.removeListener(onBmChanged)
            }
        }

        return () => {
            browser.storage.onChanged.removeListener(onStorageChanged)
        }
    }, [])

    const handleSearch = (value: string) => {
        const q = value.toLowerCase()
        const filter = (libs: LibraryData[]) => {
            if (!q) return libs

            let searchRegex: RegExp | null = null
            if (isRegex) {
                try {
                    searchRegex = new RegExp(value, 'i')
                } catch (e) { /* invalid regex */ }
            }

            return libs.filter(
                (lib) => {
                    if (isRegex && searchRegex) {
                        return searchRegex.test(lib.name) ||
                            lib.lists.some(list => searchRegex?.test(list.name) || list.tabs.some(t => searchRegex?.test(t.url) || searchRegex?.test(t.title)))
                    }
                    return lib.name.toLowerCase().includes(q) ||
                        lib.lists.some(
                            (list) =>
                                list.name.toLowerCase().includes(q) ||
                                list.tabs.some((t) => t.url.toLowerCase().includes(q) || t.title.toLowerCase().includes(q))
                        )
                }
            )
        }
        setFilteredExt(filter(extLibraries))
        setFilteredBm(filter(bmLibraries))
    }

    const totalExt = extLibraries.reduce((n, l) => n + l.lists.length, 0)
    const totalBm = bmLibraries.reduce((n, l) => n + l.lists.length, 0)

    return (
        <div className="flex h-[100vh] relative overflow-hidden">
            <Sidebar
                currentPage="lists"
                collapsed={sidebarCollapsed}
                onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                onAIClick={() => dispatch(toggleDrawer())}
                aiEnabled={status?.connected}
            />
            <div className="flex flex-col flex-1">
                {/* Header */}
                <header className="bg-gradient-to-t from-cyan-500 to-blue-500 p-2 transition-all duration-200 ease-in-out">
                    <section className="flex items-center justify-between gap-4 w-full">
                        <div className="flex-none flex items-center shrink-0">
                            <div className="mr-2">
                                <SidebarToggleButton onClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
                            </div>
                            <div className="hidden sm:block">{Brand(logo)}</div>
                            <span className="text-white font-semibold text-lg ml-4">Lists</span>
                        </div>
                        <div className="flex-1 flex justify-end items-center gap-3 pr-2">
                            <RoutineQuickMenu size="middle" buttonText="Routines" />
                            <div className="w-full max-w-xl">
                                <UnifiedSearch
                                    isReduxConnected={false}
                                    placeholder="Search libraries, lists, URLs..."
                                    onChange={handleSearch}
                                    onSearch={handleSearch}
                                    showTabFilters={false}
                                    foundCount={filteredExt.length + filteredBm.length}
                                    className="w-full !ml-0"
                                />
                            </div>
                        </div>
                    </section>
                </header>

                {/* Tabs */}
                <div className="flex-1 overflow-auto bg-gray-50">
                    <Tabs
                        activeKey={activeTab}
                        onChange={setActiveTab}
                        className="px-4 pt-2"
                        items={[
                            {
                                key: 'extension',
                                label: (
                                    <span className="flex items-center gap-1.5">
                                        <Library size={14} />
                                        Extension
                                        {extLibraries.length > 0 && (
                                            <Tag color="blue" className="ml-1 !text-xs">{totalExt}</Tag>
                                        )}
                                    </span>
                                ),
                                children: (
                                    <div className="pb-6">
                                        <LibraryList
                                            libraries={filteredExt}
                                            isBookmarks={false}
                                            onReload={fetchAll}
                                        />
                                    </div>
                                )
                            },
                            {
                                key: 'bookmarks',
                                label: (
                                    <span className="flex items-center gap-1.5">
                                        <Bookmark size={14} />
                                        Bookmarks
                                        {bmLibraries.length > 0 && (
                                            <Tag color="gold" className="ml-1 !text-xs">{totalBm}</Tag>
                                        )}
                                    </span>
                                ),
                                children: (
                                    <div className="pb-6">
                                        <LibraryList
                                            libraries={filteredBm}
                                            isBookmarks={true}
                                            onReload={fetchAll}
                                        />
                                    </div>
                                )
                            }
                        ]}
                    />
                </div>
            </div>

            <AIDrawer
                onOpenSettings={() => {
                    chrome.tabs.create({ url: chrome.runtime.getURL('tabs/settings.html#ai') })
                }}
            />

            <div className="fixed bottom-4 right-4 z-30">
                <AIProviderBadge
                    onClick={() => dispatch(toggleDrawer())}
                    status={status}
                    active={drawerOpen}
                />
            </div>
        </div>
    )
}

export default function ListsPage() {
    return (
        <Provider store={store}>
            <ConfigProvider theme={{ token: { borderRadius: 4, borderRadiusSM: 4, borderRadiusLG: 4 } }}>
                <ListsPageContent />
            </ConfigProvider>
        </Provider>
    )
}
