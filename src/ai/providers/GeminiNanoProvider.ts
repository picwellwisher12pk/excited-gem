/**
 * GeminiNanoProvider — Chrome built-in Prompt API (on-device, zero setup).
 * Uses window.ai / self.ai available in Chrome 127+ with flags enabled.
 *
 * Requirements:
 *  - Chrome 127+ Dev/Canary
 *  - chrome://flags → "Prompt API for Gemini Nano" → Enabled
 *  - chrome://flags → "Optimization Guide On Device Model" → Enabled BypassPerfRequirement
 */

import {
  BaseProvider,
  ChatMessage,
  StreamChunk,
  DiscoveredModel,
  ProviderStatus
} from './BaseProvider'

declare global {
  interface Window {
    ai?: {
      languageModel?: {
        capabilities(): Promise<{ available: 'readily' | 'after-download' | 'no'; defaultTopK?: number; maxTopK?: number; defaultTemperature?: number }>
        create(options?: { systemPrompt?: string; temperature?: number; topK?: number }): Promise<AISesssionHandle>
      }
    }
  }
}

interface AISesssionHandle {
  prompt(text: string, options?: { signal?: AbortSignal }): Promise<string>
  promptStreaming(text: string, options?: { signal?: AbortSignal }): ReadableStream<string>
  destroy(): void
}

export class GeminiNanoProvider extends BaseProvider {
  readonly type = 'gemini-nano'
  readonly supportsStreaming = true

  private systemPrompt: string

  constructor(systemPrompt = '') {
    super()
    this.systemPrompt = systemPrompt
  }

  private async getSession(systemPrompt?: string): Promise<AISesssionHandle> {
    const ai = (window as any).ai || (globalThis as any).ai
    if (!ai?.languageModel) {
      throw new Error(
        'Chrome Prompt API not available. Enable "Prompt API for Gemini Nano" in chrome://flags.'
      )
    }
    return ai.languageModel.create({ systemPrompt: systemPrompt || this.systemPrompt })
  }

  async chat(messages: ChatMessage[], abortSignal?: AbortSignal): Promise<string> {
    const systemMsg = messages.find((m) => m.role === 'system')
    const userMessages = messages.filter((m) => m.role !== 'system')

    // Gemini Nano handles a single prompt, so we flatten the conversation
    const prompt = userMessages.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')

    const session = await this.getSession(systemMsg?.content)
    try {
      return await session.prompt(prompt, { signal: abortSignal })
    } finally {
      session.destroy()
    }
  }

  async *stream(messages: ChatMessage[], abortSignal?: AbortSignal): AsyncGenerator<StreamChunk> {
    const systemMsg = messages.find((m) => m.role === 'system')
    const userMessages = messages.filter((m) => m.role !== 'system')
    const prompt = userMessages.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`).join('\n')

    const session = await this.getSession(systemMsg?.content)
    try {
      const stream = session.promptStreaming(prompt, { signal: abortSignal })
      const reader = stream.getReader()
      let prevText = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) {
          yield { text: '', done: true }
          break
        }
        // Gemini Nano streaming returns cumulative text, we need the delta
        const delta = value.slice(prevText.length)
        prevText = value
        yield { text: delta, done: false }
      }
    } finally {
      session.destroy()
    }
  }

  async discoverModels(): Promise<DiscoveredModel[]> {
    return [
      {
        id: 'gemini-nano',
        name: 'Gemini Nano (Built-in)',
        contextLength: 6144
      }
    ]
  }

  async testConnection(): Promise<ProviderStatus> {
    const start = Date.now()
    try {
      const ai = (window as any).ai || (globalThis as any).ai
      if (!ai?.languageModel) {
        return { connected: false, error: 'Chrome Prompt API not available in this browser.' }
      }
      const caps = await ai.languageModel.capabilities()
      if (caps.available === 'no') {
        return { connected: false, error: 'Gemini Nano model is not available on this device.' }
      }
      return {
        connected: true,
        modelCount: 1,
        latencyMs: Date.now() - start
      }
    } catch (e: any) {
      return { connected: false, error: e.message }
    }
  }
}
