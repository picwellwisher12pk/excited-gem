/**
 * aiSlice — Redux state for the AI layer.
 * Tracks: settings, chat history, active query, connection status, discovered models.
 */

import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit'
import type { AISettings, ProviderType } from '../ai/AIService'
import { DEFAULT_AI_SETTINGS, AIService, resetAIService } from '../ai/AIService'
import type { BrowserAction } from '../ai/actions/ActionDefinitions'
import type { DiscoveredModel, ProviderStatus } from '../ai/providers/BaseProvider'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  action?: BrowserAction | null
  executionResult?: string
  streaming?: boolean
}

interface AIState {
  settings: AISettings
  messages: ChatMessage[]
  drawerOpen: boolean
  isLoading: boolean
  streamingMessageId: string | null
  status: ProviderStatus | null
  discoveredModels: DiscoveredModel[]
  isDiscovering: boolean
  isTesting: boolean
  pendingAction: BrowserAction | null
}

const initialState: AIState = {
  settings: DEFAULT_AI_SETTINGS,
  messages: [],
  drawerOpen: false,
  isLoading: false,
  streamingMessageId: null,
  status: null,
  discoveredModels: [],
  isDiscovering: false,
  isTesting: false,
  pendingAction: null
}

// ─── Async Thunks ─────────────────────────────────────────────────────────────

export const loadAISettings = createAsyncThunk('ai/loadSettings', async () => {
  const { aiSettings } = await chrome.storage.local.get('aiSettings')
  return (aiSettings as AISettings) ?? DEFAULT_AI_SETTINGS
})

export const saveAISettings = createAsyncThunk(
  'ai/saveSettings',
  async (settings: AISettings) => {
    await AIService.saveSettings(settings)
    resetAIService() // force re-init with new settings
    return settings
  }
)

export const discoverModels = createAsyncThunk(
  'ai/discoverModels',
  async (settings: AISettings) => {
    const service = new AIService(settings)
    return service.discoverModels()
  }
)

export const testConnection = createAsyncThunk(
  'ai/testConnection',
  async (settings: AISettings) => {
    const service = new AIService(settings)
    return service.testConnection()
  }
)

// ─── Slice ────────────────────────────────────────────────────────────────────

const aiSlice = createSlice({
  name: 'ai',
  initialState,
  reducers: {
    openDrawer(state) {
      state.drawerOpen = true
    },
    closeDrawer(state) {
      state.drawerOpen = false
    },
    toggleDrawer(state) {
      state.drawerOpen = !state.drawerOpen
    },
    addMessage(state, action: PayloadAction<ChatMessage>) {
      state.messages.push(action.payload)
    },
    updateStreamingMessage(state, action: PayloadAction<{ id: string; content: string }>) {
      const msg = state.messages.find((m) => m.id === action.payload.id)
      if (msg) msg.content = action.payload.content
    },
    finalizeStreamingMessage(state, action: PayloadAction<{ id: string; action?: BrowserAction | null }>) {
      const msg = state.messages.find((m) => m.id === action.payload.id)
      if (msg) {
        msg.streaming = false
        msg.action = action.payload.action
      }
      state.streamingMessageId = null
      state.isLoading = false
    },
    setStreamingMessageId(state, action: PayloadAction<string | null>) {
      state.streamingMessageId = action.payload
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },
    setPendingAction(state, action: PayloadAction<BrowserAction | null>) {
      state.pendingAction = action.payload
    },
    setExecutionResult(state, action: PayloadAction<{ messageId: string; result: string }>) {
      const msg = state.messages.find((m) => m.id === action.payload.messageId)
      if (msg) msg.executionResult = action.payload.result
      state.pendingAction = null
    },
    clearMessages(state) {
      state.messages = []
    },
    updateSettingsField<K extends keyof AISettings>(
      state: AIState,
      action: PayloadAction<{ key: K; value: AISettings[K] }>
    ) {
      state.settings[action.payload.key] = action.payload.value
    },
    setProviderStatus(state, action: PayloadAction<ProviderStatus | null>) {
      state.status = action.payload
    }
  },
  extraReducers: (builder) => {
    builder
      .addCase(loadAISettings.fulfilled, (state, action) => {
        state.settings = action.payload
      })
      .addCase(saveAISettings.fulfilled, (state, action) => {
        state.settings = action.payload
      })
      .addCase(discoverModels.pending, (state) => {
        state.isDiscovering = true
        state.discoveredModels = []
      })
      .addCase(discoverModels.fulfilled, (state, action) => {
        state.isDiscovering = false
        state.discoveredModels = action.payload
      })
      .addCase(discoverModels.rejected, (state) => {
        state.isDiscovering = false
      })
      .addCase(testConnection.pending, (state) => {
        state.isTesting = true
        state.status = null
      })
      .addCase(testConnection.fulfilled, (state, action) => {
        state.isTesting = false
        state.status = action.payload
      })
      .addCase(testConnection.rejected, (state) => {
        state.isTesting = false
        state.status = { connected: false, error: 'Connection test failed.' }
      })
  }
})

export const {
  openDrawer, closeDrawer, toggleDrawer,
  addMessage, updateStreamingMessage, finalizeStreamingMessage,
  setStreamingMessageId, setLoading, setPendingAction, setExecutionResult,
  clearMessages, updateSettingsField, setProviderStatus
} = aiSlice.actions

export default aiSlice.reducer
