import {
  Button,
  Checkbox,
  Modal,
  Typography,
  Space,
  Tooltip,
  Switch,
  message
} from 'antd'
import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import {
  ExternalLink,
  Youtube,
  Volume2,
  VolumeX,
  X,
  RotateCw
} from 'lucide-react'
import ItemBtn from '../ItemBtn'
import { extractVideoId } from '../../utils/youtube'

const { Text, Title } = Typography

interface YoutubeTabsModalProps {
  visible: boolean
  onClose: () => void
}

export const YoutubeTabsModal: React.FC<YoutubeTabsModalProps> = ({
  visible,
  onClose
}) => {
  const { tabs } = useSelector((state: any) => state.tabs)

  // Default to groupByType: true and sortOrder: 'asc', remembering preference in localStorage
  const [groupByType, setGroupByType] = useState<boolean>(() => {
    const saved = localStorage.getItem('yt_groupByType')
    return saved !== null ? saved === 'true' : true
  })
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>(() => {
    const saved = localStorage.getItem('yt_sortOrder') as 'desc' | 'asc'
    return saved || 'asc'
  })
  const [selectedTabIds, setSelectedTabIds] = useState<number[]>([])
  const [isRefetching, setIsRefetching] = useState<boolean>(false)

  const handleGroupByTypeChange = (checked: boolean) => {
    setGroupByType(checked)
    localStorage.setItem('yt_groupByType', String(checked))
  }

  const handleSortOrderToggle = () => {
    setSortOrder((prev) => {
      const next = prev === 'desc' ? 'asc' : 'desc'
      localStorage.setItem('yt_sortOrder', next)
      return next
    })
  }

  // Filter and enrich YouTube tabs
  const youtubeTabs = useMemo(() => {
    return tabs
      .filter(
        (tab: any) =>
          tab.url &&
          (tab.url.includes('youtube.com/') || tab.url.includes('youtu.be/'))
      )
      .map((tab: any) => {
        const url = tab.url
        let type = 'Video'
        if (url.includes('/shorts/')) {
          type = 'Shorts'
        } else if (
          url.includes('/channel/') ||
          url.includes('/c/') ||
          url.includes('/@')
        ) {
          type = 'Channels'
        } else if (url.includes('/results')) {
          type = 'Search'
        }

        const duration = tab.youtubeInfo?.duration || 0

        return {
          ...tab,
          youtubeType: type,
          duration
        }
      })
      .sort((a: any, b: any) =>
        sortOrder === 'desc'
          ? b.duration - a.duration
          : a.duration - b.duration
      )
  }, [tabs, sortOrder])

  // Format duration helper
  const formatDuration = (seconds: number) => {
    if (!seconds) return ''
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0)
      return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    return `${m}:${s.toString().padStart(2, '0')}`
  }

  // Groups
  const groupedTabs = useMemo(() => {
    if (!groupByType) {
      return [{ title: 'All YouTube Tabs', tabs: youtubeTabs }]
    }

    const groups: Record<string, any[]> = {
      Channels: [],
      Video: [],
      Shorts: [],
      Search: []
    }

    youtubeTabs.forEach((tab: any) => {
      if (groups[tab.youtubeType]) {
        groups[tab.youtubeType].push(tab)
      } else {
        groups['Video'].push(tab) // Fallback
      }
    })

    return [
      { title: 'Channels', tabs: groups.Channels },
      { title: 'Videos', tabs: groups.Video },
      { title: 'Shorts', tabs: groups.Shorts },
      { title: 'Search Results', tabs: groups.Search }
    ].filter((group) => group.tabs.length > 0)
  }, [youtubeTabs, groupByType])

  // Tab activation (activates target window first, then the tab)
  const handleOpenTab = async (tab: any) => {
    try {
      if (tab.windowId) {
        await chrome.windows.update(tab.windowId, { focused: true })
      }
      await chrome.tabs.update(tab.id, { active: true })
    } catch (err) {
      console.error('Failed to focus tab/window:', err)
    }
  }

  // Handlers for Mute and Close
  const handleRemoveTab = async (id: number) => {
    try {
      await chrome.tabs.remove(id)
      setSelectedTabIds((prev) => prev.filter((tId) => tId !== id))
    } catch (e) {
      console.error(e)
    }
  }

  const handleMuteTab = async (id: number, currentMuted: boolean) => {
    try {
      await chrome.tabs.update(id, { muted: !currentMuted })
    } catch (e) {
      console.error(e)
    }
  }

  const handleGroupRemove = async (groupTabs: any[]) => {
    const ids = groupTabs.map((t) => t.id)
    try {
      await chrome.tabs.remove(ids)
      setSelectedTabIds((prev) => prev.filter((tId) => !ids.includes(tId)))
    } catch (e) {
      console.error(e)
    }
  }

  const handleGroupMuteToggle = async (groupTabs: any[]) => {
    const allMuted = groupTabs.every((t) => t.mutedInfo?.muted)
    for (const t of groupTabs) {
      try {
        await chrome.tabs.update(t.id, { muted: !allMuted })
      } catch (e) {
        console.error(e)
      }
    }
  }

  // Checkbox selection handlers
  const handleToggleSelectTab = (id: number) => {
    setSelectedTabIds((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    )
  }

  const handleToggleSelectGroup = (groupTabs: any[]) => {
    const groupIds = groupTabs.map((t) => t.id)
    const allGroupSelected = groupIds.every((id) => selectedTabIds.includes(id))
    if (allGroupSelected) {
      setSelectedTabIds((prev) => prev.filter((id) => !groupIds.includes(id)))
    } else {
      setSelectedTabIds((prev) => Array.from(new Set([...prev, ...groupIds])))
    }
  }

  const handleSelectAllToggle = () => {
    if (selectedTabIds.length === youtubeTabs.length) {
      setSelectedTabIds([])
    } else {
      setSelectedTabIds(youtubeTabs.map((t: any) => t.id))
    }
  }

  // Refetch timings handler for selected tabs (or all modal tabs if none selected)
  const handleRefetchTimings = async () => {
    const targetTabs =
      selectedTabIds.length > 0
        ? youtubeTabs.filter((t: any) => selectedTabIds.includes(t.id))
        : youtubeTabs

    if (targetTabs.length === 0) {
      message.info('No YouTube tabs to refetch')
      return
    }

    try {
      setIsRefetching(true)
      let refetchedCount = 0

      for (const tab of targetTabs) {
        // 1. Try querying the content script directly if tab is loaded
        try {
          chrome.tabs.sendMessage(
            tab.id,
            { type: 'GET_YOUTUBE_INFO' },
            (response) => {
              if (chrome.runtime.lastError) {
                // Content script not loaded or tab in background/discarded
                return
              }
              if (response && tab.url) {
                chrome.runtime.sendMessage({
                  type: 'YOUTUBE_VIDEO_INFO',
                  data: response,
                  url: tab.url
                })
              }
            }
          )
        } catch {
          // ignore tabs communication error
        }

        // 2. Also trigger API fetch via background if videoId is present
        if (tab.url) {
          const videoId = extractVideoId(tab.url)
          if (videoId) {
            chrome.runtime.sendMessage({
              type: 'FETCH_YOUTUBE_API_INFO',
              videoId,
              force: true
            })
            refetchedCount++
          }
        }
      }

      // 3. Request background to refresh data as well
      chrome.runtime.sendMessage({ type: 'REFRESH_YOUTUBE_DATA' })

      message.success(
        `Refetching timings for ${targetTabs.length} YouTube tab${targetTabs.length > 1 ? 's' : ''}...`
      )
    } catch (err) {
      console.error('Error refetching YouTube timings:', err)
      message.error('Failed to refetch YouTube timings')
    } finally {
      setTimeout(() => {
        setIsRefetching(false)
      }, 800)
    }
  }

  const isAllSelected =
    youtubeTabs.length > 0 && selectedTabIds.length === youtubeTabs.length
  const isPartiallySelected =
    selectedTabIds.length > 0 && selectedTabIds.length < youtubeTabs.length

  return (
    <Modal
      title={
        <div className="flex items-center justify-between w-full h-full pr-8">
          <Space>
            <Title
              level={4}
              style={{ margin: 0 }}
              className="flex items-center gap-2"
            >
              <Youtube className="text-red-600" /> YouTube Tabs
            </Title>
            <Text type="secondary">({youtubeTabs.length} found)</Text>
          </Space>
          <div className="flex items-center gap-3 text-sm font-normal">
            <div className="flex items-center gap-2">
              <span>Duration Sort:</span>
              <Button size="small" onClick={handleSortOrderToggle}>
                {sortOrder === 'desc' ? 'Desc' : 'Asc'}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span>Group by Type</span>
              <Switch
                checked={groupByType}
                onChange={handleGroupByTypeChange}
                size="small"
              />
            </div>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={720}
      footer={
        <div className="flex justify-between items-center w-full">
          <div className="flex items-center gap-3">
            {youtubeTabs.length > 0 && (
              <Checkbox
                checked={isAllSelected}
                indeterminate={isPartiallySelected}
                onChange={handleSelectAllToggle}
              >
                <span className="text-xs text-gray-600">
                  {selectedTabIds.length > 0
                    ? `${selectedTabIds.length} of ${youtubeTabs.length} selected`
                    : 'Select All'}
                </span>
              </Checkbox>
            )}
            <Button
              size="small"
              icon={
                <RotateCw
                  size={14}
                  className={isRefetching ? 'animate-spin' : ''}
                />
              }
              onClick={handleRefetchTimings}
              loading={isRefetching}
              disabled={youtubeTabs.length === 0}
            >
              {selectedTabIds.length > 0
                ? `Refetch Timings (${selectedTabIds.length})`
                : 'Refetch All Timings'}
            </Button>
          </div>
          <Button key="close" onClick={onClose}>
            Done
          </Button>
        </div>
      }
    >
      {youtubeTabs.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No YouTube tabs found.
        </div>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto pr-2">
          {groupedTabs.map((group, idx) => {
            const isGroupAllSelected =
              group.tabs.length > 0 &&
              group.tabs.every((t) => selectedTabIds.includes(t.id))
            const isGroupPartiallySelected =
              group.tabs.some((t) => selectedTabIds.includes(t.id)) &&
              !isGroupAllSelected

            return (
              <div key={idx} className="mb-6 last:mb-0">
                {groupByType && (
                  <div className="flex items-center justify-between text-sm font-semibold text-gray-500 mb-3 border-b pb-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={isGroupAllSelected}
                        indeterminate={isGroupPartiallySelected}
                        onChange={() => handleToggleSelectGroup(group.tabs)}
                      />
                      <span>
                        {group.title} ({group.tabs.length})
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      {group.title !== 'Channels' &&
                        group.title !== 'Search Results' && (
                          <ItemBtn
                            title={
                              group.tabs.every((t) => t.mutedInfo?.muted)
                                ? 'Unmute Group'
                                : 'Mute Group'
                            }
                            onClick={() => handleGroupMuteToggle(group.tabs)}
                            className="rounded-full !bg-white hover:!bg-slate-100 shadow-sm !border-0 w-7 h-7 !min-w-0 flex items-center justify-center transition-colors"
                          >
                            {group.tabs.every((t) => t.mutedInfo?.muted) ? (
                              <VolumeX size={14} />
                            ) : (
                              <Volume2 size={14} />
                            )}
                          </ItemBtn>
                        )}
                      <ItemBtn
                        title="Close Group"
                        onClick={() => handleGroupRemove(group.tabs)}
                        className="rounded-full !bg-white hover:!bg-slate-100 shadow-sm !border-0 group w-7 h-7 !min-w-0 flex items-center justify-center transition-colors"
                      >
                        <X
                          size={14}
                          className="text-red-500 group-hover:text-red-600"
                        />
                      </ItemBtn>
                    </div>
                  </div>
                )}
                <div className="space-y-2">
                  {group.tabs.map((tab: any) => {
                    const isSelected = selectedTabIds.includes(tab.id)

                    return (
                      <div
                        key={tab.id}
                        className={`group flex justify-between items-center p-2 rounded transition-colors ${
                          isSelected
                            ? 'bg-blue-50/80 border border-blue-200'
                            : 'bg-slate-50 hover:bg-slate-100'
                        }`}
                      >
                        <div className="flex items-center gap-3 overflow-hidden flex-1 min-w-0">
                          <Checkbox
                            checked={isSelected}
                            onChange={() => handleToggleSelectTab(tab.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          {tab.favIconUrl ? (
                            <img
                              src={tab.favIconUrl}
                              alt=""
                              className="w-5 h-5 flex-shrink-0 rounded-sm cursor-pointer"
                              onClick={() => handleOpenTab(tab)}
                            />
                          ) : (
                            <Youtube
                              className="w-5 h-5 flex-shrink-0 text-gray-400 cursor-pointer"
                              onClick={() => handleOpenTab(tab)}
                            />
                          )}
                          <div
                            className="flex flex-col overflow-hidden flex-1 cursor-pointer"
                            onClick={() => handleOpenTab(tab)}
                            title="Click to switch to this tab"
                          >
                            <span
                              className="truncate text-sm text-gray-800 font-medium hover:text-blue-600 hover:underline transition-colors"
                              title={tab.title}
                            >
                              {tab.title}
                            </span>
                            {tab.duration > 0 && (
                              <span className="text-xs text-gray-500">
                                Duration:{' '}
                                <span className="text-red-500 font-medium">
                                  {formatDuration(tab.duration)}
                                </span>
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0 ml-2">
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-200">
                            {tab.youtubeType !== 'Channels' &&
                              tab.youtubeType !== 'Search' && (
                                <ItemBtn
                                  title={
                                    tab.mutedInfo?.muted
                                      ? 'Unmute Tab'
                                      : 'Mute Tab'
                                  }
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    handleMuteTab(tab.id, tab.mutedInfo?.muted)
                                  }}
                                  className="rounded-full !bg-white hover:!bg-slate-100 shadow-sm !border-0 w-7 h-7 !min-w-0 flex items-center justify-center transition-colors"
                                >
                                  {tab.mutedInfo?.muted ? (
                                    <VolumeX size={14} />
                                  ) : (
                                    <Volume2 size={14} />
                                  )}
                                </ItemBtn>
                              )}
                            <ItemBtn
                              title="Close Tab"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRemoveTab(tab.id)
                              }}
                              className="rounded-full !bg-white hover:!bg-slate-100 shadow-sm !border-0 group-close w-7 h-7 !min-w-0 flex items-center justify-center transition-colors"
                            >
                              <X
                                size={14}
                                className="text-red-500 hover:text-red-600"
                              />
                            </ItemBtn>
                          </div>
                          <Tooltip title="Go to tab">
                            <Button
                              type="text"
                              size="small"
                              icon={<ExternalLink size={14} />}
                              onClick={(e) => {
                                e.stopPropagation()
                                handleOpenTab(tab)
                              }}
                            />
                          </Tooltip>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </Modal>
  )
}
