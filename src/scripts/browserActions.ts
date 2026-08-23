export function getCurrentWindow() {
  return chrome.windows.getCurrent({ populate: true })
}

export function getAllWindows() {
  return chrome.windows.getAll({
    populate: true,
    windowTypes: ['normal']
  })
}

export function getTabs(selectedWindow: string | number = 'current') {
  if (selectedWindow === 'current')
    return chrome.tabs.query({ currentWindow: true })
  if (selectedWindow === 'all') return chrome.tabs.query({})
  else {
    return chrome.tabs.query({ windowId: Number(selectedWindow) })
  }
}

export function setBadge(length: number) {
  chrome.action.setBadgeText({ text: length.toString() })
  chrome.action.setBadgeBackgroundColor({
    color: length <= 50 ? 'green' : 'orange'
  })
}

export function setTabCountInBadge(tabId: number, isOnRemoved?: boolean) {
  getTabs().then((tabs) => {
    let length = tabs.length
    if (
      isOnRemoved &&
      tabId &&
      tabs
        .map((t) => {
          return t.id
        })
        .includes(tabId)
    ) {
      length--
    }
    setBadge(length)
  })
}
