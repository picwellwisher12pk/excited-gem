/**
 * BaseProvider — Abstract interface every AI provider must implement.
 * Supports both streaming (token-by-token) and non-streaming responses.
 */

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface StreamChunk {
  text: string
  done: boolean
}

export interface DiscoveredModel {
  id: string
  name: string
  contextLength?: number
  size?: number
  modified?: string
}

export interface ProviderStatus {
  connected: boolean
  modelCount?: number
  error?: string
  latencyMs?: number
}

export abstract class BaseProvider {
  abstract readonly type: string
  abstract readonly supportsStreaming: boolean

  /**
   * Send a chat completion request. Returns the full response text.
   */
  abstract chat(
    messages: ChatMessage[],
    abortSignal?: AbortSignal
  ): Promise<string>

  /**
   * Stream a chat completion. Yields chunks as they arrive.
   * Default implementation falls back to non-streaming chat().
   */
  async *stream(
    messages: ChatMessage[],
    abortSignal?: AbortSignal
  ): AsyncGenerator<StreamChunk> {
    const text = await this.chat(messages, abortSignal)
    yield { text, done: true }
  }

  /**
   * Discover available models from this provider.
   * Cloud providers return a curated static list.
   * Local providers query their REST API.
   */
  abstract discoverModels(): Promise<DiscoveredModel[]>

  /**
   * Test connectivity and return status.
   */
  abstract testConnection(): Promise<ProviderStatus>
}
