import React, { useState } from 'react'
import {
  Card,
  Typography,
  Progress,
  Button,
  Tag,
  Table,
  Space,
  Input,
  Select,
  Tooltip
} from 'antd'
import {
  Bookmark,
  Folder,
  FolderX,
  Layers,
  AlertTriangle,
  Search,
  ExternalLink,
  Clock,
  Globe
} from 'lucide-react'
import type { BookmarksStats } from '../../services/analyticsDataService'

const { Text } = Typography

interface BookmarksAnalyticsViewProps {
  stats: BookmarksStats
  onRefresh: () => void
}

export const BookmarksAnalyticsView: React.FC<BookmarksAnalyticsViewProps> = ({
  stats
}) => {
  const [domainSearch, setDomainSearch] = useState('')
  const [pageSize, setPageSize] = useState<number>(10)

  const filteredDomains = stats.topDomains.filter((d) =>
    d.domain.toLowerCase().includes(domainSearch.toLowerCase())
  )

  const handleOpenBookmarksPage = () => {
    window.location.href = '/tabs/bookmarks.html'
  }

  return (
    <div className="space-y-6">
      {/* ── Top Metrics ── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">
            Total Bookmarks
          </Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.totalBookmarks}
          </div>
          <Text className="text-[11px] text-amber-500 font-medium">
            Saved items
          </Text>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">
            Folders
          </Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.totalFolders}
          </div>
          <Text className="text-[11px] text-slate-500">
            {stats.emptyFoldersCount > 0
              ? `${stats.emptyFoldersCount} empty`
              : 'Organized'}
          </Text>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">
            Tree Depth
          </Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.maxDepth}
          </div>
          <Text className="text-[11px] text-purple-500 font-medium">
            Folder levels
          </Text>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3">
          <Text className="text-[11px] font-semibold uppercase text-slate-400">
            Duplicate URLs
          </Text>
          <div className="text-2xl font-bold text-slate-800 dark:text-white mt-0.5">
            {stats.duplicateBookmarks.length}
          </div>
          <Text className="text-[11px] text-rose-500 font-medium">
            {stats.duplicateBookmarks.reduce((s, d) => s + d.count, 0)} copies
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
            Bookmarked domains
          </Text>
        </div>
      </div>

      {/* ── Timeline / Age Distribution ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center gap-2 mb-4">
          <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
            <Clock size={18} />
          </div>
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">
              Bookmark Age & Creation Timeline
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Distribution of bookmarks by when they were added
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
            <div className="text-xs text-slate-400 font-medium">
              Last 24 Hours
            </div>
            <div className="text-xl font-bold text-slate-800 dark:text-white mt-1">
              {stats.timelineBreakdown.last24Hours}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
            <div className="text-xs text-slate-400 font-medium">
              Last 7 Days
            </div>
            <div className="text-xl font-bold text-slate-800 dark:text-white mt-1">
              {stats.timelineBreakdown.last7Days}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
            <div className="text-xs text-slate-400 font-medium">
              Last 30 Days
            </div>
            <div className="text-xl font-bold text-slate-800 dark:text-white mt-1">
              {stats.timelineBreakdown.last30Days}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
            <div className="text-xs text-slate-400 font-medium">Last Year</div>
            <div className="text-xl font-bold text-slate-800 dark:text-white mt-1">
              {stats.timelineBreakdown.lastYear}
            </div>
          </div>
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 text-center">
            <div className="text-xs text-slate-400 font-medium">
              Older (&gt; 1 Year)
            </div>
            <div className="text-xl font-bold text-slate-800 dark:text-white mt-1">
              {stats.timelineBreakdown.older}
            </div>
          </div>
        </div>
      </div>

      {/* ── Top Folders ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
              <Folder size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Largest Bookmark Folders
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Folders containing the highest count of bookmarks
              </p>
            </div>
          </div>
          <Button
            type="link"
            size="small"
            onClick={handleOpenBookmarksPage}
            className="text-amber-600 flex items-center gap-1"
          >
            Manage Bookmarks <ExternalLink size={13} />
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {stats.topFolders.map((folder) => (
            <div
              key={folder.id}
              className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-1">
                  <span className="font-semibold text-xs text-slate-800 dark:text-white truncate max-w-[180px]">
                    {folder.title}
                  </span>
                  <Tag color="gold" className="!mr-0 font-medium text-[10px]">
                    {folder.bookmarkCount} items
                  </Tag>
                </div>
                <p
                  className="text-[11px] text-slate-400 truncate"
                  title={folder.path}
                >
                  {folder.path}
                </p>
              </div>
              {folder.subfolderCount > 0 && (
                <div className="mt-2 text-[11px] text-slate-500">
                  {folder.subfolderCount} subfolders
                </div>
              )}
            </div>
          ))}
          {stats.topFolders.length === 0 && (
            <p className="text-xs text-slate-400 py-4 text-center">
              No folders found
            </p>
          )}
        </div>
      </div>

      {/* ── Duplicate Bookmarks Inspector ── */}
      {stats.duplicateBookmarks.length > 0 && (
        <div className="bg-rose-50/40 dark:bg-rose-950/20 border border-rose-200 dark:border-rose-900/40 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/60 text-rose-700 dark:text-rose-300">
                <AlertTriangle size={18} />
              </div>
              <div>
                <h3 className="text-base font-semibold text-rose-900 dark:text-rose-200">
                  Duplicate Bookmarks Inspector (
                  {stats.duplicateBookmarks.length})
                </h3>
                <p className="text-xs text-rose-700 dark:text-rose-400">
                  Identical URLs saved in multiple folders
                </p>
              </div>
            </div>
            <Button
              type="primary"
              size="small"
              onClick={handleOpenBookmarksPage}
              className="bg-rose-600 hover:bg-rose-700 text-xs"
            >
              Open Clean-Up Tool
            </Button>
          </div>

          <div className="space-y-2 mt-3 max-h-80 overflow-y-auto pr-1">
            {stats.duplicateBookmarks.map((dup) => (
              <div
                key={dup.url}
                className="p-3 rounded-xl bg-white dark:bg-slate-900 border border-rose-200/60 dark:border-rose-900/30 space-y-1.5"
              >
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-slate-800 dark:text-white truncate max-w-[450px]">
                    {dup.title || dup.url}
                  </div>
                  <Tag color="red" className="!mr-0 font-medium text-xs">
                    {dup.count} copies
                  </Tag>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  {dup.url}
                </div>
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {dup.locations.map((loc, lIdx) => (
                    <span
                      key={lIdx}
                      className="px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-[10px] text-slate-600 dark:text-slate-300"
                    >
                      📁 {loc.folderPath}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Top Bookmarked Domains ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
              <Globe size={18} />
            </div>
            <div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Bookmarked Domains ({stats.topDomains.length} unique domains)
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Most frequently saved websites in your bookmarks
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
                  {domainItem.count} bookmarks{' '}
                  <span className="text-slate-400 font-normal">
                    ({domainItem.percentage}%)
                  </span>
                </span>
              </div>
              <Progress
                percent={domainItem.percentage}
                size="small"
                strokeColor="#f59e0b"
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
