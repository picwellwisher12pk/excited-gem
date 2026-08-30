import React from 'react'
import { Card, Typography, Progress, Button, Tag, Space, Tooltip } from 'antd'
import {
  LayoutGrid,
  Bookmark,
  BookmarkPlus,
  FolderOpen,
  Globe,
  AlertTriangle,
  Zap,
  CheckCircle,
  ExternalLink,
  Volume2,
  Pin,
  Moon,
  Layers
} from 'lucide-react'
import type { FullAnalyticsData } from '../../services/analyticsDataService'

const { Title, Text } = Typography

interface OverviewViewProps {
  data: FullAnalyticsData
  onTabChange: (tabKey: string) => void
  onRefresh: () => void
}

export const OverviewView: React.FC<OverviewViewProps> = ({ data, onTabChange }) => {
  const { tabs, bookmarks, lists, sessions, crossDomains } = data

  const totalTrackedItems =
    tabs.totalTabs + bookmarks.totalBookmarks + lists.totalTabs + sessions.totalTabs

  const tabsPct = totalTrackedItems > 0 ? (tabs.totalTabs / totalTrackedItems) * 100 : 0
  const bmPct = totalTrackedItems > 0 ? (bookmarks.totalBookmarks / totalTrackedItems) * 100 : 0
  const listsPct = totalTrackedItems > 0 ? (lists.totalTabs / totalTrackedItems) * 100 : 0
  const sessionsPct = totalTrackedItems > 0 ? (sessions.totalTabs / totalTrackedItems) * 100 : 0

  return (
    <div className="space-y-6">
      {/* ── KPI Stat Cards ── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* Open Tabs Card */}
        <div
          onClick={() => onTabChange('tabs')}
          className="cursor-pointer group relative overflow-hidden bg-gradient-to-br from-blue-500/10 to-indigo-500/10 border border-blue-200 dark:border-blue-800/40 rounded-2xl p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
        >
          <div className="flex justify-between items-start">
            <div>
              <Text className="text-xs font-semibold uppercase tracking-wider text-blue-600 dark:text-blue-400">
                Open Tabs
              </Text>
              <div className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
                {tabs.totalTabs}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400 group-hover:bg-blue-600 group-hover:text-white transition-colors">
              <LayoutGrid size={22} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300 font-medium">
              {tabs.totalWindows} {tabs.totalWindows === 1 ? 'window' : 'windows'}
            </span>
            {tabs.discardedTabsCount > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium flex items-center gap-1">
                <Moon size={11} /> {tabs.discardedTabsCount} sleeping
              </span>
            )}
          </div>
        </div>

        {/* Bookmarks Card */}
        <div
          onClick={() => onTabChange('bookmarks')}
          className="cursor-pointer group relative overflow-hidden bg-gradient-to-br from-amber-500/10 to-orange-500/10 border border-amber-200 dark:border-amber-800/40 rounded-2xl p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
        >
          <div className="flex justify-between items-start">
            <div>
              <Text className="text-xs font-semibold uppercase tracking-wider text-amber-600 dark:text-amber-400">
                Bookmarks
              </Text>
              <div className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
                {bookmarks.totalBookmarks}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 group-hover:bg-amber-600 group-hover:text-white transition-colors">
              <Bookmark size={22} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 font-medium">
              {bookmarks.totalFolders} folders
            </span>
            {bookmarks.duplicateBookmarks.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300 font-medium">
                {bookmarks.duplicateBookmarks.length} duplicates
              </span>
            )}
          </div>
        </div>

        {/* Saved Lists Card */}
        <div
          onClick={() => onTabChange('lists')}
          className="cursor-pointer group relative overflow-hidden bg-gradient-to-br from-purple-500/10 to-fuchsia-500/10 border border-purple-200 dark:border-purple-800/40 rounded-2xl p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
        >
          <div className="flex justify-between items-start">
            <div>
              <Text className="text-xs font-semibold uppercase tracking-wider text-purple-600 dark:text-purple-400">
                Saved Lists
              </Text>
              <div className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
                {lists.totalLists}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 group-hover:bg-purple-600 group-hover:text-white transition-colors">
              <BookmarkPlus size={22} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 font-medium">
              {lists.totalTabs} saved tabs
            </span>
            <span className="px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400 font-medium">
              {lists.totalLibraries} {lists.totalLibraries === 1 ? 'library' : 'libraries'}
            </span>
          </div>
        </div>

        {/* Saved Sessions Card */}
        <div
          onClick={() => onTabChange('sessions')}
          className="cursor-pointer group relative overflow-hidden bg-gradient-to-br from-emerald-500/10 to-teal-500/10 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
        >
          <div className="flex justify-between items-start">
            <div>
              <Text className="text-xs font-semibold uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                Saved Sessions
              </Text>
              <div className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
                {sessions.totalSessions}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
              <FolderOpen size={22} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
              {sessions.totalTabs} saved tabs
            </span>
            <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 font-medium">
              {sessions.totalWindows} windows
            </span>
          </div>
        </div>

        {/* Unique Domains Card */}
        <div
          onClick={() => onTabChange('domains')}
          className="cursor-pointer group relative overflow-hidden bg-gradient-to-br from-cyan-500/10 to-sky-500/10 border border-cyan-200 dark:border-cyan-800/40 rounded-2xl p-4 transition-all duration-200 hover:shadow-lg hover:-translate-y-0.5"
        >
          <div className="flex justify-between items-start">
            <div>
              <Text className="text-xs font-semibold uppercase tracking-wider text-cyan-600 dark:text-cyan-400">
                Unique Domains
              </Text>
              <div className="text-3xl font-bold text-slate-800 dark:text-white mt-1">
                {crossDomains.length}
              </div>
            </div>
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 group-hover:bg-cyan-600 group-hover:text-white transition-colors">
              <Globe size={22} />
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-1 text-xs">
            <span className="px-2 py-0.5 rounded-full bg-cyan-100 dark:bg-cyan-900/40 text-cyan-700 dark:text-cyan-300 font-medium">
              Across all features
            </span>
          </div>
        </div>
      </div>

      {/* ── Visual Item Distribution Bar ── */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-800 dark:text-white">
              Browser Data Distribution
            </h3>
            <Text className="text-xs text-slate-500 dark:text-slate-400">
              Breakdown of total indexed items ({totalTrackedItems.toLocaleString()} total tabs & bookmarks)
            </Text>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs">
            <span className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 font-medium">
              <span className="w-3 h-3 rounded-full bg-blue-500 inline-block" /> Tabs ({tabs.totalTabs})
            </span>
            <span className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400 font-medium">
              <span className="w-3 h-3 rounded-full bg-amber-500 inline-block" /> Bookmarks ({bookmarks.totalBookmarks})
            </span>
            <span className="flex items-center gap-1.5 text-purple-600 dark:text-purple-400 font-medium">
              <span className="w-3 h-3 rounded-full bg-purple-500 inline-block" /> Lists ({lists.totalTabs})
            </span>
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-3 h-3 rounded-full bg-emerald-500 inline-block" /> Sessions ({sessions.totalTabs})
            </span>
          </div>
        </div>

        {/* Custom Segmented Bar */}
        <div className="h-4 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden flex shadow-inner">
          <div
            style={{ width: `${tabsPct}%` }}
            className="bg-blue-500 transition-all duration-500 hover:opacity-90"
            title={`Open Tabs: ${tabs.totalTabs} (${tabsPct.toFixed(1)}%)`}
          />
          <div
            style={{ width: `${bmPct}%` }}
            className="bg-amber-500 transition-all duration-500 hover:opacity-90"
            title={`Bookmarks: ${bookmarks.totalBookmarks} (${bmPct.toFixed(1)}%)`}
          />
          <div
            style={{ width: `${listsPct}%` }}
            className="bg-purple-500 transition-all duration-500 hover:opacity-90"
            title={`Saved Lists: ${lists.totalTabs} (${listsPct.toFixed(1)}%)`}
          />
          <div
            style={{ width: `${sessionsPct}%` }}
            className="bg-emerald-500 transition-all duration-500 hover:opacity-90"
            title={`Saved Sessions: ${sessions.totalTabs} (${sessionsPct.toFixed(1)}%)`}
          />
        </div>
      </div>

      {/* ── Key Insights & Health Alerts ── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Open Tabs Status Alert */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-blue-600">
              <Zap size={20} />
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
                Tabs Activity & Memory
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {tabs.discardedTabsCount > 0
                  ? `${tabs.discardedTabsCount} of ${tabs.totalTabs} tabs are suspended/sleeping to conserve browser memory.`
                  : `${tabs.totalTabs} tabs are loaded in memory across ${tabs.totalWindows} windows.`}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">Active: {tabs.activeTabsCount} | Pinned: {tabs.pinnedTabsCount}</span>
            <Button type="link" size="small" onClick={() => onTabChange('tabs')} className="!p-0 !h-auto text-blue-600">
              View Tabs Details →
            </Button>
          </div>
        </div>

        {/* Duplicate Tabs Alert */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl ${
                tabs.duplicateUrls.length > 0
                  ? 'bg-amber-50 dark:bg-amber-900/30 text-amber-600'
                  : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600'
              }`}
            >
              {tabs.duplicateUrls.length > 0 ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
                Duplicate Open Tabs
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {tabs.duplicateUrls.length > 0
                  ? `Found ${tabs.duplicateUrls.length} URLs open in multiple tabs or windows.`
                  : 'No duplicate open tabs detected. Clean window organization!'}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {tabs.duplicateUrls.length > 0
                ? `${tabs.duplicateUrls.reduce((s, d) => s + d.count, 0)} total duplicated tabs`
                : '100% Unique'}
            </span>
            {tabs.duplicateUrls.length > 0 && (
              <Button type="link" size="small" onClick={() => onTabChange('tabs')} className="!p-0 !h-auto text-amber-600">
                Clean Duplicates →
              </Button>
            )}
          </div>
        </div>

        {/* Duplicate Bookmarks Alert */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex flex-col justify-between">
          <div className="flex items-start gap-3">
            <div
              className={`p-2 rounded-xl ${
                bookmarks.duplicateBookmarks.length > 0
                  ? 'bg-rose-50 dark:bg-rose-900/30 text-rose-600'
                  : 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-600'
              }`}
            >
              {bookmarks.duplicateBookmarks.length > 0 ? <AlertTriangle size={20} /> : <CheckCircle size={20} />}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-white">
                Duplicate Bookmarks
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 leading-relaxed">
                {bookmarks.duplicateBookmarks.length > 0
                  ? `Found ${bookmarks.duplicateBookmarks.length} URLs saved multiple times across folders.`
                  : 'No duplicate bookmarks found in your bookmark tree.'}
              </p>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-500">
              {bookmarks.duplicateBookmarks.length > 0
                ? `${bookmarks.duplicateBookmarks.reduce((s, d) => s + d.count, 0)} total bookmark copies`
                : 'Clean Tree'}
            </span>
            {bookmarks.duplicateBookmarks.length > 0 && (
              <Button type="link" size="small" onClick={() => onTabChange('bookmarks')} className="!p-0 !h-auto text-rose-600">
                Review Duplicates →
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ── 4-Quadrant Mini Leaderboards ── */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Open Tab Domains */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400">
                <LayoutGrid size={18} />
              </div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Top Domains in Open Tabs
              </h3>
            </div>
            <Button type="link" size="small" onClick={() => onTabChange('tabs')} className="text-blue-600">
              View All ({tabs.topDomains.length})
            </Button>
          </div>

          <div className="space-y-3">
            {tabs.topDomains.slice(0, 5).map((domainItem, index) => (
              <div key={domainItem.domain} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate max-w-[240px]">
                    <span className="text-slate-400 font-mono text-[11px] w-4">{index + 1}.</span>
                    {domainItem.domain}
                  </span>
                  <span className="text-slate-500 font-semibold">
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
            ))}
            {tabs.topDomains.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">No open tabs found</p>
            )}
          </div>
        </div>

        {/* Top Bookmarked Domains */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/40 text-amber-600 dark:text-amber-400">
                <Bookmark size={18} />
              </div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Top Bookmarked Domains
              </h3>
            </div>
            <Button type="link" size="small" onClick={() => onTabChange('bookmarks')} className="text-amber-600">
              View All ({bookmarks.topDomains.length})
            </Button>
          </div>

          <div className="space-y-3">
            {bookmarks.topDomains.slice(0, 5).map((domainItem, index) => (
              <div key={domainItem.domain} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1.5 truncate max-w-[240px]">
                    <span className="text-slate-400 font-mono text-[11px] w-4">{index + 1}.</span>
                    {domainItem.domain}
                  </span>
                  <span className="text-slate-500 font-semibold">
                    {domainItem.count} bookmarks <span className="text-slate-400 font-normal">({domainItem.percentage}%)</span>
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
            {bookmarks.topDomains.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">No bookmarks found</p>
            )}
          </div>
        </div>

        {/* Largest Saved Lists */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-purple-100 dark:bg-purple-900/40 text-purple-600 dark:text-purple-400">
                <BookmarkPlus size={18} />
              </div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Largest Saved Lists
              </h3>
            </div>
            <Button type="link" size="small" onClick={() => onTabChange('lists')} className="text-purple-600">
              View All ({lists.totalLists})
            </Button>
          </div>

          <div className="space-y-2.5">
            {lists.largestLists.slice(0, 5).map((list, idx) => (
              <div
                key={list.id}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
              >
                <div className="truncate max-w-[260px]">
                  <div className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                    {list.name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    Library: {list.libraryName} • {new Date(list.created).toLocaleDateString()}
                  </div>
                </div>
                <Tag color="purple" className="!mr-0 font-medium">
                  {list.tabCount} tabs
                </Tag>
              </div>
            ))}
            {lists.largestLists.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">No saved lists found</p>
            )}
          </div>
        </div>

        {/* Largest Saved Sessions */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-lg bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400">
                <FolderOpen size={18} />
              </div>
              <h3 className="text-base font-semibold text-slate-800 dark:text-white">
                Largest Saved Sessions
              </h3>
            </div>
            <Button type="link" size="small" onClick={() => onTabChange('sessions')} className="text-emerald-600">
              View All ({sessions.totalSessions})
            </Button>
          </div>

          <div className="space-y-2.5">
            {sessions.largestSessions.slice(0, 5).map((session, idx) => (
              <div
                key={session.created}
                className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800"
              >
                <div className="truncate max-w-[260px]">
                  <div className="text-xs font-semibold text-slate-800 dark:text-white truncate">
                    {session.name}
                  </div>
                  <div className="text-[11px] text-slate-400 truncate">
                    {session.windowCount} {session.windowCount === 1 ? 'window' : 'windows'} • {new Date(session.created).toLocaleDateString()}
                  </div>
                </div>
                <Tag color="green" className="!mr-0 font-medium">
                  {session.tabCount} tabs
                </Tag>
              </div>
            ))}
            {sessions.largestSessions.length === 0 && (
              <p className="text-xs text-slate-400 py-4 text-center">No saved sessions found</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
