/**
 * AIService — Central facade that routes queries to the active provider.
 * Manages provider instantiation, settings persistence, and model discovery.
 */

import { GeminiNanoProvider } from './providers/GeminiNanoProvider'
import { OllamaProvider } from './providers/OllamaProvider'
import { OpenAICompatProvider } from './providers/OpenAICompatProvider'
import { GeminiCloudProvider } from './providers/GeminiCloudProvider'
import { AnthropicProvider } from './providers/AnthropicProvider'
import { TabContextBuilder, type ContextStrategy, type TabData } from './context/TabContextBuilder'
import { TabActionExecutor } from './actions/TabActionExecutor'
import { ACTION_SYSTEM_PROMPT, type BrowserAction } from './actions/ActionDefinitions'
import type { BaseProvider, DiscoveredModel, ProviderStatus, StreamChunk } from './providers/BaseProvider'
import type { ChatMessage } from '../store/aiSlice'

export type ProviderType =
  | 'gemini-nano'
  | 'ollama'
  | 'lm-studio'
  | 'jan'
  | 'llamacpp'
  | 'openai-compatible'
  | 'openai'
  | 'gemini-cloud'
  | 'anthropic'
  | 'groq'

export interface AISettings {
  enabled: boolean
  providerType: ProviderType
  model: string
  apiKey: string
  baseUrl: string
  contextStrategy: ContextStrategy
  tokenBudget: number
  systemPrompt: string
  streaming: boolean
  contextWindowOverride?: number
}

export const DEFAULT_AI_SETTINGS: AISettings = {
  enabled: false,
  providerType: 'gemini-nano',
  model: 'gemini-nano',
  apiKey: '',
  baseUrl: '',
  contextStrategy: 'auto',
  tokenBudget: 8192,
  streaming: true,
  systemPrompt: ''
}

/** Default base URLs for each local backend */
const DEFAULT_BASE_URLS: Partial<Record<ProviderType, string>> = {
  ollama: 'http://localhost:11434',
  'lm-studio': 'http://localhost:1234',
  jan: 'http://localhost:1337',
  llamacpp: 'http://localhost:8080',
  'openai-compatible': 'http://localhost:11434'
}

export class AIService {
  private provider: BaseProvider | null = null
  private settings: AISettings

  constructor(settings: AISettings) {
    this.settings = settings
    this.provider = this.buildProvider(settings)
  }

  updateSettings(settings: AISettings) {
    this.settings = settings
    this.provider = this.buildProvider(settings)
  }

  private buildProvider(s: AISettings): BaseProvider | null {
    const baseUrl = s.baseUrl || DEFAULT_BASE_URLS[s.providerType] || ''

    switch (s.providerType) {
      case 'gemini-nano':
        return new GeminiNanoProvider(s.systemPrompt)

      case 'ollama':
        return new OllamaProvider({
          baseUrl,
          model: s.model,
          systemPrompt: s.systemPrompt
        })

      case 'lm-studio':
      case 'jan':
      case 'llamacpp':
      case 'openai-compatible':
        return new OpenAICompatProvider({
          type: s.providerType,
          baseUrl,
          model: s.model,
          apiKey: s.apiKey,
          systemPrompt: s.systemPrompt
        })

      case 'openai':
        return new OpenAICompatProvider({
          type: 'openai',
          baseUrl: 'https://api.openai.com',
          model: s.model,
          apiKey: s.apiKey,
          systemPrompt: s.systemPrompt
        })

      case 'groq':
        return new OpenAICompatProvider({
          type: 'groq',
          baseUrl: 'https://api.groq.com/openai',
          model: s.model,
          apiKey: s.apiKey,
          systemPrompt: s.systemPrompt
        })

      case 'gemini-cloud':
        return new GeminiCloudProvider({
          model: s.model,
          apiKey: s.apiKey,
          systemPrompt: s.systemPrompt
        })

      case 'anthropic':
        return new AnthropicProvider({
          model: s.model,
          apiKey: s.apiKey,
          systemPrompt: s.systemPrompt
        })

      default:
        return null
    }
  }

