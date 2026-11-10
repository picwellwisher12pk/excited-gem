import React, { useState, useMemo } from 'react'
import { Modal, Checkbox, message, Tag } from 'antd'
import { Sparkles, Trash2, CheckCircle2, Globe } from 'lucide-react'
import type { UnifiedWindow, UnifiedTab } from '../../src/adapter/types'

interface DesktopDuplicateTabsModalProps {
  visible: boolean
  windows: UnifiedWindow[]
  onClose: () => void
  onCloseTab: (browserId: string, tabId: number) => void
}

interface DuplicateGroup {
  url: string
  title: string
  favIconUrl?: string
  tabs: Array<{
    tab: UnifiedTab
    browserId: string
    windowId: number
  }>
}

export const DesktopDuplicateTabsModal: React.FC<DesktopDuplicateTabsModalProps> = ({
  visible,
  windows,
  onClose,
  onCloseTab
}) => {
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(() => new Set())
  const [isClosing, setIsClosing] = useState(false)

  // Group tabs across all windows and browsers by URL
  const duplicateGroups = useMemo<DuplicateGroup[]>(() => {
    const map = new Map<string, DuplicateGroup>()

    for (const win of windows) {
      for (const tab of win.tabs) {
        if (!tab.url || tab.url === 'about:blank' || tab.url.startsWith('chrome://')) {
          continue
        }

        const normalizedUrl = tab.url.replace(/\/$/, '').toLowerCase()
        const existing = map.get(normalizedUrl)
        if (existing) {
          existing.tabs.push({
            tab,
            browserId: win.browserId,
            windowId: win.id
          })
        } else {
          map.set(normalizedUrl, {
            url: tab.url,
            title: tab.title || tab.url,
            favIconUrl: tab.favIconUrl,
            tabs: [
              {
                tab,
                browserId: win.browserId,
                windowId: win.id
              }
            ]
          })
        }
      }
    }

    // Filter to only groups that have 2 or more occurrences
    return Array.from(map.values()).filter((g) => g.tabs.length > 1)
  }, [windows])

  const totalDuplicates = useMemo(() => {
    return duplicateGroups.reduce((acc, g) => acc + (g.tabs.length - 1), 0)
  }, [duplicateGroups])

  const handleSelectDuplicatesExceptFirst = () => {
    const next = new Set<string>()
    for (const g of duplicateGroups) {
      // Keep the first tab, select all other occurrences
      for (let i = 1; i < g.tabs.length; i++) {
        const item = g.tabs[i]
        next.add(`${item.browserId}:${item.tab.id}`)
      }
    }
    setSelectedKeys(next)
  }

  const handleSelectAll = () => {
    const next = new Set<string>()
    for (const g of duplicateGroups) {
      for (const item of g.tabs) {
        next.add(`${item.browserId}:${item.tab.id}`)
      }
    }
    setSelectedKeys(next)
  }

  const handleClearSelection = () => {
    setSelectedKeys(new Set())
  }

  const handleToggleTab = (browserId: string, tabId: number) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      const key = `${browserId}:${tabId}`
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  const handleExecuteClose = async () => {
    if (selectedKeys.size === 0) return
    setIsClosing(true)

    try {
      for (const g of duplicateGroups) {
        for (const item of g.tabs) {
          const key = `${item.browserId}:${item.tab.id}`
          if (selectedKeys.has(key)) {
            await onCloseTab(item.browserId, item.tab.id)
          }
        }
      }
      message.success(`Closed ${selectedKeys.size} duplicate tabs`)
      setSelectedKeys(new Set())
      onClose()
    } catch (err) {
      console.error('Failed to close duplicate tabs:', err)
      message.error('An error occurred while closing duplicates')
    } finally {
      setIsClosing(false)
    }
  }

  const getBrowserBadge = (browserId: string) => {
    if (browserId.includes('chrome')) {
      return { label: 'Chrome', color: 'orange' }
    }
    if (browserId.includes('edge')) {
      return { label: 'Edge', color: 'blue' }
    }
    if (browserId.includes('firefox')) {
      return { label: 'Firefox', color: 'volcano' }
    }
    return { label: 'Browser', color: 'default' }
  }

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      width={720}
      centered
      title={
        <div className="flex items-center gap-2 text-base font-semibold">
          <Sparkles className="w-5 h-5 text-[#0078d4]" />
          <span>Cross-Browser Tab Deduplication</span>
          <span
            className="text-xs px-2 py-0.5 rounded-full font-mono font-medium ml-2"
            style={{
              background: 'var(--accent-subtle)',
              color: 'var(--accent)'
            }}
          >
            {duplicateGroups.length} groups · {totalDuplicates} redundant tabs
          </span>
        </div>
      }
      footer={
        <div className="flex items-center justify-between pt-2">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleSelectDuplicatesExceptFirst}
              className="text-xs font-semibold px-3 py-1.5 rounded-lg border transition-colors hover:bg-black/5 dark:hover:bg-white/5"
              style={{ borderColor: 'var(--border)' }}
            >
              Select Duplicates (Keep 1st)
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              className="text-xs px-2.5 py-1.5 rounded-lg transition-colors text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
            >
              Clear
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="text-xs px-4 py-1.5 rounded-lg transition-colors border hover:bg-black/5 dark:hover:bg-white/5"
              style={{ borderColor: 'var(--border)' }}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={selectedKeys.size === 0 || isClosing}
              onClick={handleExecuteClose}
              className="flex items-center gap-1.5 text-xs font-semibold px-4 py-1.5 rounded-lg text-white bg-red-600 hover:bg-red-700 disabled:opacity-40 transition-all shadow-sm"
            >
              <Trash2 size={13} />
              <span>Close {selectedKeys.size} Selected</span>
            </button>
          </div>
        </div>
      }
    >
      <div className="max-h-[60vh] overflow-y-auto pr-1 flex flex-col gap-3 py-2">
        {duplicateGroups.length === 0 ? (
          <div className="py-12 text-center text-sm text-[var(--text-tertiary)] flex flex-col items-center gap-2">
            <CheckCircle2 size={36} className="text-emerald-500 mb-1" />
            <div className="font-semibold text-[var(--text-primary)]">Clean Workspace</div>
            <div>No duplicate tab URLs found across any connected browsers!</div>
          </div>
        ) : (
          duplicateGroups.map((group, groupIdx) => (
            <div
              key={groupIdx}
              className="p-3 rounded-xl border flex flex-col gap-2 transition-all"
              style={{
                background: 'var(--surface-3)',
                borderColor: 'var(--border-subtle)'
              }}
            >
              <div className="flex items-center gap-2 min-w-0">
                {group.favIconUrl ? (
                  <img
                    src={group.favIconUrl}
                    alt=""
                    className="w-4 h-4 rounded shrink-0"
                    onError={(e) => {
                      ;(e.target as HTMLElement).style.display = 'none'
                    }}
                  />
                ) : (
                  <Globe size={14} className="text-[var(--text-tertiary)] shrink-0" />
                )}
                <span className="text-xs font-semibold truncate text-[var(--text-primary)]">
                  {group.title}
                </span>
                <span className="text-[11px] font-mono text-[var(--text-tertiary)] truncate ml-auto">
                  {group.tabs.length} copies
                </span>
              </div>

              <div className="text-[11px] font-mono text-[var(--text-tertiary)] truncate">
                {group.url}
              </div>

              {/* Duplicate tab items list */}
              <div className="flex flex-col gap-1 pl-2 border-l-2 mt-1" style={{ borderColor: 'var(--border)' }}>
                {group.tabs.map((item, tabIdx) => {
                  const key = `${item.browserId}:${item.tab.id}`
                  const isChecked = selectedKeys.has(key)
                  const badge = getBrowserBadge(item.browserId)

                  return (
                    <div
                      key={key}
                      onClick={() => handleToggleTab(item.browserId, item.tab.id)}
                      className="flex items-center justify-between gap-2 p-1.5 rounded-lg cursor-pointer hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <Checkbox checked={isChecked} />
                        <Tag color={badge.color} className="text-[10px] m-0">
                          {badge.label}
                        </Tag>
                        <span className="text-[11px] font-mono text-[var(--text-tertiary)]">
                          Window #{item.windowId}
                        </span>
                        {tabIdx === 0 && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium">
                            Primary
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-[var(--text-secondary)] truncate">
                        Tab #{item.tab.id}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          ))
        )}
      </div>
    </Modal>
  )
}
