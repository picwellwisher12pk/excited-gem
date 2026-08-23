/**
 * Singleton bounded LRU Favicon Cache by domain.
 * Ensures that all tabs belonging to the same domain (e.g. YouTube, GitHub) share a single cached favicon.
 */

import debounce from 'lodash/debounce'

const MAX_CACHE_SIZE = 500

export class FaviconCache {
  private static instance: FaviconCache
  private cache: Map<string, string>

  private constructor() {
    this.cache = new Map()
    this.loadFromStorage()
  }

  public static getInstance(): FaviconCache {
    if (!FaviconCache.instance) {
      FaviconCache.instance = new FaviconCache()
    }
    return FaviconCache.instance
  }

  private loadFromStorage() {
    try {
      const stored = sessionStorage.getItem('favicon_cache')
      if (stored) {
        const parsed = JSON.parse(stored)
        Object.entries(parsed).forEach(([domain, url]) => {
          this.cache.set(domain, url as string)
        })
      }
    } catch (e) {
      console.error('Failed to load favicon cache', e)
    }
  }

  private debouncedSaveToStorage = debounce(() => {
    try {
      const obj = Object.fromEntries(this.cache)
      sessionStorage.setItem('favicon_cache', JSON.stringify(obj))
    } catch (e) {
      console.error('Failed to save favicon cache', e)
    }
  }, 500)

  public extractDomain(url: string): string | null {
    try {
      if (!url) return null
      const parsed = new URL(url)
      if (
        parsed.protocol.startsWith('chrome') ||
        parsed.protocol.startsWith('edge') ||
        parsed.protocol.startsWith('about')
      ) {
        return parsed.protocol.replace(':', '')
      }
      return parsed.hostname.toLowerCase()
    } catch {
      return null
    }
  }

  public get(url: string): string | undefined {
    const domain = this.extractDomain(url)
    if (!domain) return undefined

    if (this.cache.has(domain)) {
      // Refresh LRU position
      const val = this.cache.get(domain)!
      this.cache.delete(domain)
      this.cache.set(domain, val)
      return val
    }
    return undefined
  }

  public set(url: string, faviconUrl: string) {
    const domain = this.extractDomain(url)
    if (!domain || !faviconUrl) return

    // Maintain bounded LRU capacity
    if (this.cache.size >= MAX_CACHE_SIZE && !this.cache.has(domain)) {
      const oldestKey = this.cache.keys().next().value
      if (oldestKey) this.cache.delete(oldestKey)
    }

    this.cache.delete(domain)
    this.cache.set(domain, faviconUrl)
    this.debouncedSaveToStorage()
  }

  public getOrSet(url: string, faviconUrl?: string): string {
    const cached = this.get(url)
    if (cached) {
      return cached
    }

    const domain = this.extractDomain(url)
    const finalFavicon =
      faviconUrl ||
      (domain && !domain.startsWith('chrome')
        ? `https://www.google.com/s2/favicons?domain=${domain}&sz=32`
        : '')

    if (finalFavicon) {
      this.set(url, finalFavicon)
    }
    return finalFavicon
  }
}

export const faviconCache = FaviconCache.getInstance()
