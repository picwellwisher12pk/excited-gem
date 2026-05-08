import React, { useEffect, useState, useRef } from 'react'
import { Provider } from 'react-redux'
import {
  Button,
  Input,
  Space,
  List,
  Tag,
  Tooltip,
  Popconfirm,
  message,
  ConfigProvider,
  Checkbox,
  Dropdown,
  Popover
} from 'antd'
import {
  Save,
  FolderOpen,
  Trash2,
  Search as SearchIcon,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Edit2,
  X
} from 'lucide-react'
// @ts-ignore
import {
  getSessions,
  saveSessions,
  removeSessions,
  renameSession,
  removeTab,
  exportSessions,
  importSessions
} from '../components/getsetSessions'
import Sidebar, { SidebarToggleButton } from '../components/Sidebar'
import Brand from '../components/Header/Brand'
import logo from '../assets/logo.svg'
import store from '../store/store'
import { useSelector } from 'react-redux'
import { analytics } from '../utils/analytics'
import { usePageTracking } from '../components/Analytics/usePageTracking'
import UnifiedSearch from '../components/Search'
import 'antd/dist/reset.css'
import '../styles/index.css'

import { useDispatch } from 'react-redux'
import type { AppDispatch, RootState } from '../store/store'
import { toggleDrawer, setProviderStatus } from '../store/aiSlice'
import { AIDrawer } from '../components/AI/AIDrawer'
import { AIProviderBadge } from '../components/AI/AIProviderBadge'
import { getAIService } from '../ai/AIService'

interface TabData {
  url: string
  title: string
}

interface SessionData {
  created: number
  name?: string
  windows: {
    [key: string]: TabData[]
  }
}

// removed local Search

