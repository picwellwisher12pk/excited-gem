import { createSlice, type PayloadAction } from '@reduxjs/toolkit'
import type { ConnectedBrowser } from '../adapter/types'

export interface BrowserState {
  connectedBrowsers: ConnectedBrowser[]
  selectedBrowserId: string // 'all' or specific browser ID
  isDesktopMode: boolean
  bridgeStatus: 'connected' | 'connecting' | 'disconnected' | 'error'
  lastSyncTime: number | null
}

const initialState: BrowserState = {
  connectedBrowsers: [],
  selectedBrowserId: 'all',
  isDesktopMode: false,
  bridgeStatus: 'disconnected',
  lastSyncTime: null
}

export const browserSlice = createSlice({
  name: 'browsers',
  initialState,
  reducers: {
    setConnectedBrowsers: (state, action: PayloadAction<ConnectedBrowser[]>) => {
      state.connectedBrowsers = action.payload
    },
    setSelectedBrowserId: (state, action: PayloadAction<string>) => {
      state.selectedBrowserId = action.payload
    },
    setIsDesktopMode: (state, action: PayloadAction<boolean>) => {
      state.isDesktopMode = action.payload
    },
    setBridgeStatus: (
      state,
      action: PayloadAction<'connected' | 'connecting' | 'disconnected' | 'error'>
    ) => {
      state.bridgeStatus = action.payload
    },
    setLastSyncTime: (state, action: PayloadAction<number>) => {
      state.lastSyncTime = action.payload
    }
  }
})

export const {
  setConnectedBrowsers,
  setSelectedBrowserId,
  setIsDesktopMode,
  setBridgeStatus,
  setLastSyncTime
} = browserSlice.actions

export default browserSlice.reducer
