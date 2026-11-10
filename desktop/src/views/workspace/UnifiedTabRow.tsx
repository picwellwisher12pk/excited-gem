import React from 'react'
import { Tooltip, Checkbox, Dropdown, message } from 'antd'
import type { MenuProps } from 'antd'
import {
  Volume2,
  Pin,
  CircleDashed,
  X,
  Focus,
  Copy,
  Globe,
  FileText,
  Trash2,
  Plus,
  Layers,
  Youtube
} from 'lucide-react'
import {
  type UnifiedTab,
  type UnifiedWindow,
  type ConnectedBrowser,
  isSameBrowserEngine
} from '../../../../src/adapter/types'
import { domainColor, type SelectedTabIdentifier } from './types'
import { setTabDragPayload, clearTabDragPayload, type ActiveTabDragPayload } from './dragState'
import { useTabAppearance } from './TabAppearanceContext'
import { desktopYoutubeService, formatVideoDuration } from '../../services/desktopYoutubeService'
import { extractVideoId } from '../../../../src/utils/youtube'

export interface UnifiedTabRowProps {
  tab: UnifiedTab
  browserId: string
  windowId: number
  window?: UnifiedWindow
  visibleTabs: UnifiedTab[]
  index: number
  isSelected: boolean
  isSelectionActive?: boolean
  selectedTabsList?: SelectedTabIdentifier[]
  isOffline?: boolean
  browsers: ConnectedBrowser[]
  allWindows?: UnifiedWindow[]
  onToggleSelect: (browserId: string, tabId: number, windowId: number, title: string, url: string) => void
  onSelectRange?: (
    win: UnifiedWindow,
    clickedTab: { id: number; title: string; url: string },
    tabsToUse?: { id: number; title: string; url: string }[]
  ) => void
  onFocusTab: (browserId: string, windowId: number, tabId: number) => void
  onCloseTab: (browserId: string, tabId: number) => void
  onDiscardTab: (browserId: string, tabId: number) => void
  onCreateTab: (browserId: string, windowId?: number, url?: string) => void
  onMigrateTab?: (
    sourceBrowserId: string,
    targetBrowserId: string,
    tabId: number,
    url: string,
    targetWindowId?: number
  ) => void | Promise<void>
  onMoveTabs?: (
    browserId: string,
    tabIds: number[],
    targetWindowId: number,
    targetIndex?: number
  ) => void | Promise<void>
}

