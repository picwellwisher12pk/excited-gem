import { saveTabs, saveURLs } from '~/components/getsetSessions'
import { batchRemoveTabs, batchMoveTabs, batchUpdateTabs, batchDiscardTabs } from '~/utils/bulkOperations'


export const HOMEPAGEURL = chrome.runtime.getURL('/tabs/home.html')
let refinedTabs

export const ignoredUrlPatterns = [
  'chrome://*',
  'chrome-extension://*',
  'http(s)?://localhost*'
]
export let ignoredDataKeys = [
  'active',
  'autoDiscardable',
  'discarded',
  'height',
  'highlighted',
  'id',
  'index',
  'selected',
  'status',
  'width',
  'windowId'
]
let sortDelay = 250

export function compareURL(a, b) {
  log('URL', a.url.slice(1, 30), b.url.slice(1, 30))
  if (a.url < b.url) return -1
  if (a.url > b.url) return 1
  return 0
}

export function compareTitle(a, b) {
  if (a.title.toLowerCase() < b.title.toLowerCase()) return -1
  if (a.title.toLowerCase() > b.title.toLowerCase()) return 1
  return 0
}

export function matchKeys(property, keysToRemove) {
  for (let i = 0; i < keysToRemove.length; i++) {
    if (property === keysToRemove[i]) return true
  }
}

export function removeKeys(keysToRemove, object) {
  var tempObject = {}
  for (let property in object) {
    if (matchKeys(property, keysToRemove)) continue
    tempObject[property] = object[property]
  }
  return tempObject
}

/**
 * [saveData description]
 * @param  {String/Object/Array} data    [description]
 * @param  {String} message [description]
 */
export function saveData(data, message = 'Data saved') {
  chrome.storage.local.set(data, () => {
    chrome.notifications.create(
      'reminder',
      {
        type: 'basic',
        iconUrl: '../images/extension-icon48.png',
        title: 'Data saved',
        message: message
      },
      () =>
      // notificationId
      {
      }
    )
  })
}

// Warn if overriding existing method
if (Array.prototype.equals)
  console.warn(
    "Overriding existing Array.prototype.equals. Possible causes: New API defines the method, there's a framework conflict or you've got double inclusions in your code."
  )
// attach the .equals method to Array's prototype to call it on any array
Array.prototype.equals = (array) => {
  // if the other array is a falsy value, return
  if (!array) return false

  // compare lengths - can save a lot of time
  if (this.length !== array.length) return false

  for (var i = 0, l = this.length; i < l; i++) {
    // Check if we have nested arrays
    if (this[i] instanceof Array && array[i] instanceof Array) {
      // recurse into the nested arrays
      if (!this[i].equals(array[i])) return false
    } else if (this[i] !== array[i]) {
      // Warning - two different object instances will never be equal: {x:20} != {x:20}
      return false
    }
  }
  return true
}

export function arraysAreIdentical(arr1, arr2) {
  if (arr1.length !== arr2.length) return false
  for (var i = 0, len = arr1.length; i < len; i++) {
    if (arr1[i] !== arr2[i]) {
      return false
    }
  }
  return true
}

//Takes an array of object and make an plain array out of for a given property
// export function objectToArray(array, property) {
//     let newArray = [];
//     for (let i = 0; i < array.length; i++) {
//         newArray.push(array[i][property]);
//     }
//     return newArray;
// }
// //Takes an array of object and make an plain array out of for a given property
// export function propertyToArray(array, property) {
//     objectToArray(array, property);
// }
//Takes an array of object and make an plain array out of for a given property
export function propertyToArray(array, property) {
  let newArray = []
  for (let i = 0; i < array.length; i++) {
    newArray.push(array[i][property])
  }
  return newArray
}

// Hide method from for-in loops
Object.defineProperty(Array.prototype, 'equals', { enumerable: false })

// module.exports = general;
export function hasClass2(elem, className) {
  return elem.className.split(' ').indexOf(className) > -1
}