function SessionsPageContent() {
  const [sessions, setSessions] = useState<SessionData[]>([])
  const [filteredSessions, setFilteredSessions] = useState<SessionData[]>([])
  const [loading, setLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSessions, setExpandedSessions] = useState<Set<number>>(
    new Set()
  )
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [searchFilters, setSearchFilters] = useState({
    sessionName: true,
    tabUrl: true,
    tabTitle: true
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingSessionId, setEditingSessionId] = useState<number | null>(null)
  const [editSessionName, setEditSessionName] = useState('')

  const dispatch = useDispatch<AppDispatch>()
  const { regex: isRegex } = useSelector((state: any) => state.search || { regex: false })
  const { drawerOpen, isLoading: aiLoading, status } = useSelector((s: RootState) => s.ai)

  usePageTracking('/sessions', 'Sessions')

  const fetchSessions = async () => {
    setLoading(true)
    try {
      const items: any = await getSessions()
      setSessions(items || [])
      setFilteredSessions(items || [])
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
        dispatch(setProviderStatus({ connected: false, error: 'AI Service unavailable' }))
      }
    }
    checkAI()
  }, [dispatch])

  const handleSaveCurrentSession = async () => {
    setSaveLoading(true)
    try {
      await saveSessions()
      await fetchSessions()
      message.success('Session saved successfully')
      analytics.trackEvent('Sessions', 'Save Session')
    } catch (error) {
      message.error('Failed to save session')
    } finally {
      setSaveLoading(false)
    }
  }

  const handleRestore = (url?: string, sessionData?: SessionData) => {
    if (url) {
      chrome.tabs.create({ url })
      analytics.trackEvent('Sessions', 'Restore Single Tab')
    } else if (sessionData) {
      Object.values(sessionData.windows)
        .flat()
        .forEach((tab) => {
          chrome.tabs.create({ url: tab.url })
        })
      message.success('Session restored')
      analytics.trackEvent(
        'Sessions',
        'Restore Session',
        undefined,
        getTotalTabs(sessionData)
      )
    }
  }

  const handleDelete = async (sessionId: number) => {
    await removeSessions(sessionId)
    await fetchSessions()
    message.success('Session deleted')
    analytics.trackEvent('Sessions', 'Delete Session')
  }

  const handleRename = async (sessionId: number) => {
    if (!editSessionName.trim()) {
      setEditingSessionId(null)
      return
    }
    try {
      await renameSession(sessionId, editSessionName.trim())
      await fetchSessions()
      message.success('Session renamed')
      analytics.trackEvent('Sessions', 'Rename Session')
    } catch (error) {
      message.error('Failed to rename session')
    }
    setEditingSessionId(null)
  }

  const startRename = (e: React.MouseEvent, sessionId: number, currentName: string) => {
    e.stopPropagation()
    setEditingSessionId(sessionId)
    setEditSessionName(currentName || 'Unnamed Session')
  }

  const handleRemoveUrl = async (
    sessionId: number,
    windowId: string,
    url: string
  ) => {
    await removeTab(url, windowId, sessionId)
    await fetchSessions()
    message.success('URL removed')
    analytics.trackEvent('Sessions', 'Remove URL')
  }

  const handleExport = async () => {
    try {
      const data = await exportSessions()
      const dataStr = JSON.stringify(data, null, 2)
      const dataBlob = new Blob([dataStr], { type: 'application/json' })
      const url = URL.createObjectURL(dataBlob)
      const link = document.createElement('a')
      link.href = url
      link.download = `sessions-${Date.now()}.json`
      link.click()
      URL.revokeObjectURL(url)
      message.success('Sessions exported')
      analytics.trackEvent('Sessions', 'Export')
    } catch (error) {
      message.error('Failed to export sessions')
    }
  }

  const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (e) => {
      try {
        const imported = JSON.parse(e.target?.result as string)
        await importSessions(imported, true)
        await fetchSessions()
        message.success('Sessions imported successfully')
        analytics.trackEvent('Sessions', 'Import')
      } catch (error) {
        message.error('Failed to import sessions')
      }
    }
    reader.readAsText(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    if (!value.trim()) {
      setFilteredSessions(sessions)
      return
    }

    const query = value.toLowerCase()

    let searchRegex: RegExp | null = null
    if (isRegex) {
      try {
        searchRegex = new RegExp(value, 'i')
      } catch (e) { /* invalid regex */ }
    }

    const filtered = sessions.filter((session) => {
      // Name filter
      if (searchFilters.sessionName) {
        if (isRegex && searchRegex && session.name) {
          if (searchRegex.test(session.name)) return true
        } else if (session.name?.toLowerCase().includes(query)) {
          return true
        }
      }

      // Tab Url or Title filter
      if (searchFilters.tabUrl || searchFilters.tabTitle) {
        return Object.values(session.windows).some((tabs) =>
          tabs.some((tab) => {
            if (isRegex && searchRegex) {
              if (searchFilters.tabUrl && searchRegex.test(tab.url)) return true
              if (searchFilters.tabTitle && searchRegex.test(tab.title)) return true
              return false
            } else {
              if (searchFilters.tabUrl && tab.url.toLowerCase().includes(query)) return true
              if (searchFilters.tabTitle && tab.title.toLowerCase().includes(query)) return true
              return false
            }
          })
        )
      }

      return false
    })
    setFilteredSessions(filtered)
  }

  const toggleExpand = (sessionId: number) => {
    const newExpanded = new Set(expandedSessions)
    if (newExpanded.has(sessionId)) {
      newExpanded.delete(sessionId)
    } else {
      newExpanded.add(sessionId)
    }
    setExpandedSessions(newExpanded)
  }

  useEffect(() => {
    fetchSessions()
  }, [])

  useEffect(() => {
    if (searchQuery) {
      handleSearch(searchQuery)
    }
  }, [searchFilters, isRegex])

  const formatDate = (timestamp: number) => {
    return new Date(timestamp).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const getTotalTabs = (session: SessionData) => {
    return Object.values(session.windows).reduce(
      (sum, tabs) => sum + tabs.length,
      0
    )
  }

  const searchFilterContent = (
    <div className="p-2">
      <Space direction="vertical">
        <Checkbox
          checked={searchFilters.sessionName}
          onChange={(e) =>
            setSearchFilters({
              ...searchFilters,
              sessionName: e.target.checked
            })
          }
        >
          Name
        </Checkbox>
        <Checkbox
          checked={searchFilters.tabUrl}
          onChange={(e) =>
            setSearchFilters({ ...searchFilters, tabUrl: e.target.checked })
          }
        >
          URL
        </Checkbox>
        <Checkbox
          checked={searchFilters.tabTitle}
          onChange={(e) =>
            setSearchFilters({ ...searchFilters, tabTitle: e.target.checked })
          }
        >
          Title
        </Checkbox>
      </Space>
    </div>
  )

  const actionItems = [
    {
      key: 'save',
      label: 'Save Session',
      icon: <Save size={16} />,
      onClick: handleSaveCurrentSession
    },
    {
      key: 'export',
      label: 'Export Sessions',
      icon: <Download size={16} />,
      onClick: handleExport,
      disabled: sessions.length === 0
    },
    {
      key: 'import',
      label: 'Import Sessions',
      icon: <Upload size={16} />,
      onClick: () => fileInputRef.current?.click()
    }
  ]

  return (
    <div className="flex h-[100vh] relative overflow-hidden">
      <Sidebar
        currentPage="sessions"
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onAIClick={() => dispatch(toggleDrawer())}
        aiEnabled={status?.connected}
      />
      <div className="flex flex-col flex-1">
        {/* Header matching Tabs page structure */}
        <header className="bg-gradient-to-t from-cyan-500 to-blue-500 p-2 transition-all duration-200 ease-in-out">
          <section className="flex items-center justify-between gap-4 w-full">
            <div className="flex-none flex items-center shrink-0">
              <div className="mr-2">
                <SidebarToggleButton
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                />
              </div>
              <div className="hidden sm:block">{Brand(logo)}</div>
              <div className="flex items-center ml-4">
                <span className="text-white font-semibold text-lg">
                  Sessions
                </span>
                {sessions.length > 0 && (
                  <span className="ml-2 text-white/80 text-sm">
                    ({sessions.length})
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 flex justify-end items-center gap-4 pr-2">
              <div className="flex-none flex items-center shrink-0">
                <Dropdown
                  menu={{ items: actionItems }}
                  trigger={['click']}
                  placement="bottomRight"
                >
                  <Button
                    icon={<MoreHorizontal size={20} className="text-white" />}
                    type="text"
                    className="flex items-center justify-center hover:bg-white/10"
                  />
                </Dropdown>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </div>

              <div className="w-full max-w-xl">
                <UnifiedSearch
                  isReduxConnected={false}
                  placeholder="Search sessions..."
                  onSearch={handleSearch}
                  onChange={handleSearch}
                  showTabFilters={false}
                  foundCount={filteredSessions.length}
                  extraSuffix={
                    <Popover
                      content={searchFilterContent}
                      trigger="click"
                      placement="bottomRight"
                    >
                      <Button
                        type="text"
                        size="small"
                        className="text-gray-400 hover:text-blue-500 flex items-center"
                      >
                        Search in
                      </Button>
                    </Popover>
                  }
                  className="w-full !ml-0"
                />
              </div>
            </div>
          </section>
        </header>

        {/* Sessions List */}
        <div className="flex-1 overflow-auto bg-gray-50 p-4">
          {filteredSessions.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              {searchQuery ? 'No sessions found' : 'No saved sessions yet'}
            </div>
          ) : (
            <List
              dataSource={filteredSessions}
              renderItem={(session) => {
                const totalTabs = getTotalTabs(session)
                const isExpanded = expandedSessions.has(session.created)

                return (
                  <div
                    key={session.created}
                    className="bg-white rounded mb-2 shadow-sm hover:shadow transition-shadow"
                  >
                    <div
                      className="flex items-center justify-between px-4 py-2 cursor-pointer hover:bg-gray-50"
                      onClick={() => toggleExpand(session.created)}
                    >
                      <div className="flex items-center space-x-3 flex-1">
                        <Button
                          type="text"
                          size="small"
                          icon={
                            isExpanded ? (
                              <ChevronUp size={16} />
                            ) : (
                              <ChevronDown size={16} />
                            )
                          }
                          className="flex items-center justify-center"
                        />
                        {editingSessionId === session.created ? (
                          <Input
                            autoFocus
                            size="small"
                            value={editSessionName}
                            onChange={(e) => setEditSessionName(e.target.value)}
                            onPressEnter={() => handleRename(session.created)}
                            onBlur={() => handleRename(session.created)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-48"
                          />
                        ) : (
                          <span className="font-medium">
                            {session.name || 'Unnamed Session'}
                          </span>
                        )}
                        <Tag color="blue">{formatDate(session.created)}</Tag>
                        <Tag color="green">{totalTabs} tabs</Tag>
                      </div>
                      <Space size="small">
                        <Tooltip title="Restore all">
                          <Button
                            type="primary"
                            size="small"
                            icon={<FolderOpen size={16} />}
                            onClick={(e) => {
                              e.stopPropagation()
                              handleRestore(undefined, session)
                            }}
                            className="flex items-center justify-center"
                          />
                        </Tooltip>
                        <Tooltip title="Rename">
                          <Button
                            size="small"
                            icon={<Edit2 size={16} />}
                            onClick={(e) => startRename(e, session.created, session.name || '')}
                            className="flex items-center justify-center text-gray-500"
                          />
                        </Tooltip>
                        <Popconfirm
                          title="Delete this session?"
                          onConfirm={(e) => {
                            e?.stopPropagation()
                            handleDelete(session.created)
                          }}
                          okText="Delete"
                          cancelText="Cancel"
                        >
                          <Button
                            danger
                            size="small"
                            icon={<Trash2 size={16} />}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-center"
                          />
                        </Popconfirm>
                      </Space>
                    </div>

                    {isExpanded && (
                      <div className="border-t px-4 py-3 bg-gray-50">
                        {Object.keys(session.windows).map((winId, winIndex) => (
                          <div key={winId} className="mb-3">
                            <div className="text-xs text-gray-500 mb-1">
                              Window {winIndex + 1} (
                              {session.windows[winId].length} tabs)
                            </div>
                            <div className="space-y-1">
                              {session.windows[winId].map((tab, tabIndex) => (
                                <div
                                  key={tabIndex}
                                  className="flex items-center justify-between bg-white px-3 py-1.5 rounded text-sm hover:bg-blue-50"
                                >
                                  <div className="flex-1 truncate">
                                    <a
                                      href={tab.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 hover:underline"
                                    >
                                      {tab.title || tab.url}
                                    </a>
                                  </div>
                                  <Space size="small">
                                    <Button
                                      type="link"
                                      size="small"
                                      onClick={() => handleRestore(tab.url)}
                                    >
                                      Open
                                    </Button>
                                    <Popconfirm
                                      title="Remove this URL?"
                                      onConfirm={() =>
                                        handleRemoveUrl(
                                          session.created,
                                          winId,
                                          tab.url
                                        )
                                      }
                                      okText="Remove"
                                      cancelText="Cancel"
                                    >
                                      <Button
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<X size={14} />}
                                        className="flex items-center justify-center"
                                      />
                                    </Popconfirm>
                                  </Space>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              }}
            />
          )}
        </div>

        <AIDrawer
          open={drawerOpen}
          onClose={() => dispatch(toggleDrawer())}
          isLoading={aiLoading}
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
    </div>
  )
}

export default function SessionsPage() {
  return (
    <Provider store={store}>
      <ConfigProvider
        theme={{
          token: {
            borderRadius: 4,
            borderRadiusSM: 4,
            borderRadiusLG: 4
          }
        }}
      >
        <SessionsPageContent />
      </ConfigProvider>
    </Provider>
  )
}
