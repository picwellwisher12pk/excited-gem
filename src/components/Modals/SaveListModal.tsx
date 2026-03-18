import {
    Modal,
    Input,
    Radio,
    Select,
    Checkbox,
    List,
    Avatar,
    Space,
    Typography,
    Tag,
    Divider,
    Alert,
    TreeSelect,
    Button
} from 'antd'
import { BookmarkPlus, FolderOpen, Library } from 'lucide-react'
import { useEffect, useState } from 'react'
import { useSelector } from 'react-redux'
// @ts-ignore
import {
    getLists,
    saveList,
    saveListAsBookmarks
} from '../../components/getsetSessions'

const { Text } = Typography
const browser = chrome

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
    const { tabs } = useSelector((state: any) => state.tabs)

    const [listName, setListName] = useState('')
    const [storageType, setStorageType] = useState<'extension' | 'bookmarks'>('extension')
    const [libraryMode, setLibraryMode] = useState<'new' | 'existing'>('new')
    const [newLibraryName, setNewLibraryName] = useState('')
    const [existingLibraryId, setExistingLibraryId] = useState<string | null>(null)
    const [closeTabs, setCloseTabs] = useState(false)
    const [clearSelection, setClearSelection] = useState(true)
    const [loading, setLoading] = useState(false)
    const [libraries, setLibraries] = useState<Library[]>([])
    const [bookmarkFolders, setBookmarkFolders] = useState<any[]>([])
    const [selectedBookmarkParent, setSelectedBookmarkParent] = useState<string>('1')
    const [rootFolderName, setRootFolderName] = useState('Excited Gem Lists')

    // Hydrate selected tab data
    const selectedTabs: TabData[] = selectedTabIds
        .map((id) => tabs.find((t: any) => t.id === id))
        .filter(Boolean)

    // Deduplicate preview: track which are dupes within the selection
    const seenUrls = new Set<string>()
    const urlsInLibrary = new Set<string>()

    if (libraryMode === 'existing' && existingLibraryId) {
        const lib = libraries.find((l) => l.id === existingLibraryId)
        lib?.lists.forEach((list) => list.tabs.forEach((t) => urlsInLibrary.add(t.url)))
    }

    const deduplicatedTabs = selectedTabs.map((tab) => {
        const isDupeInSelection = seenUrls.has(tab.url)
        const isDupeInLibrary = urlsInLibrary.has(tab.url)
        if (!isDupeInSelection) seenUrls.add(tab.url)
        return { ...tab, isDupeInSelection, isDupeInLibrary }
    })

    const effectiveTabs = deduplicatedTabs.filter(
        (t) => !t.isDupeInSelection && !t.isDupeInLibrary
    )

    useEffect(() => {
        if (!open) return
        getLists().then((libs: Library[]) => {
            setLibraries(libs || [])
            if (libs.length > 0 && !existingLibraryId) {
                setExistingLibraryId(libs[0].id)
            }
        })
        // Load bookmark folders
        if (browser.bookmarks) {
            browser.bookmarks.getTree((tree) => {
                const treeData = buildBookmarkTree(tree[0]?.children || [])
                setBookmarkFolders(treeData)
            })
        }
    }, [open])

    const handleSave = async () => {
        setLoading(true)
        try {
            const tabsPayload = effectiveTabs.map((t) => ({
                url: t.url,
                title: t.title,
                windowId: t.windowId
            }))

            if (storageType === 'bookmarks') {
                const libName =
                    libraryMode === 'new'
                        ? newLibraryName || 'My Library'
                        : libraries.find((l) => l.id === existingLibraryId)?.name || 'My Library'

                await saveListAsBookmarks(
                    tabsPayload,
                    listName,
                    libName,
                    selectedBookmarkParent,
                    rootFolderName || 'Excited Gem Lists'
                )
            } else {
                await saveList(
                    tabsPayload,
                    listName,
                    libraryMode === 'existing' ? existingLibraryId : null,
                    newLibraryName || undefined
                )
            }

            if (closeTabs) {
                browser.tabs.remove(selectedTabIds)
            }

            onSaved?.()
            onClose()
        } catch (err) {
            console.error('Failed to save list:', err)
        } finally {
            setLoading(false)
        }
    }

    const handleClose = () => {
        onClose()
    }

    const dupeCount = deduplicatedTabs.filter(
        (t) => t.isDupeInSelection || t.isDupeInLibrary
    ).length

    return (
        <Modal
            open={open}
            title={
                <div className="flex items-center gap-2">
                    <BookmarkPlus size={18} className="text-blue-500" />
                    <span>Save {selectedTabIds.length} Tabs as List</span>
                </div>
            }
            onCancel={handleClose}
            footer={
                <Space>
                    <Button key="cancel" onClick={handleClose}>
                        Cancel
                    </Button>
                    <Button
                        key="save"
                        type="primary"
                        onClick={handleSave}
                        disabled={effectiveTabs.length === 0 || loading}
                        loading={loading}
                    >
                        Save List
                    </Button>
                </Space>
            }
            width={1000}
            destroyOnClose
        >
            <div className="flex gap-8">
                {/* Left Column - Options */}
                <div className="flex-none w-80 space-y-4">
                    {/* List Name */}
                    <div>
                        <Text strong>List Name <Text type="secondary">(optional)</Text></Text>
                        <Input
                            className="mt-1 rounded-md border border-gray-300"
                            placeholder="e.g. Research Day 1, or leave empty for unnamed"
                            value={listName}
                            onChange={(e) => setListName(e.target.value)}
                            autoFocus
                        />
                    </div>

                    <Divider className="!my-2" />

                    {/* Storage Type */}
                    <div>
                        <Text strong>Save to</Text>
                        <div className="mt-2">
                            <Radio.Group
                                value={storageType}
                                onChange={(e) => setStorageType(e.target.value)}
                                className="w-full"
                            >
                                <Space direction="vertical" className="w-full">
                                    <Radio value="extension">
                                        <span className="font-medium">Extension Storage</span>
                                        <Text type="secondary" className="ml-2 text-xs">Saved inside the extension, accessible from the Lists page</Text>
                                    </Radio>
                                    <Radio value="bookmarks">
                                        <span className="font-medium">Browser Bookmarks</span>
                                        <Text type="secondary" className="ml-2 text-xs">Saved as a bookmark folder in your browser</Text>
                                    </Radio>
                                </Space>
                            </Radio.Group>
                        </div>
                    </div>

                    {/* Bookmark parent folder picker */}
                    {storageType === 'bookmarks' && (
                        <div className="space-y-3">
                            {/* Root grouping folder name */}
                            <div>
                                <Text strong>
                                    Root folder name{' '}
                                    <Text type="secondary" className="font-normal text-xs">
                                        — all your saved lists will appear inside this folder
                                    </Text>
                                </Text>
                                <Input
                                    className="mt-1"
                                    value={rootFolderName}
                                    onChange={(e) => setRootFolderName(e.target.value)}
                                    placeholder="Excited Gem Lists"
                                    prefix={<span className="text-gray-400 text-xs">📁</span>}
                                />
                            </div>

                            {/* Parent location picker */}
                            {bookmarkFolders.length > 0 && (
                                <div>
                                    <Text strong>Save inside</Text>
                                    <TreeSelect
                                        className="mt-1 w-full"
                                        treeData={bookmarkFolders}
                                        value={selectedBookmarkParent}
                                        onChange={setSelectedBookmarkParent}
                                        placeholder="Select bookmark folder (default: Bookmarks Bar)"
                                        treeDefaultExpandAll
                                        showSearch
                                        treeLine
                                    />
                                    <Text type="secondary" className="text-[11px] mt-1 block">
                                        Final path: <code className="bg-slate-100 px-1 rounded">{bookmarkFolders.find(f => f.value === selectedBookmarkParent)?.title ?? 'Bookmarks Bar'}</code>{' → '}<code className="bg-slate-100 px-1 rounded">{rootFolderName || 'Excited Gem Lists'}</code>{' → Library → List'}
                                    </Text>
                                </div>
                            )}
                        </div>
                    )}

                    <Divider className="!my-2" />

                    {/* Library / Folder */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Library size={15} className="text-blue-500" />
                            <Text strong>Library</Text>
                        </div>
                        <Radio.Group
                            value={libraryMode}
                            onChange={(e) => setLibraryMode(e.target.value)}
                        >
                            <Space direction="vertical">
                                <Radio value="new">Create New Library</Radio>
                                <Radio value="existing" disabled={libraries.length === 0}>
                                    Add to Existing Library{' '}
                                    {libraries.length === 0 && (
                                        <Text type="secondary" className="text-xs">(none yet)</Text>
                                    )}
                                </Radio>
                            </Space>
                        </Radio.Group>

                        {libraryMode === 'new' && (
                            <Input
                                className="mt-2"
                                placeholder="Library name (e.g. Work Research)"
                                value={newLibraryName}
                                onChange={(e) => setNewLibraryName(e.target.value)}
                                prefix={<FolderOpen size={14} className="text-gray-400" />}
                            />
                        )}

                        {libraryMode === 'existing' && libraries.length > 0 && (
                            <Select
                                className="mt-2 w-full"
                                value={existingLibraryId}
                                onChange={setExistingLibraryId}
                                options={libraries.map((lib) => ({
                                    label: (
                                        <div className="flex items-center gap-1">
                                            <FolderOpen size={13} />
                                            <span>{lib.name || 'Unnamed Library'}</span>
                                            <Text type="secondary" className="text-xs ml-1">
                                                ({lib.lists.length} lists)
                                            </Text>
                                        </div>
                                    ),
                                    value: lib.id
                                }))}
                            />
                        )}
                    </div>

                    <Divider className="!my-2" />

                    {/* Post-save behavior */}
                    <div>
                        <Text strong>After saving</Text>
                        <div className="mt-2 flex flex-col gap-2">
                            <Checkbox
                                checked={clearSelection}
                                onChange={(e) => setClearSelection(e.target.checked)}
                            >
                                Clear tab selection
                            </Checkbox>
                            <Checkbox
                                checked={closeTabs}
                                onChange={(e) => setCloseTabs(e.target.checked)}
                            >
                                Close the saved tabs
                            </Checkbox>
                        </div>
                    </div>
                </div>

                {/* Right Column - Tabs Preview */}
                <div className="flex-1">
                    <div>
                        <div className="flex items-center justify-between mb-1">
                            <Text strong>
                                Tabs Preview{' '}
                                <Text type="secondary" className="font-normal text-xs">
                                    ({effectiveTabs.length} will be saved
                                    {dupeCount > 0 ? `, ${dupeCount} skipped as duplicates` : ''})
                                </Text>
                            </Text>
                        </div>

                        {dupeCount > 0 && (
                            <Alert
                                type="info"
                                message={`${dupeCount} duplicate URL${dupeCount > 1 ? 's' : ''} will be skipped`}
                                className="mb-2 text-xs"
                                showIcon
                            />
                        )}

                        <div className="border rounded-md max-h-96 overflow-y-auto bg-slate-50">
                            <List
                                size="small"
                                dataSource={deduplicatedTabs}
                                renderItem={(tab: any) => {
                                    const isDupe = tab.isDupeInSelection || tab.isDupeInLibrary
                                    return (
                                        <List.Item
                                            className={`!px-2 !py-1 border-b border-slate-100 last:border-0 ${isDupe ? 'opacity-40' : 'hover:bg-slate-100'} transition-colors`}
                                        >
                                            <div className="flex items-center gap-2 w-full overflow-hidden">
                                                {tab.favIconUrl ? (
                                                    <Avatar src={tab.favIconUrl} size={14} shape="square" className="flex-shrink-0" />
                                                ) : (
                                                    <Avatar size={14} shape="square" className="flex-shrink-0 text-[9px]">
                                                        {tab.title?.[0] || 'T'}
                                                    </Avatar>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <div className="text-xs font-medium leading-tight">
                                                        {tab.title || tab.url}
                                                    </div>
                                                    <div className="text-[10px] text-gray-500 leading-tight mt-1">
                                                        {tab.url}
                                                    </div>
                                                </div>
                                                {isDupe && (
                                                    <Tag color="default" className="text-[10px] flex-shrink-0">
                                                        {tab.isDupeInLibrary ? 'in library' : 'duplicate'}
                                                    </Tag>
                                                )}
                                            </div>
                                        </List.Item>
                                    )
                                }}
                            />
                        </div>
                    </div>
                </div>
            </div>
        </Modal>
    )
}
