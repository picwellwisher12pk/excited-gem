/**
 * AnthropicProvider — Claude API (claude-3.5-haiku, claude-3.5-sonnet, etc.)
 * Uses the Anthropic Messages API.
 * Note: Requires CORS-enabled access or a proxy. In a Chrome extension context,
 * direct fetch to api.anthropic.com works since extensions bypass CORS.
 */

import {
  BaseProvider,
  type ChatMessage,
  type StreamChunk,
  type DiscoveredModel,
  type ProviderStatus
} from './BaseProvider'

const ANTHROPIC_MODELS: DiscoveredModel[] = [
  {
    id: 'claude-3-7-sonnet-20250219',
    name: 'Claude 3.7 Sonnet',
    contextLength: 200000
  },
  {
    id: 'claude-3-5-sonnet-20241022',
    name: 'Claude 3.5 Sonnet',
    contextLength: 200000
  },
  {
    id: 'claude-3-5-haiku-20241022',
    name: 'Claude 3.5 Haiku',
    contextLength: 200000
  },
  {
    id: 'claude-3-opus-20240229',
    name: 'Claude 3 Opus',
    contextLength: 200000
  },
  {
    id: 'claude-3-haiku-20240307',
    name: 'Claude 3 Haiku',
    contextLength: 200000
  }
]

const BASE = 'https://api.anthropic.com/v1'
const ANTHROPIC_VERSION = '2023-06-01'

export class AnthropicProvider extends BaseProvider {
  readonly type = 'anthropic'
  readonly supportsStreaming = true

  private model: string
  private apiKey: string
  private systemPrompt: string
  private maxTokens: number

  constructor(config: {
    model: string
    apiKey: string
    systemPrompt?: string
    maxTokens?: number
  }) {
    super()
    this.model = config.model
    this.apiKey = config.apiKey
    this.systemPrompt = config.systemPrompt || ''
    this.maxTokens = config.maxTokens ?? 4096
  }

  private getHeaders(): Record<string, string> {
    return {
      'Content-Type': 'application/json',
      'x-api-key': this.apiKey,
      'anthropic-version': ANTHROPIC_VERSION
    }
  }

  private buildRequest(messages: ChatMessage[], stream: boolean) {
    const systemMsg = messages.find((m) => m.role === 'system')
    const convMsgs = messages.filter((m) => m.role !== 'system')
    const systemText = systemMsg?.content || this.systemPrompt

    return {
      model: this.model,
      max_tokens: this.maxTokens,
      system: systemText || undefined,
      messages: convMsgs.map((m) => ({ role: m.role, content: m.content })),
      stream
    }
  }

  async chat(
    messages: ChatMessage[],
    abortSignal?: AbortSignal
  ): Promise<string> {
    const res = await fetch(`${BASE}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.buildRequest(messages, false)),
      signal: abortSignal
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Anthropic error ${res.status}: ${err}`)
    }
    const data = await res.json()
    return data.content?.[0]?.text ?? ''
  }

  async *stream(
    messages: ChatMessage[],
    abortSignal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    const res = await fetch(`${BASE}/messages`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify(this.buildRequest(messages, true)),
      signal: abortSignal
    })
    if (!res.ok) throw new Error(`Anthropic stream error ${res.status}`)

    const reader = res.body!.getReader()
    const decoder = new TextDecoder()
    let buffer = ''

    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue
        const payload = line.slice(6).trim()
        try {
          const parsed = JSON.parse(payload)
          if (parsed.type === 'content_block_delta') {
            const text = parsed.delta?.text ?? ''
            if (text) yield { text, done: false }
          } else if (parsed.type === 'message_stop') {
            yield { text: '', done: true }
            return
          }
        } catch {
          // skip
        }
      }
    }
    yield { text: '', done: true }
  }

  async discoverModels(): Promise<DiscoveredModel[]> {
    return ANTHROPIC_MODELS
  }

  async testConnection(): Promise<ProviderStatus> {
    const start = Date.now()
    try {
      // Test with a minimal message to verify the API key works
      const res = await fetch(`${BASE}/messages`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }]
        }),
        signal: AbortSignal.timeout(8000)
      })
      if (!res.ok) {
        const err = await res.json()
        return {
          connected: false,
          error: err.error?.message ?? `HTTP ${res.status}`
        }
      }
      return {
        connected: true,
        modelCount: ANTHROPIC_MODELS.length,
        latencyMs: Date.now() - start
      }
    } catch (e: any) {
      return { connected: false, error: e.message }
    }
  }
}
