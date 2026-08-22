import { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'

// import { profilerCallback } from "/src/scripts/general"
import store from '~/store/store'
import { updateActiveTabs, updateFilteredTabs } from '~/store/tabSlice'
import { getTabs } from "~/scripts/browserActions"
import { extractVideoId } from '~/utils/youtube'


import '~/assets/logo.svg'
import '~/assets/dev-logo.svg'

import TabWindowWrapper from './TabWindowWrapper'
import Header from '~/components/Header/Header'
import Navigation from '~/components/Header/Navigation'
import Search from '~/components/Search'
import Sidebar from '~/components/Sidebar'
import { usePageTracking } from '~/components/Analytics/usePageTracking'

export async function updateTabs(getTabs, store) {
  const tabs = await getTabs(store.getState().tabs.selectedWindow);

  // Fetch YouTube info from storage
  const { youtubeInfoMap, youtubeApiCache } = await chrome.storage.local.get(['youtubeInfoMap', 'youtubeApiCache']);
  console.log('DEBUG: youtubeInfoMap from storage:', youtubeInfoMap);

  console.log(
    'inside updatetabs function:',
    tabs,
    store.getState().tabs.selectedWindow
  )
  const processed = tabs.map((tab) => {
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
      let youtubeInfo = youtubeInfoMap && youtubeInfoMap[url] ? youtubeInfoMap[url] : undefined;

      if (!youtubeInfo && url.includes('youtube.com/watch')) {
        const videoId = extractVideoId(url);
        if (videoId && youtubeApiCache && youtubeApiCache[videoId]) {
          const apiInfo = youtubeApiCache[videoId];
          youtubeInfo = {
            title: apiInfo.title,
            duration: apiInfo.duration,
            currentTime: 0,
            paused: true,
            percentage: 0
          };
        }
      }

      if (youtubeInfo) {
        console.log(`DEBUG: Found YouTube info for tab ${id}:`, youtubeInfo);
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
  }).filter(Boolean)
  // Update both active and filtered tabs so UI shows the list initially
  store.dispatch(updateActiveTabs(processed))
  store.dispatch(updateFilteredTabs(processed))
}

import debounce from 'lodash/debounce'

export const debouncedUpdateTabs = debounce(() => {
  updateTabs(getTabs, store)
}, 150, { maxWait: 500, leading: false, trailing: true })

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
    console.log('Selected window changed:', previousSelectedWindow, '->', currentSelectedWindow)
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
  chrome.permissions.contains({ origins: ["https://*.youtube.com/*", "http://*.youtube.com/*"] }, (result) => {
    store.dispatch({ type: 'tabs/updateYouTubePermission', payload: result });
  });
};

checkYouTubePermission();
chrome.permissions.onAdded.addListener(checkYouTubePermission);
chrome.permissions.onRemoved.addListener(checkYouTubePermission);

// Initial load
// Get current window ID and update store, then fetch tabs
chrome.windows.getCurrent().then(window => {
  if (window.id) {
    store.dispatch({ type: 'tabs/updateSelectedWindow', payload: window.id });
    updateTabs(getTabs, store);
  } else {
    updateTabs(getTabs, store);
  }
});

const ActiveTabs = () => {
  usePageTracking('/tabs', 'Active Tabs')
  console.log('ActiveTabs rendered')
  // @ts-ignore
  const { tabs } = useSelector((state) => state.tabs)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(true)
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
      />
      <div className="flex flex-col flex-1">
        <Header sidebarToggle={() => setSidebarCollapsed(!sidebarCollapsed)}>
          <Navigation tabCount={tabs.length} />
          <Search />
        </Header>
        <div className="flex-1 min-h-0 relative overflow-hidden">
          <TabWindowWrapper />
        </div>
      </div>
    </div>
  )
}
export default ActiveTabs
