import { describe, expect, it } from 'bun:test'
import tabReducer, {
  selectWindowTabs,
  selectTabRange,
  updateSelectedTabs,
  clearSelectedTabs,
  selectAllTabs
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

describe('tabSlice - selectTabRange and bulk selection', () => {
  const sampleTabs: any[] = [
    { id: 101, title: 'Tab 1', url: 'https://a.com' },
    { id: 102, title: 'Tab 2', url: 'https://b.com' },
    { id: 103, title: 'Tab 3', url: 'https://c.com' },
    { id: 104, title: 'Tab 4', url: 'https://d.com' },
    { id: 105, title: 'Tab 5', url: 'https://e.com' }
  ]

  const baseState = {
    tabs: sampleTabs,
    filteredTabs: sampleTabs,
    selectedTabs: [],
    selectedWindow: -1,
    youtubePermissionGranted: false,
    isSelectionMode: false,
    lastSelectedTabId: null
  }

  it('should select range from anchor to clicked tab', () => {
    // Step 1: select tab 102 as anchor
    const stateWithAnchor = tabReducer(
      baseState,
      updateSelectedTabs({ id: 102, selected: true })
    )
    expect(stateWithAnchor.selectedTabs).toEqual([102])
    expect(stateWithAnchor.lastSelectedTabId).toBe(102)

    // Step 2: Shift-click tab 104 (should select 102, 103, 104)
    const stateAfterRange = tabReducer(stateWithAnchor, selectTabRange(104))
    expect(stateAfterRange.selectedTabs).toContain(102)
    expect(stateAfterRange.selectedTabs).toContain(103)
    expect(stateAfterRange.selectedTabs).toContain(104)
    expect(stateAfterRange.isSelectionMode).toBe(true)
  })

  it('should select all filtered tabs with selectAllTabs', () => {
    const state = tabReducer(baseState, selectAllTabs())
    expect(state.selectedTabs).toEqual([101, 102, 103, 104, 105])
    expect(state.isSelectionMode).toBe(true)
  })

  it('should clear all selected tabs and reset selection mode', () => {
    const activeState = {
      ...baseState,
      selectedTabs: [101, 102, 103],
      isSelectionMode: true,
      lastSelectedTabId: 103
    }

    const state = tabReducer(activeState, clearSelectedTabs())
    expect(state.selectedTabs).toEqual([])
    expect(state.isSelectionMode).toBe(false)
    expect(state.lastSelectedTabId).toBeNull()
  })
})
