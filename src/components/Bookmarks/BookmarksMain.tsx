import { useState, useEffect, useMemo } from 'react'
import {
  Layout,
  Typography,
  Spin,
  Tree,
  Button,
  Space,
  Input,
  Modal,
  Form,
  Checkbox,
  List
} from 'antd'
import { SimpleAutoSizer } from '../../components/SimpleAutoSizer'
import {
  FolderOutlined,
  FileOutlined,
  DownloadOutlined,
  UploadOutlined,
  EditOutlined,
  DeleteOutlined,
  PlusOutlined,
  CopyOutlined
} from '@ant-design/icons'
const { Text, Title } = Typography
import { SidebarToggleButton } from '../../components/Sidebar'
import Sidebar from '../../components/Sidebar/Sidebar'
import Brand from '../../components/Header/Brand'
import ItemBtn from '../../components/ItemBtn'
import { Move } from 'lucide-react'
import logo from '../../assets/logo.svg'
import UnifiedSearch from '../../components/Search'
import { useSelector, useDispatch } from 'react-redux'
import type { AppDispatch, RootState } from '../../store/store'
import { toggleDrawer, setProviderStatus } from '../../store/aiSlice'
import { AIDrawer } from '../AI/AIDrawer'
import { AIProviderBadge } from '../AI/AIProviderBadge'
import { getAIService } from '../../ai/AIService'
import {
  getTree,
  searchBookmarks,
  removeBookmark,
  removeBookmarkTree,
  exportBookmarks,
  restoreBookmarks,
  createBookmark,
  updateBookmark,
  moveBookmark,
  moveBookmarks,
  copyBookmarks,
  findDuplicates,
  BookmarkNode
} from '../../utils/bookmarks'

import '../../styles/index.css'

const { Content } = Layout

