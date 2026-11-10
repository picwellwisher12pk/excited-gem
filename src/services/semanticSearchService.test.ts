import { describe, it, expect, } from 'bun:test'
import { filterTabsSemantically } from './semanticSearchService'

describe('semanticSearchService', () => {
  const dummyTabs = [
    { id: 1, title: 'GitHub - Pull Requests', url: 'https://github.com/pulls' },
    { id: 2, title: 'Amazon Checkout & Cart', url: 'https://amazon.com/cart' },
    { id: 3, title: 'Spotify Web Player: Music', url: 'https://open.spotify.com' },
    { id: 4, title: 'Vite documentation guide', url: 'https://vitejs.dev/guide' }
  ]

  it('returns all tabs when query is empty', async () => {
    const result = await filterTabsSemantically(dummyTabs, '')
    expect(result.length).toBe(4)
  })

  it('filters coding/dev tabs using fallback heuristic or model', async () => {
    const result = await filterTabsSemantically(dummyTabs, 'github pull request')
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result.some(t => t.id === 1)).toBe(true)
  })

  it('filters shopping tabs', async () => {
    const result = await filterTabsSemantically(dummyTabs, 'checkout and shopping')
    expect(result.length).toBeGreaterThanOrEqual(1)
    expect(result.some(t => t.id === 2)).toBe(true)
  })

  it('handles empty tab array gracefully', async () => {
    const result = await filterTabsSemantically([], 'anything')
    expect(result).toEqual([])
  })
})
