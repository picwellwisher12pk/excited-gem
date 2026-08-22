

// import { HOMEPAGEURL } from "~/scripts/general"

export function getCurrentWindow() {
  return chrome.windows.getCurrent({ populate: true })
}
export function getAllWindows() {
  return chrome.windows.getAll({
    populate: true,
    windowTypes: ['normal']
  })
}
/**
 * Opens OneTab Main Page
 */
// export let _oneTabPageOpened = {
//   id: null,
//   windowId: null
// };
// function setHomePageOpened(newValue) {
//   window.homepageOpened = newValue;
// }
// export function openExcitedGemPage() {
//   if (window.homepageOpened === undefined || window.homepageOpened === null) {
//     chrome.tabs.create(
//       {
//         url: HOMEPAGEURL,
//         pinned: true
//       },
//       (tab) => (window.homepageOpened = tab)
//     )
//   } else {
//     chrome.tabs.update(window.homepageOpened.id, { selected: true })
//     //If OneTab Page is opened ,brings focus to it.
//   }
// }

// export function getCurrentWindowTabs() {
//   return chrome.tabs.query({ currentWindow: true })
// }

// export function getAllWindowTabs() {
//   return chrome.tabs.query({})
// }

export function getTabs(selectedWindow: string | number = 'current') {
  if (selectedWindow === 'current')
    return chrome.tabs.query({ currentWindow: true })
  if (selectedWindow === 'all') return chrome.tabs.query({})
  else {
    return chrome.tabs.query({ windowId: Number(selectedWindow) })
  }
}

/* export function updateTabs(reactObject = window.activeTabs) {
  let result =
    preferences.defaultTabsFrom === "current"
      ? getCurrentWindowTabs()
      : getAllWindowTabs()
  result.then((tabs) => {
    window.tabs = tabs
    console.log("inside updatetabs function:", tabs)
    reactObject.setState({
      tabs: tabs
    })
    // $('.active-tab-counter').text(tabs.length);
    // $('#allWindows span.count').text(tabs.length);

    // $('#currentWindow span.count').text(tabs.length);
    // if (tabs.length >= 50)  $('#currentWindow span.count, #allWindows span.count').toggleClass('label-success label-warning');
    // if (tabs.length >= 100)  $('#currentWindow span.count, #allWindows span.count').toggleClass('label-success label-danger');
  })
} */

export function setBadge(length) {
  chrome.action.setBadgeText({ text: length.toString() })
  chrome.action.setBadgeBackgroundColor({
    color: length <= 50 ? 'green' : 'orange'
  })
}

export function setTabCountInBadge(tabId, isOnRemoved) {
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

/* export function registerMenus() {
  chrome.contextMenus.removeAll()
  // function createReadingListMenu(data) {
  //   for (let i = 0; i < data.length; i++) {
  //     let id = String(data[i].id);
  //     let name = data[i].name;
  //     console.log("id:", id, "name:", name);
  //     chrome.contextMenus.create({
  //       parentId: "showreadinglists",
  //       id: id,
  //       title: name,
  //       onclick() {},
  //     });
  //     chrome.contextMenus.create({
  //       parentId: "addreadinglists",
  //       id: id + "create",
  //       title: name,
  //       onclick() {},
  //     });
  //   }
  //
  //   console.log("menu", data);
  // }

  // chrome.contextMenus.create({
  //   "title": "Refresh Main Page",
  //   "onclick"() { streamTabs(ActiveTabsConnection); }
  // });
  // chrome.contextMenus.create({
  //     "title": "Send Current tab to list",
  //     "onclick" : tabToList ,
  //   });
  // chrome.contextMenus.create({
  //     "title": "Refresh Main Page including Ignored",
  //     "onclick" : sendToContent(true),
  //   });
  chrome.contextMenus.create({
    title: "Show Excited Gem Page"
    // "onclick": openExcitedGemPage
  })
  chrome.contextMenus.create({
    title: "Add to Reading Lists",
    id: "addreadinglists"
  })
  chrome.contextMenus.create({
    title: "Show Reading Lists",
    id: "showreadinglists"
  })

  // chrome.contextMenus.create({
  //     "title": "Run Query",
  //     "onclick" : runQuery,
  //   });
} */
