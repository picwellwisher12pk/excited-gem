import { Badge, message } from 'antd'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import Btn from '../../components/Btn'
import { DuplicateTabsModal } from '../../components/Modals/DuplicateTabsModal'
import { YoutubeTabsModal } from '../../components/Modals/YoutubeTabsModal'
import { AITestModal } from '../../components/Modals/AITestModal'
import {
  BarChart3,
  Bot,
  Copy,
  FileText,
  Layers,
  MoreVertical,
  RefreshCw,
  Youtube,
  Zap
} from 'lucide-react'

const MoreActionsMenu = () => {
  const { tabs } = useSelector((state: any) => state.tabs)
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false)
  const [isAITestModalOpen, setIsAITestModalOpen] = useState(false)
  const [hasYoutubeApiKey, setHasYoutubeApiKey] = useState(false)
  const [experimentalAI, setExperimentalAI] = useState(false)
  const [isGrouping, setIsGrouping] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    // Initial fetch
    chrome.storage.local.get(['youtubeApiKey', 'pref'], (result) => {
      setHasYoutubeApiKey(!!result.youtubeApiKey)
      setExperimentalAI(!!result.pref?.experimentalAI)
    })

    // Consolidated storage listener
    const listener = (changes: any, area: string) => {
      if (area === 'local') {
        if (changes.youtubeApiKey) {
          setHasYoutubeApiKey(!!changes.youtubeApiKey.newValue)
        }
        if (changes.pref) {
          setExperimentalAI(!!changes.pref.newValue?.experimentalAI)
        }
      }
    }
    chrome.storage.onChanged.addListener(listener)
    return () => chrome.storage.onChanged.removeListener(listener)
  }, [])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const duplicateCount = useMemo(() => {
    const urlCounts: Record<string, number> = {}
    tabs.forEach((tab: any) => {
      if (tab?.url) {
        urlCounts[tab.url] = (urlCounts[tab.url] || 0) + 1
      }
    })
    return Object.values(urlCounts).reduce(
      (acc, count) => acc + (count > 1 ? count : 0),
      0
    )
  }, [tabs])

  const handleGroupByDomain = async () => {
    if (!chrome.tabs?.group || isGrouping) return
    try {
      setIsGrouping(true)
      const windowsGroup: Record<number, Record<string, number[]>> = {}
      tabs.forEach((tab: any) => {
        try {
          if (!tab.url) return
          const domain = new URL(tab.url).hostname.replace(/^www\./, '')
          if (!domain || domain.startsWith('chrome')) return
          if (!windowsGroup[tab.windowId]) windowsGroup[tab.windowId] = {}
          if (!windowsGroup[tab.windowId][domain]) {
            windowsGroup[tab.windowId][domain] = []
          }
          windowsGroup[tab.windowId][domain].push(tab.id)
        } catch {
          // ignore invalid URLs
        }
      })

      const colors: Array<
        | 'blue'
        | 'red'
        | 'yellow'
        | 'green'
        | 'pink'
        | 'purple'
        | 'cyan'
        | 'orange'
      > = ['blue', 'green', 'purple', 'orange', 'cyan', 'pink', 'yellow', 'red']
      let colorIdx = 0
      let groupedCount = 0

      for (const winId of Object.keys(windowsGroup)) {
        const domainMap = windowsGroup[Number(winId)]
        for (const [domain, tabIds] of Object.entries(domainMap)) {
          if (tabIds.length > 1) {
            // @ts-ignore
            const groupId = await chrome.tabs.group({ tabIds })
            if (groupId && chrome.tabGroups?.update) {
              await chrome.tabGroups.update(groupId, {
                title: domain,
                color: colors[colorIdx % colors.length]
              })
              colorIdx++
              groupedCount += tabIds.length
            }
          }
        }
      }

      if (groupedCount > 0) {
        message.success(`Grouped ${groupedCount} tabs by domain`)
      } else {
        message.info('No domain groups with 2+ tabs found')
      }
    } catch (err) {
      console.error('Failed to group tabs by domain:', err)
      message.error('Failed to group tabs by domain')
    } finally {
      setIsGrouping(false)
      setIsOpen(false)
    }
  }

  const handleExportMarkdown = () => {
    const md = tabs
      .filter((t: any) => t.url && t.title)
      .map((t: any) => `- [${t.title.replace(/[\[\]]/g, '')}](${t.url})`)
      .join('\n')
    navigator.clipboard.writeText(md)
    message.success(`Copied ${tabs.length} tabs as Markdown links`)
    setIsOpen(false)
  }

  const items = [
    {
      key: 'highlight-duplicates',
      label: `Manage Duplicates (${duplicateCount})`,
      icon: <Copy size={14} />,
      onClick: () => {
        setIsDuplicateModalOpen(true)
        setIsOpen(false)
      },
      disabled: duplicateCount === 0
    },
    {
      key: 'group-by-domain',
      label: isGrouping ? 'Grouping tabs...' : 'Auto-Group by Domain',
      icon: <Layers size={14} />,
      onClick: handleGroupByDomain,
      disabled: isGrouping
    },
    {
      key: 'analytics-dashboard',
      label: 'Analytics & Insights',
      icon: <BarChart3 size={14} className="text-blue-500" />,
      onClick: () => {
        window.location.href = '/tabs/analytics.html'
        setIsOpen(false)
      }
    },
    {
      key: 'export-markdown',
      label: 'Export Tabs to Markdown',
      icon: <FileText size={14} />,
      onClick: handleExportMarkdown
    },
    {
      key: 'routines-macros',
      label: 'Routines & Macros',
      icon: <Zap size={14} className="text-amber-500 fill-amber-500" />,
      onClick: () => {
        window.location.href = '/tabs/settings.html#routines'
        setIsOpen(false)
      }
    },
    {
      key: 'force-refresh',
      label: 'Force refresh tabs view',
      icon: <RefreshCw size={14} />,
      onClick: () => {
        window.location.reload()
        setIsOpen(false)
      }
    },
    {
      key: 'youtube-tabs',
      label: 'Manage YouTube Tabs',
      icon: <Youtube size={14} />,
      onClick: () => {
        setIsYoutubeModalOpen(true)
        setIsOpen(false)
      }
    },
    ...(experimentalAI
      ? [
          {
            key: 'ai-assistant',
            label: 'AI Assistant',
            icon: <Bot size={14} />,
            onClick: () => {
              setIsAITestModalOpen(true)
              setIsOpen(false)
            }
          }
        ]
      : []),
    ...(hasYoutubeApiKey
      ? [
          {
            key: 'fetch-youtube',
            label: 'Fetch YouTube Data',
            icon: <Youtube size={14} />,
            onClick: () => {
              chrome.runtime.sendMessage({ type: 'REFRESH_YOUTUBE_DATA' })
              message.success('Refreshing YouTube data...')
              setIsOpen(false)
            }
          }
        ]
      : [])
  ]

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <Btn
          className="flex items-center justify-center px-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <Badge count={duplicateCount} size="small" offset={[0, -5]}>
            <MoreVertical size={16} />
          </Badge>
        </Btn>

        {isOpen && (
          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[210px] py-1">
            {items.map((item) => (
              <button
                key={item.key}
                type="button"
                className={`w-full text-left px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm flex items-center gap-2 ${
                  item.disabled ? 'opacity-50 cursor-not-allowed' : ''
                }`}
                onClick={!item.disabled ? item.onClick : undefined}
                disabled={item.disabled}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      <DuplicateTabsModal
        visible={isDuplicateModalOpen}
        onClose={() => setIsDuplicateModalOpen(false)}
      />

      <YoutubeTabsModal
        visible={isYoutubeModalOpen}
        onClose={() => setIsYoutubeModalOpen(false)}
      />

      <AITestModal
        visible={isAITestModalOpen}
        onClose={() => setIsAITestModalOpen(false)}
      />
    </>
  )
}

export default MoreActionsMenu
