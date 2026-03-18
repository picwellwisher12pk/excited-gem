export const preferences = {
  displayMode: 'tab',
  search: {
    regex: false,
    ignoreCase: true,
    searchIn: { title: true, url: true }, // title,url
    empty: true
  },
  defaultTabsFrom: 'current',
  tempTabsFrom: 'current',
  tabsGroup: {
    promptForClosure: true /**/,
    tabsListAnimation: true,
    tabSortAnimation: true,
    //selection by ckeckbox/hover mode/click mode
    selectionBy: 'checkbox',
    display: {
      favicon: true,
      title: true,
      url: true,
      pin: true,
      sound: true
      // close:true
    }
  },
  selectedTabs: []
}
