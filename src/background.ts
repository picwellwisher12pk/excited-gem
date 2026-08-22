import {
  getTabs,
  setBadge,
  setTabCountInBadge
} from './scripts/browserActions'
import { preferences } from './scripts/defaultPreferences'
import { extractVideoId, parseIsoDuration } from './utils/youtube'
import debounce from 'lodash/debounce'


console.log("DEBUG: Background script loaded");

function onRemoved(tabId, removeInfo) {
  getTabs().then((tabs) => {
    // window.tabs = tabs;
  })
}

chrome.runtime.onInstalled.addListener(() => {
  let jsonObj = {}
  jsonObj['preferences'] = preferences
  chrome.storage.local.set(jsonObj).then((result) => {
    chrome.storage.local.get('preferences').then((result) => {})
  })
  getTabs('current').then((tabs) => setBadge(tabs.length))
})
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
  console.log('Excited Gem: Tab Removed/Closed.')
  onRemoved(tabId, removeInfo)
  setTabCountInBadge(tabId, true)
})

chrome.tabs.onDetached.addListener(onRemoved)

chrome.tabs.onCreated.addListener((tab) => {
  getTabs('current').then((tabs) => setBadge(tabs.length))
  if (tab.url) handleTabForYouTubeApi(tab.url);
})
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.url) {
    handleTabForYouTubeApi(changeInfo.url);
  }
})

chrome.tabs.onAttached.addListener(() => {
  getTabs('current').then((tabs) => setBadge(tabs.length))
})

/* Chrome Actions */

async function openInTab(url: string, mode: 'single' | 'per-window', currentWindowId: number) {
  if (mode === 'single') {
    const tabs = await chrome.tabs.query({ url });
    if (tabs.length > 0) {
      const tab = tabs[0];
      if (tab.id) {
        await chrome.tabs.update(tab.id, { active: true });
        await chrome.windows.update(tab.windowId, { focused: true });
      }
      return;
    }
  } else {
    // per-window
    const tabs = await chrome.tabs.query({ url, windowId: currentWindowId });
    if (tabs.length > 0) {
      if (tabs[0].id) {
        await chrome.tabs.update(tabs[0].id, { active: true });
      }
      return;
    }
  }

  // If not found, create
  await chrome.tabs.create({ url, pinned: true });
}

chrome.action.onClicked.addListener(async (tab) => {
  // If openPanelOnActionClick is true (sidebar mode), this listener will NOT fire.
  // If popup is set (popup mode), this listener will NOT fire.
  // So this only fires for 'tab' mode or fallback.
  const { tabManagementMode = 'single' } = await chrome.storage.local.get(['tabManagementMode']);
  const extensionUrl = chrome.runtime.getURL('/tabs/home.html');

  console.log('DEBUG: onClicked fired. Assuming Tab Mode.');
  await openInTab(extensionUrl, tabManagementMode, tab.windowId);
});

// Store YouTube video information by tab ID
const youtubeVideoInfo = new Map<number, any>();
const youtubeApiCache = new Map<string, any>();

// Restore state from storage on startup
chrome.storage.local.get(['youtubeInfoMap', 'youtubeApiCache']).then(({ youtubeInfoMap, youtubeApiCache: savedCache }) => {
  if (youtubeInfoMap) {
    Object.entries(youtubeInfoMap).forEach(([url, info]) => {
      youtubeVideoInfo.set(url, info);
    });
    console.log('DEBUG: Restored youtubeVideoInfo from storage:', youtubeVideoInfo);
  }
  if (savedCache) {
    Object.entries(savedCache).forEach(([videoId, info]) => {
      youtubeApiCache.set(videoId, info);
    });
    console.log('DEBUG: Restored youtubeApiCache from storage:', youtubeApiCache);
  }
});

