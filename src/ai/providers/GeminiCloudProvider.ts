/**
 * GeminiCloudProvider — Google Gemini API (cloud).
 * Uses the Gemini generateContent / streamGenerateContent REST API.
 * Models: gemini-3.7-flash, gemini-3.7-pro, gemini-3.6-pro, etc.
 */

import {
  BaseProvider,
  type ChatMessage,
  type DiscoveredModel,
  type ProviderStatus,
  type StreamChunk
} from './BaseProvider'

const GEMINI_MODELS: DiscoveredModel[] = [
  { id: 'gemini-3.8-flash', name: 'Gemini 3.8 Flash (Recommended)', contextLength: 1048576 },
  { id: 'gemini-3.8-pro', name: 'Gemini 3.8 Pro', contextLength: 2097152 },
  { id: 'gemini-3.5-flash-lite', name: 'Gemini 3.5 Flash-Lite (Fastest)', contextLength: 1048576 },
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', contextLength: 1048576 },
  { id: 'gemini-3.7-pro', name: 'Gemini 3.7 Pro', contextLength: 2097152 },
  {
    id: 'gemini-3.7-flash-thinking',
    name: 'Gemini 3.7 Flash Thinking',
    contextLength: 1048576
  },
  { id: 'gemini-3.1-pro', name: 'Gemini 3.1 Pro', contextLength: 2097152 },
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', contextLength: 1048576 },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', contextLength: 2097152 },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', contextLength: 1048576 },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', contextLength: 1048576 },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', contextLength: 2097152 }
]

const BASE = 'https://generativelanguage.googleapis.com/v1beta'

export class GeminiCloudProvider extends BaseProvider {
  readonly type = 'gemini-cloud'
  readonly supportsStreaming = true

  private model: string
  private apiKey: string
  private systemPrompt: string

  constructor(config: {
    model: string
    apiKey: string
    systemPrompt?: string
  }) {
    super()
    this.model = config.model
    this.apiKey = config.apiKey
    this.systemPrompt = config.systemPrompt || ''
  }

  private buildRequest(messages: ChatMessage[]) {
    const contents = messages
      .filter((m) => m.role !== 'system')
      .map((m) => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }))

    const req: any = { contents }
    const systemMsg = messages.find((m) => m.role === 'system')
    const sysText = systemMsg?.content || this.systemPrompt
    if (sysText) {
      req.systemInstruction = { parts: [{ text: sysText }] }
    }
    return req
  }

  private async parseError(res: Response): Promise<string> {
    let detail = ''
    try {
      const json = await res.json()
      detail = json.error?.message || ''
    } catch {
      try {
        detail = await res.text()
      } catch {}
    }

    if (res.status === 503) {
      return `Gemini service temporarily overloaded (503 Service Unavailable). ${
        detail ? `Details: ${detail}. ` : ''
      }Please try again in a moment, or switch to a faster model (e.g. gemini-3.8-flash) in Settings.`
    }
    if (res.status === 429) {
      return `Gemini rate limit exceeded (429 Too Many Requests). ${
        detail ? `Details: ${detail}. ` : ''
      }Please wait a moment before sending another message.`
    }
    if (res.status === 404) {
      return `Gemini model "${this.model}" not found (404). This model may be deprecated. Please select a newer model (e.g. gemini-3.8-flash) in Settings.`
    }
    if (res.status === 400) {
      return `Gemini 400 Bad Request: ${detail || 'Invalid request configuration'}`
    }
    return `Gemini API error ${res.status}: ${detail || res.statusText}`
  }

  async chat(
    messages: ChatMessage[],
    abortSignal?: AbortSignal
  ): Promise<string> {
    const url = `${BASE}/models/${this.model}:generateContent?key=${this.apiKey}`
    const body = JSON.stringify(this.buildRequest(messages))
    let res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: abortSignal
    })

    // Retry once on transient 503
    if (res.status === 503 && !abortSignal?.aborted) {
      await new Promise((r) => setTimeout(r, 1500))
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: abortSignal
      })
    }

    if (!res.ok) {
      const err = await this.parseError(res)
      throw new Error(err)
    }
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  }

  async *stream(
    messages: ChatMessage[],
    abortSignal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    const url = `${BASE}/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`
    const body = JSON.stringify(this.buildRequest(messages))

    let res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      signal: abortSignal
    })

    // If 503 (temporary overload), auto-retry once after 1.5s
    if (res.status === 503 && !abortSignal?.aborted) {
      await new Promise((r) => setTimeout(r, 1500))
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body,
        signal: abortSignal
      })
    }

    if (!res.ok) {
      const errMsg = await this.parseError(res)
      throw new Error(errMsg)
    }

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
        if (!payload) continue
        try {
          const parsed = JSON.parse(payload)
          const text = parsed.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
          if (text) yield { text, done: false }
        } catch {
          // skip
        }
      }
    }
    yield { text: '', done: true }
  }

  async discoverModels(): Promise<DiscoveredModel[]> {
    if (this.apiKey) {
      try {
        const url = `${BASE}/models?key=${this.apiKey}`
        const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
        if (res.ok) {
          const data = await res.json()
          if (Array.isArray(data.models)) {
            const fetched = data.models
              .filter((m: any) => {
                const methods = m.supportedGenerationMethods || []
                const name = (m.name || '').toLowerCase()
                return (
                  methods.includes('generateContent') &&
                  !name.includes('embedding') &&
                  !name.includes('aqa')
                )
              })
              .map((m: any) => ({
                id: m.name.replace(/^models\//, ''),
                name: m.displayName || m.name.replace(/^models\//, ''),
                contextLength: m.inputTokenLimit || 1048576
              }))

            if (fetched.length > 0) {
              const knownMap = new Map(GEMINI_MODELS.map((km) => [km.id, km]))
              const merged: DiscoveredModel[] = fetched.map((fm) => {
                const known = knownMap.get(fm.id)
                return {
                  id: fm.id,
                  name: known?.name ?? fm.name,
                  contextLength:
                    fm.contextLength ?? known?.contextLength ?? 1048576
                }
              })

              const fetchedIds = new Set(fetched.map((f) => f.id))
              for (const km of GEMINI_MODELS) {
                if (!fetchedIds.has(km.id)) {
                  merged.push(km)
                }
              }

              return merged
            }
          }
        }
      } catch (e) {
        console.warn(
          '[GeminiCloudProvider] Dynamic discovery failed, falling back to curated list',
          e
        )
      }
    }
    return GEMINI_MODELS
  }

  async testConnection(): Promise<ProviderStatus> {
    const start = Date.now()
    try {
      const url = `${BASE}/models?key=${this.apiKey}`
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) })
      if (!res.ok) {
        const err = await res.json()
        return {
          connected: false,
          error: err.error?.message ?? `HTTP ${res.status}`
        }
      }
      return {
        connected: true,
        modelCount: GEMINI_MODELS.length,
        latencyMs: Date.now() - start
      }
    } catch (e: any) {
      return { connected: false, error: e.message }
    }
  }
}
