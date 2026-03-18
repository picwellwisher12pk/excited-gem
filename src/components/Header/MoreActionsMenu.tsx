import { Badge } from 'antd'
import { MoreVertical, Copy, RefreshCw, Youtube } from 'lucide-react'
import { useEffect, useMemo, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import Btn from '../../components/Btn'
import { DuplicateTabsModal } from '../../components/Modals/DuplicateTabsModal'
import { message } from 'antd'

const MoreActionsMenu = () => {
  const { tabs } = useSelector((state: any) => state.tabs)
  const [isDuplicateModalOpen, setIsDuplicateModalOpen] = useState(false)
  const [hasYoutubeApiKey, setHasYoutubeApiKey] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  useEffect(() => {
    chrome.storage.local.get('youtubeApiKey', (result) => {
      setHasYoutubeApiKey(!!result.youtubeApiKey)
    })

    const listener = (changes: any, area: string) => {
      if (area === 'local' && changes.youtubeApiKey) {
        setHasYoutubeApiKey(!!changes.youtubeApiKey.newValue)
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
    </>
  )
}

export default MoreActionsMenu
