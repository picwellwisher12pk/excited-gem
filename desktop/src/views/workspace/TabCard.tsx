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
  Share2,
  FileText,
  Trash2,
  MoveRight,
  Plus,
  Layers
} from 'lucide-react'
import {
  type UnifiedTab,
  type UnifiedWindow,
  type ConnectedBrowser,
  isSameBrowserEngine
} from '../../../../src/adapter/types'
import { domainColor, getBrowserBadge, type SelectedTabIdentifier } from './types'
import { setTabDragPayload, clearTabDragPayload, type ActiveTabDragPayload } from './dragState'
import { useTabAppearance } from './TabAppearanceContext'
import { desktopYoutubeService, formatVideoDuration } from '../../services/desktopYoutubeService'
import { launchBrowserUrl } from '../../services/desktopLauncher'

export interface TabCardProps {
  tab: UnifiedTab
  browserId: string
  windowId: number
  window: UnifiedWindow
  visibleTabs?: UnifiedTab[]
  index: number
  isSelected: boolean
  isSelectionActive?: boolean
  selectedTabsList?: SelectedTabIdentifier[]
  isOffline?: boolean
  browsers: ConnectedBrowser[]
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
  allWindows?: UnifiedWindow[]
  onMoveTabs?: (
    browserId: string,
    tabIds: number[],
    targetWindowId: number,
    targetIndex?: number
  ) => void | Promise<void>
}