async function fetchYouTubeApiInfo(videoId: string) {
  if (youtubeApiCache.has(videoId)) {
    const cached = youtubeApiCache.get(videoId)!;
    if (Date.now() - cached.timestamp < 24 * 60 * 60 * 1000) {
      return cached;
    }
  }

  const { youtubeApiKey: customApiKey } = await chrome.storage.local.get('youtubeApiKey');
  const apiKey = customApiKey || process.env.PLASMO_PUBLIC_YOUTUBE_API_KEY;
  if (!apiKey || apiKey === "YOUR_YOUTUBE_API_KEY_HERE" || apiKey === "") return null;

  try {
    const res = await fetch(`https://www.googleapis.com/youtube/v3/videos?id=${videoId}&part=snippet,contentDetails&key=${apiKey}`);
    const data = await res.json();
    if (data.items && data.items.length > 0) {
      const item = data.items[0];
      const title = item.snippet.title;
      const durationStr = item.contentDetails.duration;
      const duration = parseIsoDuration(durationStr);

      const info = { title, duration, timestamp: Date.now() };
      youtubeApiCache.set(videoId, info);
      chrome.storage.local.set({ youtubeApiCache: Object.fromEntries(youtubeApiCache) });
      return info;
    }
  } catch (e) {
    console.error("DEBUG: Failed to fetch YT API", e);
  }
  return null;
}

function handleTabForYouTubeApi(url?: string) {
  if (url && url.includes('youtube.com/watch')) {
    const videoId = extractVideoId(url);
    if (videoId) {
      fetchYouTubeApiInfo(videoId);
    }
  }
}


// Listen for messages from content scripts
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
// Handle messages from YouTube content script
  if (message.type === "YOUTUBE_VIDEO_INFO" && message.url) {
    // console.log("DEBUG: Background received YOUTUBE_VIDEO_INFO", message.data);
    const url = message.url;
    youtubeVideoInfo.set(url, message.data);

    // Store in local storage so UI components can pick it up
    chrome.storage.local.set({ youtubeInfoMap: Object.fromEntries(youtubeVideoInfo) });
  }

  // Handle requests for YouTube info
  if (message.type === "GET_ALL_YOUTUBE_INFO") {
    sendResponse(Array.from(youtubeVideoInfo.entries()));
    return true;
  }
});

// Clean up data when tabs are closed (debounced to avoid storage write storms)
const debouncedCleanupYouTubeInfo = debounce(async () => {
  try {
    const tabs = await chrome.tabs.query({});
    const activeUrls = new Set(tabs.map(t => t.url).filter(Boolean));
    let changed = false;
    for (const url of youtubeVideoInfo.keys()) {
      if (!activeUrls.has(url)) {
        youtubeVideoInfo.delete(url);
        changed = true;
      }
    }
    if (changed) {
      chrome.storage.local.set({ youtubeInfoMap: Object.fromEntries(youtubeVideoInfo) });
    }
  } catch (e) {
    console.error('Error cleaning up youtubeVideoInfo', e);
  }
}, 300);

chrome.tabs.onRemoved.addListener(() => {
  debouncedCleanupYouTubeInfo();
});

// Update Action Popup state based on settings
// Update Action Popup and SidePanel behavior based on settings
const updateActionState = async (mode: string) => {
  console.log('DEBUG: Updating action state to:', mode);

  // 1. Configure SidePanel Behavior (if supported)
  // @ts-ignore
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    try {
      // @ts-ignore
      await chrome.sidePanel.setPanelBehavior({
        openPanelOnActionClick: mode === 'sidebar'
      });
      console.log('DEBUG: setPanelBehavior success');
    } catch (e) {
      console.error('DEBUG: setPanelBehavior failed', e);
    }
  }

  // 2. Configure Popup
  if (mode === 'popup') {
    await chrome.action.setPopup({ popup: 'tabs/home.html' });
  } else {
    // For 'sidebar' (native open) or 'tab' (handled by onClicked), remove popup
    await chrome.action.setPopup({ popup: '' });
  }
};

chrome.storage.local.get('displayMode').then(({ displayMode }) => {
  updateActionState(displayMode || 'sidebar');
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.displayMode) {
    updateActionState(changes.displayMode.newValue);
  }
});

// Dynamic Content Script Registration removed as we are using host_permissions and static declaration
