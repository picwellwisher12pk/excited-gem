/**
 * tabClusteringService.ts — Semantic Tab Auto-Grouping into Chrome Tab Groups.
 *
 * Uses SemanticRouterProvider's local ONNX embeddings / heuristics to classify
 * tabs into meaningful workspace clusters (Development, Research, Shopping, Media, Social, Docs, etc.)
 * and groups them using the chrome.tabs / chrome.tabGroups APIs.
 */

import { getSemanticRouterInstance } from './semanticSearchService'

export type TabGroupColor =
  | 'grey'
  | 'blue'
  | 'red'
  | 'yellow'
  | 'green'
  | 'pink'
  | 'purple'
  | 'cyan'
  | 'orange'

export const CATEGORY_COLORS: Record<string, TabGroupColor> = {
  Development: 'blue',
  Documentation: 'cyan',
  Research: 'green',
  Shopping: 'yellow',
  Media: 'red',
  Social: 'purple',
  General: 'grey'
}

export interface ClusterResult {
  category: string
  color: TabGroupColor
  tabIds: number[]
}

/**
 * Clusters an array of tabs into semantic groups.
 * Only clusters groups containing at least `minTabsPerGroup` tabs.
 */
export async function clusterTabsSemantically(
  tabs: Array<{ id: number; url?: string; title?: string; windowId?: number }>,
  minTabsPerGroup = 2
): Promise<Map<number, ClusterResult[]>> {
  const router = getSemanticRouterInstance()
  
  // Group by windowId first so Chrome tab grouping doesn't mix across windows
  const perWindow = new Map<number, typeof tabs>()
  for (const tab of tabs) {
    if (!tab.url || tab.url.startsWith('chrome://')) continue
    const winId = tab.windowId || 0
    if (!perWindow.has(winId)) perWindow.set(winId, [])
    perWindow.get(winId)!.push(tab)
  }

  const windowClusters = new Map<number, ClusterResult[]>()

  for (const [winId, winTabs] of perWindow.entries()) {
    const categoryMap = new Map<string, number[]>()

    for (const tab of winTabs) {
      try {
        const cat = await router.categorizeTab(tab as any)
        if (!categoryMap.has(cat)) categoryMap.set(cat, [])
        categoryMap.get(cat)!.push(tab.id)
      } catch {
        // Skip tab on individual failure
      }
    }

    const clusters: ClusterResult[] = []
    for (const [category, tabIds] of categoryMap.entries()) {
      if (category !== 'General' && tabIds.length >= minTabsPerGroup) {
        clusters.push({
          category,
          color: CATEGORY_COLORS[category] || 'blue',
          tabIds
        })
      }
    }

    if (clusters.length > 0) {
      windowClusters.set(winId, clusters)
    }
  }

  return windowClusters
}

/**
 * Executes semantic grouping directly into Chrome Tab Groups.
 */
export async function executeSemanticTabGrouping(
  tabs: Array<{ id: number; url?: string; title?: string; windowId?: number }>
): Promise<{ totalGrouped: number; groupsCreated: number }> {
  if (typeof chrome === 'undefined' || !chrome.tabs?.group) {
    throw new Error('Chrome tab grouping API is not available')
  }

  const windowClusters = await clusterTabsSemantically(tabs)
  let totalGrouped = 0
  let groupsCreated = 0

  for (const [, clusters] of windowClusters.entries()) {
    for (const cluster of clusters) {
      try {
        // @ts-ignore
        const groupId = await chrome.tabs.group({ tabIds: cluster.tabIds })
        if (groupId && chrome.tabGroups?.update) {
          await chrome.tabGroups.update(groupId, {
            title: cluster.category,
            color: cluster.color
          })
          groupsCreated++
          totalGrouped += cluster.tabIds.length
        }
      } catch (err) {
        console.warn(`[tabClusteringService] Could not group category ${cluster.category}:`, err)
      }
    }
  }

  return { totalGrouped, groupsCreated }
}
