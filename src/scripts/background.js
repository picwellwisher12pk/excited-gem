// import { saveSessions, getSessions } from './components/getsetSessions.js';
// import packagedAndBroadcast from './components/communications.js';
// import { registerMenus, setTabCountInBadge } from "./components/browserActions.jsx";
// const {  setTabCountInBadge,updateTabs } = require('./components/browserActions.js');
// import './defaultPreferences';
// import browser from "@/node_modules/webextension-polyfill/dist/browser-polyfill.js";
// import * as browser from "webextension-polyfill";

// import { getTabs, setBadge, setTabCountInBadge } from "./browserActions.ts"
// import { preferences } from "./defaultPreferences"

// let muteAll = (data) => {
//   for (let i = 0; i < data.length; i++) {
//     browser.tabs.update(tabId, { muted: true });
//   }
// };

// let moveTab = (data) => {
//   tabId = parseInt(data.tabId);
//   position = parseInt(data.position);
//   browser.tabs.move(tabId, { index: position });
// };

// function onRemoved(tabId, removeInfo) {
//   getTabs().then((tabs) => {
//     // window.tabs = tabs;
//   })
// }

/**
 * [saveData description]
 * @param  {String/Object/Array} data    [description]
 * @param  {String} message [description]
 */
// let saveData = (data, message = "Data saved") => {
//   browser.storage.local.set(data, () => {
//     browser.notifications.create(
//       "reminder",
//       {
//         type: "basic",
//         iconUrl: "../images/extension-icon48.png",
//         title: "Data saved",
//         message: message,
//       },
//       (notificationId) => {}
//     );
//   });
// };

/* Events */
///////////
chrome.runtime.onInstalled.addListener(() => {
  // let jsonObj = {}
  // jsonObj["preferences"] = preferences
  // chrome.storage.local.set(jsonObj).then((result) => {
  //   chrome.storage.local.get("preferences").then((result) => {})
  // })
  // getTabs("current").then((tabs) => setBadge(tabs.length))
  console.log('Excited Gem: Extension Installed.')
})
chrome.tabs.onRemoved.addListener((tabId) => {
  // chrome.tabs.get(homepageOpened.id, () => {
  //   if (chrome.runtime.lastError) {
  //     setHomePageOpened(null);
  //     console.log(chrome.runtime.lastError.message);
  //   } else {
  //     // Tab exists
  //   }
  //   log('tab-closed:', tab);
  // });
  // console.log("Excited Gem: Tab Removed/Closed.")
  // onRemoved()
  // setTabCountInBadge(tabId, true)
})

// browser.tabs.onDetached.addListener(onRemoved)

// browser.tabs.onCreated.addListener(() => {
//   getTabs("current").then((tabs) => setBadge(tabs.length))
// })
// browser.tabs.onAttached.addListener(() => {
//   getTabs("current").then((tabs) => setBadge(tabs.length))
// })

/* Browser Actions */
/////////////////////

chrome.action.onClicked.addListener((tab) => {
  console.info('Extension Page opening')
  chrome.tabs
    .create({ url: chrome.runtime.getURL('popup.html'), pinned: true })
    .then((tab) => tab)
  // openExcitedGemPage();
})

// On clicking extension button opens EG homepage.

//Registering Menus
// registerMenus();
