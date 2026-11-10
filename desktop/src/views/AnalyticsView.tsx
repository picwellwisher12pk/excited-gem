import React from 'react'
import { BarChart3 } from 'lucide-react'
import { KpiCards } from './analytics/KpiCards'
import { TopDomainsCard } from './analytics/TopDomainsCard'
import { DuplicatesCard } from './analytics/DuplicatesCard'
import type { UnifiedWindow, ConnectedBrowser } from '../../src/adapter/types'

interface AnalyticsViewProps {
  windows: UnifiedWindow[]
  browsers: ConnectedBrowser[]
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({ windows }) => {
  const allTabs = windows.flatMap((w) => w.tabs)
  const totalTabs = allTabs.length
  const totalWindows = windows.length
  const sleepingTabs = allTabs.filter((t) => t.discarded).length
  const audibleTabs = allTabs.filter((t) => t.audible).length
  const pinnedTabs = allTabs.filter((t) => t.pinned).length

  // Domain breakdown
  const domainCounts = allTabs.reduce<Record<string, number>>((acc, tab) => {
    try {
      if (tab.url) {
        const domain = new URL(tab.url).hostname.replace(/^www\./, '')
        acc[domain] = (acc[domain] || 0) + 1
      }
    } catch {
      acc.other = (acc.other || 0) + 1
    }
    return acc
  }, {})

  const topDomains = Object.entries(domainCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)

  const maxDomainCount = topDomains.length > 0 ? topDomains[0][1] : 1

  // Duplicate URLs detection
  const urlMap = new Map<string, { title: string; count: number; browsers: Set<string> }>()
  for (const tab of allTabs) {
    if (tab.url && tab.url !== 'about:blank' && !tab.url.startsWith('chrome://')) {
      const existing = urlMap.get(tab.url)
      if (existing) {
        existing.count++
        existing.browsers.add(tab.browserId)
      } else {
        urlMap.set(tab.url, {
          title: tab.title,
          count: 1,
          browsers: new Set([tab.browserId])
        })
      }
    }
  }

  const duplicates = Array.from(urlMap.entries())
    .filter(([_, data]) => data.count > 1)
    .map(([url, data]) => ({
      url,
      title: data.title,
      count: data.count,
      browserCount: data.browsers.size
    }))
    .slice(0, 6)

  return (
    <div
      className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 transition-colors"
      style={{
        fontFamily: 'var(--font-sans)',
        background: 'var(--surface-0)'
      }}
    >
      {/* Header */}
      <div>
        <h2
          className="text-lg font-semibold flex items-center gap-2 m-0"
          style={{ color: 'var(--text-primary)' }}
        >
          <BarChart3 size={20} style={{ color: 'var(--accent)' }} />
          Resource & Tab Intelligence
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Real-time metrics and distribution across your connected browsers.
        </p>
      </div>

      {/* KPI Cards */}
      <KpiCards
        totalTabs={totalTabs}
        totalWindows={totalWindows}
        sleepingTabs={sleepingTabs}
        audibleTabs={audibleTabs}
        pinnedTabs={pinnedTabs}
      />

      {/* Domain Ranking & Duplicate URLs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <TopDomainsCard
          topDomains={topDomains}
          totalTabs={totalTabs}
          maxDomainCount={maxDomainCount}
        />
        <DuplicatesCard duplicates={duplicates} />
      </div>
    </div>
  )
}
