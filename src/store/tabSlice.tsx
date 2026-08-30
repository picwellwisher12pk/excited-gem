import { createSlice } from '@reduxjs/toolkit'

export interface Tab {
  id: number
  title: string
  url: string
  favIconUrl?: string
  pinned: boolean
  audible: boolean
  muted: boolean
  mutedInfo: { muted: boolean }
  discarded: boolean
  status: 'loading' | 'complete' | 'error'
  index: number
  windowId: number
  groupId?: number
  youtubeInfo?: {
    duration: number
    currentTime: number
    paused: boolean
    title: string
    percentage: number
    tabId: number
  }
}

interface TabState {
  tabs: Tab[]
  filteredTabs: Tab[]
  selectedTabs: number[]
  selectedWindow: number
  youtubePermissionGranted: boolean
  isSelectionMode: boolean
  lastSelectedTabId: number | null // anchor for shift-select
}

const initialState: TabState = {
  tabs: [],
  filteredTabs: [],
  selectedTabs: [],
  selectedWindow: chrome.windows?.WINDOW_ID_CURRENT || -1,
  youtubePermissionGranted: false,
  isSelectionMode: false,
  lastSelectedTabId: null
}

export const tabSlice = createSlice({
  name: 'tabs',
  initialState,
  reducers: {
    updateActiveTabs: (state, action) => {
      state.tabs = action.payload
    },
    updateSelectedTabs: (state, action) => {
      let { id, selected } = action.payload
      if (selected) {
        if (!state.selectedTabs.includes(id)) state.selectedTabs.push(id)
      } else {
        state.selectedTabs = state.selectedTabs.filter((t) => t !== id)
      }
      state.lastSelectedTabId = id
      window.selectedTabs = [...state.selectedTabs]
    },
    // Select all tabs between lastSelectedTabId and the given id (inclusive)
    selectTabRange: (state, action) => {
      const clickedId: number = action.payload
      const anchor = state.lastSelectedTabId
      if (anchor === null || anchor === clickedId) {
        // No anchor — treat as normal toggle
        if (!state.selectedTabs.includes(clickedId)) {
          state.selectedTabs.push(clickedId)
        } else {
          state.selectedTabs = state.selectedTabs.filter((t) => t !== clickedId)
        }
        state.lastSelectedTabId = clickedId
        window.selectedTabs = [...state.selectedTabs]
        return
      }
      // Find positions in filteredTabs order
      const ids = state.filteredTabs.map((t) => t.id)
      const anchorIdx = ids.indexOf(anchor)
      const clickedIdx = ids.indexOf(clickedId)
      if (anchorIdx === -1 || clickedIdx === -1) return
      const [from, to] =
        anchorIdx < clickedIdx
          ? [anchorIdx, clickedIdx]
          : [clickedIdx, anchorIdx]
      const rangeIds = ids.slice(from, to + 1)
      // Add all range IDs that aren't already selected
      rangeIds.forEach((id) => {
        if (!state.selectedTabs.includes(id)) state.selectedTabs.push(id)
      })
      // Don't update anchor on range select (next shift-click extends from same anchor)
      window.selectedTabs = [...state.selectedTabs]
    },
    updateFilteredTabs: (state, action) => {
      state.filteredTabs = [...action.payload]
      window.filteredTabs = [...action.payload]
    },
    clearSelectedTabs: (state) => {
      state.selectedTabs = []
      window.selectedTabs = []
    },
    selectAllTabs: (state) => {
      state.selectedTabs = [...state.filteredTabs.map((tab) => tab.id)]
    },
    invertSelectedTabs: (state) => {
      state.selectedTabs = [
        ...state.filteredTabs
          .filter((tab) => !state.selectedTabs.includes(tab.id))
          .map((tab) => tab.id)
      ]
    },
    updateSelectedWindow: (state, action) => {
      console.log('updateSelectedWindow:', action.payload)
      state.selectedWindow = action.payload
      window.selectedWindow = action.payload
    },
    updateYouTubeInfo: (state, action) => {
      const { tabId, info } = action.payload
      const tab = state.tabs.find((t) => t.id === tabId)
      if (tab) {
        tab.youtubeInfo = info
      }
      const filteredTab = state.filteredTabs.find((t) => t.id === tabId)
      if (filteredTab) {
        filteredTab.youtubeInfo = info
      }
    },
    updateYouTubePermission: (state, action) => {
      state.youtubePermissionGranted = action.payload
    },
    toggleSelectionMode: (state, action) => {
      state.isSelectionMode = action.payload
      if (!action.payload) {
        state.selectedTabs = []
      }
    },
    reorderTabs: (state, action) => {
      const { fromIndex, toIndex } = action.payload
      const newTabs = [...state.tabs]
      const [movedTab] = newTabs.splice(fromIndex, 1)
      newTabs.splice(toIndex, 0, movedTab)

      const reindexedTabs = newTabs.map((tab, index) => ({
        ...tab,
        index: index
      }))

      state.tabs = reindexedTabs

      if (
        state.filteredTabs &&
        state.filteredTabs.length === state.tabs.length
      ) {
        state.filteredTabs = [...reindexedTabs]
      }
    }
  }
})

// Action creators are generated for each case reducer function
export const {
  selectAllTabs,
  invertSelectedTabs,
  updateActiveTabs,
  updateSelectedTabs,
  selectTabRange,
  updateFilteredTabs,
  clearSelectedTabs,
  updateSelectedWindow,
  updateYouTubeInfo,
  updateYouTubePermission,
  toggleSelectionMode,
  reorderTabs
} = tabSlice.actions

export default tabSlice.reducer
