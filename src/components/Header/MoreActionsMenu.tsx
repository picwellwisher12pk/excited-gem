import { Badge } from 'antd'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import Btn from '../../components/Btn'
import { DuplicateTabsModal } from '../../components/Modals/DuplicateTabsModal'
import { YoutubeTabsModal } from '../../components/Modals/YoutubeTabsModal'
import { AITestModal } from '../../components/Modals/AITestModal'
import { message } from 'antd'
import { Bot, Copy, MoreVertical, RefreshCw, Youtube } from 'lucide-react'

const MoreActionsMenu = () => {
  const { tabs } = useSelector((state: any) => state.tabs)
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
  const [isYoutubeModalOpen, setIsYoutubeModalOpen] = useState(false)
  const [isAITestModalOpen, setIsAITestModalOpen] = useState(false)
  const [hasYoutubeApiKey, setHasYoutubeApiKey] = useState(false)
  const [experimentalAI, setExperimentalAI] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

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
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
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
      urlCounts[tab.url] = (urlCounts[tab.url] || 0) + 1
    })
    return Object.values(urlCounts).reduce(
      (acc, count) => acc + (count > 1 ? count : 0),
      0
    )
  }, [tabs])

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
    ...(experimentalAI ? [
      {
        key: 'ai-assistant',
        label: 'AI Assistant',
        icon: <Bot size={14} />,
        onClick: () => {
          setIsAITestModalOpen(true)
          setIsOpen(false)
        }
      }
    ] : []),
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
          <div className="absolute top-full right-0 mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-[200px]">
            {items.map(item => (
              <div
                key={item.key}
                className={`px-3 py-2 hover:bg-gray-100 cursor-pointer text-sm flex items-center gap-2 ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''
                  }`}
                onClick={!item.disabled ? item.onClick : undefined}
              >
                {item.icon}
                <span>{item.label}</span>
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

      <AITestModal
        visible={isAITestModalOpen}
        onClose={() => setIsAITestModalOpen(false)}
      />
    </>
  )
}

export default MoreActionsMenu