// export function getCurrentURL() {
//   let currentURL = '';
//   currentURL = window.location.pathname;
//   if (currentURL.indexOf('session') > -1) {
//     return 'sessions';
//   }
//   if (currentURL.indexOf('options') > -1) {
//     return 'options';
//   }
//   if (currentURL.indexOf('tabs') > -1) {
//     return 'tabs';
//   }
// }
export function setValue(object, path, value) {
  var a = path.split('.')
  var o = object
  for (var i = 0; i < a.length - 1; i++) {
    var n = a[i]
    if (n in o) {
      o = o[n]
    } else {
      o[n] = {}
      o = o[n]
    }
  }
  o[a[a.length - 1]] = value
}

export function getValue(object, path) {
  var o = object
  path = path.replace(/\[(\w+)]/g, '.$1')
  path = path.replace(/^\./, '')
  var a = path.split('.')
  while (a.length) {
    var n = a.shift()
    if (n in o) {
      o = o[n]
    } else {
      return
    }
  }
  return o
}

export function log() {
  let trace = false
  if (window.development || window.debug) {
    console.group(arguments[0])
    console.log(Array.prototype.slice.call(arguments))
    trace ? console.trace() : ''
    console.groupEnd()
  }
}

// export function log(){
//   log.history = log.history || [];   // store logs to an array for reference
//   log.history.push(arguments);
//   if(console){
//     log( Array.prototype.slice.call(arguments) );
//   }
// }

// export function highlightCurrentNavLink() {
//   var currentPage = getCurrentURL();
//   if (currentPage == 'tabs') $('ul.nav.navbar-nav li.tabs').toggleClass('active');
//   if (currentPage == 'options') $('ul.nav.navbar-nav li.options').toggleClass('active');
//   if (currentPage == 'sessions') $('ul.nav.navbar-nav li.sessions').toggleClass('active');
// }

export function timeConverter(UNIX_timestamp) {
  var date = new Date(UNIX_timestamp)
  var options = {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }
  return date.toLocaleDateString('en-US', options)
}

// Hide method from for-in loops
Object.defineProperty(Array.prototype, 'equals', { enumerable: false })

function quicksort(sortby, array) {
  log('quicksort array', array)
  if (array.length <= 1) return array
  let pivot = array[0]
  let left = []
  let right = []
  for (let i = 1; i < array.length; i++) {
    array[i][sortby] < pivot[sortby]
      ? left.push(array[i])
      : right.push(array[i])
  }
  log('left:', left, 'right:', right)
  return quicksort(sortby, left).concat(pivot, quicksort(sortby, right))
}

function hasClass(el, className) {
  if (el.classList) return el.classList.contains(className)
  return !!el.className.match(new RegExp('(\\s|^)' + className + '(\\s|$)'))
}

export function addClass(el, className) {
  if (el.classList) el.classList.add(className)
  else if (!hasClass(el, className)) el.className += ' ' + className
}

export function removeClass(el, className) {
  if (el.classList) el.classList.remove(className)
  else if (hasClass(el, className)) {
    var reg = new RegExp('(\\s|^)' + className + '(\\s|$)')
    el.className = el.className.replace(reg, ' ')
  }
}

export function sortTabs(sortby, tabs) {
  return new Promise((resolve) => {
    let tabsList = quicksort(sortby, tabs)
    log('after quicksort', tabsList)
    tabsList.forEach((tab, i) => {
      setTimeout(() => {
        chrome.tabs.move(tab.id, { index: i })
      }, sortDelay)
      console.log('sorting: still moving')
    })
    resolve(true)
  })
}

/*function runQuery(query){
  let query = 'table#searchResult tbody td';
  chrome.runtime.sendMessage(query);
  return query;
}*/
export function santizeTabs(tabs, ignoredUrlPatterns) {
  refinedTabs = tabs.filter((tab) => {
    ignoredUrlPatterns
    let url = tab.url
    let pattern = new RegExp(ignoredUrlPatterns.join('|'), 'i')
    // log(url,pattern,matched);
    return url.match(pattern) == null
  })
  return refinedTabs
}

// state = { ...props };
// state = {
//   selectedTabs: [],
//   allMuted: false,
//   allSelected: false,
//   allPinned: false,
// };

