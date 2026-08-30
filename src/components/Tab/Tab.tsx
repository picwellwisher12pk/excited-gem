import { List, Button } from 'antd'
import { PlayCircleOutlined, PauseCircleOutlined } from '@ant-design/icons'
import React, { useState, useEffect, useRef } from 'react'
import { controlYouTubeVideo } from '../../services/tabService'
import { useDispatch, useSelector } from 'react-redux'
import { Pin, Volume2, VolumeX, X, Moon } from 'lucide-react'
import {
  toggleSelectionMode,
  updateSelectedTabs,
  selectTabRange
} from '../../store/tabSlice'
import ItemBtn from '../../components/ItemBtn'
import { TabIcon } from './TabIcon'
import { HighlightedText } from './helpers'
import { TabContextMenu } from './ContextMenu'
import { faviconCache } from '../../utils/faviconCache'
// @ts-ignore
import GripIcon from 'react:/src/icons/grip-vertical.svg'

interface MutedInfo {
  muted: boolean
  reason?: string
}

export interface YouTubeInfo {
  duration: number
  currentTime: number
  paused: boolean
  title: string
  percentage: number
  tabId: number
}

export interface TabProps {
  id: number
  title: string
  url: string
  active: boolean
  selected: boolean
  pinned: boolean
  discarded: boolean
  status: 'loading' | 'complete' | 'error'
  audible: boolean
  muted: boolean
  mutedInfo: MutedInfo
  favIconUrl: string
  activeTab: boolean
  index: number
  remove: (id: number) => void
  toggleMuteTab: (id: number, muted: boolean) => void
  togglePinTab: (id: number, pinned: boolean) => void
  tabActionButtons?: 'always' | 'hover'
  groupColor?: string
  isGrouped?: boolean
  discardTab?: (id: number) => void
  youtubeInfo?: YouTubeInfo
  isCompact?: boolean
  isSelectionMode?: boolean
  hideUrl?: boolean
  style?: React.CSSProperties
  windowId?: number
}

interface SearchState {
  searchTerm: string
  searchIn: {
    title: boolean
    url: boolean
  }
}

