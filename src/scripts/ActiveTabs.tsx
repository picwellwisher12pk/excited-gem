import { useMemo, useState, useEffect } from 'react'
import { useSelector, useDispatch } from 'react-redux'
import debounce from 'lodash/debounce'

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

export async function updateTabs(getTabsFunc: any, appStore: any) {
  const tabs = await getTabsFunc(appStore.getState().tabs.selectedWindow)

  // Fetch YouTube info from storage
  const { youtubeInfoMap, youtubeApiCache } = await chrome.storage.local.get([
    'youtubeInfoMap',
    'youtubeApiCache'
  ])

  const processed = tabs
    .map((tab: any) => {
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

        const isYoutubeUrl =
          url.includes('youtube.com/') || url.includes('youtu.be/')
        if (isYoutubeUrl && (!youtubeInfo || !youtubeInfo.duration)) {
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
            chrome.runtime.sendMessage({
              type: 'FETCH_YOUTUBE_API_INFO',
              videoId
            })
          }
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
          youtubeInfo
        }
      }
      return null
    })
    .filter(Boolean)

  // Update both active and filtered tabs so UI shows the list initially
  appStore.dispatch(updateActiveTabs(processed))
  appStore.dispatch(updateFilteredTabs(processed))
}

export const debouncedUpdateTabs = debounce(
  () => {
    updateTabs(getTabs, store)
  },
  150,
  { maxWait: 500, leading: false, trailing: true }
)

// Listen to tab events
chrome.tabs.onRemoved.addListener(debouncedUpdateTabs)
chrome.tabs.onDetached.addListener(debouncedUpdateTabs)
chrome.tabs.onCreated.addListener(debouncedUpdateTabs)
chrome.tabs.onAttached.addListener(debouncedUpdateTabs)
chrome.tabs.onUpdated.addListener(debouncedUpdateTabs)
chrome.tabs.onMoved.addListener(debouncedUpdateTabs)

// Listen to store changes for selectedWindow
let previousSelectedWindow = store.getState().tabs.selectedWindow
store.subscribe(() => {
  const currentSelectedWindow = store.getState().tabs.selectedWindow
  if (currentSelectedWindow !== previousSelectedWindow) {
    previousSelectedWindow = currentSelectedWindow
    debouncedUpdateTabs()
  }
})

// Listen for YouTube info changes in storage
chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local') {
    if (changes.youtubeInfoMap || changes.youtubeApiCache) {
      debouncedUpdateTabs()
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
  const dispatch = useDispatch<AppDispatch>()
  const { tabs } = useSelector((state: any) => state.tabs)
  const {
    drawerOpen,
    status,
    isLoading: aiLoading
  } = useSelector((state: RootState) => state.ai)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)

  useEffect(() => {
    const checkAI = async () => {
      try {
        const service = await getAIService()
        const providerStatus = await service.getStatus()
        dispatch(setProviderStatus(providerStatus))
      } catch {
        dispatch(
          setProviderStatus({
            connected: false,
            error: 'AI Service unavailable'
          })
        )
      }
    }
    checkAI()
  }, [dispatch])

  const openAISettings = () => {
    chrome.tabs.create({ url: chrome.runtime.getURL('tabs/settings.html#ai') })
  }

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
          navigation={navigation}
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
        onOpenSettings={openAISettings}
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