// closeTab = closeTab.bind(this);
// toggleMute = toggleMute.bind(this);
// isAllMuted = isAllMuted.bind(this);
// onDragEnd = onDragEnd.bind(this);
// updateSelectedTabs = updateSelectedTabs.bind(this);
// setPreferences = setPreferences.bind(this);
// processSelectedTabs = processSelectedTabs.bind(this);
// togglePin = togglePin.bind(this);

// componentDidMount(a, b) {
//   setState({ allMuted: isAllMuted() });
//   setState({ allPinned: isAllPinned() });
//   setState({ allSelected: isAllSelected() });
//   setState({ preferences: props.preferences });
// }

//Creating SelectedTabs status
// updateSelectedTabs(id, selected) {
//   let tempArray = props.selectedTabs;
//   !selected ? tempArray.splice(tempArray.indexOf(id), 1) : tempArray.push(id);
//   tempArray.length > 0
//     ? addClass(document.querySelector('#selection-action'), 'selection-active')
//     : removeClass(document.querySelector('#selection-action'), 'selection-active');
//   props.updateSelectedTabsAction(tempArray);
// }
// isAllSelected() {
//   for (let tab of props.tabs) {
//     if (!tab.checked) return false;
//   }
//   return true;
// }
//Close

//Pinned
// const pinTab = (tabId) => {
//   console.info("pinning");
//   chrome.tabs.update(tabId, {pinned: true});
//   getTabs().then(
//     (tabs) => {
//       setState({tabs});
//     },
//     (error) => log(`Error: ${error}`)
//   );
// };
// const unpinTab = (tabId) => {
//   console.info("unpinning");
//   chrome.tabs.update(tabId, {pinned: false});
//   getTabs().then(
//     (tabs) => {
//       setState({tabs});
//     },
//     (error) => log(`Error: ${error}`)
//   );
// };
// const togglePin = (tabId) => {
//   let tabTemp = props.tabs.filter((tab) => tab.id === tabId);
//   tabTemp[0].pinned ? unpinTab(tabId) : pinTab(tabId);
// };
// isAllPinned() {
//   for (let tab of props.tabs) {
//     if (!tab.pinned) return false;
//   }
//   return true;
// }
//Muted or Not
// muteTab(id) {
//   chrome.tabs.update(parseInt(id), { muted: true });
// }
// unmuteTab(id) {
//   chrome.tabs.update(parseInt(id), { muted: false });
// }
// const toggleMute = (id) => {
//   chrome.tabs.get(id).then((tab) => {
//     chrome.tabs.update(parseInt(id), {muted: !tab.mutedInfo.muted});
//   });
//   props.updateActiveTabs();
// };
// isAllMuted() {
//   // const tabs = props.tabs.then(tabs => tabs);
//   for (let tab of props.tabs) {
//     if (!tab.mutedInfo.muted) return false;
//   }
//   return true;
// }
export async function processTabs(action, selection, state, setState) {
  const selectedTabs = {}
  state
    ?.filter((tab) => selection.includes(tab.id))
    .forEach((tab) => {
      selectedTabs[tab.id] = tab
    })

  const numericIds = selection.map(Number)

  switch (action) {
    case 'closeSelected': {
      let message = 'Are you sure you want to close selected tabs'
      if (state && selection.length === state.length) {
        message = 'Are you sure you want to close all the tabs? This will also close this window.'
      }
      const userPermission = confirm(message)
      if (!userPermission) return false
      await batchRemoveTabs(numericIds)
      if (typeof setState === 'function') setState()
      break
    }
    case 'toNewWindow': {
      if (numericIds.length === 0) break
      const firstTab = numericIds[0]
      const otherTabs = numericIds.slice(1)
      const windowInfo = await chrome.windows.create({ tabId: firstTab, focused: true })
      if (otherTabs.length > 0 && windowInfo?.id) {
        await batchMoveTabs(otherTabs, { windowId: windowInfo.id, index: -1 })
      }
      break
    }
    case 'toSession':
      saveTabs(
        selection.map((selectedTab) =>
          state.tabs?.find((o) => selectedTab === o.id) || state.find?.((o) => selectedTab === o.id)
        ).filter(Boolean)
      )
      break
    case 'save':
      saveURLs(
        selection.map((selectedTab) =>
          state.tabs?.find((o) => selectedTab === o.id) || state.find?.((o) => selectedTab === o.id)
        ).filter(Boolean)
      )
      break
    case 'pinSelected':
      await batchUpdateTabs(numericIds, { pinned: true })
      break
    case 'unpinSelected':
      await batchUpdateTabs(numericIds, { pinned: false })
      break
    case 'togglePinSelected': {
      const toPin = numericIds.filter(id => !selectedTabs[id]?.pinned)
      const toUnpin = numericIds.filter(id => selectedTabs[id]?.pinned)
      if (toPin.length > 0) await batchUpdateTabs(toPin, { pinned: true })
      if (toUnpin.length > 0) await batchUpdateTabs(toUnpin, { pinned: false })
      break
    }
    case 'muteSelected':
      await batchUpdateTabs(numericIds, { muted: true })
      break
    case 'unmuteSelected':
      await batchUpdateTabs(numericIds, { muted: false })
      break
    case 'toggleMuteSelected': {
      const toMute = numericIds.filter(id => !selectedTabs[id]?.mutedInfo?.muted)
      const toUnmute = numericIds.filter(id => selectedTabs[id]?.mutedInfo?.muted)
      if (toMute.length > 0) await batchUpdateTabs(toMute, { muted: true })
      if (toUnmute.length > 0) await batchUpdateTabs(toUnmute, { muted: false })
      break
    }
    case 'discardSelected':
      await batchDiscardTabs(numericIds)
      break
  }
}