export const Tab = React.forwardRef<HTMLDivElement, TabProps>(
  (
    {
      id,
      windowId,
      active,
      activeTab,
      remove,
      toggleMuteTab,
      togglePinTab,
      selected,
      status,
      audible,
      mutedInfo,
      pinned,
      discarded,
      favIconUrl,
      title = '',
      url = '',
      tabActionButtons = 'hover',
      groupColor,
      isGrouped,
      discardTab,
      youtubeInfo,
      isCompact = false,
      hideUrl = false,
      ...props
    },
    ref
  ) => {
    const longPressTimer = useRef<any>(null)
    const dispatch = useDispatch()
    const { isSelectionMode } = useSelector((state: any) => state.tabs)

    const handlePointerDown = () => {
      if (isSelectionMode || !isCompact) return

      longPressTimer.current = setTimeout(() => {
        dispatch(toggleSelectionMode(true))
        dispatch(updateSelectedTabs({ id, selected: true }))
      }, 500)
    }

    const handlePointerUp = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }

    const handlePointerLeave = () => {
      if (longPressTimer.current) {
        clearTimeout(longPressTimer.current)
        longPressTimer.current = null
      }
    }

    const { searchTerm, searchIn } = useSelector<
      { search: SearchState },
      SearchState
    >((state) => state.search)
    const youtubePermissionGranted = useSelector(
      (state: any) => state.tabs.youtubePermissionGranted
    )

    const formatTime = (seconds: number): string => {
      if (isNaN(seconds)) return '0:00'
      const hrs = Math.floor(seconds / 3600)
      const mins = Math.floor((seconds % 3600) / 60)
      const secs = Math.floor(seconds % 60)
      if (hrs > 0) {
        return `${hrs}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
      }
      return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    const _ref = React.useRef<HTMLDivElement>(null)
    const mergeRefs = (el: HTMLDivElement) => {
      // @ts-ignore
      _ref.current = el
      if (typeof ref === 'function') {
        ref(el)
      } else if (ref) {
        ref.current = el
      }
    }

    const [seekValue, setSeekValue] = useState<number>(0)
    const [isYouTube, setIsYouTube] = useState<boolean>(false)

    useEffect(() => {
      if (youtubeInfo) {
        setSeekValue(youtubeInfo.percentage)
        setIsYouTube(true)
      } else if (url && url.includes('youtube.com/watch')) {
        setIsYouTube(true)
      } else {
        setIsYouTube(false)
      }
    }, [youtubeInfo, url])

    const handlePlayPause = async (e: React.MouseEvent) => {
      e.stopPropagation()
      if (youtubeInfo) {
        try {
          const action = youtubeInfo.paused ? 'play' : 'pause'
          await controlYouTubeVideo(id, action)
        } catch (error) {
          console.error('Error controlling YouTube playback:', error)
        }
      }
    }

    const handleSeek = async (value: number) => {
      if (youtubeInfo) {
        try {
          setSeekValue(value)
          await controlYouTubeVideo(id, 'seek', value)
        } catch (error) {
          console.error('Error seeking YouTube video:', error)
        }
      }
    }

    const handleRequestPermission = async (e: React.MouseEvent) => {
      e.stopPropagation()
      try {
        const granted = await chrome.permissions.request({
          origins: ['https://*.youtube.com/*', 'http://*.youtube.com/*']
        })
        if (granted) {
          console.log('YouTube permission granted')
        }
      } catch (error) {
        console.error('Error requesting permission:', error)
      }
    }

    const handleSelectedTabsUpdate = React.useCallback(
      (shiftKey: boolean) => {
        if (shiftKey) {
          dispatch(selectTabRange(id))
        } else {
          dispatch(updateSelectedTabs({ id, selected: !selected }))
        }
      },
      [dispatch, id, selected]
    )

    const handleTabClick = React.useCallback(async () => {
      if (windowId) {
        try {
          await chrome.windows.update(windowId, { focused: true })
        } catch (err) {
          console.error('Failed to focus window:', err)
        }
      }
      chrome.tabs.update(id, { active: true })
    }, [id, windowId])

    const handleMuteTab = React.useCallback(() => {
      toggleMuteTab(id, mutedInfo.muted)
    }, [id, mutedInfo.muted, toggleMuteTab])

    const handlePinTab = React.useCallback(() => {
      togglePinTab(id, pinned)
    }, [id, pinned, togglePinTab])

    const handleRemove = React.useCallback(() => {
      remove(id)
    }, [id, remove])

    const cachedFavicon = React.useMemo(() => {
      return faviconCache.getOrSet(url, favIconUrl)
    }, [url, favIconUrl])

    const isLoading = status === 'loading'
    const discardedClass = discarded ? ' idle' : ''

    return (
      <List.Item
        key={id}
        id={String(id)}
        className={`
        w-full overflow-hidden tab-item flex items-center py-2
        hover:bg-slate-200 transition-colors duration-300
        border-b border-stone-100 !justify-start group
        flex-col sm:flex-row min-h-[50px] sm:min-h-0
        ${selected ? ' checked bg-slate-100' : ''}
        ${active ? 'border-l-4 border-l-blue-600 bg-blue-50' : ''}
        ${isLoading ? ' loading' : discardedClass}
        ${isGrouped && !active ? 'ml-4 border-l-4 bg-slate-50/50' : ''}
        ${isGrouped && active ? 'ml-4' : ''}
      `}
        style={{
          cursor: 'grab',
          ...props.style,
          ...(isGrouped && groupColor && !active
            ? { borderLeftColor: groupColor }
            : {})
        }}
        data-discarded={discarded}
      >
        <div
          ref={mergeRefs}
          // @ts-ignore
          {...props}
          className="w-full h-full flex items-center"
          onPointerDown={handlePointerDown}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onContextMenu={(e) => {
            e.preventDefault()
          }}
        >
          <TabContextMenu
            tab={{ id, title, url, pinned, mutedInfo, discarded }}
          >
            <div className="flex w-full items-center items-stretch sm:items-center">
              <div className="handle cursor-grab active:cursor-grabbing mr-2 flex items-center shrink-0">
                <GripIcon className="h-4 w-4 opacity-30 group-hover:opacity-70" />
              </div>
              <TabIcon
                onChange={handleSelectedTabsUpdate}
                checked={selected}
                loading={isLoading}
                discarded={discarded}
                src={cachedFavicon}
                title={title}
                isSelectionMode={isSelectionMode}
              />
              <div className="flex flex-auto truncate flex-col justify-center ml-2">
                <span
                  className="truncate font-semibold shrink-0 cursor-pointer hover:underline"
                  style={{ opacity: discarded || isLoading ? 0.7 : 1 }}
                  title={url}
                  onClick={handleTabClick}
                >
                  <HighlightedText
                    text={title}
                    highlight={searchIn.title ? searchTerm : ''}
                  />
                </span>
                {!hideUrl && (
                  <>
                    {/* Mobile: Show URL below title */}
                    <button
                      className="text-xs text-slate-400 truncate w-full text-left sm:hidden block leading-none bg-transparent border-0 cursor-pointer p-0 hover:text-slate-600 transition-colors"
                      title={url}
                      onClick={handleTabClick}
                    >
                      <HighlightedText
                        text={url}
                        highlight={searchIn.url ? searchTerm : ''}
                      />
                    </button>
                    {/* Desktop: Show URL next to title (hidden on mobile) */}
                    <button
                      className="text-xs text-slate-400 truncate w-full text-left hover:text-slate-600 transition-colors hidden sm:block bg-transparent border-0 cursor-pointer p-0"
                      title={url}
                      onClick={handleTabClick}
                    >
                      <HighlightedText
                        text={url}
                        highlight={searchIn.url ? searchTerm : ''}
                      />
                    </button>
                  </>
                )}
              </div>
              {/* YouTube Video Controls */}
              {isYouTube && (
                <>
                  {youtubeInfo ? (
                    <div
                      className="flex items-center ml-2 mr-2"
                      style={{ minWidth: 180, maxWidth: 240, width: 220 }}
                      onClick={(e) => e.stopPropagation()}
                    >
                      <Button
                        type="text"
                        size="small"
                        onClick={handlePlayPause}
                        icon={
                          youtubeInfo.paused ? (
                            <PlayCircleOutlined
                              style={{ color: '#ff0000', fontSize: 16 }}
                            />
                          ) : (
                            <PauseCircleOutlined
                              style={{ color: '#ff0000', fontSize: 16 }}
                            />
                          )
                        }
                        style={{
                          width: 24,
                          height: 24,
                          padding: 0,
                          marginRight: 4
                        }}
                        aria-label={youtubeInfo.paused ? 'Play' : 'Pause'}
                      />
                      <span
                        className="text-xs text-gray-500 mr-1 min-w-[36px] text-right"
                        style={{ width: 36 }}
                      >
                        {formatTime(youtubeInfo.currentTime)}
                      </span>
                      <input
                        type="range"
                        min={0}
                        max={100}
                        step={0.1}
                        value={seekValue}
                        onChange={(e) => handleSeek(Number(e.target.value))}
                        className="youtube-seekbar"
                        style={{
                          width: '90px',
                          height: '1px',
                          background: `linear-gradient(to right, #ff0000 0%, #ff0000 ${seekValue}%, #ccc ${seekValue}%, #ccc 100%)`,
                          margin: '0 6px',
                          padding: 0,
                          WebkitAppearance: 'none'
                        }}
                      />
                      <style>{`
                      input.youtube-seekbar::-webkit-slider-thumb {
                        -webkit-appearance: none;
                        appearance: none;
                        width: 6px;
                        height: 6px;
                        background: #ff0000;
                        border-radius: 6px;
                        cursor: pointer;
                        margin-top: -3px;
                      }
                      input.youtube-seekbar::-webkit-slider-runnable-track {
                        height: 1px;
                        background: transparent;
                      }
                    `}</style>
                      <span
                        className="text-xs text-gray-500 ml-1 min-w-[36px] text-left"
                        style={{ width: 36 }}
                      >
                        {formatTime(youtubeInfo.duration)}
                      </span>
                    </div>
                  ) : (
                    !youtubePermissionGranted && (
                      <Button
                        size="small"
                        type="text"
                        onClick={handleRequestPermission}
                        className="ml-2 text-xs text-gray-500 hover:text-red-600 flex items-center"
                        icon={<PlayCircleOutlined />}
                      >
                        Enable Controls
                      </Button>
                    )
                  )}
                </>
              )}

              <div
                className={`
                  tab-actions flex items-center gap-1.5
                  transition-all duration-200 ease-out
                  ${tabActionButtons === 'always' ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4 group-hover:opacity-100 group-hover:translate-x-0'}
                  absolute right-2 top-1/2 -translate-y-1/2
                  hidden sm:flex
                  ${audible || mutedInfo.muted ? '!opacity-100' : ''}
                `}
                role="group"
                aria-label={`Actions for tab: ${title}`}
              >
                {/* Discard button: show only if tab is NOT already discarded */}
                {!discarded && (
                  <ItemBtn
                    title="Discard Tab"
                    aria-label={`Discard tab: ${title}`}
                    onClick={(e) => {
                      e.stopPropagation()
                      discardTab?.(id)
                    }}
                    className="rounded-full !bg-white hover:!bg-slate-100 shadow-sm !border-0 w-7 h-7 !min-w-0 flex items-center justify-center transition-colors"
                  >
                    <Moon size={14} className="text-slate-500" />
                  </ItemBtn>
                )}
                {(audible || mutedInfo.muted) && (
                  <ItemBtn
                    title={mutedInfo.muted ? 'Unmute Tab' : 'Mute Tab'}
                    aria-label={`${mutedInfo.muted ? 'Unmute' : 'Mute'} tab: ${title}`}
                    onClick={handleMuteTab}
                    className="rounded-full !bg-white hover:!bg-slate-100 shadow-sm !border-0 w-7 h-7 !min-w-0 flex items-center justify-center transition-colors"
                  >
                    {mutedInfo.muted ? (
                      <VolumeX size={14} />
                    ) : (
                      <Volume2 size={14} />
                    )}
                  </ItemBtn>
                )}
                {activeTab && (
                  <>
                    <ItemBtn
                      title={pinned ? 'Unpin Tab' : 'Pin Tab'}
                      aria-label={`${pinned ? 'Unpin' : 'Pin'} tab: ${title}`}
                      onClick={handlePinTab}
                      className="rounded-full !bg-white hover:!bg-slate-100 shadow-sm !border-0 w-7 h-7 !min-w-0 flex items-center justify-center transition-colors"
                    >
                      <Pin size={14} className={pinned ? 'fill-current' : ''} />
                    </ItemBtn>
                    <ItemBtn
                      title="Close Tab"
                      aria-label={`Close tab: ${title}`}
                      onClick={handleRemove}
                      className="rounded-full !bg-white hover:!bg-slate-100 shadow-sm !border-0 group w-7 h-7 !min-w-0 flex items-center justify-center transition-colors"
                    >
                      <X
                        size={14}
                        className="text-red-500 group-hover:text-red-600"
                      />
                    </ItemBtn>
                  </>
                )}
              </div>
            </div>
          </TabContextMenu>
        </div>
      </List.Item>
    )
  }
)

Tab.displayName = 'Tab'

export default Tab