  /** Test the current provider's connection */
  async testConnection(): Promise<ProviderStatus> {
    if (!this.provider) return { connected: false, error: 'No provider configured.' }
    return this.provider.testConnection()
  }

  async getStatus(): Promise<ProviderStatus> {
    return this.testConnection()
  }

  /** Discover available models for the current provider */
  async discoverModels(): Promise<DiscoveredModel[]> {
    if (!this.provider) return []
    return this.provider.discoverModels()
  }

  /**
   * Send a natural-language query about tabs.
   * Builds context, sends to AI, parses the action, returns it for confirmation.
   */
  async query(
    userMessage: string,
    tabs: TabData[],
    currentWindowId?: number,
    history: ChatMessage[] = []
  ): Promise<{ action: BrowserAction | null; rawResponse: string }> {
    if (!this.provider) throw new Error('AI provider not configured.')

    const effectiveBudget = this.settings.contextWindowOverride ?? this.settings.tokenBudget
    const builder = new TabContextBuilder(tabs)
    const ctx = builder.build({
      strategy: this.settings.contextStrategy,
      tokenBudget: Math.floor(effectiveBudget * 0.7), // reserve 30% for response
      query: userMessage,
      currentWindowId
    })

    const combinedSystemPrompt = this.settings.systemPrompt
      ? `${ACTION_SYSTEM_PROMPT}\n\nUSER CUSTOM INSTRUCTIONS:\n${this.settings.systemPrompt}`
      : ACTION_SYSTEM_PROMPT

    const messages = [
      { role: 'system' as const, content: combinedSystemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      {
        role: 'user' as const,
        content: `${ctx.text}\n\n---\nUser request: ${userMessage}`
      }
    ]

    const raw = await this.provider.chat(messages)
    const action = TabActionExecutor.parseAIResponse(raw)
    return { action, rawResponse: raw }
  }

  /**
   * Stream a response token-by-token.
   * Used for pure analysis queries where we don't need structured JSON.
   */
  async *streamQuery(
    userMessage: string,
    tabs: TabData[],
    currentWindowId?: number,
    abortSignal?: AbortSignal,
    history: ChatMessage[] = []
  ): AsyncGenerator<StreamChunk> {
    if (!this.provider) throw new Error('AI provider not configured.')

    const effectiveBudget = this.settings.contextWindowOverride ?? this.settings.tokenBudget
    const builder = new TabContextBuilder(tabs)
    const ctx = builder.build({
      strategy: this.settings.contextStrategy,
      tokenBudget: Math.floor(effectiveBudget * 0.7),
      query: userMessage,
      currentWindowId
    })

    const combinedSystemPrompt = this.settings.systemPrompt
      ? `${ACTION_SYSTEM_PROMPT}\n\nUSER CUSTOM INSTRUCTIONS:\n${this.settings.systemPrompt}`
      : ACTION_SYSTEM_PROMPT

    const messages = [
      { role: 'system' as const, content: combinedSystemPrompt },
      ...history.map(m => ({ role: m.role, content: m.content })),
      {
        role: 'user' as const,
        content: `${ctx.text}\n\n---\nUser request: ${userMessage}`
      }
    ]

    if (this.settings.streaming && this.provider.supportsStreaming) {
      yield* this.provider.stream(messages, abortSignal)
    } else {
      const text = await this.provider.chat(messages, abortSignal)
      yield { text, done: true }
    }
  }

  /** Load settings from chrome.storage and create an instance */
  static async fromStorage(): Promise<AIService> {
    const { aiSettings } = await chrome.storage.local.get('aiSettings')
    return new AIService(aiSettings ?? DEFAULT_AI_SETTINGS)
  }

  /** Save settings to chrome.storage */
  static async saveSettings(settings: AISettings): Promise<void> {
    await chrome.storage.local.set({ aiSettings: settings })
  }
}

// Singleton instance — re-created when settings change
let _instance: AIService | null = null

export async function getAIService(): Promise<AIService> {
  if (!_instance) {
    _instance = await AIService.fromStorage()
  }
  return _instance
}

export function resetAIService() {
  _instance = null
}
