import { describe, expect, it } from 'bun:test'
import tabReducer, {
  selectWindowTabs,
} from './tabSlice'

describe('tabSlice - selectWindowTabs', () => {
  const initialTabsState = {
    tabs: [],
    filteredTabs: [],
    selectedTabs: [1, 2], // window A has tabs 1, 2 already selected
    selectedWindow: -1,
    youtubePermissionGranted: false,
    isSelectionMode: true,
    lastSelectedTabId: null
  }

  it('should select all tabs of a window when select is true', () => {
    // Window B has tabs [10, 11, 12]
    const nextState = tabReducer(
      initialTabsState,
      selectWindowTabs({ tabIds: [10, 11, 12], select: true })
    )

    expect(nextState.selectedTabs).toEqual([1, 2, 10, 11, 12])
    expect(nextState.isSelectionMode).toBe(true)
  })

  it('should not add duplicates if some tabs are already selected', () => {
    // Window A tabs are [2, 3, 4], where 2 is already selected
    const nextState = tabReducer(
      initialTabsState,
      selectWindowTabs({ tabIds: [2, 3, 4], select: true })
    )

    expect(nextState.selectedTabs).toEqual([1, 2, 3, 4])
  })

  it('should deselect only the specified window tabs when select is false', () => {
    // initial state has [1, 2], we deselect window tabs [2]
    const nextState = tabReducer(
      initialTabsState,
      selectWindowTabs({ tabIds: [2], select: false })
    )

    expect(nextState.selectedTabs).toEqual([1])
    expect(nextState.isSelectionMode).toBe(true)
  })

  it('should reset isSelectionMode to false when all selected tabs are cleared', () => {
    const stateWithOnlyWindowTabs = {
      ...initialTabsState,
      selectedTabs: [10, 11]
    }

    const nextState = tabReducer(
      stateWithOnlyWindowTabs,
      selectWindowTabs({ tabIds: [10, 11], select: false })
    )

    expect(nextState.selectedTabs).toEqual([])
    expect(nextState.isSelectionMode).toBe(false)
  })

  it('should enable isSelectionMode when selecting tabs even if previously false', () => {
    const idleState = {
      ...initialTabsState,
      selectedTabs: [],
      isSelectionMode: false
    }

    const nextState = tabReducer(
      idleState,
      selectWindowTabs({ tabIds: [5, 6], select: true })
    )

    expect(nextState.selectedTabs).toEqual([5, 6])
    expect(nextState.isSelectionMode).toBe(true)
  })
})
