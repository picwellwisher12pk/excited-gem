import React, { useEffect, useState, useRef, useCallback } from 'react'
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
  Checkbox,
  Dropdown,
  Popover,
  Empty,
  Spin
} from 'antd'
import {
  Camera,
  FolderOpen,
  Trash2,
  Download,
  Upload,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  Edit2,
  FileText,
  X,
  Monitor,
} from 'lucide-react'
import {
  getSessions,
  saveCurrentSession,
  deleteSession,
  renameSession,
  removeTabFromSession,
  exportSessions,
  importSessions,
  markUrlAccessed
} from '../services/storageService'
import type { HydratedSession } from '../services/storageTypes'
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

function SessionsPageContent() {
  const [sessions, setSessions] = useState<HydratedSession[]>([])
  const [filteredSessions, setFilteredSessions] = useState<HydratedSession[]>([])
  const [loading, setLoading] = useState(false)
  const [saveLoading, setSaveLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSessions, setExpandedSessions] = useState<Set<string>>(new Set())
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [searchFilters, setSearchFilters] = useState({
    sessionName: true,
    tabUrl: true,
    tabTitle: true
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editSessionName, setEditSessionName] = useState('')

  const dispatch = useDispatch<AppDispatch>()
  const { regex: isRegex } = useSelector(
    (state: any) => state.search || { regex: false }
  )
  const { drawerOpen, status } = useSelector((s: RootState) => s.ai)

  usePageTracking('/sessions', 'Sessions')

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const items = await getSessions()
      setSessions(items)
      setFilteredSessions(items)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const checkAI = async () => {
      try {
        const service = await getAIService()
        const s = await service.getStatus()
        dispatch(setProviderStatus(s))
      } catch {
        dispatch(setProviderStatus({ connected: false, error: 'AI Service unavailable' }))
      }
    }
    checkAI()
    fetchSessions()
  }, [dispatch, fetchSessions])

  // Re-apply search when filters change
  useEffect(() => {
    if (searchQuery) applySearch(searchQuery, sessions)
  }, [searchFilters, isRegex])

  const applySearch = (value: string, source: HydratedSession[]) => {
    if (!value.trim()) {
      setFilteredSessions(source)
      return
    }
    const query = value.toLowerCase()
    let searchRegex: RegExp | null = null
    if (isRegex) {
      try { searchRegex = new RegExp(value, 'i') } catch { /* invalid */ }
    }

    const filtered = source.filter((session) => {
      if (searchFilters.sessionName) {
        const nameMatch = isRegex && searchRegex
          ? searchRegex.test(session.name)
          : session.name?.toLowerCase().includes(query)
        if (nameMatch) return true
      }
      if (searchFilters.tabUrl || searchFilters.tabTitle) {
        return Object.values(session.windows).some((tabs) =>
          tabs.some((tab) => {
            if (isRegex && searchRegex) {
              if (searchFilters.tabUrl && searchRegex.test(tab.url)) return true
              if (searchFilters.tabTitle && searchRegex.test(tab.title)) return true
            } else {
              if (searchFilters.tabUrl && tab.url.toLowerCase().includes(query)) return true
              if (searchFilters.tabTitle && tab.title.toLowerCase().includes(query)) return true
            }
            return false
          })
        )
      }
      return false
    })
    setFilteredSessions(filtered)
  }

  const handleSearch = (value: string) => {
    setSearchQuery(value)
    applySearch(value, sessions)
  }

  const handleSaveCurrentSession = async () => {
    setSaveLoading(true)
    try {
      await saveCurrentSession()
      await fetchSessions()
      message.success('Session saved successfully')
      analytics.trackEvent('Sessions', 'Save Session')
    } catch {
      message.error('Failed to save session')
    } finally {
      setSaveLoading(false)
    }
  }

  const formatDate = (timestamp: number) =>
    new Date(timestamp).toLocaleString('en-US', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit'
    })

  const getTotalTabs = (session: HydratedSession) =>
    Object.values(session.windows).reduce((sum, tabs) => sum + tabs.length, 0)

  const handleRestore = async (url?: string, session?: HydratedSession) => {
    if (url) {
      await markUrlAccessed(url)
      browser.tabs.create({ url })
      analytics.trackEvent('Sessions', 'Restore Single Tab')
    } else if (session) {
      const allTabs = Object.values(session.windows).flat()
      for (const tab of allTabs) {
        await markUrlAccessed(tab.url)
        browser.tabs.create({ url: tab.url })
      }
      message.success('Session restored')
      analytics.trackEvent('Sessions', 'Restore Session', undefined, getTotalTabs(session))
    }
  }

  const handleDelete = async (sessionId: string) => {
    await deleteSession(sessionId)
    await fetchSessions()
    message.success('Session deleted')
    analytics.trackEvent('Sessions', 'Delete Session')
  }

  const handleRename = async (sessionId: string) => {
    if (!editSessionName.trim()) { setEditingSessionId(null); return }
    try {
      await renameSession(sessionId, editSessionName.trim())
      await fetchSessions()
      message.success('Session renamed')
      analytics.trackEvent('Sessions', 'Rename Session')
    } catch {
      message.error('Failed to rename session')
    }
    setEditingSessionId(null)
  }

  const handleRemoveUrl = async (sessionId: string, windowId: string, url: string) => {
    await removeTabFromSession(sessionId, windowId, url)
    await fetchSessions()
    message.success('URL removed')
    analytics.trackEvent('Sessions', 'Remove URL')
  }

  const handleExport = async () => {
    try {
      const data = await exportSessions()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `sessions-${Date.now()}.json`
      a.click()
      URL.revokeObjectURL(url)
      message.success('Sessions exported')
      analytics.trackEvent('Sessions', 'Export')
    } catch {
      message.error('Failed to export sessions')
    }
  }

  const handleExportMarkdown = (session: HydratedSession, e?: React.MouseEvent) => {
    e?.stopPropagation()
    const lines: string[] = [
      `# ${session.name} (${formatDate(session.created)})`
    ]
    Object.entries(session.windows).forEach(([, tabs], idx) => {
      lines.push(`\n## Window ${idx + 1}`)
      tabs.forEach((t) => {
        lines.push(`- [${(t.title || t.url).replace(/[[\]]/g, '')}](${t.url})`)
      })
    })
    navigator.clipboard.writeText(lines.join('\n'))
    message.success('Copied session as Markdown')
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
      } catch {
        message.error('Failed to import sessions')
      }
    }
    reader.readAsText(file)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  const toggleExpand = (sessionId: string) => {
    setExpandedSessions((prev) => {
      const next = new Set(prev)
      next.has(sessionId) ? next.delete(sessionId) : next.add(sessionId)
      return next
    })
  }

  const searchFilterContent = (
    <div className="p-2">
      <Space direction="vertical">
        <Checkbox
          checked={searchFilters.sessionName}
          onChange={(e) => setSearchFilters({ ...searchFilters, sessionName: e.target.checked })}
        >Name</Checkbox>
        <Checkbox
          checked={searchFilters.tabUrl}
          onChange={(e) => setSearchFilters({ ...searchFilters, tabUrl: e.target.checked })}
        >URL</Checkbox>
        <Checkbox
          checked={searchFilters.tabTitle}
          onChange={(e) => setSearchFilters({ ...searchFilters, tabTitle: e.target.checked })}
        >Title</Checkbox>
      </Space>
    </div>
  )

  const actionItems = [
    {
      key: 'export',
      label: 'Export All Sessions',
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
        <header className="bg-gradient-to-t from-cyan-500 to-blue-500 p-2 transition-all duration-200 ease-in-out">
          <section className="flex items-center justify-between gap-4 w-full">
            <div className="flex-none flex items-center shrink-0">
              <div className="mr-2">
                <SidebarToggleButton onClick={() => setSidebarCollapsed(!sidebarCollapsed)} />
              </div>
              <div className="hidden sm:block">{Brand(logo)}</div>
              <div className="flex items-center ml-4 gap-2">
                <Camera size={18} className="text-white/80" />
                <span className="text-white font-semibold text-lg">Sessions</span>
                {sessions.length > 0 && (
                  <span className="ml-1 text-white/80 text-sm">({sessions.length})</span>
                )}
              </div>
            </div>

            <div className="flex-1 flex justify-end items-center gap-3 pr-2">
              <RoutineQuickMenu size="middle" buttonText="Routines" />

              {/* Prominent Save Session button */}
              <Tooltip title="Snapshot all open tabs across all windows">
                <Button
                  type="primary"
                  icon={<Camera size={16} />}
                  onClick={handleSaveCurrentSession}
                  loading={saveLoading}
                  className="!bg-white/20 hover:!bg-white/30 border-white/30 text-white font-medium flex items-center gap-1"
                >
                  Save Now
                </Button>
              </Tooltip>

              <div className="flex-none flex items-center shrink-0 gap-1">
                <Dropdown menu={{ items: actionItems }} trigger={['click']} placement="bottomRight">
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
                  placeholder="Search sessions, URLs, titles..."
                  onSearch={handleSearch}
                  onChange={handleSearch}
                  showTabFilters={false}
                  foundCount={filteredSessions.length}
                  extraSuffix={
                    <Popover content={searchFilterContent} trigger="click" placement="bottomRight">
                      <Button type="text" size="small" className="text-gray-400 hover:text-blue-500 flex items-center">
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

        <div className="flex-1 overflow-auto bg-gray-50 p-4">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Spin size="large" />
            </div>
          ) : filteredSessions.length === 0 ? (
            <Empty
              description={
                searchQuery
                  ? 'No sessions match your search'
                  : 'No saved sessions yet — click "Save Now" to snapshot your current tabs'
              }
              className="mt-16"
            />
          ) : (
            <div className="space-y-2">
              {filteredSessions.map((session) => {
                const totalTabs = getTotalTabs(session)
                const windowCount = Object.keys(session.windows).length
                const isExpanded = expandedSessions.has(session.id)

                return (
                  <div
                    key={session.id}
                    className="bg-white rounded-lg shadow-sm hover:shadow transition-shadow"
                  >
                    {/* Session header */}
                    <div
                      className="flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-gray-50 rounded-t-lg"
                      onClick={() => toggleExpand(session.id)}
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <Button
                          type="text"
                          size="small"
                          icon={isExpanded ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
                          className="flex items-center justify-center shrink-0"
                        />
                        <Camera size={16} className="text-teal-500 shrink-0" />
                        {editingSessionId === session.id ? (
                          <Input
                            autoFocus
                            size="small"
                            value={editSessionName}
                            onChange={(e) => setEditSessionName(e.target.value)}
                            onPressEnter={() => handleRename(session.id)}
                            onBlur={() => handleRename(session.id)}
                            onClick={(e) => e.stopPropagation()}
                            className="w-48"
                          />
                        ) : (
                          <span className="font-semibold truncate">
                            {session.name}
                          </span>
                        )}
                        <Tag color="blue">{formatDate(session.created)}</Tag>
                        <Tag color="green">{totalTabs} tabs</Tag>
                        {windowCount > 1 && (
                          <Tag icon={<Monitor size={11} className="inline mr-1" />} color="cyan">
                            {windowCount} windows
                          </Tag>
                        )}
                      </div>

                      <Space size="small" onClick={(e) => e.stopPropagation()}>
                        <Tooltip title="Copy as Markdown">
                          <Button
                            size="small"
                            icon={<FileText size={15} />}
                            onClick={(e) => handleExportMarkdown(session, e)}
                            className="flex items-center justify-center"
                          />
                        </Tooltip>
                        <Tooltip title="Restore all tabs">
                          <Button
                            type="primary"
                            size="small"
                            icon={<FolderOpen size={15} />}
                            onClick={(e) => { e.stopPropagation(); handleRestore(undefined, session) }}
                            className="flex items-center justify-center"
                          />
                        </Tooltip>
                        <Tooltip title="Rename">
                          <Button
                            size="small"
                            icon={<Edit2 size={15} />}
                            onClick={(e) => {
                              e.stopPropagation()
                              setEditingSessionId(session.id)
                              setEditSessionName(session.name || '')
                            }}
                            className="flex items-center justify-center text-gray-500"
                          />
                        </Tooltip>
                        <Popconfirm
                          title="Delete this session?"
                          onConfirm={(e) => { e?.stopPropagation(); handleDelete(session.id) }}
                          okText="Delete"
                          cancelText="Cancel"
                        >
                          <Button
                            danger
                            size="small"
                            icon={<Trash2 size={15} />}
                            onClick={(e) => e.stopPropagation()}
                            className="flex items-center justify-center"
                          />
                        </Popconfirm>
                      </Space>
                    </div>

                    {/* Expanded windows & tabs */}
                    {isExpanded && (
                      <div className="border-t bg-gray-50 rounded-b-lg px-4 py-3 space-y-3">
                        {Object.entries(session.windows).map(([winId, tabs], winIndex) => (
                          <div key={winId}>
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-1.5 font-medium">
                              <Monitor size={12} />
                              Window {winIndex + 1}
                              <span className="text-gray-400">({tabs.length} tabs)</span>
                            </div>
                            <div className="space-y-1">
                              {tabs.map((tab, tabIndex) => (
                                <div
                                  key={tabIndex}
                                  className="flex items-center justify-between bg-white px-3 py-1.5 rounded text-sm hover:bg-blue-50 border border-gray-100"
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
                                    {tab.freq > 1 && (
                                      <span className="ml-2 text-[10px] text-amber-500 font-medium">
                                        ★ ×{tab.freq}
                                      </span>
                                    )}
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
                                      title="Remove this URL from session?"
                                      onConfirm={() => handleRemoveUrl(session.id, winId, tab.url)}
                                      okText="Remove"
                                      cancelText="Cancel"
                                    >
                                      <Button
                                        type="text"
                                        size="small"
                                        danger
                                        icon={<X size={13} />}
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
              })}
            </div>
          )}
        </div>

        <AIDrawer
          onOpenSettings={() =>
            chrome.tabs.create({ url: chrome.runtime.getURL('tabs/settings.html#ai') })
          }
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
        theme={{ token: { borderRadius: 4, borderRadiusSM: 4, borderRadiusLG: 4 } }}
      >
        <SessionsPageContent />
      </ConfigProvider>
    </Provider>
  )
}
