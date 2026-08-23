import { saveTabs, saveURLs } from '../components/getsetSessions'
import {
  batchRemoveTabs,
  batchMoveTabs,
  batchUpdateTabs,
  batchDiscardTabs
} from '../utils/bulkOperations'

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
      () => {}
    )
  })
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

export function propertyToArray(array, property) {
  let newArray = []
  for (let i = 0; i < array.length; i++) {
    newArray.push(array[i][property])
  }
  return newArray
}

export function hasClass2(elem, className) {
  return elem.className.split(' ').indexOf(className) > -1
}

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

export function santizeTabs(tabs, ignoredUrlPatterns) {
  refinedTabs = tabs.filter((tab) => {
    let url = tab.url
    let pattern = new RegExp(ignoredUrlPatterns.join('|'), 'i')
    return url.match(pattern) == null
  })
  return refinedTabs
}

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
        message =
          'Are you sure you want to close all the tabs? This will also close this window.'
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
      const windowInfo = await chrome.windows.create({
        tabId: firstTab,
        focused: true
      })
      if (otherTabs.length > 0 && windowInfo?.id) {
        await batchMoveTabs(otherTabs, { windowId: windowInfo.id, index: -1 })
      }
      break
    }
    case 'toSession':
      saveTabs(
        selection
          .map(
            (selectedTab) =>
              state.tabs?.find((o) => selectedTab === o.id) ||
              state.find?.((o) => selectedTab === o.id)
          )
          .filter(Boolean)
      )
      break
    case 'save':
      saveURLs(
        selection
          .map(
            (selectedTab) =>
              state.tabs?.find((o) => selectedTab === o.id) ||
              state.find?.((o) => selectedTab === o.id)
          )
          .filter(Boolean)
      )
      break
    case 'pinSelected':
      await batchUpdateTabs(numericIds, { pinned: true })
      break
    case 'unpinSelected':
      await batchUpdateTabs(numericIds, { pinned: false })
      break
    case 'togglePinSelected': {
      const toPin = numericIds.filter((id) => !selectedTabs[id]?.pinned)
      const toUnpin = numericIds.filter((id) => selectedTabs[id]?.pinned)
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
      const toMute = numericIds.filter(
        (id) => !selectedTabs[id]?.mutedInfo?.muted
      )
      const toUnmute = numericIds.filter(
        (id) => selectedTabs[id]?.mutedInfo?.muted
      )
      if (toMute.length > 0) await batchUpdateTabs(toMute, { muted: true })
      if (toUnmute.length > 0) await batchUpdateTabs(toUnmute, { muted: false })
      break
    }
    case 'discardSelected':
      await batchDiscardTabs(numericIds)
      break
  }
}

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

export const filterTabs = (
  { searchTerm, audibleSearch, pinnedSearch, searchIn },
  { ignoreCase, regex },
  tabs
) => {
  let filteredTabs = tabs?.filter(({ title, url, audible, pinned }) => {
    const isAudible = audibleSearch ? audible === true : true
    const isPinned = pinnedSearch ? pinned === true : true
    if (regex) {
      try {
        let regexTest = new RegExp(searchTerm, ignoreCase ? 'i' : '')
        if (searchIn.title && regexTest.test(title) && isAudible && isPinned)
          return true
        if (searchIn.url && regexTest.test(url) && isAudible && isPinned)
          return true
      } catch (error) {
        return false
      }
    } else {
      const lowerSearchTerm = searchTerm.toLowerCase()
      if (searchIn.title) {
        const matches = ignoreCase
          ? title.toLowerCase().includes(lowerSearchTerm)
          : title.includes(searchTerm)
        if (matches && isAudible && isPinned) return true
      }
      if (searchIn.url) {
        const matches = url.toLowerCase().includes(lowerSearchTerm)
        if (matches && isAudible && isPinned) return true
      }
    }
  })

  return filteredTabs
}

export const reduceTabs = (
  { searchTerm, audibleSearch, pinnedSearch, searchIn },
  { ignoreCase, regex },
  tabs
) => {
  console.time('reduceTabs')
  if (!tabs) return []

  let searchRegex
  let lowerSearchTerm

  if (regex) {
    try {
      searchRegex = new RegExp(searchTerm, ignoreCase ? 'i' : '')
    } catch (error) {
      console.error('Invalid Regex:', error)
      return []
    }
  } else if (ignoreCase) {
    lowerSearchTerm = searchTerm.toLowerCase()
  }

  const reducedTabs = tabs.filter((tab) => {
    const { title, url, audible, pinned } = tab

    if (audibleSearch && !audible) return false
    if (pinnedSearch && !pinned) return false

    if (!searchTerm) return true

    let matchesTitle = false
    let matchesUrl = false

    if (regex) {
      if (searchIn.title) matchesTitle = searchRegex.test(title)
      if (!matchesTitle && searchIn.url) matchesUrl = searchRegex.test(url)
    } else {
      if (ignoreCase) {
        if (searchIn.title)
          matchesTitle = title.toLowerCase().includes(lowerSearchTerm)
        if (!matchesTitle && searchIn.url)
          matchesUrl = url.toLowerCase().includes(lowerSearchTerm)
      } else {
        if (searchIn.title) matchesTitle = title.includes(searchTerm)
        if (!matchesTitle && searchIn.url) matchesUrl = url.includes(searchTerm)
      }
    }

    return matchesTitle || matchesUrl
  })

  console.timeEnd('reduceTabs')
  return reducedTabs
}

export const getMetrics = (compName, mode, actualTime, baseTime) => {
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
