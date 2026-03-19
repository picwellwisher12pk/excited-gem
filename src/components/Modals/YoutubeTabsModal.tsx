import { Button, Checkbox, List, Modal, Typography, Space, Tooltip, Switch } from 'antd'
import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { ExternalLink, Youtube, Volume2, VolumeX, X } from 'lucide-react'
import ItemBtn from '../ItemBtn'

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
  const [groupByType, setGroupByType] = useState(false)
  const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc')

  // Filter and enrich YouTube tabs
  const youtubeTabs = useMemo(() => {
    return tabs
      .filter((tab: any) => tab.url && (tab.url.includes('youtube.com/') || tab.url.includes('youtu.be/')))
      .map((tab: any) => {
        const url = tab.url
        let type = 'Video'
        if (url.includes('/shorts/')) {
          type = 'Shorts'
        } else if (url.includes('/channel/') || url.includes('/c/') || url.includes('/@')) {
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
      .sort((a: any, b: any) => sortOrder === 'desc' ? b.duration - a.duration : a.duration - b.duration)
  }, [tabs, sortOrder])

  // Format duration
  const formatDuration = (seconds: number) => {
    if (!seconds) return ''
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
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
    ].filter(group => group.tabs.length > 0)
  }, [youtubeTabs, groupByType])

  // Handlers for Mute and Close
  const handleRemoveTab = async (id: number) => {
    try { await chrome.tabs.remove(id) } catch (e) { console.error(e) }
  }

  const handleMuteTab = async (id: number, currentMuted: boolean) => {
    try { await chrome.tabs.update(id, { muted: !currentMuted }) } catch (e) { console.error(e) }
  }

  const handleGroupRemove = async (groupTabs: any[]) => {
    const ids = groupTabs.map(t => t.id)
    try { await chrome.tabs.remove(ids) } catch (e) { console.error(e) }
  }

  const handleGroupMuteToggle = async (groupTabs: any[]) => {
    const allMuted = groupTabs.every(t => t.mutedInfo?.muted)
    for (const t of groupTabs) {
      try { await chrome.tabs.update(t.id, { muted: !allMuted }) } catch (e) { console.error(e) }
    }
  }

  return (
    <Modal
      title={
        <div className="flex items-center justify-between w-full h-full pr-8">
          <Space>
            <Title level={4} style={{ margin: 0 }} className="flex items-center gap-2">
              <Youtube className="text-red-600" /> YouTube Tabs
            </Title>
            <Text type="secondary">({youtubeTabs.length} found)</Text>
          </Space>
          <div className="flex items-center gap-4 text-sm font-normal">
            <div className="flex items-center gap-2">
              <span>Duration Sort:</span>
              <Button
                size="small"
                onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
              >
                {sortOrder === 'desc' ? 'Desc' : 'Asc'}
              </Button>
            </div>
            <div className="flex items-center gap-2">
              <span>Group by Type</span>
              <Switch checked={groupByType} onChange={setGroupByType} size="small" />
            </div>
          </div>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={700}
      footer={
        <div className="flex justify-end gap-2">
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
          {groupedTabs.map((group, idx) => (
            <div key={idx} className="mb-6 last:mb-0">
              {groupByType && (
                <div className="flex items-center justify-between text-sm font-semibold text-gray-500 mb-3 border-b pb-1">
                  <span>{group.title} ({group.tabs.length})</span>
                  <div className="flex items-center gap-1">
                    {group.title !== 'Channels' && group.title !== 'Search Results' && (
                      <ItemBtn
                        title={group.tabs.every(t => t.mutedInfo?.muted) ? 'Unmute Group' : 'Mute Group'}
                        onClick={() => handleGroupMuteToggle(group.tabs)}
                        className="rounded-full !bg-white hover:!bg-slate-100 shadow-sm !border-0 w-7 h-7 !min-w-0 flex items-center justify-center transition-colors"
                      >
                        {group.tabs.every(t => t.mutedInfo?.muted) ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      </ItemBtn>
                    )}
                    <ItemBtn
                      title="Close Group"
                      onClick={() => handleGroupRemove(group.tabs)}
                      className="rounded-full !bg-white hover:!bg-slate-100 shadow-sm !border-0 group w-7 h-7 !min-w-0 flex items-center justify-center transition-colors"
                    >
                      <X size={14} className="text-red-500 group-hover:text-red-600" />
                    </ItemBtn>
                  </div>
                </div>
              )}
              <div className="space-y-2">
                {group.tabs.map((tab: any) => (
                  <div
                    key={tab.id}
                    className="group flex justify-between items-center bg-slate-50 p-2 rounded hover:bg-slate-100 transition-colors"
                  >
                    <div className="flex items-center gap-3 overflow-hidden">
                      {tab.favIconUrl ? (
                        <img
                          src={tab.favIconUrl}
                          alt=""
                          className="w-5 h-5 flex-shrink-0 rounded-sm"
                        />
                      ) : (
                        <Youtube className="w-5 h-5 flex-shrink-0 text-gray-400" />
                      )}
                      <div className="flex flex-col overflow-hidden">
                        <span
                          className="truncate text-sm text-gray-800 font-medium"
                          title={tab.title}
                        >
                          {tab.title}
                        </span>
                        {tab.duration > 0 && (
                          <span className="text-xs text-gray-500">
                            Duration: <span className="text-red-500">{formatDuration(tab.duration)}</span>
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 text-xs text-gray-400 flex-shrink-0">
                      <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity duration-200">
                        {tab.youtubeType !== 'Channels' && tab.youtubeType !== 'Search' && (
                          <ItemBtn
                            title={tab.mutedInfo?.muted ? 'Unmute Tab' : 'Mute Tab'}
                            onClick={(e) => { e.stopPropagation(); handleMuteTab(tab.id, tab.mutedInfo?.muted) }}
                            className="rounded-full !bg-white hover:!bg-slate-100 shadow-sm !border-0 w-7 h-7 !min-w-0 flex items-center justify-center transition-colors"
                          >
                            {tab.mutedInfo?.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                          </ItemBtn>
                        )}
                        <ItemBtn
                          title="Close Tab"
                          onClick={(e) => { e.stopPropagation(); handleRemoveTab(tab.id) }}
                          className="rounded-full !bg-white hover:!bg-slate-100 shadow-sm !border-0 group-close w-7 h-7 !min-w-0 flex items-center justify-center transition-colors"
                        >
                          <X size={14} className="text-red-500 hover:text-red-600" />
                        </ItemBtn>
                      </div>
                      <Tooltip title="Go to tab">
                        <Button
                          type="text"
                          size="small"
                          icon={<ExternalLink size={14} />}
                          onClick={() => {
                            chrome.windows.update(tab.windowId, {
                              focused: true
                            })
                            chrome.tabs.update(tab.id, { active: true })
                          }}
                        />
                      </Tooltip>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </Modal>
  )
}
