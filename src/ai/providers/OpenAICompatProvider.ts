/**
 * OpenAICompatProvider — Works with:
 *   - OpenAI (api.openai.com)
 *   - LM Studio (localhost:1234)
 *   - Jan (localhost:1337)
 *   - llama.cpp server (any port)
 *   - Groq (api.groq.com/openai)
 *   - Together AI
 *   - Any OpenAI-compatible endpoint
 *
 * Model field is free-form for local; curated list for known cloud endpoints.
 */

import {
  BaseProvider,
  ChatMessage,
  StreamChunk,
  DiscoveredModel,
  ProviderStatus
} from './BaseProvider'

/** Known cloud endpoints with curated model lists */
const CLOUD_MODELS: Record<string, DiscoveredModel[]> = {
  'api.openai.com': [
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', contextLength: 128000 },
    { id: 'gpt-4o', name: 'GPT-4o', contextLength: 128000 },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', contextLength: 128000 },
    { id: 'o1-mini', name: 'o1 Mini', contextLength: 128000 },
    { id: 'o1', name: 'o1', contextLength: 200000 }
  ],
  'api.groq.com': [
    { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B (Groq)', contextLength: 128000 },
    { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B (Groq)', contextLength: 128000 },
    { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (Groq)', contextLength: 32768 },
    { id: 'gemma2-9b-it', name: 'Gemma2 9B (Groq)', contextLength: 8192 }
  ],
  'api.together.xyz': [
    { id: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', name: 'Llama 3.3 70B (Together)', contextLength: 131072 },
    { id: 'mistralai/Mixtral-8x7B-Instruct-v0.1', name: 'Mixtral 8x7B (Together)', contextLength: 32768 }
  ]
}

export class OpenAICompatProvider extends BaseProvider {
  readonly type: string
  readonly supportsStreaming = true

  private baseUrl: string
  private model: string
  private apiKey: string
  private systemPrompt: string

  constructor(config: {
    type?: string
    baseUrl?: string
    model: string
    apiKey?: string
    systemPrompt?: string
  }) {
    super()
    this.type = config.type ?? 'openai-compatible'
    this.baseUrl = (config.baseUrl || 'https://api.openai.com').replace(/\/$/, '')
    this.model = config.model
    this.apiKey = config.apiKey || ''
    this.systemPrompt = config.systemPrompt || ''
  }

  private getHeaders(): Record<string, string> {
    const h: Record<string, string> = { 'Content-Type': 'application/json' }
    if (this.apiKey) h['Authorization'] = `Bearer ${this.apiKey}`
    return h
  }

  private buildMessages(messages: ChatMessage[]): ChatMessage[] {
    if (!this.systemPrompt) return messages
    if (messages[0]?.role === 'system') return messages
    return [{ role: 'system', content: this.systemPrompt }, ...messages]
  }

  async chat(messages: ChatMessage[], abortSignal?: AbortSignal): Promise<string> {
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages: this.buildMessages(messages),
        stream: false
      }),
      signal: abortSignal
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`OpenAI-compat error ${res.status}: ${err}`)
    }
    const data = await res.json()
    return data.choices?.[0]?.message?.content ?? ''
  }

  async *stream(messages: ChatMessage[], abortSignal?: AbortSignal): AsyncGenerator<StreamChunk> {
    const res = await fetch(`${this.baseUrl}/v1/chat/completions`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        model: this.model,
        messages: this.buildMessages(messages),
        stream: true
      }),
      signal: abortSignal
    })
    if (!res.ok) throw new Error(`Stream error ${res.status}`)

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
        if (payload === '[DONE]') {
          yield { text: '', done: true }
          return
        }
        try {
          const parsed = JSON.parse(payload)
          const text = parsed.choices?.[0]?.delta?.content ?? ''
          if (text) yield { text, done: false }
        } catch {
          // skip
        }
      }
    }
    yield { text: '', done: true }
  }

  async discoverModels(): Promise<DiscoveredModel[]> {
    // Check if it's a known cloud endpoint with a curated list
    try {
      const host = new URL(this.baseUrl).hostname
      const known = Object.entries(CLOUD_MODELS).find(([h]) => host.includes(h))
      if (known) return known[1]
    } catch {
      // ignore URL parsing errors
    }

    // Otherwise query /v1/models (works for LM Studio, Jan, llama.cpp, etc.)
    try {
      const res = await fetch(`${this.baseUrl}/v1/models`, {
        headers: this.getHeaders(),
        signal: AbortSignal.timeout(5000)
      })
      if (!res.ok) throw new Error(`models error ${res.status}`)
      const data = await res.json()
      return (data.data ?? []).map((m: any) => ({
        id: m.id,
        name: m.id,
        contextLength: m.context_length ?? m.max_context_length
      }))
    } catch (e: any) {
      throw new Error(`Cannot discover models: ${e.message}`)
    }
  }

  async testConnection(): Promise<ProviderStatus> {
    const start = Date.now()
    try {
      const models = await this.discoverModels()
      return {
        connected: true,
        modelCount: models.length,
        latencyMs: Date.now() - start
      }
    } catch (e: any) {
      return { connected: false, error: e.message }
    }
  }
}
