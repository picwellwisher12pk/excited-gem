import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Globe } from 'lucide-react'
import { message } from 'antd'
import { BrowserIcon } from '../BrowserIcon'
import { getTabDragPayload, clearTabDragPayload } from '../../views/workspace/dragState'
import {
  type UnifiedWindow,
  type ConnectedBrowser,
  isSameBrowserEngine
} from '../../../../src/adapter/types'

interface BrowserFiltersProps {
  windows: UnifiedWindow[]
  browsers?: ConnectedBrowser[]
  totalTabs: number
  selectedBrowserId: string
  onSelectBrowser: (id: string) => void
  onMigrateTab?: (
    sourceBrowserId: string,
    targetBrowserId: string,
    tabId: number,
    url: string,
    targetWindowId?: number
  ) => void | Promise<void>
}

export const BrowserFilters: React.FC<BrowserFiltersProps> = ({
  windows,
  browsers = [],
  totalTabs,
  selectedBrowserId,
  onSelectBrowser,
  onMigrateTab
}) => {
  const [dragOverBrowserId, setDragOverBrowserId] = useState<string | null>(null)
  const getBrowserTabCount = (browserId: string) => {
    return windows
      .filter((w) => isSameBrowserEngine(w.browserId, browserId))
      .reduce((acc, w) => acc + (w.tabs?.length || 0), 0)
  }

  const edgeCount = getBrowserTabCount('edge')
  const chromeCount = getBrowserTabCount('chrome')
  const firefoxCount = getBrowserTabCount('firefox')
  const operaCount = getBrowserTabCount('opera')
  const braveCount = getBrowserTabCount('brave')

  const hasOpera =
    operaCount > 0 ||
    browsers.some((b) => isSameBrowserEngine(b.id, 'opera') || isSameBrowserEngine(b.engine, 'opera'))
  const hasBrave =
    braveCount > 0 ||
    browsers.some((b) => isSameBrowserEngine(b.id, 'brave') || isSameBrowserEngine(b.engine, 'brave'))

  const browserFilters = [
    {
      id: 'all',
      label: 'All',
      count: totalTabs,
      color: 'var(--accent)',
      icon: <Globe size={13} strokeWidth={2} />
    },
    {
      id: 'edge',
      label: 'Edge',
      count: edgeCount,
      color: 'var(--browser-edge)'
    },
    {
      id: 'chrome',
      label: 'Chrome',
      count: chromeCount,
      color: 'var(--browser-chrome)'
    },
    {
      id: 'firefox',
      label: 'Firefox',
      count: firefoxCount,
      color: 'var(--browser-firefox)'
    },
    ...(hasOpera
      ? [
          {
            id: 'opera',
            label: 'Opera',
            count: operaCount,
            color: '#ff1b2d'
          }
        ]
      : []),
    ...(hasBrave
      ? [
          {
            id: 'brave',
            label: 'Brave',
            count: braveCount,
            color: '#fb542b'
          }
        ]
      : [])
  ]

  return (
    <div className="flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar py-1">
      <div
        className="relative flex items-center p-1 rounded-xl"
        style={{
          background: 'var(--surface-3)',
          border: '1px solid var(--border-subtle)'
        }}
      >
        {browserFilters.map((filter) => {
          const isSelected =
            selectedBrowserId === filter.id ||
            (filter.id !== 'all' && isSameBrowserEngine(selectedBrowserId, filter.id))
          const isTargetDragOver = dragOverBrowserId === filter.id

          const handleFilterDrop = async (e: React.DragEvent) => {
            e.preventDefault()
            e.stopPropagation()
            setDragOverBrowserId(null)
            if (filter.id === 'all' || !onMigrateTab) return

            try {
              let data: any = getTabDragPayload()
              if (!data) {
                try {
                  const raw = e.dataTransfer.getData('application/json') || e.dataTransfer.getData('text/plain')
                  if (raw && (raw.startsWith('{') || raw.startsWith('['))) {
                    data = JSON.parse(raw)
                  }
                } catch {}
              }
              clearTabDragPayload()

              if (!data) return

              const tabsToMove = Array.isArray(data.tabs) && data.tabs.length > 0
                ? data.tabs
                : data.tabId && data.browserId
                ? [{ browserId: data.browserId, tabId: data.tabId, url: data.url || '', title: data.title || '' }]
                : []

              const eligibleTabs = tabsToMove.filter(
                (t) => !isSameBrowserEngine(t.browserId, filter.id) && t.url
              )

              if (eligibleTabs.length === 0) return

              for (const t of eligibleTabs) {
                await onMigrateTab(t.browserId, filter.id, t.tabId, t.url)
              }

              message.success(
                `Moved ${eligibleTabs.length} tab${eligibleTabs.length > 1 ? 's' : ''} to ${filter.label}`
              )
            } catch (err) {
              console.error('Failed to migrate tabs to browser:', err)
            }
          }

          return (
            <button
              type="button"
              key={filter.id}
              onClick={() => onSelectBrowser(filter.id)}
              onDragOver={(e) => {
                if (filter.id !== 'all' && onMigrateTab) {
                  e.preventDefault()
                  e.dataTransfer.dropEffect = 'move'
                  setDragOverBrowserId(filter.id)
                }
              }}
              onDragLeave={() => {
                if (dragOverBrowserId === filter.id) {
                  setDragOverBrowserId(null)
                }
              }}
              onDrop={handleFilterDrop}
              className={`relative flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 z-10 ${
                isTargetDragOver ? 'scale-105 ring-2 ring-[var(--accent)] bg-[var(--accent-subtle)]' : ''
              }`}
              style={{
                color: isSelected ? 'var(--text-primary)' : 'var(--text-tertiary)',
                fontWeight: isSelected ? 600 : 500
              }}
            >
              {isSelected && (
                <motion.div
                  layoutId="browser-filter-bg"
                  className="absolute inset-0 rounded-lg"
                  style={{
                    background: 'var(--surface-2)',
                    boxShadow: 'var(--shadow-sm)',
                    border: '1px solid var(--border-subtle)'
                  }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}

              <span className="relative z-10 flex items-center gap-1.5">
                {filter.icon && <span>{filter.icon}</span>}
                {!filter.icon && (
                  <BrowserIcon browserId={filter.id} size={13} />
                )}
                <span>{filter.label}</span>
                <span
                  className="text-[10px] px-1.5 py-0.2 rounded-full font-semibold"
                  style={{
                    background: isSelected ? 'var(--surface-4)' : 'transparent',
                    color: isSelected ? 'var(--text-primary)' : 'var(--text-tertiary)'
                  }}
                >
                  {filter.count}
                </span>
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
