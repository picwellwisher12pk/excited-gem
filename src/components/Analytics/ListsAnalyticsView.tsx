import React, { useState } from 'react'
import {
  Card,
  Typography,
  Progress,
  Button,
  Tag,
  Space,
  Input,
  Select,
  Tooltip
} from 'antd'
import {
  BookmarkPlus,
  Library,
  Layers,
  Database,
  Search,
  ExternalLink,
  Clock,
  Globe
} from 'lucide-react'
import type { ListsStats } from '../../services/analyticsDataService'

const { Text } = Typography

interface ListsAnalyticsViewProps {
  stats: ListsStats
  onRefresh: () => void
}

export const ListsAnalyticsView: React.FC<ListsAnalyticsViewProps> = ({ stats }) => {
  const [domainSearch, setDomainSearch] = useState('')
  const [pageSize, setPageSize] = useState<number>(10)

  const filteredDomains = stats.topDomains.filter((d) =>
    d.domain.toLowerCase().includes(domainSearch.toLowerCase())
  )

  const handleOpenListsPage = () => {
    window.location.href = '/tabs/lists.html'
  }

  return (
    <div className="space-y-6">
      {/* ── Top Metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">Total Libraries</Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.totalLibraries}
          </div>
          <Text className="text-[11px] text-purple-500 font-medium">Collections</Text>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">Total Lists</Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.totalLists}
          </div>
          <Text className="text-[11px] text-slate-500">
            {stats.extensionListsCount} ext / {stats.bookmarksListsCount} bm
          </Text>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">Saved Tabs</Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.totalTabs}
          </div>
          <Text className="text-[11px] text-fuchsia-500 font-medium">Tabs in lists</Text>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">Avg Tabs / List</Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.avgTabsPerList}
          </div>
          <Text className="text-[11px] text-indigo-500 font-medium">Average size</Text>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">Unique Domains</Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.topDomains.length}
          </div>
          <Text className="text-[11px] text-cyan-500 font-medium">Saved domains</Text>
        </div>
      </div>

      {/* ── Storage Type Distribution ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
            <Database size={18} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">
              Storage Backend Distribution
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Lists stored inside Chrome extension storage vs Browser bookmark folders
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-4 rounded-xl bg-purple-50/50 dark:bg-purple-950/20 border border-purple-200/60 dark:border-purple-900/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm text-purple-900 dark:text-purple-200">
                Extension Local Storage
              </span>
              <Tag color="purple">{stats.extensionListsCount} lists</Tag>
            </div>
            <p className="text-xs text-purple-700 dark:text-purple-400">
              Fast, high-performance compressed storage with deduplicated URL bank
            </p>
          </div>

          <div className="p-4 rounded-xl bg-amber-50/50 dark:bg-amber-950/20 border border-amber-200/60 dark:border-amber-900/30">
            <div className="flex items-center justify-between mb-2">
              <span className="font-semibold text-sm text-amber-900 dark:text-amber-200">
                Browser Bookmarks Storage
              </span>
              <Tag color="gold">{stats.bookmarksListsCount} lists</Tag>
            </div>
            <p className="text-xs text-amber-700 dark:text-amber-400">
              Directly synced with Chrome/browser bookmarks across your signed-in devices
            </p>
          </div>
        </div>
      </div>

      {/* ── Largest Saved Lists Leaderboard ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
              <Library size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Largest Saved Lists ({stats.largestLists.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Lists with the highest number of saved tabs
              </p>
            </div>
          </div>
          <Button
            type="link"
            size="small"
            onClick={handleOpenListsPage}
            className="text-purple-600 flex items-center gap-1"
          >
            Manage Lists <ExternalLink size={13} />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.largestLists.map((list) => (
            <div
              key={list.id}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-slate-800 dark:text-white truncate max-w-[180px]">
                    {list.name}
                  </span>
                  <Tag color="purple" className="!mr-0 font-medium text-[10px]">
                    {list.tabCount} tabs
                  </Tag>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  Library: {list.libraryName} • {new Date(list.created).toLocaleDateString()}
                </div>

                {/* Top domains preview */}
                {list.topDomains.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {list.topDomains.slice(0, 3).map((d) => (
                      <span
                        key={d.domain}
                        className="px-1.5 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700 text-[10px] text-slate-600 dark:text-slate-300 truncate max-w-[130px]"
                      >
                        {d.domain} ({d.count})
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
          {stats.largestLists.length === 0 && (
            <p className="text-xs text-slate-400 py-4 text-center">No saved lists found</p>
          )}
        </div>
      </div>

      {/* ── Top Domains in Lists ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Domains in Saved Lists ({stats.topDomains.length} unique domains)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Most frequent domains across all your libraries and lists
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
              className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
            >
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
                strokeColor="#a855f7"
                showInfo={false}
                className="!m-0"
              />
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
