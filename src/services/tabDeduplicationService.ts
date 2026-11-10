/**
 * tabDeduplicationService.ts — Semantic Duplicate & Redundancy Detection.
 *
 * Identifies tabs with distinct URLs that cover identical or near-identical topics
 * using cosine similarity of embeddings (SemanticRouterProvider).
 */

import { getSemanticRouterInstance } from './semanticSearchService'

export interface RedundantTabGroup {
  id: string
  topic: string
  avgSimilarity: number
  tabs: Array<{
    id: number
    title: string
    url: string
    favIconUrl?: string
    windowId?: number
  }>
}

function dotProduct(a: Float32Array | number[], b: Float32Array | number[]): number {
  let sum = 0
  const len = Math.min(a.length, b.length)
  for (let i = 0; i < len; i++) sum += a[i] * b[i]
  return sum
}

/**
 * Finds clusters of tabs with distinct URLs that have high semantic overlap.
 * @param tabs List of open tabs
 * @param similarityThreshold Threshold above which tabs are considered redundant (default 0.82)
 */
export async function findSemanticDuplicates(
  tabs: Array<{ id: number; title?: string; url?: string; favIconUrl?: string; windowId?: number }>,
  similarityThreshold = 0.82
): Promise<RedundantTabGroup[]> {
  const validTabs = tabs.filter(
    (t) => t.id && t.url && !t.url.startsWith('chrome://') && !t.url.startsWith('edge://')
  )

  if (validTabs.length < 2) return []

  const router = getSemanticRouterInstance()
  const extractor = (router as any).extractor

  // If local ONNX model is available, compute pairwise embedding similarity
  if (extractor) {
    try {
      const embeddings: Array<{ tab: typeof validTabs[0]; vector: Float32Array }> = []

      for (const tab of validTabs) {
        const text = `${tab.title || ''} ${tab.url || ''}`.trim()
        const out = await extractor(text, { pooling: 'mean', normalize: true })
        embeddings.push({ tab, vector: out.data })
      }

      const groups: RedundantTabGroup[] = []
      const visited = new Set<number>()

      for (let i = 0; i < embeddings.length; i++) {
        if (visited.has(embeddings[i].tab.id)) continue

        const cluster = [embeddings[i].tab]
        let totalSim = 1.0

        for (let j = i + 1; j < embeddings.length; j++) {
          if (visited.has(embeddings[j].tab.id)) continue
          
          // Don't pair exact identical URLs (those are already handled by exact URL deduplication)
          if (embeddings[i].tab.url === embeddings[j].tab.url) continue

          const sim = dotProduct(embeddings[i].vector, embeddings[j].vector)
          if (sim >= similarityThreshold) {
            cluster.push(embeddings[j].tab)
            totalSim += sim
            visited.add(embeddings[j].tab.id)
          }
        }

        if (cluster.length > 1) {
          visited.add(embeddings[i].tab.id)
          const avg = totalSim / cluster.length
          groups.push({
            id: `sem-${embeddings[i].tab.id}`,
            topic: embeddings[i].tab.title || 'Similar Topic',
            avgSimilarity: Math.round(avg * 100),
            tabs: cluster.map((t) => ({
              id: t.id,
              title: t.title || '',
              url: t.url || '',
              favIconUrl: t.favIconUrl,
              windowId: t.windowId
            }))
          })
        }
      }

      return groups
    } catch (err) {
      console.warn('[tabDeduplicationService] ONNX similarity calculation failed, using heuristic:', err)
    }
  }

  // Fallback lexical heuristic for environments without active WebGPU/WASM model
  return findHeuristicDuplicates(validTabs)
}

function findHeuristicDuplicates(
  tabs: Array<{ id: number; title?: string; url?: string; favIconUrl?: string; windowId?: number }>
): RedundantTabGroup[] {
  const groups: RedundantTabGroup[] = []
  const visited = new Set<number>()

  for (let i = 0; i < tabs.length; i++) {
    if (visited.has(tabs[i].id)) continue
    const t1 = (tabs[i].title || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
    if (t1.length < 8) continue

    const words1 = new Set(t1.split(/\s+/))
    const cluster = [tabs[i]]

    for (let j = i + 1; j < tabs.length; j++) {
      if (visited.has(tabs[j].id) || tabs[i].url === tabs[j].url) continue
      const t2 = (tabs[j].title || '').toLowerCase().replace(/[^a-z0-9 ]/g, '').trim()
      if (t2.length < 8) continue

      const words2 = new Set(t2.split(/\s+/))
      const intersection = [...words1].filter((w) => words2.has(w) && w.length > 3)

      if (intersection.length >= 3) {
        cluster.push(tabs[j])
        visited.add(tabs[j].id)
      }
    }

    if (cluster.length > 1) {
      visited.add(tabs[i].id)
      groups.push({
        id: `heur-${tabs[i].id}`,
        topic: tabs[i].title || 'Similar Content',
        avgSimilarity: 85,
        tabs: cluster.map((t) => ({
          id: t.id,
          title: t.title || '',
          url: t.url || '',
          favIconUrl: t.favIconUrl,
          windowId: t.windowId
        }))
      })
    }
  }

  return groups
}
