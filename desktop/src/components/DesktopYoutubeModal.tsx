import React, { useState, useMemo, useEffect } from 'react'
import { Modal, Tag, Tooltip, message, Checkbox, Switch, Button, Dropdown, Input, Alert } from 'antd'
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
  RotateCw,
  Key,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ChevronDown,
  ChevronUp,
  Settings2
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

  // API Key Settings & Error tracking states
  const [showSettings, setShowSettings] = useState(false)
  const [showErrors, setShowErrors] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(() => desktopYoutubeService.getApiKey())
  const [isTestingKey, setIsTestingKey] = useState(false)
  const [keyStatusMessage, setKeyStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  useEffect(() => {
    return desktopYoutubeService.subscribe(() => {
      setRefreshNonce((n) => n + 1)
      setApiKeyInput(desktopYoutubeService.getApiKey())
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
      cancelText: 'Cancel',
      onOk: async () => {
        for (const item of toClose) {
          await onCloseTab(item.browserId, item.tab.id)
        }
        setSelectedKeys(new Set())
        message.success(`Closed ${toClose.length} tabs`)
      }
    })
  }

  const errorsList = desktopYoutubeService.getLastErrors()
  const errorsByVideoId = useMemo(() => {
    const map = new Map<string, string>()
    for (const err of errorsList) {
      if (err.videoId) {
        map.set(err.videoId, err.error)
      }
    }
    return map
  }, [errorsList])

  const handleTestKey = async () => {
    setIsTestingKey(true)
    setKeyStatusMessage(null)
    try {
      const res = await desktopYoutubeService.testApiKey(apiKeyInput)
      if (res.valid) {
        desktopYoutubeService.setApiKey(apiKeyInput)
        setKeyStatusMessage({ type: 'success', text: '✓ API Key is valid and successfully connected!' })
        message.success('API Key is valid and verified with YouTube Data API v3')
      } else {
        setKeyStatusMessage({ type: 'error', text: `✗ Verification failed: ${res.error || 'Invalid API Key'}` })
        message.error(res.error || 'API Key verification failed')
      }
    } finally {
      setIsTestingKey(false)
    }
  }

  const handleClearKey = () => {
    desktopYoutubeService.setApiKey('')
    setApiKeyInput('')
    setKeyStatusMessage(null)
    message.info('YouTube API Key removed. Now using native page scraper fallback.')
  }

  const handleFetchDurations = async () => {
    setIsFetchingDurations(true)
    try {
      const adapter = getBrowserAdapter()
      if (adapter && 'fetchYoutubeDurations' in adapter) {
        ;(adapter as any).fetchYoutubeDurations()
      }
      const rawTabs = allYoutubeTabs.map((item) => item.tab)
      const { updated, errors } = await desktopYoutubeService.fetchMissingDurationsForTabs(rawTabs)
      if (errors.length > 0) {
        setShowErrors(true)
        if (updated > 0) {
          message.warning(`Updated ${updated} video(s), but encountered ${errors.length} error(s). See error details below.`)
        } else {
          message.error(`Failed to fetch video durations: ${errors[0]?.error || 'Unknown error'}`)
        }
      } else if (updated > 0) {
        message.success(`Successfully synced ${updated} YouTube duration(s)`)
      } else {
        message.info('All YouTube tabs already have durations cached')
      }
    } catch (e: any) {
      console.error('Error fetching YouTube durations:', e)
      message.error(e?.message || 'Failed to fetch YouTube durations')
      setShowErrors(true)
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
            {/* API Key Settings Button */}
            <Tooltip title="Configure YouTube Data API Key or view connection status">
              <Button
                size="small"
                onClick={() => setShowSettings((prev) => !prev)}
                icon={<Key size={13} className={desktopYoutubeService.getApiKey() ? 'text-emerald-500' : 'text-amber-500'} />}
                className="flex items-center gap-1 text-xs"
              >
                <span>API Key {desktopYoutubeService.getApiKey() ? '✓' : '(Optional)'}</span>
                {showSettings ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
              </Button>
            </Tooltip>

            {/* Sync Durations Button */}
            <Tooltip title="Fetch & sync video durations from YouTube API or native page extractor">
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
            <div className="flex items-center gap-1.5 text-xs text-[var(--text-tertiary)] ml-1">
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
      width={780}
      centered
      destroyOnClose
    >
      <div className="max-h-[60vh] overflow-y-auto pr-1 flex flex-col gap-3 py-2">
        {/* API Key Configuration Panel */}
        {showSettings && (
          <div className="p-3 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-3)] flex flex-col gap-2.5 text-xs">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                <Key size={14} className="text-amber-500" />
                YouTube Data API v3 Configuration
              </span>
              <span className="text-[11px] text-[var(--text-tertiary)]">
                {desktopYoutubeService.getApiKey() ? 'API Key Active (Batching enabled)' : 'Native Watch Page Scraper Active'}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-secondary)] m-0 leading-relaxed">
              An API key allows fast batch fetching of up to 50 video durations simultaneously. If not set, Excited Gem automatically falls back to our native background scraper without requiring any API key.
            </p>
            <div className="flex items-center gap-2">
              <Input.Password
                value={apiKeyInput}
                onChange={(e) => {
                  setApiKeyInput(e.target.value)
                  setKeyStatusMessage(null)
                }}
                placeholder="Paste your YouTube Data API v3 key here (AIzaSy...)"
                size="small"
                className="flex-1 font-mono text-xs"
              />
              <Button
                size="small"
                type="primary"
                onClick={handleTestKey}
                loading={isTestingKey}
                disabled={!apiKeyInput.trim()}
              >
                Test & Save
              </Button>
              {desktopYoutubeService.getApiKey() && (
                <Button size="small" onClick={handleClearKey}>
                  Clear
                </Button>
              )}
            </div>
            {keyStatusMessage && (
              <div
                className={`text-[11px] font-medium p-1.5 rounded flex items-center gap-1.5 ${
                  keyStatusMessage.type === 'success'
                    ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10'
                    : 'text-red-600 dark:text-red-400 bg-red-500/10'
                }`}
              >
                {keyStatusMessage.type === 'success' ? <CheckCircle2 size={13} /> : <XCircle size={13} />}
                <span>{keyStatusMessage.text}</span>
              </div>
            )}
          </div>
        )}

        {/* Duration Fetch Errors Notice */}
        {errorsList.length > 0 && (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between p-2 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-600 dark:text-red-400">
              <div className="flex items-center gap-2">
                <AlertTriangle size={15} className="shrink-0 text-red-500" />
                <span>
                  <strong>{errorsList.length} error(s)</strong> occurred during video duration fetch.
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="small"
                  type="link"
                  onClick={() => setShowErrors((prev) => !prev)}
                  className="p-0 h-auto text-xs font-medium text-red-500 hover:text-red-600"
                >
                  {showErrors ? 'Hide Error Details' : 'View Error Details'}
                </Button>
                <Button
                  size="small"
                  type="text"
                  onClick={() => desktopYoutubeService.clearErrors()}
                  className="p-0 h-auto text-[11px] text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  Dismiss
                </Button>
              </div>
            </div>

            {showErrors && (
              <div className="p-2.5 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface-3)] max-h-40 overflow-y-auto flex flex-col gap-1.5 text-xs font-mono">
                {errorsList.map((err, idx) => (
                  <div
                    key={idx}
                    className="flex items-start justify-between gap-2 p-1.5 rounded bg-[var(--surface-2)] border border-[var(--border-subtle)] text-[11px]"
                  >
                    <div className="flex flex-col min-w-0 flex-1">
                      {err.videoId && (
                        <span className="font-semibold text-[var(--text-primary)]">
                          Video ID: {err.videoId} {err.title ? `(${err.title})` : ''}
                        </span>
                      )}
                      <span className="text-red-500 dark:text-red-400 break-words">{err.error}</span>
                    </div>
                    <span className="text-[10px] text-[var(--text-tertiary)] shrink-0">
                      {new Date(err.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {allYoutubeTabs.length === 0 ? (
          <div className="py-12 text-center text-[var(--text-tertiary)] text-sm flex flex-col items-center gap-2">
            <Youtube size={32} className="text-[var(--text-tertiary)] stroke-1" />
            <p>No active YouTube tabs detected across your open browser windows.</p>
          </div>
        ) : (
          groupedTabs.map((group) => (
            <div key={group.title} className="flex flex-col gap-2">
              <div className="flex items-center justify-between text-xs font-semibold text-[var(--text-secondary)] px-1 border-b pb-1 border-[var(--border-subtle)]">
                <span className="flex items-center gap-1.5">
                  <PlaySquare size={13} className="text-red-500" />
                  {group.title} ({group.items.length})
                </span>
              </div>

              <div className="flex flex-col gap-1">
                {group.items.map((item) => {
                  const key = `${item.browserId}:${item.tab.id}`
                  const isSelected = selectedKeys.has(key)
                  const vId = extractVideoId(item.tab.url)

                  return (
                    <div
                      key={key}
                      onClick={() => toggleSelect(key)}
                      className={`group flex items-center justify-between gap-3 px-3 py-2 rounded-lg border transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-red-500/10 border-red-500/30'
                          : 'bg-[var(--surface-2)] hover:bg-[var(--surface-3)] border-[var(--border-subtle)] hover:border-[var(--border)]'
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
                          <span className="text-[11px] truncate text-[var(--text-tertiary)] font-mono">
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
                        ) : vId && errorsByVideoId.has(vId) ? (
                          <Tooltip title={`Fetch failed: ${errorsByVideoId.get(vId)}. Click to view error log.`}>
                            <Tag
                              color="error"
                              onClick={(e) => {
                                e.stopPropagation()
                                setShowErrors(true)
                              }}
                              className="m-0 text-[11px] font-mono cursor-pointer flex items-center gap-1 hover:opacity-80 transition-opacity"
                            >
                              <AlertTriangle size={11} />
                              <span>Failed</span>
                            </Tag>
                          </Tooltip>
                        ) : (
                          <Tag
                            onClick={async (e) => {
                              e.stopPropagation()
                              if (vId) {
                                message.loading({ content: 'Fetching video duration...', key: `fetch-${vId}` })
                                const dur = await desktopYoutubeService.fetchViaWatchPage(vId)
                                if (dur && dur > 0) {
                                  message.success({ content: `Duration: ${formatVideoDuration(dur)}`, key: `fetch-${vId}` })
                                } else {
                                  const err = desktopYoutubeService.getLastErrors().find((errItem) => errItem.videoId === vId)?.error || 'Could not fetch duration'
                                  message.error({ content: `Fetch failed: ${err}`, key: `fetch-${vId}` })
                                  setShowErrors(true)
                                }
                              }
                            }}
                            className="m-0 text-[11px] text-[var(--text-tertiary)] font-mono hover:text-red-400 hover:border-red-500/50 cursor-pointer transition-colors"
                            title="Click to fetch duration for this video"
                          >
                            Fetch duration
                          </Tag>
                        )}

                        <span className="text-[10px] text-[var(--text-tertiary)] font-mono">
                          Win #{item.windowId}
                        </span>

                        <Tooltip title="Focus tab in browser">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation()
                              onFocusTab(item.browserId, item.windowId, item.tab.id)
                            }}
                            className="p-1 rounded hover:bg-[var(--surface-4)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
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
                            className="p-1 rounded hover:bg-red-500/20 text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
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
