import React, { useState, useMemo } from 'react'
import { Modal, Tag, Tooltip, message, } from 'antd'
import {
  BrainCircuit,
  FolderPlus,
  Code2,
  BookOpen,
  Film,
  MessageSquare,
  Search,
  ShoppingBag,
  Layers
} from 'lucide-react'
import type { UnifiedWindow, UnifiedTab } from '../../src/adapter/types'

interface DesktopClusterModalProps {
  visible: boolean
  windows: UnifiedWindow[]
  onClose: () => void
  onCreateTab: (browserId: string, windowId?: number, url?: string) => void
  onCloseTab: (browserId: string, tabId: number) => void
}

interface TabCluster {
  id: string
  name: string
  icon: React.ReactNode
  color: string
  tabs: Array<{
    tab: UnifiedTab
    browserId: string
    windowId: number
  }>
}

function categorizeTab(tab: UnifiedTab): string {
  const text = `${tab.title || ''} ${tab.url || ''}`.toLowerCase()

  if (/github|gitlab|stackoverflow|localhost|dev|npm|repo|pull|commit|tauri|cargo|rust/.test(text)) {
    return 'Development'
  }
  if (/docs|documentation|mdn|guide|manual|api|reference|cheatsheet/.test(text)) {
    return 'Documentation'
  }
  if (/youtube|spotify|netflix|twitch|soundcloud|music|video|stream|audio/.test(text)) {
    return 'Media'
  }
  if (/twitter|x\.com|discord|slack|reddit|linkedin|telegram|whatsapp|chat/.test(text)) {
    return 'Social'
  }
  if (/wikipedia|arxiv|medium|substack|paper|research|study|edu|article/.test(text)) {
    return 'Research'
  }
  if (/amazon|ebay|shop|store|pricing|checkout|cart|buy/.test(text)) {
    return 'Shopping'
  }
  return 'General'
}

const CLUSTER_CONFIG: Record<string, { icon: React.ReactNode; color: string }> = {
  Development: { icon: <Code2 size={15} />, color: '#0078d4' },
  Documentation: { icon: <BookOpen size={15} />, color: '#00b4d8' },
  Media: { icon: <Film size={15} />, color: '#e74c3c' },
  Social: { icon: <MessageSquare size={15} />, color: '#9b59b6' },
  Research: { icon: <Search size={15} />, color: '#2ecc71' },
  Shopping: { icon: <ShoppingBag size={15} />, color: '#f39c12' },
  General: { icon: <Layers size={15} />, color: '#8899a6' }
}

export const DesktopClusterModal: React.FC<DesktopClusterModalProps> = ({
  visible,
  windows,
  onClose,
  onCreateTab,
  onCloseTab
}) => {
  const [selectedClusterIds, setSelectedClusterIds] = useState<Set<string>>(() => new Set())

  // Cluster tabs across all active windows
  const clusters = useMemo<TabCluster[]>(() => {
    const map = new Map<string, TabCluster>()

    for (const win of windows) {
      if ((win as unknown as { isOffline?: boolean }).isOffline) continue

      for (const tab of win.tabs) {
        if (!tab.url || tab.url === 'about:blank') continue

        const cat = categorizeTab(tab)
        const config = CLUSTER_CONFIG[cat] || CLUSTER_CONFIG.General

        if (!map.has(cat)) {
          map.set(cat, {
            id: cat,
            name: cat,
            icon: config.icon,
            color: config.color,
            tabs: []
          })
        }

        map.get(cat)!.tabs.push({
          tab,
          browserId: win.browserId,
          windowId: win.id
        })
      }
    }

    return Array.from(map.values()).sort((a, b) => b.tabs.length - a.tabs.length)
  }, [windows])

  const handleCreateClusterWindow = async (cluster: TabCluster) => {
    try {
      if (cluster.tabs.length === 0) return
      const targetBrowser = cluster.tabs[0].browserId
      // Create new window with first tab
      await onCreateTab(targetBrowser, undefined, cluster.tabs[0].tab.url)
      message.success(`Created new window for "${cluster.name}" cluster`)
    } catch (err) {
      console.error('Failed to create cluster window:', err)
      message.error('Could not create cluster window')
    }
  }

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      width={740}
      centered
      title={
        <div className="flex items-center gap-2 text-base font-semibold">
          <BrainCircuit className="w-5 h-5 text-[#0078d4]" />
          <span>AI Semantic Tab Clustering</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-mono font-medium ml-2"
            style={{
              background: 'var(--accent-subtle)',
              color: 'var(--accent)'
            }}
          >
            {clusters.length} topics detected
          </span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between pt-2">
          <span className="text-xs text-[var(--text-tertiary)] font-mono">
            {clusters.reduce((acc, c) => acc + c.tabs.length, 0)} total tabs classified
          </span>
          <button
            type="button"
            onClick={onClose}
            className="text-xs font-semibold px-4 py-1.5 rounded-lg bg-[var(--accent)] text-white hover:brightness-110 transition-all shadow-sm"
          >
            Done
          </button>
        </div>
      }
    >
      <div className="max-h-[60vh] overflow-y-auto pr-1 flex flex-col gap-3 py-2">
        {clusters.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--text-tertiary)]">
            No active tabs available to cluster.
          </div>
        ) : (
          clusters.map((cluster) => (
            <div
              key={cluster.id}
              className="p-3.5 rounded-xl border flex flex-col gap-2.5 transition-all"
              style={{
                background: 'var(--surface-3)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              {/* Cluster Header */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                    style={{
                      background: `${cluster.color}20`,
                      color: cluster.color
                    }}
                  >
                    {cluster.icon}
                  </span>
                  <span className="text-sm font-semibold text-[var(--text-primary)]">
                    {cluster.name}
                  </span>
                  <Tag
                    style={{
                      borderColor: `${cluster.color}40`,
                      background: `${cluster.color}15`,
                      color: cluster.color
                    }}
                    className="text-[11px] font-mono font-medium m-0"
                  >
                    {cluster.tabs.length} tabs
                  </Tag>
                </div>

                <Tooltip title="Gather these tabs into a dedicated window">
                  <button
                    type="button"
                    onClick={() => handleCreateClusterWindow(cluster)}
                    className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-lg border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
                    style={{
                      borderColor: 'var(--border-subtle)',
                      color: 'var(--text-secondary)'
                    }}
                  >
                    <FolderPlus size={13} style={{ color: cluster.color }} />
                    <span>Group in Window</span>
                  </button>
                </Tooltip>
              </div>

              {/* Tabs under this cluster */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 pl-2 border-l-2 mt-0.5" style={{ borderColor: `${cluster.color}40` }}>
                {cluster.tabs.map((item, idx) => (
                  <div
                    key={`${item.browserId}-${item.tab.id}-${idx}`}
                    className="flex items-center gap-2 p-1.5 rounded-lg bg-black/5 dark:bg-white/5 min-w-0"
                  >
                    {item.tab.favIconUrl ? (
                      <img
                        src={item.tab.favIconUrl}
                        alt=""
                        className="w-3.5 h-3.5 rounded shrink-0"
                        onError={(e) => {
                          ;(e.target as HTMLElement).style.display = 'none'
                        }}
                      />
                    ) : (
                      <span
                        className="w-2 h-2 rounded-full shrink-0"
                        style={{ backgroundColor: cluster.color }}
                      />
                    )}
                    <span
                      className="text-xs truncate text-[var(--text-primary)]"
                      title={item.tab.title}
                    >
                      {item.tab.title || 'Untitled Tab'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}
