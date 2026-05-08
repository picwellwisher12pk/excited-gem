/**
 * OllamaProvider — Local Ollama inference server.
 * Supports any model the user has pulled: llama3.2, phi4-mini, qwen2.5, etc.
 * Model field is free-form — auto-discovered but never restricted.
 *
 * Discovery API: GET {baseUrl}/api/tags
 * Chat API:      POST {baseUrl}/api/chat  (OpenAI-compat also at /v1/chat/completions)
 */

import {
  BaseProvider,
  ChatMessage,
  StreamChunk,
  DiscoveredModel,
  ProviderStatus
} from './BaseProvider'

export class OllamaProvider extends BaseProvider {
  readonly type = 'ollama'
  readonly supportsStreaming = true

  private baseUrl: string
  private model: string
  private systemPrompt: string

  constructor(config: { baseUrl?: string; model: string; systemPrompt?: string }) {
    super()
    this.baseUrl = (config.baseUrl || 'http://localhost:11434').replace(/\/$/, '')
    this.model = config.model
    this.systemPrompt = config.systemPrompt || ''
  }

  async chat(messages: ChatMessage[], abortSignal?: AbortSignal): Promise<string> {
    const msgs = this.prependSystem(messages)
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, messages: msgs, stream: false }),
      signal: abortSignal
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Ollama error ${res.status}: ${err}`)
    }
    const data = await res.json()
    return data.message?.content ?? ''
  }

  async *stream(messages: ChatMessage[], abortSignal?: AbortSignal): AsyncGenerator<StreamChunk> {
    const msgs = this.prependSystem(messages)
    const res = await fetch(`${this.baseUrl}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: this.model, messages: msgs, stream: true }),
      signal: abortSignal
    })
    if (!res.ok) throw new Error(`Ollama stream error ${res.status}`)

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
        if (!line.trim()) continue
        try {
          const parsed = JSON.parse(line)
          const text = parsed.message?.content ?? ''
          if (text) yield { text, done: false }
          if (parsed.done) {
            yield { text: '', done: true }
            return
          }
        } catch {
          // skip malformed chunks
        }
      }
    }
    yield { text: '', done: true }
  }

  async discoverModels(): Promise<DiscoveredModel[]> {
    const res = await fetch(`${this.baseUrl}/api/tags`, { signal: AbortSignal.timeout(5000) })
    if (!res.ok) throw new Error(`Ollama tags error ${res.status}`)
    const data = await res.json()
    return (data.models ?? []).map((m: any) => ({
      id: m.name,
      name: m.name,
      size: m.size,
      modified: m.modified_at,
      // Ollama doesn't always report context_length in /api/tags,
      // but it may be in model details via /api/show
      contextLength: m.details?.context_length
    }))
  }

  /** Fetch detailed info for a specific model (context window, family, etc.) */
  async showModel(modelName: string): Promise<{ contextLength?: number; family?: string } | null> {
    try {
      const res = await fetch(`${this.baseUrl}/api/show`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: modelName }),
        signal: AbortSignal.timeout(5000)
      })
      if (!res.ok) return null
      const data = await res.json()
      return {
        contextLength: data.model_info?.['llama.context_length'] ?? data.parameters?.num_ctx,
        family: data.details?.family
      }
    } catch {
      return null
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

  private prependSystem(messages: ChatMessage[]): ChatMessage[] {
    if (!this.systemPrompt) return messages
    const hasSystem = messages[0]?.role === 'system'
    if (hasSystem) return messages
    return [{ role: 'system', content: this.systemPrompt }, ...messages]
  }
}
