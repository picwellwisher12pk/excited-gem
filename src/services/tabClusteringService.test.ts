import { describe, it, expect } from 'bun:test'
import { clusterTabsSemantically } from './tabClusteringService'

describe('tabClusteringService', () => {
  const dummyTabs = [
    { id: 101, title: 'GitHub: Issues & Pull Requests', url: 'https://github.com/issues', windowId: 1 },
    { id: 102, title: 'Stack Overflow: React Hooks', url: 'https://stackoverflow.com/questions/123', windowId: 1 },
    { id: 103, title: 'Amazon: Wireless Headphones', url: 'https://amazon.com/dp/xyz', windowId: 1 },
    { id: 104, title: 'eBay: Electronics Deals', url: 'https://ebay.com/itm/123', windowId: 1 },
    { id: 105, title: 'Random Single Tab', url: 'https://example.com', windowId: 1 }
  ]

  it('clusters tabs with 2+ matching categories in the same window', async () => {
    const clustersMap = await clusterTabsSemantically(dummyTabs, 2)
    const winClusters = clustersMap.get(1)

    expect(winClusters).toBeDefined()
    expect(winClusters!.length).toBeGreaterThanOrEqual(1)

    // Check that Development cluster captured the dev tabs
    const devCluster = winClusters!.find((c) => c.category === 'Development')
    expect(devCluster).toBeDefined()
    expect(devCluster!.tabIds).toContain(101)
    expect(devCluster!.tabIds).toContain(102)

    // Check that Shopping cluster captured the shopping tabs
    const shopCluster = winClusters!.find((c) => c.category === 'Shopping')
    expect(shopCluster).toBeDefined()
    expect(shopCluster!.tabIds).toContain(103)
    expect(shopCluster!.tabIds).toContain(104)
  })

  it('does not group tabs if minimum threshold is not met', async () => {
    const singleTabs = [
      { id: 201, title: 'GitHub', url: 'https://github.com', windowId: 2 },
      { id: 202, title: 'Amazon', url: 'https://amazon.com', windowId: 2 }
    ]

    const clustersMap = await clusterTabsSemantically(singleTabs, 2)
    expect(clustersMap.has(2)).toBe(false)
  })
})
