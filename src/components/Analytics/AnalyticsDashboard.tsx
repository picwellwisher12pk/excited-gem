import React, { useEffect, useState, useCallback, useMemo } from 'react'
import { Tabs, Button, Spin, Typography, Badge, Tooltip, message } from 'antd'
import {
  BarChart3,
  RefreshCw,
  Download,
  LayoutGrid,
  Bookmark,
  BookmarkPlus,
  FolderOpen,
  Globe,
  PieChart
} from 'lucide-react'
import Sidebar, { SidebarToggleButton } from '../Sidebar'
import Brand from '../Header/Brand'
import logo from '../../assets/logo.svg'
import { usePageTracking } from '../Analytics/usePageTracking'
import { useSelector, useDispatch } from 'react-redux'
import type { AppDispatch, RootState } from '../../store/store'
import { toggleDrawer, setProviderStatus } from '../../store/aiSlice'
import { AIDrawer } from '../AI/AIDrawer'
import { RoutineQuickMenu } from '../Routines/RoutineQuickMenu'
import UnifiedSearch from '../Search'
import { getAIService } from '../../ai/AIService'
import { fetchFullAnalyticsData } from '../../services/analyticsDataService'
import type { FullAnalyticsData } from '../../services/analyticsDataService'
import { OverviewView } from './OverviewView'
import { TabsAnalyticsView } from './TabsAnalyticsView'
import { BookmarksAnalyticsView } from './BookmarksAnalyticsView'
import { ListsAnalyticsView } from './ListsAnalyticsView'
import { SessionsAnalyticsView } from './SessionsAnalyticsView'
import { DomainCrossExplorer } from './DomainCrossExplorer'
import { ExportReportModal } from './ExportReportModal'

const { Text } = Typography

