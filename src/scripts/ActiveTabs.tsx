import { useMemo, useState } from 'react'
import { useSelector, useDispatch } from 'react-redux'

// import { profilerCallback } from "/src/scripts/general"
import store from '../store/store'
import { updateActiveTabs, updateFilteredTabs } from '../store/tabSlice'
import { getTabs } from '../scripts/browserActions'
import { extractVideoId } from '../utils/youtube'

import '../assets/logo.svg'
import '../assets/dev-logo.svg'

import TabWindowWrapper from './TabWindowWrapper'
import Header from '../components/Header/Header'
import Navigation from '../components/Header/Navigation'
import Search from '../components/Search'
import Sidebar from '../components/Sidebar'
import { usePageTracking } from '../components/Analytics/usePageTracking'
import { AIDrawer } from '../components/AI/AIDrawer'
import { AIProviderBadge } from '../components/AI/AIProviderBadge'
import { toggleDrawer, setProviderStatus } from '../store/aiSlice'
import type { AppDispatch, RootState } from '../store/store'
import { getAIService } from '../ai/AIService'
import { useEffect } from 'react'

export async function updateTabs(getTabs, store) {
  const tabs = await getTabs(store.getState().tabs.selectedWindow)

  // Fetch YouTube info from storage
  const { youtubeInfoMap, youtubeApiCache } = await chrome.storage.local.get([
    'youtubeInfoMap',
    'youtubeApiCache'
  ])
  console.log('DEBUG: youtubeInfoMap from storage:', youtubeInfoMap)

  console.log(
    'inside updatetabs function:',
    tabs,
    store.getState().tabs.selectedWindow
  )
  const processed = tabs
    .map((tab) => {
      const {
        active,
        audible,
        discarded,
        favIconUrl,
        id,
        index,
        mutedInfo,
        pinned,
        status,
        title,
        url,
        windowId,
        groupId
      } = tab
      if (url) {
        // Merge YouTube info if available
        let youtubeInfo =
          youtubeInfoMap && youtubeInfoMap[url]
            ? youtubeInfoMap[url]
            : undefined

        const isYoutubeUrl = url.includes('youtube.com/') || url.includes('youtu.be/')
        if (
          isYoutubeUrl && (!youtubeInfo || !youtubeInfo.duration)
        ) {
          const videoId = extractVideoId(url)
          if (videoId && youtubeApiCache && youtubeApiCache[videoId]) {
            const apiInfo = youtubeApiCache[videoId]
            youtubeInfo = {
              title: apiInfo.title || youtubeInfo?.title || 'Unknown Video',
              duration: apiInfo.duration || 0,
              currentTime: youtubeInfo?.currentTime || 0,
              paused: youtubeInfo?.paused ?? true,
              percentage: youtubeInfo?.percentage || 0
            }
          } else if (videoId) {
            // Trigger a fetch if we don't have the info yet
            console.log(
              `DEBUG: Triggering FETCH_YOUTUBE_API_INFO for videoId ${videoId} (url: ${url})`
            )
            chrome.runtime.sendMessage({
              type: 'FETCH_YOUTUBE_API_INFO',
              videoId
            })
          }
        }

        if (youtubeInfo) {
          console.log(`DEBUG: Found YouTube info for tab ${id}:`, youtubeInfo)
        }

        return {
          active,
          audible,
          discarded,
          favIconUrl,
          id,
          index,
          mutedInfo,
          pinned,
          status,
          title,
          url,
          groupId,
          windowId,
          youtubeInfo // Add youtubeInfo to the tab object
        }
      }
      return null
    })
    .filter(Boolean)
  // Update both active and filtered tabs so UI shows the list initially
  store.dispatch(updateActiveTabs(processed))
  store.dispatch(updateFilteredTabs(processed))
}