const TabCardComponent: React.FC<TabCardProps> = ({
  tab,
  browserId,
  windowId,
  window: winObj,
  visibleTabs,
  index,
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
  let domain = ''
  try {
    if (tab.url) {
      domain = new URL(tab.url).hostname.replace(/^www\./, '')
    }
  } catch {
    domain = tab.url
  }

  const handleCardClick = (e: React.MouseEvent) => {
    if (e.shiftKey && onSelectRange) {
      e.preventDefault()
      e.stopPropagation()
      onSelectRange(winObj, tab, visibleTabs)
    } else if (e.ctrlKey || e.metaKey) {
      e.preventDefault()
      e.stopPropagation()
      onToggleSelect(browserId, tab.id, windowId, tab.title, tab.url)
    } else if (isOffline) {
      launchBrowserUrl(browserId, tab.url)
      message.success('Opening tab in browser...')
    } else {
      onFocusTab(browserId, windowId, tab.id)
    }
  }

  // Construct Context Menu items
  const otherBrowsers = browsers.filter((b) => b.id !== browserId && b.isConnected)

  const isPartOfBulk = isSelected && selectedTabsList.length > 1
  const bulkTabsForSameEngine = isPartOfBulk
    ? selectedTabsList.filter((t) => isSameBrowserEngine(t.browserId, browserId))
    : []
  const effectiveTabIds = isPartOfBulk && bulkTabsForSameEngine.length > 0
    ? bulkTabsForSameEngine.map((t) => Number(t.tabId)).filter((id) => !isNaN(id) && id > 0)
    : [tab.id]
  const isBulk = effectiveTabIds.length > 1

  // Other destination windows for the same browser engine
  const sameBrowserOtherWindows = (allWindows || []).filter(
    (w) => isSameBrowserEngine(w.browserId, browserId) && Number(w.id) !== Number(windowId) && !(w as any).isOffline
  )

  const handleMoveToDestinationWindow = async (targetWinId: number) => {
    if (onMoveTabs) {
      await onMoveTabs(browserId, effectiveTabIds, targetWinId)
    } else {
      for (const id of effectiveTabIds) {
        const found = winObj.tabs.find((t) => t.id === id)
        if (found?.url) {
          await onCreateTab(browserId, targetWinId, found.url)
          await onCloseTab(browserId, id)
        }
      }
    }
    message.success(
      `Moved ${effectiveTabIds.length} ${effectiveTabIds.length === 1 ? 'tab' : 'tabs'} to Window #${targetWinId}`
    )
  }

  const handleMoveToNewWindow = async () => {
    try {
      await onCreateTab(browserId, undefined, tab.url)
      for (const id of effectiveTabIds) {
        await onCloseTab(browserId, id)
      }
      message.success(
        `Moved ${effectiveTabIds.length} ${effectiveTabIds.length === 1 ? 'tab' : 'tabs'} to new window`
      )
    } catch (e) {
      console.error('Failed to move to new window:', e)
    }
  }

  const contextMenuItems: MenuProps['items'] = [
    {
      key: 'focus',
      label: 'Focus Tab',
      icon: <Focus size={14} />,
      disabled: isOffline,
      onClick: () => onFocusTab(browserId, windowId, tab.id)
    },
    {
      key: 'duplicate',
      label: 'Duplicate Tab',
      icon: <Copy size={14} />,
      disabled: isOffline,
      onClick: () => onCreateTab(browserId, windowId, tab.url)
    },
    {
      key: 'move-to-window',
      label: isBulk ? `Move ${effectiveTabIds.length} Tabs to Window` : 'Move to Window',
      icon: <MoveRight size={14} />,
      disabled: isOffline,
      popupOffset: [4, -4] as [number, number],
      children: [
        ...sameBrowserOtherWindows.map((tw) => ({
          key: `move-win-${tw.id}`,
          label: `${getBrowserBadge(tw.browserId).name} Window #${tw.id} (${tw.tabs.length} tabs)`,
          icon: <Layers size={14} />,
          onClick: () => handleMoveToDestinationWindow(Number(tw.id))
        })),
        ...(sameBrowserOtherWindows.length > 0 ? [{ type: 'divider' as const }] : []),
        {
          key: 'move-win-new',
          label: 'New Window',
          icon: <Plus size={14} />,
          onClick: handleMoveToNewWindow
        }
      ]
    },
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
              label: b.name,
              onClick: async () => {
                const tabsToMigrate = isBulk && bulkTabsForSameEngine.length > 0
                  ? bulkTabsForSameEngine
                  : [{ tabId: tab.id, url: tab.url }]
                for (const t of tabsToMigrate) {
                  if (t.url) {
                    await onMigrateTab(browserId, b.id, Number(t.tabId), t.url)
                  }
                }
                message.success(
                  `Moving ${tabsToMigrate.length} ${tabsToMigrate.length === 1 ? 'tab' : 'tabs'} to ${b.name}`
                )
              }
            }))
          }
        ]
      : []),
    { type: 'divider' },
    {
      key: 'copy-url',
      label: 'Copy URL',
      icon: <Share2 size={14} />,
      onClick: () => {
        navigator.clipboard.writeText(tab.url)
        message.success('URL copied to clipboard')
      }
    },
    {
      key: 'copy-markdown',
      label: 'Copy as Markdown',
      icon: <FileText size={14} />,
      onClick: () => {
        navigator.clipboard.writeText(`[${tab.title || domain}](${tab.url})`)
        message.success('Markdown link copied')
      }
    },
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
        onDragOver={(e) => {
          if (!isOffline) {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
          }
        }}
        onContextMenu={(e) => {
          e.stopPropagation()
        }}
        onDragStart={(e) => {
          const isPartOfBulk = isSelected && selectedTabsList.length > 1
          const dragTabs = isPartOfBulk
            ? selectedTabsList
            : [{ browserId, windowId, tabId: tab.id, url: tab.url, title: tab.title }]

          const payload: ActiveTabDragPayload = {
            type: 'tab-drag',
            browserId,
            windowId,
            tabId: tab.id,
            url: tab.url,
            title: tab.title,
            tabs: dragTabs
          }

          setTabDragPayload(payload)

          try {
            const jsonStr = JSON.stringify(payload)
            e.dataTransfer.setData('application/json', jsonStr)
            e.dataTransfer.setData('text/plain', jsonStr)
          } catch {}
          e.dataTransfer.effectAllowed = 'move'

          if (dragTabs.length > 1) {
            const ghost = document.createElement('div')
            ghost.style.position = 'absolute'
            ghost.style.top = '-1000px'
            ghost.style.left = '-1000px'
            ghost.style.padding = '5px 10px'
            ghost.style.background = '#0078d4'
            ghost.style.color = '#ffffff'
            ghost.style.borderRadius = '6px'
            ghost.style.fontWeight = '600'
            ghost.style.fontSize = '12px'
            ghost.style.boxShadow = '0 4px 12px rgba(0,0,0,0.25)'
            ghost.style.zIndex = '99999'
            ghost.textContent = `Moving ${dragTabs.length} tabs`
            document.body.appendChild(ghost)
            e.dataTransfer.setDragImage(ghost, 15, 15)
            setTimeout(() => {
              if (ghost.parentNode) document.body.removeChild(ghost)
            }, 0)
          }
        }}
        onDragEnd={() => {
          clearTabDragPayload()
        }}
        className="group flex items-center justify-between gap-2.5 px-3 py-2 rounded-lg transition-all duration-150 cursor-pointer select-none"
        style={{
          border: `1px solid ${
            isSelected
              ? 'var(--accent)'
              : isTabActive
              ? 'var(--border-accent)'
              : 'transparent'
          }`,
          background: isSelected
            ? 'var(--accent-subtle)'
            : isTabActive
            ? 'var(--accent-subtle)'
            : 'transparent',
          opacity: isOffline ? 0.5 : isDiscarded ? 0.6 : 1,
          boxShadow: isTabActive ? 'var(--shadow-glow)' : 'none'
        }}
        onClick={handleCardClick}
        onMouseEnter={(e) => {
          if (!isTabActive && !isSelected) {
            e.currentTarget.style.background = 'var(--surface-3)'
            e.currentTarget.style.borderColor = 'var(--border-subtle)'
          }
          if (isDiscarded) {
            e.currentTarget.style.opacity = '1'
          }
        }}
        onMouseLeave={(e) => {
          if (!isTabActive && !isSelected) {
            e.currentTarget.style.background = 'transparent'
            e.currentTarget.style.borderColor = 'transparent'
          }
          if (isDiscarded) {
            e.currentTarget.style.opacity = '0.6'
          }
        }}
      >
        {/* Checkbox & Favicon */}
        <div className="flex items-center gap-2 min-w-0 flex-1">
          <div
            className={`shrink-0 transition-opacity duration-150 ${
              isSelected
                ? 'opacity-100'
                : isSelectionActive
                ? 'opacity-60 hover:opacity-100'
                : 'opacity-0 group-hover:opacity-100'
            }`}
            onClick={(e) => {
              e.stopPropagation()
              if (e.shiftKey && onSelectRange) {
                e.preventDefault()
                onSelectRange(winObj, tab, visibleTabs)
              }
            }}
          >
            <Checkbox
              checked={isSelected}
              onChange={(e) => {
                if (e.nativeEvent?.shiftKey && onSelectRange) {
                  onSelectRange(winObj, tab, visibleTabs)
                } else {
                  onToggleSelect(browserId, tab.id, windowId, tab.title, tab.url)
                }
              }}
            />
          </div>

          {tab.favIconUrl ? (
            <img
              src={tab.favIconUrl}
              alt=""
              className="shrink-0 rounded object-contain"
              style={{
                width: `${Math.max(14, Math.round(iconSize * 1.15))}px`,
                height: `${Math.max(14, Math.round(iconSize * 1.15))}px`
              }}
              onError={(e) => {
                ;(e.target as HTMLElement).style.display = 'none'
              }}
            />
          ) : (
            <div
              className="rounded flex items-center justify-center shrink-0 font-bold"
              style={{
                width: `${Math.max(14, Math.round(iconSize * 1.15))}px`,
                height: `${Math.max(14, Math.round(iconSize * 1.15))}px`,
                fontSize: `${Math.max(9, Math.round(iconSize * 0.65))}px`,
                background: domainColor(domain),
                color: '#fff'
              }}
            >
              {domain.charAt(0).toUpperCase() || '?'}
            </div>
          )}

          {/* Tab Title and URL Domain */}
          <div className="flex flex-col min-w-0 flex-1 gap-0.5">
            <span
              className="truncate font-medium leading-tight"
              title={tab.title}
              style={{
                fontSize: `${fontSize}px`,
                color: isTabActive ? 'var(--accent)' : 'var(--text-primary)'
              }}
            >
              {tab.title || 'Untitled Tab'}
            </span>
            {domain && (
              <div className="flex items-center gap-1.5 leading-tight">
                <span
                  className="truncate"
                  style={{
                    fontSize: `${Math.max(10, Math.round(fontSize * 0.85))}px`,
                    color: 'var(--text-tertiary)',
                    fontFamily: 'var(--font-mono)'
                  }}
                >
                  {domain}
                </span>
                {(tab.youtubeInfo || ytDuration > 0 || (tab.url && (tab.url.includes('youtube.com') || tab.url.includes('youtu.be')))) && (
                  <span
                    onClick={(e) => {
                      if (ytDuration <= 0 && tab.url) {
                        e.stopPropagation()
                        const vId = extractVideoId(tab.url)
                        if (vId) desktopYoutubeService.fetchViaWatchPage(vId)
                      }
                    }}
                    className="px-1.5 py-0.5 rounded font-mono font-semibold flex items-center gap-1 shrink-0 cursor-pointer"
                    style={{
                      fontSize: `${Math.max(9, Math.round(fontSize * 0.75))}px`,
                      background: 'rgba(239, 68, 68, 0.15)',
                      color: '#ef4444'
                    }}
                    title={ytDuration > 0 ? `Video duration: ${formatVideoDuration(ytDuration)}` : 'Click to fetch duration'}
                  >
                    ▶ {ytDuration > 0 ? formatVideoDuration(ytDuration) : 'YouTube'}
                  </span>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Badges and Hover Actions */}
        <div className="flex items-center gap-1.5 shrink-0">
          {isTabActive && (
            <span
              className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
              style={{
                background: 'var(--accent)',
                color: 'var(--text-on-accent)'
              }}
            >
              Active
            </span>
          )}

          {tab.audible && (
            <Volume2
              size={iconSize}
              className="animate-soft-pulse shrink-0"
              style={{ color: 'var(--status-success)' }}
            />
          )}

          {tab.pinned && (
            <Pin
              size={iconSize}
              className="shrink-0"
              style={{ color: 'var(--status-warning)' }}
            />
          )}

          {isDiscarded && (
            <Tooltip title="Suspended (Memory saved)">
              <span
                className="flex items-center justify-center p-1 rounded"
                style={{
                  background: 'var(--surface-4)',
                  color: 'var(--text-tertiary)'
                }}
              >
                <CircleDashed size={iconSize} strokeWidth={1.75} />
              </span>
            </Tooltip>
          )}

          {/* Hover Action Buttons */}
          {!isOffline && (
            <div className="opacity-0 group-hover:opacity-100 flex items-center gap-0.5 transition-opacity duration-150">
              {!isDiscarded && !isTabActive && (
                <Tooltip title="Suspend tab">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      onDiscardTab(browserId, tab.id)
                    }}
                    className="p-1 rounded-md transition-all duration-150 active:scale-95"
                    style={{ color: 'var(--text-tertiary)' }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.color = 'var(--status-warning)'
                      e.currentTarget.style.background = 'var(--surface-4)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.color = 'var(--text-tertiary)'
                      e.currentTarget.style.background = 'transparent'
                    }}
                  >
                    <CircleDashed size={14} strokeWidth={1.75} />
                  </button>
                </Tooltip>
              )}

              <Tooltip title="Close tab">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    onCloseTab(browserId, tab.id)
                  }}
                  className="p-1 rounded-md transition-all duration-150 active:scale-95"
                  style={{ color: 'var(--text-tertiary)' }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--text-danger)'
                    e.currentTarget.style.background = 'rgba(229, 72, 77, 0.1)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-tertiary)'
                    e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <X size={14} />
                </button>
              </Tooltip>
            </div>
          )}
        </div>
      </div>
    </Dropdown>
  )
}

export const TabCard = React.memo(TabCardComponent)
