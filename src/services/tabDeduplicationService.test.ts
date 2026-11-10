import { describe, it, expect } from 'bun:test'
import { findSemanticDuplicates } from './tabDeduplicationService'

describe('tabDeduplicationService', () => {
  it('detects tabs discussing the same problem with different URLs', async () => {
    const tabs = [
      {
        id: 1,
        title: 'How to fix React hydration failed error in Next.js',
        url: 'https://stackoverflow.com/questions/1111'
      },
      {
        id: 2,
        title: 'Fix React hydration failed error Next.js documentation',
        url: 'https://nextjs.org/docs/messages/react-hydration-error'
      },
      {
        id: 3,
        title: 'Spotify Web Player Listen to Music',
        url: 'https://open.spotify.com'
      }
    ]

    const groups = await findSemanticDuplicates(tabs)
    expect(groups.length).toBeGreaterThanOrEqual(1)

    const group = groups[0]
    expect(group.tabs.some((t) => t.id === 1)).toBe(true)
    expect(group.tabs.some((t) => t.id === 2)).toBe(true)
    expect(group.tabs.some((t) => t.id === 3)).toBe(false)
  })

  it('returns empty array when fewer than 2 valid tabs', async () => {
    const result = await findSemanticDuplicates([{ id: 1, title: 'Single Tab', url: 'https://example.com' }])
    expect(result).toEqual([])
  })
})
