import React, { useState, useMemo, useEffect } from 'react'
import { Modal, Tag, Tooltip, message, Checkbox, Switch, Button, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import {
  Youtube,
  PlaySquare,
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  Clock,
  ExternalLink,
  Trash2,
  FolderPlus,
  RotateCw
} from 'lucide-react'
import type { UnifiedWindow, UnifiedTab, ConnectedBrowser } from '../../../src/adapter/types'
import { desktopYoutubeService, formatVideoDuration } from '../services/desktopYoutubeService'
import { extractVideoId } from '../../../src/utils/youtube'
import { getBrowserAdapter } from '../../../src/adapter'

interface DesktopYoutubeModalProps {
  visible: boolean
  windows: UnifiedWindow[]
  browsers: ConnectedBrowser[]
  onClose: () => void
  onFocusTab: (browserId: string, windowId: number, tabId: number) => void
  onCloseTab: (browserId: string, tabId: number) => void
  onCreateTab: (browserId: string, windowId?: number, url?: string) => void
  onSortWindowTabs?: (browserId: string, windowId: number, sortBy: string, direction?: 'asc' | 'desc') => Promise<void>
}

interface EnrichedYoutubeTab {
  tab: UnifiedTab
  browserId: string
  windowId: number
  type: 'Videos' | 'Shorts' | 'Channels' | 'Other'
  duration: number
}

function formatDuration(seconds: number): string {
  if (!seconds || seconds <= 0) return 'Unknown'
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

function getYoutubeType(url: string): 'Videos' | 'Shorts' | 'Channels' | 'Other' {
  if (url.includes('/shorts/')) return 'Shorts'
  if (url.includes('/@') || url.includes('/channel/') || url.includes('/c/')) return 'Channels'
  if (url.includes('/watch') || url.includes('youtu.be/')) return 'Videos'
  return 'Other'
}

export const DesktopYoutubeModal: React.FC<DesktopYoutubeModalProps> = ({
  visible,
  windows,
  browsers,
  onClose,
  onFocusTab,
  onCloseTab,
  onCreateTab,
  onSortWindowTabs
}) => {
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')
  const [groupByType, setGroupByType] = useState(true)
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set())
  const [, setRefreshNonce] = useState(0)
  const [isFetchingDurations, setIsFetchingDurations] = useState(false)

  useEffect(() => {
    return desktopYoutubeService.subscribe(() => {
      setRefreshNonce((n) => n + 1)
    })
  }, [])

  // Collect and enrich all YouTube tabs across active windows
  const allYoutubeTabs = useMemo<EnrichedYoutubeTab[]>(() => {
    const list: EnrichedYoutubeTab[] = []

    for (const win of windows) {
      if ((win as unknown as { isOffline?: boolean }).isOffline) continue

      for (const tab of win.tabs) {
        if (!tab.url) continue
        const isYt = tab.url.includes('youtube.com') || tab.url.includes('youtu.be')
        if (!isYt) continue

        const duration = tab.youtubeInfo?.duration || desktopYoutubeService.getDurationForUrl(tab.url) || 0
        const type = getYoutubeType(tab.url)

        list.push({
          tab,
          browserId: win.browserId,
          windowId: win.id,
          type,
          duration
        })
      }
    }

    return list.sort((a, b) => {
      // Sort primarily by duration
      if (a.duration > 0 && b.duration > 0) {
        return sortOrder === 'asc' ? a.duration - b.duration : b.duration - a.duration
      }
      if (a.duration > 0) return -1
      if (b.duration > 0) return 1
      return (a.tab.title || '').localeCompare(b.tab.title || '')
    })
  }, [windows, sortOrder])

  // Group tabs by category if toggled
  const groupedTabs = useMemo(() => {
    if (!groupByType) {
      return [{ title: 'All YouTube Tabs', items: allYoutubeTabs }]
    }

    const groups: Record<string, EnrichedYoutubeTab[]> = {
      Videos: [],
      Shorts: [],
      Channels: [],
      Other: []
    }

    for (const item of allYoutubeTabs) {
      groups[item.type].push(item)
    }

    return [
      { title: 'Videos', items: groups.Videos },
      { title: 'Shorts', items: groups.Shorts },
      { title: 'Channels', items: groups.Channels },
      { title: 'Search & Other', items: groups.Other }
    ].filter((g) => g.items.length > 0)
  }, [allYoutubeTabs, groupByType])

  // Select all / deselect all
  const allSelected = allYoutubeTabs.length > 0 && selectedKeys.size === allYoutubeTabs.length
  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedKeys(new Set())
    } else {
      setSelectedKeys(new Set(allYoutubeTabs.map((item) => `${item.browserId}:${item.tab.id}`)))
    }
  }

  const toggleSelect = (key: string) => {
    setSelectedKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  // Handle Sort Window Tabs in Actual Browser
  const handleSortWindow = async (browserId: string, windowId: number) => {
    if (!onSortWindowTabs) return
    try {
      await onSortWindowTabs(browserId, windowId, 'duration', sortOrder)
      message.success(
        `Sorted Window #${windowId} tabs by video duration (${sortOrder === 'asc' ? 'shortest first' : 'longest first'})`
      )
    } catch (err) {
      console.error('Failed to sort window tabs:', err)
      message.error('Failed to sort window tabs')
    }
  }

  // Sort menu options for each window that contains YouTube tabs
  const windowsWithYoutube = useMemo(() => {
    const map = new Map<string, { browserId: string; windowId: number; count: number }>()
    for (const item of allYoutubeTabs) {
      const key = `${item.browserId}-${item.windowId}`
      const existing = map.get(key)
      if (existing) {
        existing.count++
      } else {
        map.set(key, { browserId: item.browserId, windowId: item.windowId, count: 1 })
      }
    }
    return Array.from(map.values())
  }, [allYoutubeTabs])

  const sortWindowMenu: MenuProps['items'] = [
    {
      key: 'all-windows',
      label: `Sort All Active Windows (${windowsWithYoutube.length} windows)`,
      onClick: async () => {
        for (const w of windowsWithYoutube) {
          await handleSortWindow(w.browserId, w.windowId)
        }
      }
    },
    { type: 'divider' },
    ...windowsWithYoutube.map((w) => ({
      key: `win-${w.browserId}-${w.windowId}`,
      label: `Window #${w.windowId} (${w.count} YouTube tabs)`,
      onClick: () => handleSortWindow(w.browserId, w.windowId)
    }))
  ]

  // Group selected or all into a fresh new window
  const handleGroupIntoNewWindow = async () => {
    const targetItems =
      selectedKeys.size > 0
        ? allYoutubeTabs.filter((item) => selectedKeys.has(`${item.browserId}:${item.tab.id}`))
        : allYoutubeTabs

    if (targetItems.length === 0) return

    try {
      const first = targetItems[0]
      await onCreateTab(first.browserId, undefined, first.tab.url)

      for (let i = 1; i < targetItems.length; i++) {
        if (targetItems[i].tab.url) {
          await onCreateTab(first.browserId, undefined, targetItems[i].tab.url)
        }
      }
      message.success(`Grouped ${targetItems.length} YouTube tabs into a new window`)
    } catch (err) {
      console.error('Error grouping into new window:', err)
      message.error('Failed to group into new window')
    }
  }

  // Batch close selected
  const handleCloseSelected = async () => {
    const toClose = allYoutubeTabs.filter((item) =>
      selectedKeys.has(`${item.browserId}:${item.tab.id}`)
    )
    if (toClose.length === 0) return

    Modal.confirm({
      title: 'Close Selected YouTube Tabs',
      content: `Are you sure you want to close ${toClose.length} selected YouTube tabs?`,
      okText: 'Close Tabs',
      okType: 'danger',
      onOk: async () => {
        for (const item of toClose) {
          await onCloseTab(item.browserId, item.tab.id)
        }
        setSelectedKeys(new Set())
        message.success(`Closed ${toClose.length} tabs`)
      }
    })
  }

  const handleFetchDurations = async () => {
    setIsFetchingDurations(true)
    try {
      const adapter = getBrowserAdapter()
      if (adapter && 'fetchYoutubeDurations' in adapter) {
        ;(adapter as any).fetchYoutubeDurations()
      }
      const rawTabs = allYoutubeTabs.map((item) => item.tab)
      const count = await desktopYoutubeService.fetchMissingDurationsForTabs(rawTabs)
      message.success(`Synced YouTube durations (${count} updated)`)
    } catch (e: any) {
      console.warn('Error fetching YouTube durations:', e)
      message.error(e?.message || 'Failed to fetch YouTube durations')
    } finally {
      setIsFetchingDurations(false)
    }
  }

  return (
    <Modal
      title={
        <div className="flex items-center justify-between w-full pr-8">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-red-500/10 flex items-center justify-center text-red-500">
              <Youtube size={17} />
            </div>
            <div>
              <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
                YouTube Duration Manager
              </span>
              <span className="text-xs ml-2 text-zinc-400">
                ({allYoutubeTabs.length} tabs found)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Sync Durations Button */}
            <Tooltip title="Fetch & sync video durations from YouTube API or extension cache">
              <Button
                size="small"
                onClick={handleFetchDurations}
                loading={isFetchingDurations}
                icon={<RotateCw size={13} className={isFetchingDurations ? 'animate-spin' : ''} />}
                className="flex items-center gap-1 text-xs"
              >
                <span>Sync Durations</span>
              </Button>
            </Tooltip>
            {/* Sort Order Toggle */}
            <Tooltip title="Toggle duration sort order">
              <Button
                size="small"
                onClick={() => setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'))}
                className="flex items-center gap-1 text-xs"
              >
                {sortOrder === 'asc' ? (
                  <>
                    <ArrowDownWideNarrow size={13} className="text-red-500" />
                    <span>Shortest First</span>
                  </>
                ) : (
                  <>
                    <ArrowUpWideNarrow size={13} className="text-red-500" />
                    <span>Longest First</span>
                  </>
                )}
              </Button>
            </Tooltip>

            {/* Sort in Browser Window Button */}
            {onSortWindowTabs && windowsWithYoutube.length > 0 && (
              <Dropdown menu={{ items: sortWindowMenu }} trigger={['click']}>
                <Button
                  size="small"
                  type="primary"
                  danger
                  className="flex items-center gap-1 text-xs"
                >
                  <ArrowDownWideNarrow size={13} />
                  <span>Sort Window Tabs</span>
                </Button>
              </Dropdown>
            )}

            {/* Group by type switch */}
            <div className="flex items-center gap-1.5 text-xs text-zinc-400 ml-1">
              <span>Group</span>
              <Switch size="small" checked={groupByType} onChange={setGroupByType} />
            </div>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      footer={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Checkbox checked={allSelected} onChange={toggleSelectAll}>
              <span className="text-xs">
                Select All ({selectedKeys.size}/{allYoutubeTabs.length})
              </span>
            </Checkbox>
          </div>

          <div className="flex items-center gap-2">
            {selectedKeys.size > 0 && (
              <Button
                size="small"
                danger
                icon={<Trash2 size={13} />}
                onClick={handleCloseSelected}
              >
                Close Selected ({selectedKeys.size})
              </Button>
            )}

            <Button
              size="small"
              icon={<FolderPlus size={13} />}
              onClick={handleGroupIntoNewWindow}
              disabled={allYoutubeTabs.length === 0}
            >
              Group to New Window
            </Button>

            <Button size="small" onClick={onClose}>
              Done
            </Button>
          </div>
        </div>
      }
      width={760}
      centered
      destroyOnClose
    >
      <div className="max-h-[60vh] overflow-y-auto pr-1 flex flex-col gap-4 py-2">
        {allYoutubeTabs.length === 0 ? (
          <div className="py-12 text-center text-zinc-400 text-sm flex flex-col items-center gap-2">
            <Youtube size={32} className="text-zinc-500 stroke-1" />
            <p>No active YouTube tabs detected across your open browser windows.</p>
          </div>
        ) : (
          groupedTabs.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-semibold text-zinc-400 px-1 border-b pb-1 border-zinc-800">
                <span className="flex items-center gap-1.5">
                  <PlaySquare size={13} className="text-red-500" />
                  {group.title} ({group.items.length})
                </span>
              </div>

              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const key = `${item.browserId}:${item.tab.id}`
                  const isSelected = selectedKeys.has(key)

                  return (
                    <div
                      key={key}
                      onClick={() => toggleSelect(key)}
                      className={`group flex items-center justify-between gap-3 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-zinc-800/40 hover:bg-zinc-800/80 border-transparent hover:border-zinc-700'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <Checkbox
                          checked={isSelected}
                          onChange={(e) => {
                            e.stopPropagation()
                            toggleSelect(key)
                          }}
                        />

                        {item.tab.favIconUrl ? (
                          <img
                            src={item.tab.favIconUrl}
                            alt=""
                            className="w-4 h-4 rounded shrink-0"
                            onError={(e) => {
                              ;(e.target as HTMLElement).style.display = 'none'
                            }}
                          />
                        ) : (
                          <Youtube size={16} className="text-red-500 shrink-0" />
                        )}

                        <div className="flex flex-col min-w-0 flex-1">
                          <span
                            className="text-xs font-medium truncate"
                            title={item.tab.title}
                            style={{ color: 'var(--text-primary)' }}
                          >
                            {item.tab.title || 'YouTube Video'}
                          </span>
                          <span className="text-[11px] truncate text-zinc-500 font-mono">
                            {item.tab.url}
                          </span>
                        </div>
                      </div>

                      {/* Right Metadata & Actions */}
                      <div className="flex items-center gap-2 shrink-0">
                        {item.duration > 0 ? (
                          <Tag
                            color="red"
                            className="m-0 text-[11px] font-mono font-medium flex items-center gap-1"
                          >
                            <Clock size={11} />
                            {formatVideoDuration(item.duration)}
                          </Tag>
                        ) : (
                          <Tag
                            onClick={(e) => {
                              e.stopPropagation()
                              const vId = extractVideoId(item.tab.url)
                              if (vId) desktopYoutubeService.fetchViaWatchPage(vId)
                            }}
                            className="m-0 text-[11px] text-zinc-500 font-mono hover:text-red-400 hover:border-red-500/50 cursor-pointer transition-colors"
                            title="Click to fetch duration for this video"
                          >
                            Fetch duration
                          </Tag>
                        )}

                        <span className="text-[10px] text-zinc-500 font-mono">
                          Win #{item.windowId}
                        </span>

                        <Tooltip title="Focus tab in browser">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onFocusTab(item.browserId, item.windowId, item.tab.id)
                            }}
                            className="p-1 rounded hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200 transition-colors"
                          >
                            <ExternalLink size={13} />
                          </button>
                        </Tooltip>

                        <Tooltip title="Close tab">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onCloseTab(item.browserId, item.tab.id)
                            }}
                            className="p-1 rounded hover:bg-red-500/20 text-zinc-400 hover:text-red-400 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </Tooltip>
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
