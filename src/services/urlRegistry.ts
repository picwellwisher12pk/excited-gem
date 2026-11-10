/**
 * URL Registry utilities.
 * FNV-1a 32-bit hash for URL content-addressing.
 * O(1) lookup, automatic dedup across sessions and collections.
 */

import type { UrlEntry, UrlRegistry } from './storageTypes'

/** FNV-1a 32-bit hash → 8-char hex string */
export function hashUrl(url: string): string {
  let hash = 0x811c9dc5
  for (let i = 0; i < url.length; i++) {
    hash ^= url.charCodeAt(i)
    hash = (hash * 0x01000193) >>> 0
  }
  return hash.toString(16).padStart(8, '0')
}

/**
 * Find or create a UrlEntry in the registry.
 * Always increments freq when found.
 */
export function upsertUrl(
  registry: UrlRegistry,
  url: string,
  title: string,
  now = Date.now()
): { registry: UrlRegistry; hash: string } {
  const hash = hashUrl(url)
  const existing = registry[hash]

  if (existing) {
    registry[hash] = {
      ...existing,
      title: title || existing.title,
      titleUpdatedAt: title ? now : existing.titleUpdatedAt,
      freq: existing.freq + 1
    }
  } else {
    registry[hash] = {
      url,
      title: title || url,
      titleUpdatedAt: now,
      firstSeen: now,
      freq: 1
    }
  }

  return { registry, hash }
}

/**
 * Decrement freq for a set of hashes.
 * Entries reaching freq <= 0 are candidates for GC.
 */
export function decrementFreqs(
  registry: UrlRegistry,
  hashes: string[]
): UrlRegistry {
  const updated = { ...registry }
  for (const hash of hashes) {
    if (updated[hash]) {
      updated[hash] = { ...updated[hash], freq: updated[hash].freq - 1 }
    }
  }
  return updated
}

/**
 * Remove all entries with freq <= 0 from the registry.
 * Call after any delete operation.
 */
export function gcRegistry(registry: UrlRegistry): UrlRegistry {
  const cleaned: UrlRegistry = {}
  for (const [hash, entry] of Object.entries(registry)) {
    if (entry.freq > 0) {
      cleaned[hash] = entry
    }
  }
  return cleaned
}

/**
 * Hydrate a hash to its UrlEntry. Returns a fallback if missing.
 */
export function hydrateHash(
  registry: UrlRegistry,
  hash: string
): UrlEntry {
  return (
    registry[hash] ?? {
      url: 'about:blank',
      title: 'Missing',
      titleUpdatedAt: 0,
      firstSeen: 0,
      freq: 0
    }
  )
}

/**
 * Update lastAccessed for a hash (user opened the URL).
 */
export function touchUrl(
  registry: UrlRegistry,
  hash: string,
  now = Date.now()
): UrlRegistry {
  if (!registry[hash]) return registry
  return {
    ...registry,
    [hash]: { ...registry[hash], lastAccessed: now }
  }
}

/**
 * Suggest dead entries to prune (freq=0 or very old+cold).
 * Returns hashes safe to remove.
 */
export function suggestPrunable(
  registry: UrlRegistry,
  maxAgeDays = 90
): string[] {
  const cutoff = Date.now() - maxAgeDays * 24 * 60 * 60 * 1000
  return Object.entries(registry)
    .filter(([, e]) => e.freq <= 0 || (e.freq === 1 && e.firstSeen < cutoff))
    .map(([hash]) => hash)
}