const UnifiedTabRowComponent: React.FC<UnifiedTabRowProps> = ({
  tab,
  browserId,
  windowId,
  window: winObj,
  visibleTabs,
  index: _index,
  isSelected,
  isSelectionActive = false,
  selectedTabsList = [],
  isOffline,
  browsers,
  allWindows = [],
  onToggleSelect,
  onSelectRange,
  onFocusTab,
  onCloseTab,
  onDiscardTab,
  onCreateTab,
  onMigrateTab,
  onMoveTabs
}) => {
  const { fontSize, iconSize } = useTabAppearance()
  const isTabActive = tab.active
  const isDiscarded = tab.discarded

  const isYoutubeUrl = Boolean(tab.url && (tab.url.includes('youtube.com') || tab.url.includes('youtu.be')))
  const ytDuration = tab.youtubeInfo?.duration || desktopYoutubeService.getDurationForUrl(tab.url) || 0
  const formattedYtDuration = ytDuration > 0 ? formatVideoDuration(ytDuration) : ''
  const badgeFontSize = Math.max(10, Math.round(fontSize * 0.8))
  const urlFontSize = Math.max(10, Math.round(fontSize * 0.85))
  const faviconSize = Math.max(14, Math.round(iconSize * 1.15))

  let domain = ''
  try {
    if (tab.url) {
      domain = new URL(tab.url).hostname.replace(/^www\./, '')
    }
  } catch {
    domain = tab.url
  }

  // Multi-tab selection actions
  const isSelectedInBatch = isSelected && selectedTabsList.length > 1
  const effectiveTabIds = isSelectedInBatch
    ? selectedTabsList.filter((t) => isSameBrowserEngine(t.browserId, browserId)).map((t) => t.tabId)
    : [tab.id]
  const isBulk = effectiveTabIds.length > 1

  const otherBrowsers = browsers.filter((b) => !isSameBrowserEngine(b.id, browserId) && b.isConnected)
  const sameBrowserOtherWindows = allWindows.filter(
    (w) => isSameBrowserEngine(w.browserId, browserId) && w.id !== windowId
  )

  const contextMenuItems: MenuProps['items'] = [
    {
      key: 'focus',
      label: 'Focus Tab',
      icon: <Focus size={14} />,
      disabled: isOffline,
      onClick: () => onFocusTab(browserId, windowId, tab.id)
    },
    { type: 'divider' },
    {
      key: 'copy-url',
      label: isBulk ? `Copy ${effectiveTabIds.length} URLs` : 'Copy URL',
      icon: <Copy size={14} />,
      onClick: async () => {
        if (isBulk) {
          const urls = selectedTabsList
            .filter((t) => isSameBrowserEngine(t.browserId, browserId))
            .map((t) => t.url)
            .join('\n')
          await navigator.clipboard.writeText(urls)
          message.success(`Copied ${effectiveTabIds.length} URLs`)
        } else {
          await navigator.clipboard.writeText(tab.url)
          message.success('Copied URL')
        }
      }
    },
    {
      key: 'copy-title',
      label: 'Copy Title',
      icon: <FileText size={14} />,
      onClick: async () => {
        await navigator.clipboard.writeText(tab.title)
        message.success('Copied title')
      }
    },
    {
      key: 'duplicate',
      label: 'Duplicate Tab',
      icon: <Plus size={14} />,
      disabled: isOffline,
      onClick: () => onCreateTab(browserId, windowId, tab.url)
    },
    { type: 'divider' },
    ...(sameBrowserOtherWindows.length > 0 && onMoveTabs
      ? [
          {
            key: 'move-window',
            label: isBulk ? `Move ${effectiveTabIds.length} Tabs to Window` : 'Move to Window',
            icon: <Layers size={14} />,
            popupOffset: [4, -4] as [number, number],
            children: sameBrowserOtherWindows.map((tw) => ({
              key: `target-win-${tw.id}`,
              label: `Window #${tw.id} (${tw.tabs.length} tabs)`,
              onClick: async () => {
                await onMoveTabs(browserId, effectiveTabIds, tw.id)
                message.success(`Moved ${effectiveTabIds.length} tab(s) to Window #${tw.id}`)
              }
            }))
          }
        ]
      : []),
    {
      key: 'suspend',
      label: isBulk
        ? `Suspend ${effectiveTabIds.length} Tabs`
        : isDiscarded
        ? 'Tab Sleeping'
        : 'Suspend Tab',
      icon: <CircleDashed size={14} strokeWidth={1.75} />,
      disabled: isOffline || isTabActive || isDiscarded,
      onClick: async () => {
        for (const id of effectiveTabIds) {
          await onDiscardTab(browserId, id)
        }
      }
    },
    ...(otherBrowsers.length > 0 && onMigrateTab
      ? [
          {
            key: 'migrate',
            label: isBulk ? `Move ${effectiveTabIds.length} Tabs to Browser` : 'Move to Browser',
            icon: <Globe size={14} />,
            disabled: isOffline,
            popupOffset: [4, -4] as [number, number],
            children: otherBrowsers.map((b) => ({
              key: `migrate-${b.id}`,
              label: `Send to ${b.name}`,
              onClick: async () => {
                if (isBulk) {
                  for (const st of selectedTabsList) {
                    await onMigrateTab(st.browserId, b.id, st.tabId, st.url)
                  }
                  message.success(`Migrated ${selectedTabsList.length} tabs to ${b.name}`)
                } else {
                  await onMigrateTab(browserId, b.id, tab.id, tab.url)
                  message.success(`Sent to ${b.name}`)
                }
              }
            }))
          }
        ]
      : []),
    { type: 'divider' },
    {
      key: 'close',
      label: isBulk ? `Close ${effectiveTabIds.length} Tabs` : 'Close Tab',
      icon: <Trash2 size={14} />,
      danger: true,
      disabled: isOffline,
      onClick: async () => {
        for (const id of effectiveTabIds) {
          await onCloseTab(browserId, id)
        }
      }
    }
  ]

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey && onSelectRange && winObj) {
      e.preventDefault()
      onSelectRange(
        winObj,
        { id: tab.id, title: tab.title, url: tab.url },
        visibleTabs
      )
    } else if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      onToggleSelect(browserId, tab.id, windowId, tab.title, tab.url)
    } else {
      if (!isOffline) {
        onFocusTab(browserId, windowId, tab.id)
      }
    }
  }

  const handleDragStart = (e: React.DragEvent) => {
    if (isOffline) return
    const tabsToDrag: ActiveTabDragPayload[] =
      isSelected && selectedTabsList.length > 1
        ? selectedTabsList.map((t) => ({
            tabId: t.tabId,
            browserId: t.browserId,
            windowId: t.windowId,
            url: t.url,
            title: t.title
          }))
        : [
            {
              tabId: tab.id,
              browserId,
              windowId,
              url: tab.url,
              title: tab.title
            }
          ]

    setTabDragPayload({
      tabId: tab.id,
      browserId,
      windowId,
      url: tab.url,
      title: tab.title,
      tabs: tabsToDrag
    })

    e.dataTransfer.setData('text/plain', tab.url)
    e.dataTransfer.setData(
      'application/json',
      JSON.stringify({
        tabId: tab.id,
        browserId,
        windowId,
        url: tab.url,
        title: tab.title,
        tabs: tabsToDrag
      })
    )
    e.dataTransfer.effectAllowed = 'copyMove'
  }

  return (
    <Dropdown
      menu={{ items: contextMenuItems }}
      trigger={['contextMenu']}
      destroyPopupOnHide
      getPopupContainer={() => document.body}
      overlayClassName="compact-context-menu"
    >
      <div
        draggable={!isOffline}
        onDragStart={handleDragStart}
        onDragEnd={clearTabDragPayload}
        onClick={handleClick}
        className={`group relative flex items-center gap-3 px-4 py-2 border-b transition-colors cursor-pointer select-none ${
          isSelected
            ? 'bg-[var(--accent-subtle)]'
            : isTabActive
            ? 'bg-blue-50/60 dark:bg-blue-950/20'
            : 'hover:bg-[var(--surface-3)]'
        }`}
        style={{
          borderColor: 'var(--border-subtle)',
          opacity: isDiscarded ? 0.75 : 1,
          borderLeft: isTabActive
            ? '3px solid var(--accent)'
            : '3px solid transparent'
        }}
      >
        {/* Left: Checkbox (always visible if selected/selection active, else on group-hover) */}
        <div
          onClick={(e) => {
            e.stopPropagation()
            onToggleSelect(browserId, tab.id, windowId, tab.title, tab.url)
          }}
          className={`shrink-0 transition-opacity ${
            isSelected || isSelectionActive ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}
        >
          <Checkbox checked={isSelected} />
        </div>

        {/* Favicon */}
        <div
          className="shrink-0 flex items-center justify-center"
          style={{ width: `${faviconSize}px`, height: `${faviconSize}px` }}
        >
          {tab.favIconUrl ? (
            <img
              src={tab.favIconUrl}
              alt=""
              className="rounded-sm object-contain"
              style={{ width: `${faviconSize}px`, height: `${faviconSize}px` }}
              onError={(e) => {
                ;(e.currentTarget as HTMLImageElement).style.display = 'none'
              }}
            />
          ) : (
            <div
              className="rounded-sm flex items-center justify-center font-bold text-white uppercase"
              style={{
                width: `${faviconSize}px`,
                height: `${faviconSize}px`,
                fontSize: `${Math.max(9, Math.round(faviconSize * 0.55))}px`,
                background: domainColor(domain || tab.title)
              }}
            >
              {(tab.title || '?').trim().charAt(0)}
            </div>
          )}
        </div>

        {/* Middle text: Title (Line 1) and URL (Line 2) */}
        <div className="flex-1 min-w-0 flex flex-col justify-center gap-0.5">
          <div className="flex items-center gap-2 min-w-0 flex-wrap">
            <span
              className="truncate font-semibold hover:underline"
              style={{
                color: 'var(--text-primary)',
                fontSize: `${fontSize}px`,
                lineHeight: 1.3
              }}
              title={tab.title}
            >
              {tab.title || 'Untitled Tab'}
            </span>

            {/* In-row badges */}
            {tab.pinned && (
              <Tooltip title="Pinned tab">
                <Pin size={iconSize} className="text-blue-500 shrink-0" />
              </Tooltip>
            )}

            {tab.audible && (
              <Tooltip title="Playing audio">
                <Volume2 size={iconSize} className="text-amber-500 shrink-0" />
              </Tooltip>
            )}

            {isDiscarded && (
              <Tooltip title="Suspended (Memory saved)">
                <span
                  className="flex items-center gap-1 font-mono rounded bg-[var(--surface-4)] text-[var(--text-tertiary)] shrink-0 font-medium border border-[var(--border-subtle)]"
                  style={{
                    fontSize: `${badgeFontSize}px`,
                    padding: `${Math.max(1, Math.round(iconSize * 0.1))}px ${Math.max(4, Math.round(iconSize * 0.35))}px`
                  }}
                >
                  <CircleDashed size={iconSize} strokeWidth={1.75} />
                  <span>sleep</span>
                </span>
              </Tooltip>
            )}

            {(tab.youtubeInfo || isYoutubeUrl) && (
              <Tooltip
                title={
                  ytDuration > 0
                    ? `YouTube Video Duration: ${formattedYtDuration}`
                    : 'YouTube Video (Click to fetch duration)'
                }
              >
                <span
                  onClick={(e) => {
                    e.stopPropagation()
                    if (ytDuration <= 0 && tab.url) {
                      const vId = extractVideoId(tab.url)
                      if (vId) desktopYoutubeService.fetchViaWatchPage(vId)
                    }
                  }}
                  className="flex items-center gap-1 font-mono rounded bg-red-500/10 text-red-500 shrink-0 font-semibold cursor-pointer hover:bg-red-500/20 border border-red-500/20 transition-all select-none"
                  style={{
                    fontSize: `${badgeFontSize}px`,
                    padding: `${Math.max(1, Math.round(iconSize * 0.1))}px ${Math.max(4, Math.round(iconSize * 0.35))}px`
                  }}
                >
                  <Youtube size={iconSize} className="shrink-0" />
                  {formattedYtDuration ? <span>{formattedYtDuration}</span> : null}
                </span>
              </Tooltip>
            )}
          </div>

          <span
            className="truncate font-mono"
            style={{
              color: 'var(--text-tertiary)',
              fontSize: `${urlFontSize}px`
            }}
            title={tab.url}
          >
            {tab.url}
          </span>
        </div>

        {/* Right: Hover Action Buttons */}
        <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity shrink-0">
          {!isOffline && !isDiscarded && !isTabActive && (
            <Tooltip title="Suspend tab (free memory)">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onDiscardTab(browserId, tab.id)
                }}
                className="p-1 rounded hover:bg-[var(--surface-4)] text-[var(--text-tertiary)] hover:text-amber-500 transition-colors"
              >
                <CircleDashed size={Math.max(13, iconSize)} strokeWidth={1.75} />
              </button>
            </Tooltip>
          )}

          <Tooltip title="Copy URL">
            <button
              type="button"
              onClick={async (e) => {
                e.stopPropagation()
                await navigator.clipboard.writeText(tab.url)
                message.success('Copied URL')
              }}
              className="p-1 rounded hover:bg-[var(--surface-4)] text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <Copy size={Math.max(13, iconSize)} />
            </button>
          </Tooltip>

          {!isOffline && (
            <Tooltip title="Close tab">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  onCloseTab(browserId, tab.id)
                }}
                className="p-1 rounded hover:bg-red-500/15 text-[var(--text-tertiary)] hover:text-red-500 transition-colors"
              >
                <X size={Math.max(13, iconSize)} strokeWidth={2} />
              </button>
            </Tooltip>
          )}
        </div>
      </div>
    </Dropdown>
  )
}

export const UnifiedTabRow = React.memo(UnifiedTabRowComponent)

