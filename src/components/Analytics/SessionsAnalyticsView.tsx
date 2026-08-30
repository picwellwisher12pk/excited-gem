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
  FolderOpen,
  Monitor,
  Layers,
  Clock,
  Search,
  ExternalLink,
  Globe,
  Database
} from 'lucide-react'
import type { SessionsStats } from '../../services/analyticsDataService'

const { Text } = Typography

interface SessionsAnalyticsViewProps {
  stats: SessionsStats
  onRefresh: () => void
}

export const SessionsAnalyticsView: React.FC<SessionsAnalyticsViewProps> = ({
  stats
}) => {
  const [domainSearch, setDomainSearch] = useState('')
  const [pageSize, setPageSize] = useState<number>(10)

  const filteredDomains = stats.topDomains.filter((d) =>
    d.domain.toLowerCase().includes(domainSearch.toLowerCase())
  )

  const handleOpenSessionsPage = () => {
    window.location.href = '/tabs/sessions.html'
  }

  return (
    <div className="space-y-6">
      {/* ── Top Metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">
            Total Sessions
          </Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.totalSessions}
          </div>
          <Text className="text-[11px] text-emerald-500 font-medium">
            Saved snapshots
          </Text>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">
            Saved Windows
          </Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.totalWindows}
          </div>
          <Text className="text-[11px] text-slate-500">Preserved windows</Text>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">
            Saved Tabs
          </Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.totalTabs}
          </div>
          <Text className="text-[11px] text-teal-500 font-medium">
            Total tabs preserved
          </Text>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">
            Avg Tabs / Session
          </Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.avgTabsPerSession}
          </div>
          <Text className="text-[11px] text-blue-500 font-medium">
            Tabs per snapshot
          </Text>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">
            Unique Domains
          </Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.topDomains.length}
          </div>
          <Text className="text-[11px] text-cyan-500 font-medium">
            Preserved domains
          </Text>
        </div>
      </div>

      {/* ── Largest Saved Sessions Leaderboard ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <FolderOpen size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Largest Saved Sessions ({stats.largestSessions.length})
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Snapshots containing the most tabs and windows
              </p>
            </div>
          </div>
          <Button
            type="link"
            size="small"
            onClick={handleOpenSessionsPage}
            className="text-emerald-600 flex items-center gap-1"
          >
            Manage Sessions <ExternalLink size={13} />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {stats.largestSessions.map((session) => (
            <div
              key={session.created}
              className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-slate-800 dark:text-white truncate max-w-[180px]">
                    {session.name}
                  </span>
                  <Tag color="green" className="!mr-0 font-medium text-[10px]">
                    {session.tabCount} tabs
                  </Tag>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {session.windowCount}{' '}
                  {session.windowCount === 1 ? 'window' : 'windows'} •{' '}
                  {new Date(session.created).toLocaleDateString()}
                </div>

                {/* Top domains preview */}
                {session.topDomains.length > 0 && (
                  <div className="mt-2.5 flex flex-wrap gap-1">
                    {session.topDomains.slice(0, 3).map((d) => (
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
          {stats.largestSessions.length === 0 && (
            <p className="text-xs text-slate-400 py-4 text-center">
              No saved sessions found
            </p>
          )}
        </div>
      </div>

      {/* ── Top Domains in Sessions ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Domains in Saved Sessions ({stats.topDomains.length} unique
                domains)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Most frequent domains across all your saved session snapshots
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
                  <span className="text-slate-400 font-mono text-[11px] w-5">
                    {index + 1}.
                  </span>
                  {domainItem.favIconUrl && (
                    <img
                      src={domainItem.favIconUrl}
                      alt=""
                      className="w-4 h-4 rounded-sm flex-shrink-0"
                      onError={(e) =>
                        ((e.target as HTMLElement).style.display = 'none')
                      }
                    />
                  )}
                  <span className="truncate">{domainItem.domain}</span>
                </span>
                <span className="text-slate-500 font-medium">
                  {domainItem.count} tabs{' '}
                  <span className="text-slate-400 font-normal">
                    ({domainItem.percentage}%)
                  </span>
                </span>
              </div>
              <Progress
                percent={domainItem.percentage}
                size="small"
                strokeColor="#10b981"
                showInfo={false}
                className="!m-0"
              />
            </div>
          ))}
          {filteredDomains.length === 0 && (
            <p className="text-xs text-slate-400 py-6 text-center">
              No matching domains found
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
