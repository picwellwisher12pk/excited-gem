import { Badge, message } from 'antd'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import Btn from '../../components/Btn'
import { DuplicateTabsModal } from '../../components/Modals/DuplicateTabsModal'
import { YoutubeTabsModal } from '../../components/Modals/YoutubeTabsModal'
import { BugReportModal } from '../../components/Modals/BugReportModal'
import { toggleDrawer } from '../../store/aiSlice'
import {
  BarChart3,
  Bot,
  Bug,
  Combine,
  Copy,
  FileText,
  Layers,
  MoreVertical,
  RefreshCw,
  Sparkles,
  Youtube,
  Zap
} from 'lucide-react'
import { executeSemanticTabGrouping } from '../../services/tabClusteringService'
import { combineAllWindows } from '../../services/windowManagerService'

const MoreActionsMenu = () => {
  const dispatch = useDispatch()
  const { tabs } = useSelector((state: any) => state.tabs)
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false)
  const [isBugReportModalOpen, setIsBugReportModalOpen] = useState(false)
  const [hasYoutubeApiKey, setHasYoutubeApiKey] = useState(false)
  const [experimentalAI, setExperimentalAI] = useState(false)
  const [isGrouping, setIsGrouping] = useState(false)
  const [isMerging, setIsMerging] = useState(false)
  const [windowCount, setWindowCount] = useState(1)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isOpen && chrome.windows?.getAll) {
      chrome.windows.getCurrent((current) => {
        const isIncog = !!current?.incognito
        chrome.windows.getAll({ windowTypes: ['normal'] }, (wins) => {
          if (wins && wins.length) {
            const matchingWins = wins.filter((w) => !!w.incognito === isIncog)
            setWindowCount(matchingWins.length)
          }
        })
      })
    }
  }, [isOpen])

  const handleCombineAllWindows = async () => {
    try {
      setIsMerging(true)
      const res = await combineAllWindows()
      if (!res.success) {
        message.error(res.error || 'Failed to combine windows')
      } else if (res.movedCount === 0) {
        const incognitoText =
          res.skippedIncognitoCount > 0
            ? ` (${res.skippedIncognitoCount} incognito window(s) kept isolated)`
            : ''
        message.info(`All eligible tabs are already in this window${incognitoText}`)
      } else {
        const incognitoText =
          res.skippedIncognitoCount > 0
            ? ` (${res.skippedIncognitoCount} incognito window(s) kept isolated)`
            : ''
        message.success(
          `Combined ${res.movedCount} tab(s) from ${res.closedWindowsCount} window(s) into this window${incognitoText}!`
        )
      }
    } catch (err: any) {
      message.error(err?.message || 'Error combining windows')
    } finally {
      setIsMerging(false)
      setIsOpen(false)
    }
  }

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

  const handleSemanticGrouping = async () => {
    if (!chrome.tabs?.group || isGrouping) return
    try {
      setIsGrouping(true)
      const { totalGrouped, groupsCreated } = await executeSemanticTabGrouping(tabs)
      if (groupsCreated > 0) {
        message.success(`Smart grouped ${totalGrouped} tabs into ${groupsCreated} categories!`)
      } else {
        message.info('No clusters with 2+ matching tabs found')
      }
    } catch (err) {
      console.error('Failed to smart group tabs:', err)
      message.error('Failed to smart group tabs')
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

  const itemSections = [
    {
      title: 'Tabs & Windows',
      items: [
        {
          key: 'combine-all-windows',
          label: isMerging
            ? 'Combining windows...'
            : windowCount > 1
              ? `Combine All Windows (${windowCount})`
              : 'Combine All Windows',
          icon: <Combine size={14} className="text-indigo-600" />,
          onClick: handleCombineAllWindows,
          disabled: isMerging || windowCount <= 1
        },
        {
          key: 'smart-group-ai',
          label: isGrouping ? 'Analyzing & grouping...' : 'Smart Group by Topic (AI)',
          icon: <Sparkles size={14} className="text-purple-600" />,
          onClick: handleSemanticGrouping,
          disabled: isGrouping
        },
        {
          key: 'group-by-domain',
          label: isGrouping ? 'Grouping tabs...' : 'Auto-Group by Domain',
          icon: <Layers size={14} className="text-blue-500" />,
          onClick: handleGroupByDomain,
          disabled: isGrouping
        },
        {
          key: 'highlight-duplicates',
          label: `Manage Duplicates (${duplicateCount})`,
          icon: <Copy size={14} className="text-amber-500" />,
          onClick: () => {
            setIsDuplicateModalOpen(true)
            setIsOpen(false)
          },
          disabled: duplicateCount === 0
        }
      ]
    },
    {
      title: 'Tools & Productivity',
      items: [
        {
          key: 'export-markdown',
          label: 'Export Tabs to Markdown',
          icon: <FileText size={14} className="text-emerald-500" />,
          onClick: handleExportMarkdown
        },
        {
          key: 'youtube-tabs',
          label: 'Manage YouTube Tabs',
          icon: <Youtube size={14} className="text-red-500" />,
          onClick: () => {
            setIsYoutubeModalOpen(true)
            setIsOpen(false)
          }
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
        ...(hasYoutubeApiKey
          ? [
              {
                key: 'fetch-youtube',
                label: 'Fetch YouTube Data',
                icon: <Youtube size={14} className="text-red-500" />,
                onClick: () => {
                  chrome.runtime.sendMessage({ type: 'REFRESH_YOUTUBE_DATA' })
                  message.success('Refreshing YouTube data...')
                  setIsOpen(false)
                }
              }
            ]
          : [])
      ]
    },
    {
      title: 'Intelligence & Help',
      items: [
        {
          key: 'ai-assistant',
          label: 'AI Assistant (Drawer)',
          icon: <Bot size={14} className="text-purple-600" />,
          onClick: () => {
            dispatch(toggleDrawer())
            setIsOpen(false)
          }
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
          key: 'force-refresh',
          label: 'Force refresh tabs view',
          icon: <RefreshCw size={14} className="text-slate-500" />,
          onClick: () => {
            window.location.reload()
            setIsOpen(false)
          }
        },
        {
          key: 'report-bug-feedback',
          label: 'Report Bug / Feedback',
          icon: <Bug size={14} className="text-rose-500" />,
          onClick: () => {
            setIsBugReportModalOpen(true)
            setIsOpen(false)
          }
        }
      ]
    }
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
          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200/90 rounded-xl shadow-xl z-50 min-w-[250px] w-max py-1 divide-y divide-gray-100 backdrop-blur-sm animate-in fade-in zoom-in-95 duration-100">
            {itemSections.map((section, sIdx) => (
              <div key={section.title || sIdx} className="py-1">
                {section.title && (
                  <div className="px-3 py-1 text-[10px] font-semibold tracking-wider text-gray-400 uppercase">
                    {section.title}
                  </div>
                )}
                {section.items.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className={`w-full text-left px-3 py-1.5 hover:bg-slate-50 active:bg-slate-100 cursor-pointer text-xs font-medium text-slate-700 flex items-center gap-2.5 transition-colors whitespace-nowrap ${
                      item.disabled ? 'opacity-40 cursor-not-allowed hover:bg-transparent' : ''
                    }`}
                    onClick={!item.disabled ? item.onClick : undefined}
                    disabled={item.disabled}
                  >
                    <span className="flex-shrink-0">{item.icon}</span>
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
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

      <BugReportModal
        visible={isBugReportModalOpen}
        onClose={() => setIsBugReportModalOpen(false)}
      />
    </>
  )
}

export default MoreActionsMenu
