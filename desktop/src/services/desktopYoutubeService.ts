import { extractVideoId, parseIsoDuration } from '../../../src/utils/youtube'
import type { UnifiedTab } from '../../../src/adapter/types'
import { getBrowserAdapter } from '../../../src/adapter'

export interface CachedYoutubeVideo {
  title?: string
  duration: number // in seconds
  timestamp: number
}

export interface YoutubeFetchError {
  videoId?: string
  title?: string
  error: string
  timestamp: number
}

const STORAGE_CACHE_KEY = 'excited_gem_desktop_yt_cache'
const STORAGE_API_KEY = 'excited_gem_yt_api_key'

class DesktopYoutubeService {
  private cache: Map<string, CachedYoutubeVideo> = new Map()
  private apiKey: string = ''
  private listeners: Set<() => void> = new Set()
  private inFlightVideoIds: Set<string> = new Set()
  private lastErrors: YoutubeFetchError[] = []

  constructor() {
    this.loadFromStorage()
  }

  public getLastErrors(): YoutubeFetchError[] {
    return [...this.lastErrors]
  }

  public clearErrors(): void {
    this.lastErrors = []
    this.notify()
  }

  public addError(error: string, videoId?: string, title?: string) {
    this.lastErrors.unshift({
      videoId,
      title,
      error,
      timestamp: Date.now()
    })
    if (this.lastErrors.length > 50) {
      this.lastErrors.pop()
    }
    this.notify()
  }

  private loadFromStorage() {
    if (typeof localStorage === 'undefined') return
    try {
      const savedKey = localStorage.getItem(STORAGE_API_KEY)
      if (savedKey) this.apiKey = savedKey

      const savedData = localStorage.getItem(STORAGE_CACHE_KEY)
      if (savedData) {
        const parsed = JSON.parse(savedData)
        for (const [id, item] of Object.entries(parsed)) {
          if (item && typeof item === 'object') {
            this.cache.set(id, item as CachedYoutubeVideo)
          }
        }
      }
    } catch (e) {
      console.warn('[DesktopYoutubeService] Error loading cache:', e)
    }
  }

  private persistCache() {
    if (typeof localStorage === 'undefined') return
    try {
      const obj: Record<string, CachedYoutubeVideo> = {}
      for (const [id, val] of this.cache.entries()) {
        obj[id] = val
      }
      localStorage.setItem(STORAGE_CACHE_KEY, JSON.stringify(obj))
    } catch (e) {
      console.warn('[DesktopYoutubeService] Error saving cache:', e)
    }
  }

  public subscribe(callback: () => void): () => void {
    this.listeners.add(callback)
    return () => this.listeners.delete(callback)
  }

  private notify() {
    this.listeners.forEach((cb) => {
      try {
        cb()
      } catch (err) {
        console.error('[DesktopYoutubeService] Listener error:', err)
      }
    })
  }

  public getApiKey(): string {
    return this.apiKey
  }