export const AnalyticsDashboard: React.FC = () => {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  const [activeTabKey, setActiveTabKey] = useState('overview')
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [analyticsData, setAnalyticsData] = useState<FullAnalyticsData | null>(
    null
  )
  const [exportModalOpen, setExportModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')

  const dispatch = useDispatch<AppDispatch>()
  const { status } = useSelector((s: RootState) => s.ai)

  usePageTracking('/analytics', 'Analytics')

  const loadData = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    else setLoading(true)

    try {
      const data = await fetchFullAnalyticsData()
      setAnalyticsData(data)
      if (isRefresh) message.success('Analytics refreshed!')
    } catch (err) {
      console.error('Failed to load analytics data:', err)
      message.error('Failed to fetch analytics data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useEffect(() => {
    const checkAI = async () => {
      try {
        const service = await getAIService()
        const providerStatus = await service.getStatus()
        dispatch(setProviderStatus(providerStatus))
      } catch {
        // AI service optional
      }
    }
    checkAI()
  }, [dispatch])

  const tabItems = useMemo(
    () => [
      {
        key: 'overview',
        label: (
          <span className="flex items-center gap-2 font-medium">
            <PieChart size={16} />
            <span>Overview</span>
          </span>
        ),
        children: analyticsData ? (
          <OverviewView
            data={analyticsData}
            onTabChange={setActiveTabKey}
            onRefresh={() => loadData(true)}
          />
        ) : null
      },
      {
        key: 'tabs',
        label: (
          <span className="flex items-center gap-2 font-medium">
            <LayoutGrid size={16} />
            <span>Tabs</span>
            {analyticsData && (
              <Badge
                count={analyticsData.tabs.totalTabs}
                overflowCount={999}
                className="!text-xs ml-1"
                color="#1890ff"
              />
            )}
          </span>
        ),
        children: analyticsData ? (
          <TabsAnalyticsView
            stats={analyticsData.tabs}
            onRefresh={() => loadData(true)}
          />
        ) : null
      },
      {
        key: 'bookmarks',
        label: (
          <span className="flex items-center gap-2 font-medium">
            <Bookmark size={16} />
            <span>Bookmarks</span>
            {analyticsData && (
              <Badge
                count={analyticsData.bookmarks.totalBookmarks}
                overflowCount={999}
                className="!text-xs ml-1"
                color="#faad14"
              />
            )}
          </span>
        ),
        children: analyticsData ? (
          <BookmarksAnalyticsView
            stats={analyticsData.bookmarks}
            onRefresh={() => loadData(true)}
          />
        ) : null
      },
      {
        key: 'lists',
        label: (
          <span className="flex items-center gap-2 font-medium">
            <BookmarkPlus size={16} />
            <span>Lists</span>
            {analyticsData && (
              <Badge
                count={analyticsData.lists.totalLists}
                overflowCount={999}
                className="!text-xs ml-1"
                color="#722ed1"
              />
            )}
          </span>
        ),
        children: analyticsData ? (
          <ListsAnalyticsView
            stats={analyticsData.lists}
            onRefresh={() => loadData(true)}
          />
        ) : null
      },
      {
        key: 'sessions',
        label: (
          <span className="flex items-center gap-2 font-medium">
            <FolderOpen size={16} />
            <span>Sessions</span>
            {analyticsData && (
              <Badge
                count={analyticsData.sessions.totalSessions}
                overflowCount={999}
                className="!text-xs ml-1"
                color="#52c41a"
              />
            )}
          </span>
        ),
        children: analyticsData ? (
          <SessionsAnalyticsView
            stats={analyticsData.sessions}
            onRefresh={() => loadData(true)}
          />
        ) : null
      },
      {
        key: 'domains',
        label: (
          <span className="flex items-center gap-2 font-medium">
            <Globe size={16} />
            <span>Domain Matrix</span>
            {analyticsData && (
              <Badge
                count={analyticsData.crossDomains.length}
                overflowCount={999}
                className="!text-xs ml-1"
                color="#13c2c2"
              />
            )}
          </span>
        ),
        children: analyticsData ? (
          <DomainCrossExplorer
            data={analyticsData}
            externalSearch={searchQuery}
          />
        ) : null
      }
    ],
    [analyticsData, loadData]
  )

  return (
    <div className="flex h-[100vh] relative overflow-hidden">
      <Sidebar
        currentPage="analytics"
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onAIClick={() => dispatch(toggleDrawer())}
        aiEnabled={status?.connected}
      />

      <div className="flex flex-col flex-1 min-h-0 h-full">
        {/* ── Header matching Sessions / Lists / Bookmarks structure ── */}
        <header className="bg-gradient-to-t from-cyan-500 to-blue-500 p-2 transition-all duration-200 ease-in-out shrink-0">
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
                  Analytics
                </span>
                {analyticsData && (
                  <span className="ml-2 text-white/80 text-sm hidden md:inline">
                    ({analyticsData.crossDomains.length} unique domains)
                  </span>
                )}
              </div>
            </div>

            <div className="flex-1 flex justify-end items-center gap-3 pr-2">
              <RoutineQuickMenu size="middle" buttonText="Routines" />

              <Tooltip title="Export analytics report">
                <Button
                  type="text"
                  icon={<Download size={17} className="text-white" />}
                  onClick={() => setExportModalOpen(true)}
                  className="flex items-center justify-center hover:bg-white/10 text-white rounded"
                />
              </Tooltip>

              <Tooltip title="Refresh statistics">
                <Button
                  type="text"
                  icon={
                    <RefreshCw
                      size={17}
                      className={`text-white ${refreshing ? 'animate-spin' : ''}`}
                    />
                  }
                  onClick={() => loadData(true)}
                  disabled={refreshing}
                  className="flex items-center justify-center hover:bg-white/10 text-white rounded"
                />
              </Tooltip>

              <div className="w-full max-w-md hidden sm:block">
                <UnifiedSearch
                  isReduxConnected={false}
                  placeholder="Quick search across features..."
                  value={searchQuery}
                  onChange={(val: string) => {
                    setSearchQuery(val)
                    if (val && activeTabKey !== 'domains') {
                      setActiveTabKey('domains')
                    }
                  }}
                  onSearch={(val: string) => {
                    setSearchQuery(val)
                    if (val && activeTabKey !== 'domains') {
                      setActiveTabKey('domains')
                    }
                  }}
                  showTabFilters={false}
                  foundCount={
                    analyticsData ? analyticsData.crossDomains.length : 0
                  }
                  className="w-full !ml-0 rounded-md border-0"
                />
              </div>
            </div>
          </section>
        </header>

        {/* ── Main Scrollable Body ── */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden bg-gray-50 p-4 sm:p-6 min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
              <Spin size="large" />
              <Text className="text-sm text-gray-500 font-medium">
                Aggregating browser analytics & statistics...
              </Text>
            </div>
          ) : (
            <div className="max-w-7xl mx-auto pb-12 space-y-6">
              <Tabs
                activeKey={activeTabKey}
                onChange={setActiveTabKey}
                items={tabItems}
                size="large"
                className="bg-transparent"
              />
            </div>
          )}
        </div>
      </div>

      {/* ── Export Report Modal ── */}
      <ExportReportModal
        open={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        data={analyticsData}
      />

      <AIDrawer
        onOpenSettings={() => {
          window.location.href = '/tabs/settings.html#ai'
        }}
      />
    </div>
  )
}
