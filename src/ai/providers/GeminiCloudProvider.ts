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
  { id: 'gemini-3.7-flash', name: 'Gemini 3.7 Flash', contextLength: 1048576 },
  { id: 'gemini-3.7-pro', name: 'Gemini 3.7 Pro', contextLength: 2097152 },
  {
    id: 'gemini-3.7-flash-thinking',
    name: 'Gemini 3.7 Flash Thinking',
    contextLength: 1048576
  },
  { id: 'gemini-3.6-pro', name: 'Gemini 3.6 Pro', contextLength: 2097152 },
  { id: 'gemini-3.6-flash', name: 'Gemini 3.6 Flash', contextLength: 1048576 },
  { id: 'gemini-3.5-pro', name: 'Gemini 3.5 Pro', contextLength: 2097152 },
  { id: 'gemini-3.5-flash', name: 'Gemini 3.5 Flash', contextLength: 1048576 }
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

  async chat(
    messages: ChatMessage[],
    abortSignal?: AbortSignal
  ): Promise<string> {
    const url = `${BASE}/models/${this.model}:generateContent?key=${this.apiKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.buildRequest(messages)),
      signal: abortSignal
    })
    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Gemini error ${res.status}: ${err}`)
    }
    const data = await res.json()
    return data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
  }

  async *stream(
    messages: ChatMessage[],
    abortSignal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    const url = `${BASE}/models/${this.model}:streamGenerateContent?alt=sse&key=${this.apiKey}`
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(this.buildRequest(messages)),
      signal: abortSignal
    })
    if (!res.ok) throw new Error(`Gemini stream error ${res.status}`)

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
                const isLegacy = /gemini-(1\.|2\.|3\.0|3\.1|3\.2)/i.test(name)
                return (
                  methods.includes('generateContent') &&
                  !isLegacy &&
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