// Listen to tab events
chrome.tabs.onRemoved.addListener(() => updateTabs(getTabs, store))
chrome.tabs.onDetached.addListener(() => updateTabs(getTabs, store))
chrome.tabs.onCreated.addListener(() => updateTabs(getTabs, store))
chrome.tabs.onAttached.addListener(() => updateTabs(getTabs, store))
chrome.tabs.onUpdated.addListener(() => updateTabs(getTabs, store))
chrome.tabs.onMoved.addListener(() => updateTabs(getTabs, store))

// Listen to store changes for selectedWindow
let previousSelectedWindow = store.getState().tabs.selectedWindow
store.subscribe(() => {
  const currentSelectedWindow = store.getState().tabs.selectedWindow
  if (currentSelectedWindow !== previousSelectedWindow) {
    console.log(
      'Selected window changed:',
      previousSelectedWindow,
      '->',
      currentSelectedWindow
    )
    previousSelectedWindow = currentSelectedWindow
    updateTabs(getTabs, store)
  }
})

// Listen for YouTube info changes in storage
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.youtubeInfoMap) {
      const newValue = changes.youtubeInfoMap.newValue
      if (newValue) {
        // console.log('DEBUG: Storage changed youtubeInfoMap:', newValue);
        updateTabs(getTabs, store)
      }
    }
    if (changes.youtubeApiCache) {
      updateTabs(getTabs, store)
    }
  }
})

// Check and listen for YouTube permission
const checkYouTubePermission = () => {
  chrome.permissions.contains(
    { origins: ['https://*.youtube.com/*', 'http://*.youtube.com/*'] },
    (result) => {
      store.dispatch({ type: 'tabs/updateYouTubePermission', payload: result })
    }
  )
}

checkYouTubePermission()
chrome.permissions.onAdded.addListener(checkYouTubePermission)
chrome.permissions.onRemoved.addListener(checkYouTubePermission)

// Initial load
// Get current window ID and update store, then fetch tabs
chrome.windows.getCurrent().then((window) => {
  if (window.id) {
    store.dispatch({ type: 'tabs/updateSelectedWindow', payload: window.id })
    updateTabs(getTabs, store)
  } else {
    updateTabs(getTabs, store)
  }
})

const ActiveTabs = () => {
  usePageTracking('/tabs', 'Active Tabs')
  console.log('ActiveTabs rendered')
  const dispatch = useDispatch<AppDispatch>()
  // @ts-ignore
  const { tabs } = useSelector((state: any) => state.tabs)
  const { drawerOpen, settings: aiSettings, status, isLoading: aiLoading } = useSelector((state: RootState) => state.ai)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
  useEffect(() => {
    const checkAI = async () => {
      try {
        const service = await getAIService()
        const status = await service.getStatus()
        dispatch(setProviderStatus(status))
      } catch (e) {
        dispatch(setProviderStatus({ connected: false, error: 'AI Service unavailable' }))
      }
    }
    checkAI()
  }, [dispatch])

  const navigation = useMemo(
    () => <Navigation tabCount={tabs.length} />,
    [tabs]
  )
  return (
    <div className="flex h-[100vh] relative overflow-hidden">
      <Sidebar
        currentPage="tabs"
        collapsed={sidebarCollapsed}
        onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
        onAIClick={() => dispatch(toggleDrawer())}
        aiEnabled={status?.connected}
      />
      <div className="flex flex-col flex-1">
        <Header
          sidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          navigation={<Navigation tabCount={tabs.length} />}
        >
          <Search />
        </Header>
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <TabWindowWrapper />
        </div>
      </div>

      {/* AI Drawer */}
      <AIDrawer
        open={drawerOpen}
        onClose={() => dispatch(toggleDrawer())}
        isLoading={aiLoading}
      />

      {/* Floating AI trigger button */}
      <div className="fixed bottom-4 right-4 z-30">
        <AIProviderBadge
          onClick={() => dispatch(toggleDrawer())}
          status={status}
          active={drawerOpen}
        />
      </div>
    </div>
  )
}
export default ActiveTabs

