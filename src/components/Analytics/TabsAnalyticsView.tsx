import React, { useState } from 'react'
import {
  Card,
  Typography,
  Progress,
  Button,
  Tag,
  Space,
  Table,
  Popconfirm,
  message,
  Input,
  Select,
  Tooltip
} from 'antd'
import {
  LayoutGrid,
  Monitor,
  Pin,
  Volume2,
  VolumeX,
  Moon,
  AlertTriangle,
  Layers,
  Search,
  ExternalLink,
  Trash2,
  ShieldCheck,
  Globe
} from 'lucide-react'
import {
  closeDuplicateTabs,
  closeTabsByDomain
} from '../../services/analyticsDataService'
import type { TabsStats } from '../../services/analyticsDataService'

const { Text, Title } = Typography

interface TabsAnalyticsViewProps {
  stats: TabsStats
  onRefresh: () => void
}

const TAB_GROUP_COLORS: Record<string, string> = {
  grey: '#6b7280',
  blue: '#3b82f6',
  red: '#ef4444',
  yellow: '#eab308',
  green: '#22c55e',
  pink: '#ec4899',
  purple: '#a855f7',
  cyan: '#06b6d4',
  orange: '#f97316'
}

export const TabsAnalyticsView: React.FC<TabsAnalyticsViewProps> = ({ stats, onRefresh }) => {
  const [domainSearch, setDomainSearch] = useState('')
  const [pageSize, setPageSize] = useState<number>(10)
  const [closingDomain, setClosingDomain] = useState<string | null>(null)
  const [closingUrl, setClosingUrl] = useState<string | null>(null)

  const handleCloseDomain = async (domain: string) => {
    setClosingDomain(domain)
    try {
      const closed = await closeTabsByDomain(domain)
      message.success(`Closed ${closed} tabs from ${domain}`)
      onRefresh()
    } catch {
      message.error(`Failed to close tabs for ${domain}`)
    } finally {
      setClosingDomain(null)
    }
  }

  const handleCloseDuplicates = async (url: string) => {
    setClosingUrl(url)
    try {
      const closed = await closeDuplicateTabs(url)
      message.success(`Closed ${closed} duplicate tabs`)
      onRefresh()
    } catch {
      message.error('Failed to close duplicate tabs')
    } finally {
      setClosingUrl(null)
    }
  }

  const handleFocusWindow = (windowId: number) => {
    if (chrome && chrome.windows) {
      chrome.windows.update(windowId, { focused: true }, () => {
        message.info(`Focused Window #${windowId}`)
      })
    }
  }

  const filteredDomains = stats.topDomains.filter((d) =>
    d.domain.toLowerCase().includes(domainSearch.toLowerCase())
  )

  return (
    <div className="space-y-6">
      {/* ── Top Metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">Total Tabs</Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.totalTabs}
          </div>
          <Text className="text-[11px] text-blue-500 font-medium">
            {stats.activeTabsCount} active
          </Text>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">Windows</Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.totalWindows}
          </div>
          <Text className="text-[11px] text-slate-500">
            {stats.incognitoWindowsCount > 0 ? `${stats.incognitoWindowsCount} incognito` : 'All normal'}
          </Text>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">Tab Groups</Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.tabGroupsCount}
          </div>
          <Text className="text-[11px] text-purple-500 font-medium">
            {stats.groupedTabsCount} grouped tabs
          </Text>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">Pinned Tabs</Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.pinnedTabsCount}
          </div>
          <Text className="text-[11px] text-amber-500 font-medium">
            {stats.totalTabs > 0 ? ((stats.pinnedTabsCount / stats.totalTabs) * 100).toFixed(0) : 0}% of tabs
          </Text>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">Sleeping Tabs</Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.discardedTabsCount}
          </div>
          <Text className="text-[11px] text-emerald-500 font-medium">Memory saved</Text>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">Audible / Media</Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.audibleTabsCount}
          </div>
          <Text className="text-[11px] text-indigo-500 font-medium">
            {stats.mutedTabsCount > 0 ? `${stats.mutedTabsCount} muted` : 'Playing audio'}
          </Text>
        </div>
      </div>

      {/* ── Windows Distribution ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Monitor size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Windows Distribution ({stats.totalWindows})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tabs organized across open browser windows
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.windows.map((win, idx) => {
            const winShare = stats.totalTabs > 0 ? (win.tabCount / stats.totalTabs) * 100 : 0
            return (
              <div
                key={win.id}
                className={`p-4 rounded-xl border transition-all ${
                  win.focused
                    ? 'border-blue-500/60 bg-blue-50/40 dark:bg-blue-950/20 shadow-sm'
                    : 'border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800 dark:text-white">
                      Window #{idx + 1}
                    </span>
                    {win.focused && <Tag color="blue" className="!mr-0 text-[10px]">Focused</Tag>}
                    {win.incognito && <Tag color="purple" className="!mr-0 text-[10px]">Incognito</Tag>}
                  </div>
                  <Button
                    size="small"
                    type="text"
                    onClick={() => handleFocusWindow(win.id)}
                    className="text-xs text-blue-600 hover:text-blue-700"
                  >
                    Focus
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-500">{win.tabCount} tabs</span>
                    <span className="text-slate-400">{winShare.toFixed(1)}% of total</span>
                  </div>
                  <Progress percent={winShare} size="small" strokeColor="#3b82f6" showInfo={false} className="!m-0" />
                </div>

                {/* Quick tab previews */}
                <div className="mt-3 pt-2.5 border-t border-slate-200 dark:border-slate-800 space-y-1">
                  <div className="text-[11px] font-medium text-slate-400">Tab previews:</div>
                  {win.tabs.slice(0, 3).map((tab, tIdx) => (
                    <div key={tab.id || tIdx} className="text-xs text-slate-600 dark:text-slate-300 truncate flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-slate-600 flex-shrink-0" />
                      <span className="truncate">{tab.title || tab.url || 'Untitled Tab'}</span>
                    </div>
                  ))}
                  {win.tabs.length > 3 && (
                    <div className="text-[11px] text-slate-400">
                      +{win.tabs.length - 3} more tabs
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* ── Tab Groups (if any) ── */}
      {stats.tabGroups.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
              <Layers size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Tab Groups ({stats.tabGroups.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Chrome native tab groupings
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {stats.tabGroups.map((group) => {
              const colorHex = TAB_GROUP_COLORS[group.color] || '#6b7280'
              return (
                <div
                  key={group.id}
                  className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex items-center justify-between"
                >
                  <div className="flex items-center gap-2 truncate">
                    <span
                      className="w-3 h-3 rounded-full flex-shrink-0 shadow-sm"
                      style={{ backgroundColor: colorHex }}
                    />
                    <span className="font-semibold text-xs text-slate-800 dark:text-white truncate">
                      {group.title}
                    </span>
                  </div>
                  <Tag className="!mr-0 font-medium text-[11px]">
                    {group.tabCount} tabs
                  </Tag>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ── Duplicate Open Tabs Detector ── */}
      {stats.duplicateUrls.length > 0 && (
        <div className="bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/60 text-amber-700 dark:text-amber-300">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-amber-900 dark:text-amber-200">
                  Duplicate Open Tabs Detected ({stats.duplicateUrls.length})
                </h3>
                <p className="text-xs text-amber-700 dark:text-amber-400">
                  Identical URLs currently open across your browser tabs and windows
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-2 mt-3">
            {stats.duplicateUrls.map((dup) => (
              <div
                key={dup.url}
                className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-amber-200/60 dark:border-amber-900/30 gap-2"
              >
                <div className="truncate max-w-[500px]">
                  <div className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                    {dup.title || dup.url}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {dup.url}
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Tag color="orange" className="!mr-0 font-medium text-xs">
                    {dup.count} instances ({dup.windowIds.length} {dup.windowIds.length === 1 ? 'win' : 'wins'})
                  </Tag>
                  <Popconfirm
                    title="Close duplicate tabs?"
                    description={`This will close ${dup.count - 1} duplicate tabs, keeping 1 open.`}
                    onConfirm={() => handleCloseDuplicates(dup.url)}
                    okText="Close Duplicates"
                    cancelText="Cancel"
                  >
                    <Button
                      size="small"
                      danger
                      loading={closingUrl === dup.url}
                      className="text-xs"
                    >
                      Keep 1 Tab
                    </Button>
                  </Popconfirm>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Top Open Domains in Tabs ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Domain Breakdown ({stats.topDomains.length} unique domains)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Tabs grouped by domain name with quick cleanup actions
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-full sm:w-56">
              <Input
                placeholder="Search domains..."
                prefix={<Search size={14} className="text-slate-400" />}
                value={domainSearch}
                onChange={(e) => setDomainSearch(e.target.value)}
                size="small"
                allowClear
                className="rounded-lg"
              />
            </div>
            <Select
              size="small"
              value={pageSize >= 1000 ? 1000 : pageSize}
              onChange={setPageSize}
              style={{ width: 100 }}
              options={[
                { label: 'Top 10', value: 10 },
                { label: 'Top 25', value: 25 },
                { label: 'Top 50', value: 50 },
                { label: 'Top 100', value: 100 },
                { label: 'Show All', value: 1000 }
              ]}
            />
          </div>
        </div>

        <div className="space-y-3">
          {filteredDomains.slice(0, pageSize).map((domainItem, index) => (
            <div
              key={domainItem.domain}
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-2"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-semibold text-slate-800 dark:text-white flex items-center gap-2 truncate">
                    <span className="text-slate-400 font-mono text-[11px] w-5">{index + 1}.</span>
                    {domainItem.favIconUrl && (
                      <img
                        src={domainItem.favIconUrl}
                        alt=""
                        className="w-4 h-4 rounded-sm flex-shrink-0"
                        onError={(e) => ((e.target as HTMLElement).style.display = 'none')}
                      />
                    )}
                    <span className="truncate">{domainItem.domain}</span>
                  </span>
                  <span className="text-slate-500 font-medium">
                    {domainItem.count} tabs <span className="text-slate-400 font-normal">({domainItem.percentage}%)</span>
                  </span>
                </div>
                <Progress
                  percent={domainItem.percentage}
                  size="small"
                  strokeColor="#3b82f6"
                  showInfo={false}
                  className="!m-0"
                />
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center ml-0 sm:ml-4">
                <Popconfirm
                  title={`Close all ${domainItem.count} tabs from ${domainItem.domain}?`}
                  onConfirm={() => handleCloseDomain(domainItem.domain)}
                  okText="Close All"
                  cancelText="Cancel"
                >
                  <Button
                    size="small"
                    type="text"
                    danger
                    icon={<Trash2 size={13} />}
                    loading={closingDomain === domainItem.domain}
                    className="text-xs flex items-center gap-1 text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                  >
                    Close Tabs
                  </Button>
                </Popconfirm>
              </div>
            </div>
          ))}
          {filteredDomains.length === 0 && (
            <p className="text-xs text-slate-400 py-6 text-center">No matching domains found</p>
          )}
        </div>
      </div>
    </div>
  )
}
