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

export interface ChatSession {
  id: string
  title: string
  messages: ChatMessage[]
  lastModified: number
}

interface AIState {
  settings: AISettings
  sessions: ChatSession[]
  currentSessionId: string | null
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
  sessions: [],
  currentSessionId: null,
  drawerOpen: false,
  isLoading: false,
  streamingMessageId: null,
  status: null,
  discoveredModels: [],
  isDiscovering: false,
  isTesting: false,
  pendingAction: null
}

// ─── Persistence Helpers ──────────────────────────────────────────────────────
const saveSessions = (sessions: ChatSession[], currentId: string | null) => {
  chrome.storage.local.set({ aiSessions: sessions, aiCurrentSessionId: currentId })
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

export const loadChatHistory = createAsyncThunk('ai/loadChatHistory', async () => {
  const { aiSessions, aiCurrentSessionId, aiChatHistory } = await chrome.storage.local.get(['aiSessions', 'aiCurrentSessionId', 'aiChatHistory'])

  let sessions = Array.isArray(aiSessions) ? (aiSessions as ChatSession[]) : []
  let currentId = aiCurrentSessionId as string | null

  // Migration: if old history exists but no sessions, create a default session
  if (sessions.length === 0 && aiChatHistory && (aiChatHistory as ChatMessage[]).length > 0) {
    const defaultSession: ChatSession = {
      id: 'default',
      title: 'Previous Conversation',
      messages: aiChatHistory as ChatMessage[],
      lastModified: Date.now()
    }
    sessions = [defaultSession]
    currentId = 'default'
  }

  return { sessions, currentId }
})

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
      let session = state.sessions.find(s => s.id === state.currentSessionId)

      // If no session exists, create one on the fly
      if (!session) {
        session = {
          id: Date.now().toString(),
          title: 'New Chat',
          messages: [],
          lastModified: Date.now()
        }
        state.sessions.unshift(session)
        state.currentSessionId = session.id
      }

      session.messages.push(action.payload)
      session.lastModified = Date.now()

      // Auto-generate title if it's the first user message
      if (session.title === 'New Chat' && action.payload.role === 'user') {
        session.title = action.payload.content.slice(0, 30) + (action.payload.content.length > 30 ? '...' : '')
      }
      saveSessions(state.sessions, state.currentSessionId)
    },
    updateStreamingMessage(state, action: PayloadAction<{ id: string; content: string }>) {
      const session = state.sessions.find(s => s.id === state.currentSessionId)
      if (session) {
        const msg = session.messages.find((m) => m.id === action.payload.id)
        if (msg) {
          msg.content = action.payload.content
        }
      }
    },
    finalizeStreamingMessage(state, action: PayloadAction<{ id: string; action?: BrowserAction | null }>) {
      const session = state.sessions.find(s => s.id === state.currentSessionId)
      if (session) {
        const msg = session.messages.find((m) => m.id === action.payload.id)
        if (msg) {
          msg.streaming = false
          msg.action = action.payload.action
        }
        state.streamingMessageId = null
        state.isLoading = false
        session.lastModified = Date.now()
        saveSessions(state.sessions, state.currentSessionId)
      }
    },
    setExecutionResult(state, action: PayloadAction<{ messageId: string; result: string }>) {
      const session = state.sessions.find(s => s.id === state.currentSessionId)
      if (session) {
        const msg = session.messages.find((m) => m.id === action.payload.messageId)
        if (msg) msg.executionResult = action.payload.result
        state.pendingAction = null
        session.lastModified = Date.now()
        saveSessions(state.sessions, state.currentSessionId)
      }
    },
    clearMessages(state) {
      const session = state.sessions.find(s => s.id === state.currentSessionId)
      if (session) {
        session.messages = []
        saveSessions(state.sessions, state.currentSessionId)
      }
    },
    // Session Management
    createChatSession(state) {
      const newSession: ChatSession = {
        id: Date.now().toString(),
        title: 'New Chat',
        messages: [],
        lastModified: Date.now()
      }
      state.sessions.unshift(newSession)
      state.currentSessionId = newSession.id
      saveSessions(state.sessions, state.currentSessionId)
    },
    switchChatSession(state, action: PayloadAction<string>) {
      state.currentSessionId = action.payload
      saveSessions(state.sessions, state.currentSessionId)
    },
    deleteChatSession(state, action: PayloadAction<string>) {
      state.sessions = state.sessions.filter(s => s.id !== action.payload)
      if (state.currentSessionId === action.payload) {
        state.currentSessionId = state.sessions[0]?.id || null
      }
      // If no sessions left, create a new one
      if (state.sessions.length === 0) {
        const newSession: ChatSession = {
          id: 'default',
          title: 'New Chat',
          messages: [],
          lastModified: Date.now()
        }
        state.sessions = [newSession]
        state.currentSessionId = 'default'
      }
      saveSessions(state.sessions, state.currentSessionId)
    },
    renameChatSession(state, action: PayloadAction<{ id: string; title: string }>) {
      const session = state.sessions.find(s => s.id === action.payload.id)
      if (session) {
        session.title = action.payload.title
        saveSessions(state.sessions, state.currentSessionId)
      }
    },
    updateSettingsField<K extends keyof AISettings>(
      state: AIState,
      action: PayloadAction<{ key: K; value: AISettings[K] }>
    ) {
      state.settings[action.payload.key] = action.payload.value
    },
    setProviderStatus(state, action: PayloadAction<ProviderStatus | null>) {
      state.status = action.payload
    },
    setStreamingMessageId(state, action: PayloadAction<string | null>) {
      state.streamingMessageId = action.payload
    },
    setLoading(state, action: PayloadAction<boolean>) {
      state.isLoading = action.payload
    },
    setPendingAction(state, action: PayloadAction<BrowserAction | null>) {
      state.pendingAction = action.payload
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
      .addCase(loadChatHistory.fulfilled, (state, action) => {
        state.sessions = action.payload.sessions
        state.currentSessionId = action.payload.currentId

        // Ensure at least one session exists
        if (state.sessions.length === 0) {
          const defaultSession: ChatSession = {
            id: 'default',
            title: 'New Chat',
            messages: [],
            lastModified: Date.now()
          }
          state.sessions = [defaultSession]
          state.currentSessionId = 'default'
        }
      })
  }
})

export const {
  openDrawer, closeDrawer, toggleDrawer,
  addMessage, updateStreamingMessage, finalizeStreamingMessage,
  setStreamingMessageId, setLoading, setPendingAction, setExecutionResult,
  clearMessages, updateSettingsField, setProviderStatus,
  createChatSession, switchChatSession, deleteChatSession, renameChatSession
} = aiSlice.actions

export default aiSlice.reducer
