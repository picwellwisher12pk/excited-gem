/**
 * semanticSearchService.ts — In-browser semantic search using SemanticRouterProvider.
 *
 * Computes embeddings for tabs (title + url) and ranks them against a user query
 * using cosine similarity via Transformers.js / ONNX.
 */

import { SemanticRouterProvider } from '../ai/providers/SemanticRouterProvider'

let routerInstance: SemanticRouterProvider | null = null

export function getSemanticRouterInstance(): SemanticRouterProvider {
  if (!routerInstance) {
    routerInstance = new SemanticRouterProvider()
  }
  return routerInstance
}

export interface SemanticSearchResult<T> {
  item: T
  score: number
}

/**
 * Filters and ranks items (e.g. tabs) semantically given a query.
 * Falls back safely to empty array if query is empty or router fails.
 */
export async function filterTabsSemantically<T extends { title?: string; url?: string; id?: number | string }>(
  tabs: T[],
  query: string,
  threshold = 0.25
): Promise<T[]> {
  const trimmed = query.trim()
  if (!trimmed || !tabs || tabs.length === 0) return tabs

  const router = getSemanticRouterInstance()

  try {
    const rawTabs = tabs as unknown as chrome.tabs.Tab[]
    const { matchedTabs } = await router.filterTabs(rawTabs, trimmed, threshold)
    
    // Maintain match order returned by score
    const matchedMap = new Map(matchedTabs.map((t) => [t.id, t]))
    const result: T[] = []
    
    for (const mt of matchedTabs) {
      const orig = tabs.find((t) => t.id === mt.id)
      if (orig) result.push(orig)
    }

    return result
  } catch (err) {
    console.warn('[semanticSearchService] Semantic search failed, returning original tabs:', err)
    return tabs
  }
}
