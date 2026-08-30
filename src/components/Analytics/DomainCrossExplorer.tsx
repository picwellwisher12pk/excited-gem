import React, { useState, useMemo } from 'react'
import {
  Table,
  Input,
  Tag,
  Button,
  Drawer,
  Typography,
  Space,
  Popover,
  Checkbox,
  Segmented,
  Select,
  Tooltip
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import {
  Globe,
  Search,
  LayoutGrid,
  Bookmark,
  BookmarkPlus,
  FolderOpen,
  Eye,
  SlidersHorizontal,
  Columns3,
  RotateCcw,
  Filter,
  Check,
  X
} from 'lucide-react'
import type {
  CrossDomainStat,
  FullAnalyticsData
} from '../../services/analyticsDataService'

const { Text } = Typography

interface DomainCrossExplorerProps {
  data: FullAnalyticsData
  externalSearch?: string
}

type ColumnKey =
  | 'domain'
  | 'tabsCount'
  | 'bookmarksCount'
  | 'listsCount'
  | 'sessionsCount'
  | 'totalCount'
  | 'action'

const COLUMN_DEFINITIONS: Array<{ key: ColumnKey; label: string; icon?: React.ReactNode }> = [
  { key: 'domain', label: 'Domain Name', icon: <Globe size={14} className="text-cyan-500" /> },
  { key: 'tabsCount', label: 'Open Tabs', icon: <LayoutGrid size={14} className="text-blue-500" /> },
  { key: 'bookmarksCount', label: 'Bookmarks', icon: <Bookmark size={14} className="text-amber-500" /> },
  { key: 'listsCount', label: 'Saved Lists', icon: <BookmarkPlus size={14} className="text-purple-500" /> },
  { key: 'sessionsCount', label: 'Saved Sessions', icon: <FolderOpen size={14} className="text-emerald-500" /> },
  { key: 'totalCount', label: 'Total References' },
  { key: 'action', label: 'Actions' }
]

const DEFAULT_VISIBLE_COLUMNS: Record<ColumnKey, boolean> = {
  domain: true,
  tabsCount: true,
  bookmarksCount: true,
  listsCount: true,
  sessionsCount: true,
  totalCount: true,
  action: true
}

export const DomainCrossExplorer: React.FC<DomainCrossExplorerProps> = ({
  data,
  externalSearch
}) => {
  const [internalSearch, setInternalSearch] = useState('')
  const [selectedDomain, setSelectedDomain] = useState<CrossDomainStat | null>(null)
  const [drawerOpen, setDrawerOpen] = useState(false)

  // Column visibility state
  const [visibleColumns, setVisibleColumns] = useState<Record<ColumnKey, boolean>>(
    DEFAULT_VISIBLE_COLUMNS
  )

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState<string>('all')
  const [minCountFilter, setMinCountFilter] = useState<number>(1)

  // Pagination state
  const [pageSize, setPageSize] = useState<number>(15)
  const [currentPage, setCurrentPage] = useState<number>(1)

  const effectiveSearch =
    externalSearch !== undefined && externalSearch !== '' ? externalSearch : internalSearch

  const handleSetColumn = (key: ColumnKey, isVisible: boolean) => {
    setVisibleColumns((prev) => {
      if (!isVisible) {
        const trueCount = Object.values(prev).filter(Boolean).length
        if (trueCount <= 1) return prev
      }
      return { ...prev, [key]: isVisible }
    })
  }

  const handleShowAllColumns = () => {
    setVisibleColumns({
      domain: true,
      tabsCount: true,
      bookmarksCount: true,
      listsCount: true,
      sessionsCount: true,
      totalCount: true,
      action: true
    })
  }

  const handleResetFilters = () => {
    setInternalSearch('')
    setCategoryFilter('all')
    setMinCountFilter(1)
    setCurrentPage(1)
  }

  const isFilterActive =
    effectiveSearch.trim() !== '' || categoryFilter !== 'all' || minCountFilter > 1

  // Filtered dataset
  const filteredData = useMemo(() => {
    return data.crossDomains.filter((item) => {
      // Search filter
      if (effectiveSearch.trim()) {
        const q = effectiveSearch.toLowerCase()
        if (!item.domain.toLowerCase().includes(q)) return false
      }

      // Min count filter
      if (item.totalCount < minCountFilter) return false

      // Category presence filter
      if (categoryFilter === 'tabs' && item.tabsCount === 0) return false
      if (categoryFilter === 'bookmarks' && item.bookmarksCount === 0) return false
      if (categoryFilter === 'lists' && item.listsCount === 0) return false
      if (categoryFilter === 'sessions' && item.sessionsCount === 0) return false
      if (categoryFilter === 'multi') {
        const categoriesPresent = [
          item.tabsCount > 0,
          item.bookmarksCount > 0,
          item.listsCount > 0,
          item.sessionsCount > 0
        ].filter(Boolean).length
        if (categoriesPresent < 2) return false
      }
      if (categoryFilter === 'all_areas') {
        if (
          item.tabsCount === 0 ||
          item.bookmarksCount === 0 ||
          item.listsCount === 0 ||
          item.sessionsCount === 0
        ) {
          return false
        }
      }

      return true
    })
  }, [data.crossDomains, effectiveSearch, categoryFilter, minCountFilter])

  // Drilldown items for selected domain
  const domainTabs = useMemo(() => {
    if (!selectedDomain) return []
    const results: Array<{ id?: number; title?: string; url?: string; windowId: number }> = []
    for (const win of data.tabs.windows) {
      for (const t of win.tabs) {
        if (t.url && t.url.includes(selectedDomain.domain)) {
          results.push({ ...t, windowId: win.id })
        }
      }
    }
    return results
  }, [selectedDomain, data.tabs])

  const domainBookmarks = useMemo(() => {
    if (!selectedDomain) return []
    const results: Array<{ title: string; url: string; folderPath?: string }> = []
    for (const dup of data.bookmarks.duplicateBookmarks) {
      if (dup.url.includes(selectedDomain.domain)) {
        for (const loc of dup.locations) {
          results.push({ title: loc.title, url: dup.url, folderPath: loc.folderPath })
        }
      }
    }
    return results
  }, [selectedDomain, data.bookmarks])

  const domainLists = useMemo(() => {
    if (!selectedDomain) return []
    const results: Array<{ listName: string; libraryName: string; title: string; url: string }> = []
    for (const list of data.lists.largestLists) {
      for (const tab of list.tabs) {
        if (tab.url && tab.url.includes(selectedDomain.domain)) {
          results.push({
            listName: list.name,
            libraryName: list.libraryName,
            title: tab.title,
            url: tab.url
          })
        }
      }
    }
    return results
  }, [selectedDomain, data.lists])

  const domainSessions = useMemo(() => {
    if (!selectedDomain) return []
    const results: Array<{ sessionName: string; created: number; title: string; url: string }> = []
    for (const session of data.sessions.largestSessions) {
      const windows = session.windows || {}
      Object.values(windows).forEach((tabs) => {
        tabs.forEach((t) => {
          if (t.url && t.url.includes(selectedDomain.domain)) {
            results.push({
              sessionName: session.name,
              created: session.created,
              title: t.title,
              url: t.url
            })
          }
        })
      })
    }
    return results
  }, [selectedDomain, data.sessions])

  const handleInspect = (record: CrossDomainStat) => {
    setSelectedDomain(record)
    setDrawerOpen(true)
  }

  // Dynamic table columns based on visibility
  const allColumns: Record<ColumnKey, any> = {
    domain: {
      title: 'Domain',
      dataIndex: 'domain',
      key: 'domain',
      sorter: (a: CrossDomainStat, b: CrossDomainStat) => a.domain.localeCompare(b.domain),
      render: (domain: string, record: CrossDomainStat) => (
        <div className="flex items-center gap-2.5">
          {record.favIconUrl ? (
            <img
              src={record.favIconUrl}
              alt=""
              className="w-4 h-4 rounded-sm flex-shrink-0"
              onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
            />
          ) : (
            <Globe size={16} className="text-slate-400 flex-shrink-0" />
          )}
          <span className="font-semibold text-slate-800 dark:text-white text-xs">{domain}</span>
        </div>
      )
    },
    tabsCount: {
      title: 'Open Tabs',
      dataIndex: 'tabsCount',
      key: 'tabsCount',
      align: 'center' as const,
      sorter: (a: CrossDomainStat, b: CrossDomainStat) => a.tabsCount - b.tabsCount,
      render: (count: number) =>
        count > 0 ? (
          <Tag color="blue" className="font-medium text-xs">
            {count}
          </Tag>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">-</span>
        )
    },
    bookmarksCount: {
      title: 'Bookmarks',
      dataIndex: 'bookmarksCount',
      key: 'bookmarksCount',
      align: 'center' as const,
      sorter: (a: CrossDomainStat, b: CrossDomainStat) => a.bookmarksCount - b.bookmarksCount,
      render: (count: number) =>
        count > 0 ? (
          <Tag color="gold" className="font-medium text-xs">
            {count}
          </Tag>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">-</span>
        )
    },
    listsCount: {
      title: 'Lists',
      dataIndex: 'listsCount',
      key: 'listsCount',
      align: 'center' as const,
      sorter: (a: CrossDomainStat, b: CrossDomainStat) => a.listsCount - b.listsCount,
      render: (count: number) =>
        count > 0 ? (
          <Tag color="purple" className="font-medium text-xs">
            {count}
          </Tag>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">-</span>
        )
    },
    sessionsCount: {
      title: 'Sessions',
      dataIndex: 'sessionsCount',
      key: 'sessionsCount',
      align: 'center' as const,
      sorter: (a: CrossDomainStat, b: CrossDomainStat) => a.sessionsCount - b.sessionsCount,
      render: (count: number) =>
        count > 0 ? (
          <Tag color="green" className="font-medium text-xs">
            {count}
          </Tag>
        ) : (
          <span className="text-slate-300 dark:text-slate-600">-</span>
        )
    },
    totalCount: {
      title: 'Total References',
      dataIndex: 'totalCount',
      key: 'totalCount',
      align: 'center' as const,
      defaultSortOrder: 'descend' as const,
      sorter: (a: CrossDomainStat, b: CrossDomainStat) => a.totalCount - b.totalCount,
      render: (count: number) => (
        <span className="font-bold text-slate-800 dark:text-white text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800">
          {count}
        </span>
      )
    },
    action: {
      title: 'Action',
      key: 'action',
      align: 'right' as const,
      render: (_: any, record: CrossDomainStat) => (
        <Button
          size="small"
          type="text"
          icon={<Eye size={14} className="text-blue-500" />}
          onClick={() => handleInspect(record)}
          className="text-xs text-blue-600 hover:text-blue-700"
        >
          Details
        </Button>
      )
    }
  }

  const columns: ColumnsType<CrossDomainStat> = COLUMN_DEFINITIONS.filter(
    (col) => visibleColumns[col.key]
  ).map((col) => allColumns[col.key])

  // Columns visibility popover content
  const columnPopoverContent = (
    <div className="w-56 space-y-2 p-1">
      <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
        <span className="font-semibold text-xs text-slate-800 dark:text-white">Toggle Columns</span>
        <Button
          type="link"
          size="small"
          onClick={handleShowAllColumns}
          className="!p-0 !h-auto text-xs text-blue-600"
        >
          Show All
        </Button>
      </div>
      <div className="space-y-1 pt-1">
        {COLUMN_DEFINITIONS.map((col) => {
          const isChecked = visibleColumns[col.key]
          return (
            <label
              key={col.key}
              className="flex items-center justify-between p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-xs transition-colors select-none"
            >
              <span className="flex items-center gap-2 text-slate-700 dark:text-slate-300 font-medium">
                {col.icon}
                <span>{col.label}</span>
              </span>
              <Checkbox
                checked={isChecked}
                onChange={(e) => handleSetColumn(col.key, e.target.checked)}
              />
            </label>
          )
        })}
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      {/* ── Main Container ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm space-y-4">
        {/* Top Header & Search */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-cyan-100 dark:bg-cyan-900/40 text-cyan-600 dark:text-cyan-400">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Cross-Feature Domain Matrix
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Compare domain presence across Tabs, Bookmarks, Lists, and Sessions
              </p>
            </div>
          </div>

          {/* Search & Actions Bar */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="w-full sm:w-64">
              <Input
                placeholder="Search domains..."
                prefix={<Search size={14} className="text-slate-400" />}
                value={effectiveSearch}
                onChange={(e) => setInternalSearch(e.target.value)}
                allowClear
                size="small"
                className="rounded-lg"
              />
            </div>

            {/* Column Visibility Button */}
            <Popover
              content={columnPopoverContent}
              trigger="click"
              placement="bottomRight"
            >
              <Button
                size="small"
                icon={<Columns3 size={14} />}
                className="flex items-center gap-1 text-xs"
              >
                Columns ({Object.values(visibleColumns).filter(Boolean).length})
              </Button>
            </Popover>

            {/* Reset Filters */}
            {isFilterActive && (
              <Button
                size="small"
                type="dashed"
                danger
                icon={<RotateCcw size={13} />}
                onClick={handleResetFilters}
                className="flex items-center gap-1 text-xs"
              >
                Reset
              </Button>
            )}
          </div>
        </div>

        {/* ── Filters Toolbar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-800/40 p-3 rounded-xl border border-slate-100 dark:border-slate-800 text-xs">
          {/* Category Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-slate-500 dark:text-slate-400 flex items-center gap-1">
              <Filter size={13} /> Presence:
            </span>
            <Segmented
              size="small"
              value={categoryFilter}
              onChange={(val) => setCategoryFilter(val as string)}
              options={[
                { label: 'All', value: 'all' },
                { label: 'In Tabs', value: 'tabs' },
                { label: 'In Bookmarks', value: 'bookmarks' },
                { label: 'In Lists', value: 'lists' },
                { label: 'In Sessions', value: 'sessions' },
                { label: 'Multi-Feature (2+)', value: 'multi' },
                { label: 'In All 4 Areas', value: 'all_areas' }
              ]}
              className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700"
            />
          </div>

          {/* Min Occurrences Filter */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Min Refs:</span>
            <Select
              size="small"
              value={minCountFilter}
              onChange={(val) => {
                setMinCountFilter(val)
                setCurrentPage(1)
              }}
              style={{ width: 100 }}
              options={[
                { label: '1+ refs', value: 1 },
                { label: '2+ refs', value: 2 },
                { label: '5+ refs', value: 5 },
                { label: '10+ refs', value: 10 },
                { label: '20+ refs', value: 20 }
              ]}
            />
          </div>

          {/* Page Size Selector */}
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-500 dark:text-slate-400">Rows:</span>
            <Select
              size="small"
              value={pageSize >= 1000 ? 1000 : pageSize}
              onChange={(size) => {
                setPageSize(size)
                setCurrentPage(1)
              }}
              style={{ width: 105 }}
              options={[
                { label: '10 / page', value: 10 },
                { label: '15 / page', value: 15 },
                { label: '25 / page', value: 25 },
                { label: '50 / page', value: 50 },
                { label: '100 / page', value: 100 },
                { label: 'Show All', value: 1000 }
              ]}
            />
          </div>
        </div>

        {/* ── Active Filter Summary & Count ── */}
        <div className="flex items-center justify-between text-xs text-slate-500 px-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span>
              Showing <strong className="text-slate-800 dark:text-white">{filteredData.length}</strong> of{' '}
              {data.crossDomains.length} domains
            </span>
            {isFilterActive && (
              <span className="text-blue-600 font-medium ml-1">
                (Filters Applied)
              </span>
            )}
          </div>
        </div>

        {/* ── Data Table ── */}
        <Table
          columns={columns}
          dataSource={filteredData}
          rowKey="domain"
          size="small"
          pagination={{
            current: currentPage,
            pageSize: pageSize,
            showSizeChanger: true,
            pageSizeOptions: ['10', '15', '25', '50', '100', '200', '500'],
            onChange: (page, size) => {
              setCurrentPage(page)
              if (size && size !== pageSize) {
                setPageSize(size)
              }
            },
            onShowSizeChange: (_curr, size) => {
              setPageSize(size)
              setCurrentPage(1)
            },
            showTotal: (total, range) => `${range[0]}-${range[1]} of ${total} domains`
          }}
          className="rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800"
        />
      </div>

      {/* ── Domain Drilldown Drawer ── */}
      <Drawer
        title={
          <div className="flex items-center gap-2">
            <Globe size={18} className="text-cyan-500" />
            <span className="font-semibold">{selectedDomain?.domain}</span>
            <Tag color="cyan" className="text-xs">
              {selectedDomain?.totalCount} total references
            </Tag>
          </div>
        }
        placement="right"
        width={560}
        onClose={() => setDrawerOpen(false)}
        open={drawerOpen}
      >
        {selectedDomain && (
          <div className="space-y-6">
            {/* Open Tabs matches */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <LayoutGrid size={16} className="text-blue-500" />
                <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
                  Open Tabs ({domainTabs.length})
                </h4>
              </div>
              {domainTabs.length > 0 ? (
                <div className="space-y-2">
                  {domainTabs.map((t, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
                    >
                      <div className="font-semibold text-slate-800 dark:text-white truncate">
                        {t.title || t.url}
                      </div>
                      <div className="text-slate-400 text-[11px] truncate">{t.url}</div>
                      <div className="mt-1 text-[10px] text-blue-500">Window #{t.windowId}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No active open tabs for this domain</p>
              )}
            </div>

            {/* Bookmarks matches */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <Bookmark size={16} className="text-amber-500" />
                <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
                  Bookmarks ({domainBookmarks.length})
                </h4>
              </div>
              {domainBookmarks.length > 0 ? (
                <div className="space-y-2">
                  {domainBookmarks.map((b, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
                    >
                      <div className="font-semibold text-slate-800 dark:text-white truncate">
                        {b.title}
                      </div>
                      <div className="text-slate-400 text-[11px] truncate">{b.url}</div>
                      {b.folderPath && (
                        <div className="mt-1 text-[10px] text-amber-500">📁 {b.folderPath}</div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No bookmarks matched</p>
              )}
            </div>

            {/* Lists matches */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <BookmarkPlus size={16} className="text-purple-500" />
                <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
                  Saved Lists ({domainLists.length})
                </h4>
              </div>
              {domainLists.length > 0 ? (
                <div className="space-y-2">
                  {domainLists.map((l, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
                    >
                      <div className="font-semibold text-slate-800 dark:text-white truncate">
                        {l.title}
                      </div>
                      <div className="text-slate-400 text-[11px] truncate">{l.url}</div>
                      <div className="mt-1 text-[10px] text-purple-500">
                        List: {l.listName} (Library: {l.libraryName})
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No lists matched</p>
              )}
            </div>

            {/* Sessions matches */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <FolderOpen size={16} className="text-emerald-500" />
                <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
                  Saved Sessions ({domainSessions.length})
                </h4>
              </div>
              {domainSessions.length > 0 ? (
                <div className="space-y-2">
                  {domainSessions.map((s, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs"
                    >
                      <div className="font-semibold text-slate-800 dark:text-white truncate">
                        {s.title}
                      </div>
                      <div className="text-slate-400 text-[11px] truncate">{s.url}</div>
                      <div className="mt-1 text-[10px] text-emerald-500">
                        Session: {s.sessionName} • {new Date(s.created).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400">No sessions matched</p>
              )}
            </div>
          </div>
        )}
      </Drawer>
    </div>
  )
}