export default function BookmarksMain() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [bookmarks, setBookmarks] = useState<BookmarkNode[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const dispatch = useDispatch<AppDispatch>()
  const {
    drawerOpen,
    isLoading: aiLoading,
    status
  } = useSelector((s: RootState) => s.ai)

  // Modal State
  const [isModalVisible, setIsModalVisible] = useState(false)
  const [editingNode, setEditingNode] = useState<BookmarkNode | null>(null)
  const [form] = Form.useForm()
  const [modalMode, setModalMode] = useState<
    'create_folder' | 'create_bookmark' | 'edit'
  >('create_bookmark')
  const [activeParentId, setActiveParentId] = useState<string | undefined>(
    undefined
  )

  const [isDuplicatesModalVisible, setIsDuplicatesModalVisible] =
    useState(false)
  const [isCalculatingDuplicates, setIsCalculatingDuplicates] = useState(false)
  const [duplicateGroups, setDuplicateGroups] = useState<
    Record<string, BookmarkNode[]>
  >({})
  const [selectedDuplicateIds, setSelectedDuplicateIds] = useState<string[]>([])

  const [expandedKeys, setExpandedKeys] = useState<React.Key[]>([])
  const [checkedKeys, setCheckedKeys] = useState<React.Key[]>([])
  const [isFolderPickerVisible, setIsFolderPickerVisible] = useState(false)
  const [folderPickerMode, setFolderPickerMode] = useState<
    'move' | 'copy' | null
  >(null)
  const [targetFolderKey, setTargetFolderKey] = useState<string | null>(null)

  const onExpand = (newExpandedKeys: React.Key[]) => {
    setExpandedKeys(newExpandedKeys)
  }

  const onCheck = (checkedKeysValue: any) => {
    setCheckedKeys(checkedKeysValue.checked || checkedKeysValue)
  }

  const onSelect = (selectedKeys: React.Key[], info: any) => {
    const { node } = info
    if (!node.isLeaf) {
      setExpandedKeys((prev) => {
        const newKeys = [...prev]
        const index = newKeys.indexOf(node.key)
        if (index > -1) {
          newKeys.splice(index, 1)
        } else {
          newKeys.push(node.key)
        }
        return newKeys
      })
    }
  }
  const { regex: isRegex, searchIn = { title: true, url: true } } = useSelector(
    (state: any) =>
      state.search || { regex: false, searchIn: { title: true, url: true } }
  )

  const filterTree = (
    nodes: BookmarkNode[],
    query: string,
    isRegex: boolean,
    searchIn: any
  ): BookmarkNode[] => {
    const result: BookmarkNode[] = []
    let searchRegex: RegExp | null = null
    if (isRegex) {
      try {
        searchRegex = new RegExp(query, 'i')
      } catch (e) {}
    }
    const q = query.toLowerCase()

    for (const node of nodes) {
      let matches = false

      if (isRegex && searchRegex) {
        if (searchIn?.title && node.title && searchRegex.test(node.title))
          matches = true
        if (!matches && searchIn?.url && node.url && searchRegex.test(node.url))
          matches = true
      } else {
        if (
          searchIn?.title &&
          node.title &&
          node.title.toLowerCase().includes(q)
        )
          matches = true
        if (
          !matches &&
          searchIn?.url &&
          node.url &&
          node.url.toLowerCase().includes(q)
        )
          matches = true
      }

      if (matches) {
        result.push(node)
      } else if (node.children) {
        const filteredChildren = filterTree(
          node.children,
          query,
          isRegex,
          searchIn
        )
        if (filteredChildren.length > 0) {
          result.push({ ...node, children: filteredChildren })
        }
      }
    }
    return result
  }

  const fetchBookmarks = async () => {
    setLoading(true)
    try {
      if (searchQuery) {
        // If it's a simple query across both fields, use the fast native search
        if (!isRegex && searchIn?.title && searchIn?.url) {
          const results = await searchBookmarks(searchQuery)
          setBookmarks(results)
        } else {
          // Otherwise we need to filter the whole tree manually
          const tree = await getTree()
          const rootNodes = tree[0]?.children || []
          setBookmarks(filterTree(rootNodes, searchQuery, isRegex, searchIn))
        }
      } else {
        const tree = await getTree()
        setBookmarks(tree[0]?.children || [])
      }
    } catch (error) {
      console.error('Failed to fetch bookmarks:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    const checkAI = async () => {
      try {
        const service = await getAIService()
        const status = await service.getStatus()
        dispatch(setProviderStatus(status))
      } catch (e) {
        dispatch(
          setProviderStatus({
            connected: false,
            error: 'AI Service unavailable'
          })
        )
      }
    }
    checkAI()
  }, [dispatch])

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchBookmarks()
    }, 300)

    return () => clearTimeout(delayDebounceFn)
  }, [searchQuery, isRegex])

  const handleExport = async () => {
    const jsonStr = await exportBookmarks()
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `bookmarks_backup_${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json'
    input.onchange = async (e: any) => {
      const file = e.target.files[0]
      if (!file) return

      const reader = new FileReader()
      reader.onload = async (event) => {
        try {
          const jsonString = event.target?.result as string
          setLoading(true)
          await restoreBookmarks(jsonString)
          await fetchBookmarks()
        } catch (error) {
          console.error('Import failed:', error)
          Modal.error({
            title: 'Import Failed',
            content: 'There was an error importing your bookmarks.'
          })
        } finally {
          setLoading(false)
        }
      }
      reader.readAsText(file)
    }
    input.click()
  }

  const handleDelete = (node: BookmarkNode) => {
    Modal.confirm({
      title: `Delete ${node.url ? 'Bookmark' : 'Folder'}?`,
      content: `Are you sure you want to delete "${node.title}"?`,
      okText: 'Yes',
      okType: 'danger',
      cancelText: 'No',
      onOk: async () => {
        try {
          if (node.url) {
            await removeBookmark(node.id)
          } else {
            await removeBookmarkTree(node.id)
          }

          // Re-calculate duplicates if modal is open
          if (isDuplicatesModalVisible) {
            const currentDuplicates = { ...duplicateGroups }
            for (const url in currentDuplicates) {
              currentDuplicates[url] = currentDuplicates[url].filter(
                (b) => b.id !== node.id
              )
              if (currentDuplicates[url].length <= 1) {
                delete currentDuplicates[url]
              }
            }
            setDuplicateGroups(currentDuplicates)
          }

          fetchBookmarks()
        } catch (error) {
          console.error('Failed to delete node', error)
        }
      }
    })
  }

  const showModal = (
    mode: 'create_folder' | 'create_bookmark' | 'edit',
    node?: BookmarkNode,
    parentId?: string
  ) => {
    setModalMode(mode)
    setEditingNode(mode === 'edit' && node ? node : null)
    setActiveParentId(parentId)

    if (mode === 'edit' && node) {
      form.setFieldsValue({
        title: node.title,
        url: node.url
      })
    } else {
      form.resetFields()
    }

    setIsModalVisible(true)
  }

  const handleFindDuplicates = () => {
    setIsDuplicatesModalVisible(true)
    setIsCalculatingDuplicates(true)
    setSelectedDuplicateIds([])
    setDuplicateGroups({})

    // Offload calculation so modal opens immediately with spinner
    setTimeout(() => {
      try {
        const dups = findDuplicates(bookmarks)
        setDuplicateGroups(dups)
      } catch (err) {
        console.error('Failed to find duplicates:', err)
      } finally {
        setIsCalculatingDuplicates(false)
      }
    }, 50)
  }

  const toggleDuplicateSelection = (id: string) => {
    setSelectedDuplicateIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const handleSelectAllDuplicatesKeepFirst = () => {
    const idsToSelect: string[] = []
    Object.values(duplicateGroups).forEach((nodes) => {
      // Keep the first one, select the rest
      nodes.slice(1).forEach((node) => idsToSelect.push(node.id))
    })
    setSelectedDuplicateIds(idsToSelect)
  }

  const handleSelectAllDuplicates = () => {
    const idsToSelect: string[] = []
    Object.values(duplicateGroups).forEach((nodes) => {
      nodes.forEach((node) => idsToSelect.push(node.id))
    })
    setSelectedDuplicateIds(idsToSelect)
  }

  const handleCloseSelectedDuplicates = async () => {
    if (selectedDuplicateIds.length === 0) return

    try {
      setLoading(true)
      for (const id of selectedDuplicateIds) {
        await removeBookmark(id)
      }

      // Re-calculate local state grouping
      const currentDuplicates = { ...duplicateGroups }
      for (const url in currentDuplicates) {
        currentDuplicates[url] = currentDuplicates[url].filter(
          (b) => !selectedDuplicateIds.includes(b.id)
        )
        if (currentDuplicates[url].length <= 1) {
          delete currentDuplicates[url]
        }
      }
      setDuplicateGroups(currentDuplicates)
      setSelectedDuplicateIds([])
      fetchBookmarks()
    } catch (error) {
      console.error('Failed to delete selected duplicates', error)
    } finally {
      setLoading(false)
    }
  }

  const handleModalOk = async () => {
    try {
      const values = await form.validateFields()
      setLoading(true)

      if (modalMode === 'edit' && editingNode) {
        await updateBookmark(editingNode.id, {
          title: values.title,
          url: values.url
        })
      } else if (modalMode === 'create_folder') {
        await createBookmark({
          parentId: activeParentId || '1', // Default to Bookmarks Bar (id '1') if no parent
          title: values.title
        })
      } else if (modalMode === 'create_bookmark') {
        await createBookmark({
          parentId: activeParentId || '1',
          title: values.title,
          url: values.url
        })
      }

      setIsModalVisible(false)
      fetchBookmarks()
    } catch (error) {
      console.error('Modal action failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleBulkDelete = async () => {
    if (checkedKeys.length === 0) return
    Modal.confirm({
      title: `Delete ${checkedKeys.length} items?`,
      content:
        'This action cannot be undone and will delete all selected bookmarks and folders.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        setLoading(true)
        try {
          for (const key of checkedKeys) {
            try {
              await removeBookmarkTree(key as string)
            } catch (e) {
              // If it's a leaf, removeBookmark might be needed or handled by removeBookmarkTree
              await removeBookmark(key as string)
            }
          }
          setCheckedKeys([])
          fetchBookmarks()
        } catch (error) {
          console.error('Bulk delete failed:', error)
        } finally {
          setLoading(false)
        }
      }
    })
  }

  const findNodesByIds = (
    ids: string[],
    currentNodes: BookmarkNode[]
  ): BookmarkNode[] => {
    let found: BookmarkNode[] = []
    for (const node of currentNodes) {
      if (ids.includes(node.id)) {
        found.push(node)
      }
      if (node.children) {
        found = found.concat(findNodesByIds(ids, node.children))
      }
    }
    return found
  }

  const handleBulkAction = async (targetId: string) => {
    if (!targetId) return
    setLoading(true)
    try {
      if (folderPickerMode === 'move') {
        await moveBookmarks(checkedKeys as string[], targetId)
      } else if (folderPickerMode === 'copy') {
        const selectedNodes = findNodesByIds(checkedKeys as string[], bookmarks)
        await copyBookmarks(selectedNodes, targetId)
      }
      setCheckedKeys([])
      setIsFolderPickerVisible(false)
      setTargetFolderKey(null)
      fetchBookmarks()
    } catch (error) {
      console.error('Bulk action failed:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleDrop = async (info: any) => {
    const dropKey = info.node.key
    const dragKey = info.dragNode.key
    const dropPos = info.node.pos.split('-')
    const dropPosition = info.dropPosition - Number(dropPos[dropPos.length - 1])

    try {
      setLoading(true)

      const isMultiDrag = checkedKeys.includes(dragKey)
      const itemsToMove = isMultiDrag
        ? (checkedKeys as string[])
        : [dragKey as string]

      for (const id of itemsToMove) {
        // If dropping inside a folder
        if (!info.dropToGap && !info.node.isLeaf) {
          await moveBookmark(id, { parentId: dropKey })
        }
        // Dropping next to an item
        else {
          await moveBookmark(id, {
            parentId: info.node.parentId,
            index: dropPosition < 0 ? info.node.index : info.node.index + 1
          })
        }
      }
      fetchBookmarks()
    } catch (e) {
      console.error('Failed to move bookmark(s)', e)
    } finally {
      setLoading(false)
    }
  }

  const buildTreeData = (data: BookmarkNode[]): any[] => {
    return data.map((item) => {
      const isFolder = !item.url
      return {
        key: item.id,
        title: item.title,
        isLeaf: !isFolder,
        children: item.children ? buildTreeData(item.children) : [],
        dataRef: item,
        parentId: item.parentId,
        index: item.index
      }
    })
  }

  const treeData = useMemo(() => buildTreeData(bookmarks), [bookmarks])

  const folderTreeData = useMemo(() => {
    const filterFolders = (nodes: any[]): any[] => {
      return nodes
        .filter((node) => !node.dataRef.url)
        .map((node) => ({
          ...node,
          children: node.children ? filterFolders(node.children) : []
        }))
    }
    return filterFolders(treeData)
  }, [treeData])

  const titleRender = (nodeData: any) => {
    const item = nodeData.dataRef
    const isFolder = !item.url

    return (
      <div className="flex justify-between items-center w-full group py-0.5 pr-2 relative">
        <div className="flex items-center overflow-hidden flex-1">
          {isFolder ? (
            <FolderOutlined className="text-blue-500 mr-2 flex-shrink-0" />
          ) : (
            <FileOutlined className="text-gray-500 mr-2 flex-shrink-0" />
          )}
          <span className="truncate flex-1">
            {isFolder ? (
              item.title
            ) : (
              <a
                href={item.url}
                target="_blank"
                rel="noreferrer"
                className="text-gray-800 hover:text-blue-500"
                onClick={(e) => e.stopPropagation()}
              >
                {item.title}
              </a>
            )}
            {item.url && (
              <span className="text-gray-400 text-xs ml-2 hidden group-hover:inline-block truncate max-w-[300px]">
                ({item.url})
              </span>
            )}
          </span>
        </div>

        <div className="tab-actions flex items-center gap-1.5 transition-all duration-200 ease-out opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0 absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 pl-2">
          {isFolder && (
            <>
              <ItemBtn
                title="Add Bookmark Here"
                onClick={(e) => {
                  e.stopPropagation()
                  showModal('create_bookmark', undefined, item.id)
                }}
                className="rounded-full !bg-white hover:!bg-slate-100 shadow-sm !border-0 w-7 h-7 !min-w-0 flex items-center justify-center transition-colors"
              >
                <PlusOutlined className="text-slate-500 text-xs" />
              </ItemBtn>
              <ItemBtn
                title="Add Folder Here"
                onClick={(e) => {
                  e.stopPropagation()
                  showModal('create_folder', undefined, item.id)
                }}
                className="rounded-full !bg-white hover:!bg-slate-100 shadow-sm !border-0 w-7 h-7 !min-w-0 flex items-center justify-center transition-colors"
              >
                <FolderOutlined className="text-slate-500 text-xs" />
              </ItemBtn>
              <div className="w-px h-4 bg-gray-200 mx-0.5"></div>
            </>
          )}

          <ItemBtn
            title="Edit"
            onClick={(e) => {
              e.stopPropagation()
              showModal('edit', item)
            }}
            className="rounded-full !bg-white hover:!bg-slate-100 shadow-sm !border-0 w-7 h-7 !min-w-0 flex items-center justify-center transition-colors"
          >
            <EditOutlined className="text-slate-500 text-xs" />
          </ItemBtn>

          <ItemBtn
            title="Delete"
            onClick={(e) => {
              e.stopPropagation()
              handleDelete(item)
            }}
            className="rounded-full !bg-white hover:!bg-slate-100 shadow-sm !border-0 w-7 h-7 !min-w-0 flex items-center justify-center transition-colors group/delete"
          >
            <DeleteOutlined className="text-red-500 group-hover/delete:text-red-600 text-xs" />
          </ItemBtn>
        </div>
      </div>
    )
  }

  return (
    <div className="flex h-[100vh] relative overflow-hidden">
      <Sidebar
        currentPage="bookmarks"
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onAIClick={() => dispatch(toggleDrawer())}
        aiEnabled={status?.connected}
      />
      <div className="flex flex-col flex-1 min-h-0">
        <header className="bg-gradient-to-t from-cyan-500 to-blue-500 p-2 transition-all duration-200 ease-in-out">
          <section className="flex items-center justify-between gap-4 w-full">
            <div className="flex-none flex items-center shrink-0">
              <div className="mr-2">
                <SidebarToggleButton
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
              </div>
              <div className="hidden sm:block">{Brand(logo)}</div>
              <span className="text-white font-semibold text-lg ml-4">
                Bookmarks
              </span>
            </div>

            <div className="flex-1 flex justify-end items-center pr-2">
              <div className="w-full max-w-xl">
                <UnifiedSearch
                  isReduxConnected={false}
                  placeholder="Search bookmarks..."
                  value={searchQuery}
                  onChange={setSearchQuery}
                  onSearch={setSearchQuery}
                  showTabFilters={false}
                  foundCount={bookmarks.length}
                  className="w-full !ml-0 rounded-md border-0"
                />
              </div>
            </div>
          </section>

          <section className="flex flex-row justify-between items-center mt-1 h-8">
            <div className="flex mb-0 overflow-x-auto sm:overflow-visible no-scrollbar ml-2 items-center">
              <span className="text-white font-semibold text-sm">
                Bookmarks Manager
              </span>
            </div>
            <Space className="mr-2">
              <Button
                size="small"
                icon={<CopyOutlined />}
                onClick={handleFindDuplicates}
                className="border-white text-blue-500 hover:!text-white hover:!border-white bg-white hover:!bg-transparent"
              >
                Find Duplicates
              </Button>
              <Button
                size="small"
                icon={<UploadOutlined />}
                onClick={handleImport}
                className="border-white text-blue-500 hover:!text-white hover:!border-white bg-white hover:!bg-transparent"
              >
                Import JSON
              </Button>
              <Button
                size="small"
                icon={<DownloadOutlined />}
                onClick={handleExport}
                className="border-white text-blue-500 hover:!text-white hover:!border-white bg-white hover:!bg-transparent"
              >
                Export JSON
              </Button>
              <Button
                size="small"
                type="primary"
                icon={<PlusOutlined />}
                onClick={() => showModal('create_bookmark')}
                className="!bg-blue-600 hover:!bg-blue-700 !border-none text-white shadow-sm"
              >
                Add Bookmark
              </Button>
            </Space>
          </section>
        </header>

        <div className="flex-1 overflow-hidden bg-gray-50 flex flex-col p-2">
          {loading ? (
            <div className="flex justify-center items-center flex-1">
              <Spin size="large" />
            </div>
          ) : bookmarks.length > 0 ? (
            <div className="flex-1 min-h-0 flex flex-col">
              {checkedKeys.length > 0 && (
                <div className="bg-blue-600 text-white px-4 py-2 flex justify-between items-center rounded-md mb-2 shadow-sm animate-in fade-in slide-in-from-top-2 duration-200">
                  <div className="flex items-center gap-4">
                    <span className="font-medium">
                      {checkedKeys.length} items selected
                    </span>
                    <Space split={<div className="w-px h-3 bg-blue-400" />}>
                      <Button
                        size="small"
                        type="text"
                        className="text-white hover:bg-blue-700 flex items-center"
                        onClick={() => {
                          setFolderPickerMode('move')
                          setIsFolderPickerVisible(true)
                        }}
                      >
                        <Move className="w-3 h-3 mr-1" /> Move To
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        className="text-white hover:bg-blue-700 flex items-center"
                        onClick={() => {
                          setFolderPickerMode('copy')
                          setIsFolderPickerVisible(true)
                        }}
                      >
                        <CopyOutlined className="text-xs mr-1" /> Copy To
                      </Button>
                      <Button
                        size="small"
                        type="text"
                        className="text-white hover:bg-red-500 hover:text-white flex items-center"
                        onClick={handleBulkDelete}
                      >
                        <DeleteOutlined className="text-xs mr-1" /> Delete
                      </Button>
                    </Space>
                  </div>
                  <Button
                    size="small"
                    type="text"
                    className="text-blue-100 hover:text-white"
                    onClick={() => setCheckedKeys([])}
                  >
                    Clear
                  </Button>
                </div>
              )}
              <div className="flex-1 min-h-0 overflow-hidden relative">
                <SimpleAutoSizer>
                  {({ height, width }) => (
                    <Tree
                      height={height}
                      className="bg-transparent"
                      treeData={treeData}
                      titleRender={titleRender}
                      checkable
                      checkedKeys={checkedKeys}
                      onCheck={onCheck}
                      draggable
                      onDrop={handleDrop}
                      blockNode
                      expandedKeys={expandedKeys}
                      onExpand={onExpand}
                      onSelect={onSelect}
                      virtual={true}
                    />
                  )}
                </SimpleAutoSizer>
              </div>
            </div>
          ) : (
            <div className="text-center text-gray-400 mt-20">
              No bookmarks found.
            </div>
          )}
        </div>

        <Modal
          title={
            modalMode === 'edit'
              ? `Edit ${editingNode?.url ? 'Bookmark' : 'Folder'}`
              : modalMode === 'create_folder'
                ? 'Create Folder'
                : 'Create Bookmark'
          }
          open={isModalVisible}
          onOk={handleModalOk}
          onCancel={() => setIsModalVisible(false)}
          okText="Save"
        >
          <Form form={form} layout="vertical" className="mt-4">
            <Form.Item
              name="title"
              label="Title"
              rules={[{ required: true, message: 'Please enter a title' }]}
            >
              <Input placeholder="Bookmark Title" />
            </Form.Item>
            {modalMode !== 'create_folder' &&
              (!editingNode || editingNode.url) && (
                <Form.Item
                  name="url"
                  label="URL"
                  rules={[
                    { required: true, message: 'Please enter a valid URL' },
                    {
                      type: 'url',
                      warningOnly: true,
                      message: 'This field must be a valid url.'
                    }
                  ]}
                >
                  <Input placeholder="https://example.com" />
                </Form.Item>
              )}
          </Form>
        </Modal>

        <Modal
          title={
            <Space>
              <Title level={4} style={{ margin: 0 }}>
                Duplicate Bookmarks
              </Title>{' '}
              <Text type="secondary">
                {isCalculatingDuplicates
                  ? '(Calculating...)'
                  : `(${Object.keys(duplicateGroups).length} groups found)`}
              </Text>
            </Space>
          }
          open={isDuplicatesModalVisible}
          onCancel={() => setIsDuplicatesModalVisible(false)}
          footer={
            <div className="flex justify-end gap-2">
              <Button
                key="close"
                onClick={() => setIsDuplicatesModalVisible(false)}
              >
                Done
              </Button>
              <Button
                key="keep-one"
                onClick={handleSelectAllDuplicatesKeepFirst}
                disabled={
                  isCalculatingDuplicates ||
                  Object.keys(duplicateGroups).length === 0
                }
              >
                Select All Duplicates (Keep 1st)
              </Button>
              <Button
                key="select-all"
                onClick={handleSelectAllDuplicates}
                disabled={
                  isCalculatingDuplicates ||
                  Object.keys(duplicateGroups).length === 0
                }
              >
                Select All
              </Button>
              <Button
                key="remove"
                type="primary"
                danger
                disabled={
                  selectedDuplicateIds.length === 0 || isCalculatingDuplicates
                }
                onClick={handleCloseSelectedDuplicates}
              >
                Delete Selected ({selectedDuplicateIds.length})
              </Button>
            </div>
          }
          width={800}
        >
          <div className="max-h-[60vh] overflow-y-auto">
            {isCalculatingDuplicates ? (
              <div className="flex justify-center items-center py-20">
                <Spin size="large" />
              </div>
            ) : Object.keys(duplicateGroups).length === 0 ? (
              <div className="text-center py-10 text-gray-500">
                No duplicate bookmarks found!
              </div>
            ) : (
              <List
                itemLayout="vertical"
                dataSource={Object.entries(duplicateGroups)}
                pagination={{
                  pageSize: 20,
                  size: 'small',
                  showSizeChanger: true,
                  pageSizeOptions: ['20', '50', '100'],
                  className: 'mt-4 p-4 border-t border-gray-100'
                }}
                renderItem={([url, nodes]) => (
                  <List.Item className="border-b border-gray-100 py-4">
                    <div
                      className="mb-2 font-medium text-blue-600 truncate"
                      title={url}
                    >
                      <a
                        href={url}
                        target="_blank"
                        rel="noreferrer"
                        className="hover:underline"
                      >
                        {url}
                      </a>
                    </div>
                    <div className="pl-4 space-y-2">
                      {nodes.map((node) => (
                        <div
                          key={node.id}
                          className="flex items-center justify-between bg-slate-50 p-2 rounded hover:bg-slate-100 transition-colors"
                        >
                          <div className="flex items-center gap-3 overflow-hidden flex-1 mr-4">
                            <Checkbox
                              checked={selectedDuplicateIds.includes(node.id)}
                              onChange={() => toggleDuplicateSelection(node.id)}
                            />
                            <FileOutlined className="text-gray-400 flex-shrink-0" />
                            <span
                              className="truncate text-sm text-gray-700"
                              title={node.title}
                            >
                              {node.title}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </List.Item>
                )}
              />
            )}
          </div>
        </Modal>

        <Modal
          title={`Select Destination Folder to ${folderPickerMode === 'move' ? 'Move' : 'Copy'} Items`}
          open={isFolderPickerVisible}
          onOk={() => targetFolderKey && handleBulkAction(targetFolderKey)}
          onCancel={() => {
            setIsFolderPickerVisible(false)
            setTargetFolderKey(null)
          }}
          okText="Confirm"
          confirmLoading={loading}
          okButtonProps={{ disabled: !targetFolderKey }}
        >
          <div className="mt-4">
            <Text type="secondary" className="mb-4 block">
              Choose a folder from your bookmarks:
            </Text>
            <div className="border border-gray-200 rounded-md p-2 max-h-[400px] overflow-y-auto">
              <Tree
                treeData={folderTreeData}
                onSelect={(keys) => setTargetFolderKey(keys[0] as string)}
                selectedKeys={targetFolderKey ? [targetFolderKey] : []}
                defaultExpandAll
              />
            </div>
          </div>
        </Modal>
      </div>

      <AIDrawer
        open={drawerOpen}
        onClose={() => dispatch(toggleDrawer())}
        isLoading={aiLoading}
        onOpenSettings={() => {
          chrome.tabs.create({
            url: chrome.runtime.getURL('tabs/settings.html#ai')
          })
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