// setPreferences(prefSection, key, value) {
//   chrome.storage.local.get('preferences').then(result => {
//     let jsonObj = result;
//     jsonObj['preferences'][prefSection][key] = value;
//     chrome.storage.local.set(jsonObj).then(() => {
//       chrome.notifications.create(
//         'reminder',
//         {
//           type: 'basic',
//           iconUrl: '../images/logo.png',
//           title: 'Settings Saved',
//           message: 'Search settings updated',
//         },
//         function(notificationId) {}
//       );
//     });
//   });
// }

/**
 * Given a search term, audible search, pinned search, and search in, return a
 * filtered list of tabs
 * @param tabs - The array of tabs to filter.
 * @returns A promise that resolves to an array of filtered tabs.
 */
export const asyncFilterTabs = async (
  { searchTerm, audibleSearch, pinnedSearch, searchIn },
  { ignoreCase, regex },
  tabs
) => {
  return await new Promise(async (resolve) => {
    if (searchTerm === '' && !audibleSearch && !pinnedSearch) {
      resolve(tabs)
      return
    }
    const filteredTabs = reduceTabs(
      { searchTerm, audibleSearch, pinnedSearch, searchIn },
      { ignoreCase, regex },
      tabs
    )
    resolve(filteredTabs)
  })
}

/**
 * If the search term is empty, return all tabs. If the search term is not empty,
 * filter the tabs by whether they match the search term in the title or the URL
 * @param tabs - The list of tabs to filter.
 * @returns The filtered tabs.
 */
export const filterTabs = (
  { searchTerm, audibleSearch, pinnedSearch, searchIn },
  { ignoreCase, regex },
  tabs
) => {
  let filteredTabs = tabs?.filter(({ title, url, audible, pinned }) => {
    const isAudible = audibleSearch ? audible === true : true
    const isPinned = pinnedSearch ? pinned === true : true
    if (regex) {
      /* If the search term is found in the title or the URL, and the site is
      audible and pinned, return true. */
      try {
        let regexTest = new RegExp(searchTerm, ignoreCase ? 'i' : '')
        if (searchIn[0] && regexTest.test(title) && isAudible && isPinned)
          return true
        if (searchIn[1] && regexTest.test(url) && isAudible && isPinned)
          return true
      } catch (error) {
        console.error('Search error:', error)
      }
    } else {
      if (searchIn[0] && !ignoreCase)
        return title.includes(searchTerm) && isAudible && isPinned
      if (searchIn[0] && ignoreCase)
        return (
          title.toLowerCase().includes(searchTerm.toLowerCase()) &&
          isAudible &&
          isPinned
        )
      if (searchIn[1])
        return (
          url.toLowerCase().includes(searchTerm.toLowerCase()) &&
          isAudible &&
          isPinned
        )
    }
  })

  return filteredTabs
}
/**
 * It takes a search term, a list of searchIn options, and a list of tabs, and
 * returns a list of tabs that match the search term
 * @param tabs - The array of tabs to search through.
 * @returns An array of tab objects.
 */