  public setApiKey(key: string) {
    this.apiKey = key.trim()
    if (typeof localStorage !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_API_KEY, this.apiKey)
      } catch {}
    }
    // Also broadcast to connected extension bridge if adapter is available
    try {
      const adapter = getBrowserAdapter()
      if (adapter && 'setYoutubeApiKey' in adapter) {
        ;(adapter as any).setYoutubeApiKey(this.apiKey)
      }
    } catch {}
    this.notify()
  }

  public getCachedInfo(videoId: string): CachedYoutubeVideo | undefined {
    return this.cache.get(videoId)
  }

  public getDurationForUrl(url?: string): number | undefined {
    if (!url) return undefined
    const vId = extractVideoId(url)
    if (!vId) return undefined
    const item = this.cache.get(vId)
    return item?.duration && item.duration > 0 ? item.duration : undefined
  }

  /**
   * Imports cached data received from browser extension (via bridge)
   */
  public importExtensionCache(
    apiCache: Record<string, { title?: string; duration?: number; timestamp?: number }>,
    infoMap?: Record<string, { duration?: number; currentTime?: number; title?: string }>,
    extensionApiKey?: string
  ) {
    let changed = false

    if (extensionApiKey && !this.apiKey) {
      this.apiKey = extensionApiKey
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(STORAGE_API_KEY, extensionApiKey)
        } catch {}
      }
      changed = true
    }

    if (apiCache) {
      for (const [id, data] of Object.entries(apiCache)) {
        if (data && typeof data.duration === 'number' && data.duration > 0) {
          const existing = this.cache.get(id)
          if (!existing || existing.duration !== data.duration) {
            this.cache.set(id, {
              title: data.title || existing?.title,
              duration: data.duration,
              timestamp: data.timestamp || Date.now()
            })
            changed = true
          }
        }
      }
    }

    if (infoMap) {
      for (const [url, info] of Object.entries(infoMap)) {
        if (info && typeof info.duration === 'number' && info.duration > 0) {
          const vId = extractVideoId(url)
          if (vId) {
            const existing = this.cache.get(vId)
            if (!existing || existing.duration !== info.duration) {
              this.cache.set(vId, {
                title: info.title || existing?.title,
                duration: info.duration,
                timestamp: Date.now()
              })
              changed = true
            }
          }
        }
      }
    }

    if (changed) {
      this.persistCache()
      this.notify()
    }
  }

  /**
   * Test a YouTube Data API v3 key
   */
  public async testApiKey(key: string): Promise<{ valid: boolean; error?: string }> {
    const trimmed = key.trim()
    if (!trimmed) {
      return { valid: false, error: 'API key is empty' }
    }
    try {
      const url = `https://www.googleapis.com/youtube/v3/videos?id=dQw4w9WgXcQ&part=snippet&key=${trimmed}`
      const res = await fetch(url)
      if (res.ok) {
        return { valid: true }
      }
      let errorMsg = `HTTP ${res.status}: ${res.statusText}`
      try {
        const errorJson = await res.json()
        if (errorJson?.error?.message) {
          errorMsg = errorJson.error.message
        }
      } catch {}
      return { valid: false, error: errorMsg }
    } catch (err: any) {
      return { valid: false, error: err?.message || 'Network error verifying key' }
    }
  }

  /**
   * Directly fetch durations from YouTube Data API v3
   */
  public async fetchFromYoutubeApi(videoIds: string[], apiKeyOverride?: string): Promise<Record<string, number>> {
    const key = apiKeyOverride || this.apiKey
    if (!key) {
      const err = 'No YouTube API Key provided. Set one in the settings bar or sync from extension.'
      this.addError(err)
      throw new Error(err)
    }

    const uniqueIds = Array.from(new Set(videoIds)).filter(Boolean)
    if (uniqueIds.length === 0) return {}

    const results: Record<string, number> = {}

    // Batch in chunks of 50 (YouTube Data API limit)
    const chunkSize = 50
    for (let i = 0; i < uniqueIds.length; i += chunkSize) {
      const chunk = uniqueIds.slice(i, i + chunkSize)
      const url = `https://www.googleapis.com/youtube/v3/videos?id=${chunk.join(',')}&part=snippet,contentDetails&key=${key}`
      let res: Response
      try {
        res = await fetch(url)
      } catch (networkErr: any) {
        const msg = `Network fetch error: ${networkErr?.message || networkErr}`
        for (const vId of chunk) {
          this.addError(msg, vId)
        }
        throw new Error(msg)
      }

      if (!res.ok) {
        let errorMsg = `HTTP ${res.status}: ${res.statusText}`
        try {
          const errorJson = await res.json()
          if (errorJson?.error?.message) {
            errorMsg = errorJson.error.message
          }
        } catch {}
        const fullError = `YouTube API Error (${res.status}): ${errorMsg}`
        for (const vId of chunk) {
          this.addError(fullError, vId)
        }
        throw new Error(fullError)
      }

      const data = await res.json()
      const returnedIds = new Set<string>()

      if (Array.isArray(data.items)) {
        for (const item of data.items) {
          const vId = item.id
          returnedIds.add(vId)
          const durationStr = item.contentDetails?.duration
          const durationSec = durationStr ? parseIsoDuration(durationStr) : 0
          const title = item.snippet?.title

          this.cache.set(vId, {
            title,
            duration: durationSec,
            timestamp: Date.now()
          })
          results[vId] = durationSec

          if (durationSec === 0) {
            this.addError('Live stream or zero-duration video', vId, title)
          }
        }
      }

      for (const vId of chunk) {
        if (!returnedIds.has(vId)) {
          this.addError('Video not found or is private/deleted', vId)
        }
      }
    }

    this.persistCache()
    this.notify()
    return results
  }

  /**
   * Fallback: Fetch a single video duration by scraping its public HTML page
   * Uses Tauri native command when available to bypass webview CORS restrictions
   */
  public async fetchViaWatchPage(videoId: string): Promise<number | null> {
    if (!videoId || this.inFlightVideoIds.has(videoId)) return null
    this.inFlightVideoIds.add(videoId)

    try {
      // 1. Try native desktop command first (bypasses browser CORS completely)
      if (typeof window !== 'undefined' && (window as any).__TAURI_INTERNALS__) {
        try {
          const { invoke } = await import('@tauri-apps/api/core')
          const nativeRes = await invoke<{ video_id: string; title?: string; duration: number }>(
            'fetch_youtube_video_native',
            { videoId }
          )
          if (nativeRes && nativeRes.duration > 0) {
            this.cache.set(videoId, {
              title: nativeRes.title,
              duration: nativeRes.duration,
              timestamp: Date.now()
            })
            this.persistCache()
            this.notify()
            return nativeRes.duration
          }
        } catch (nativeErr: any) {
          const errMsg = typeof nativeErr === 'string' ? nativeErr : nativeErr?.message || 'Native fetch failed'
          this.addError(errMsg, videoId)
        }
      }

      // 2. Direct browser fetch fallback (if allowed or mock)
      try {
        const res = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: {
            'Accept-Language': 'en-US,en;q=0.9'
          }
        })
        if (!res.ok) {
          this.addError(`HTTP ${res.status}: Failed to load watch page`, videoId)
          return null
        }
        const html = await res.text()

        // 1. Look for approxDurationMs
        const msMatch = html.match(/"approxDurationMs":"(\d+)"/)
        if (msMatch) {
          const ms = parseInt(msMatch[1], 10)
          const seconds = Math.floor(ms / 1000)
          if (seconds > 0) {
            const titleMatch = html.match(/<title>([^<]+) - YouTube<\/title>/)
            this.cache.set(videoId, {
              title: titleMatch ? titleMatch[1] : undefined,
              duration: seconds,
              timestamp: Date.now()
            })
            this.persistCache()
            this.notify()
            return seconds
          }
        }

        // 2. Look for itemprop="duration" content="PT...S"
        const metaMatch = html.match(/itemprop="duration"\s+content="([^"]+)"/)
        if (metaMatch) {
          const seconds = parseIsoDuration(metaMatch[1])
          if (seconds > 0) {
            this.cache.set(videoId, {
              duration: seconds,
              timestamp: Date.now()
            })
            this.persistCache()
            this.notify()
            return seconds
          }
        }

        this.addError('Could not find duration in watch page HTML', videoId)
      } catch (corsErr: any) {
        if (!this.lastErrors.some((e) => e.videoId === videoId)) {
          this.addError(
            'Failed to fetch watch page (CORS restricted). Please configure a YouTube API Key.',
            videoId
          )
        }
      }
    } finally {
      this.inFlightVideoIds.delete(videoId)
    }
    return null
  }

  /**
   * Fetches missing durations for all provided tabs using available methods
   */
  public async fetchMissingDurationsForTabs(
    tabs: UnifiedTab[],
    onProgress?: (completed: number, total: number) => void
  ): Promise<{ updated: number; errors: YoutubeFetchError[] }> {
    this.clearErrors()
    const missingVideoIds: string[] = []

    for (const t of tabs) {
      if (!t.url) continue
      const vId = extractVideoId(t.url)
      if (!vId) continue

      const cached = this.cache.get(vId)
      const existingDuration = t.youtubeInfo?.duration || cached?.duration || 0
      if (existingDuration <= 0) {
        if (!missingVideoIds.includes(vId)) {
          missingVideoIds.push(vId)
        }
      }
    }

    if (missingVideoIds.length === 0) {
      return { updated: 0, errors: [] }
    }

    let fetchedCount = 0

    // 1. If API key is available, use fast batch YouTube Data API
    if (this.apiKey) {
      try {
        const results = await this.fetchFromYoutubeApi(missingVideoIds, this.apiKey)
        fetchedCount = Object.values(results).filter((d) => d > 0).length
        onProgress?.(fetchedCount, missingVideoIds.length)
        return { updated: fetchedCount, errors: this.getLastErrors() }
      } catch (e: any) {
        console.warn('[DesktopYoutubeService] Batch API fetch failed, falling back to native scraper:', e)
      }
    }

    // 2. Otherwise fallback to watch page scraper with limited concurrency
    const concurrency = 3
    for (let i = 0; i < missingVideoIds.length; i += concurrency) {
      const slice = missingVideoIds.slice(i, i + concurrency)
      const promises = slice.map((id) => this.fetchViaWatchPage(id))
      const outcomes = await Promise.allSettled(promises)
      for (const res of outcomes) {
        if (res.status === 'fulfilled' && res.value && res.value > 0) {
          fetchedCount++
        }
      }
      onProgress?.(Math.min(i + concurrency, missingVideoIds.length), missingVideoIds.length)
    }

    return { updated: fetchedCount, errors: this.getLastErrors() }
  }
}

export function formatVideoDuration(seconds?: number): string {
  if (!seconds || seconds <= 0) return ''
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  }
  return `${m}:${s.toString().padStart(2, '0')}`
}

export const desktopYoutubeService = new DesktopYoutubeService()