export const reduceTabs = (
  { searchTerm, audibleSearch, pinnedSearch, searchIn },
  { ignoreCase, regex },
  tabs
) => {
  console.time('reduceTabs')
  if (!tabs) return [];

  // Pre-calculate search criteria
  let searchRegex;
  let lowerSearchTerm;

  if (regex) {
    try {
      searchRegex = new RegExp(searchTerm, ignoreCase ? 'i' : '');
    } catch (error) {
      console.error('Invalid Regex:', error);
      return []; // Return empty or original tabs? Returning empty on invalid regex seems safer to indicate error
    }
  } else if (ignoreCase) {
    lowerSearchTerm = searchTerm.toLowerCase();
  }

  const reducedTabs = tabs.filter((tab) => {
    const { title, url, audible, pinned } = tab;

    // 1. Filter by properties (Audible/Pinned)
    // Optimization: Check these boolean flags first as they are faster than string matching
    if (audibleSearch && !audible) return false;
    if (pinnedSearch && !pinned) return false;

    // 2. Filter by Search Term
    // If no search term, we keep it (assuming the caller handles empty search check, but good to be safe)
    if (!searchTerm) return true;

    let matchesTitle = false;
    let matchesUrl = false;

    if (regex) {
      if (searchIn.title) matchesTitle = searchRegex.test(title);
      // Optimization: If title matched and we don't need to know specifically which one matched, we can stop here.
      // But if we need to check URL only if title didn't match:
      if (!matchesTitle && searchIn.url) matchesUrl = searchRegex.test(url);
    } else {
      if (ignoreCase) {
        if (searchIn.title) matchesTitle = title.toLowerCase().includes(lowerSearchTerm);
        if (!matchesTitle && searchIn.url) matchesUrl = url.toLowerCase().includes(lowerSearchTerm);
      } else {
        if (searchIn.title) matchesTitle = title.includes(searchTerm);
        if (!matchesTitle && searchIn.url) matchesUrl = url.includes(searchTerm);
      }
    }

    return matchesTitle || matchesUrl;
  });

  console.timeEnd('reduceTabs')
  return reducedTabs
}

export const getMetrics = (compName, mode, actualTime, baseTime) => {
  // requestAnimationFrame(() => {
  //   document.getElementById("demo").innerText = `
  //    ComponnentId: ${compName}
  //    Mode:         ${mode}
  //    BaseTime:     ${baseTime}
  //    ActualTime:   ${actualTime}
  //   `;
  // });
  console.log(compName, mode, actualTime, baseTime)
}

export function updateTabs(getTabs, store) {
  getTabs().then((tabs) => {
    store.dispatch(updateActiveTabs(tabs))
  })
}

export const profilerCallback = (
  id,
  phase,
  actualDuration,
  baseDuration,
  startTime,
  commitTime,
  interactions
) => {
  console.log(
    'id:',
    id,
    'phase:',
    phase,
    'actualDuration:',
    actualDuration,
    'baseDuration:',
    baseDuration,
    'startTime:',
    startTime,
    'commitTime:',
    commitTime,
    'interactions:',
    interactions
  )
}
export const makePlaceholder = (searchIn, regex = false) => {
  let placeholder = 'Search in '
  placeholder += searchIn.title ? 'Titles' : ''
  placeholder += searchIn.title && searchIn.url ? ' and ' : ''
  placeholder += searchIn.url ? 'URLs' : ''
  return regex ? `${placeholder} using regular expression` : placeholder
}

export function getCurrentWindow() {
  return chrome.windows.getCurrent({ populate: true })
}

export function getAllWindows() {
  return chrome.windows.getAll({
    populate: true,
    windowTypes: ['normal']
  })
}
