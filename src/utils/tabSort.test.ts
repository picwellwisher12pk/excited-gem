import { describe, expect, it } from 'bun:test'
import {
  getVideoDuration,
  isVideoTab,
  sortTabsByCriteria,
} from './tabSort'

describe('tabSort utility', () => {
  describe('getVideoDuration & isVideoTab', () => {
    it('should extract duration from youtubeInfo', () => {
      const tab = {
        id: 1,
        url: 'https://www.youtube.com/watch?v=abc',
        youtubeInfo: { duration: 185 }
      }
      expect(getVideoDuration(tab)).toBe(185)
      expect(isVideoTab(tab)).toBe(true)
    })

    it('should extract duration from generic videoInfo', () => {
      const tab = {
        id: 2,
        url: 'https://vimeo.com/123456',
        videoInfo: { duration: 240 }
      }
      expect(getVideoDuration(tab)).toBe(240)
      expect(isVideoTab(tab)).toBe(true)
    })

    it('should identify video tab even if duration is missing or 0', () => {
      const tab = {
        id: 3,
        url: 'https://www.youtube.com/watch?v=xyz'
      }
      expect(getVideoDuration(tab)).toBe(null)
      expect(isVideoTab(tab)).toBe(true)
    })

    it('should return null / false for regular non-video tabs', () => {
      const tab = {
        id: 4,
        url: 'https://github.com/trending'
      }
      expect(getVideoDuration(tab)).toBe(null)
      expect(isVideoTab(tab)).toBe(false)
    })
  })

  describe('Pure Video Window Sorting', () => {
    const videoTabs = [
      {
        id: 1,
        windowId: 10,
        index: 0,
        url: 'https://youtube.com/watch?v=1',
        youtubeInfo: { duration: 300 }
      },
      {
        id: 2,
        windowId: 10,
        index: 1,
        url: 'https://youtube.com/watch?v=2',
        youtubeInfo: { duration: 45 }
      },
      {
        id: 3,
        windowId: 10,
        index: 2,
        url: 'https://youtube.com/watch?v=3',
        youtubeInfo: { duration: 120 }
      }
    ]

    it('sorts video tabs in ascending order (shortest first)', () => {
      const sorted = sortTabsByCriteria(videoTabs, {
        sortBy: 'duration',
        direction: 'asc'
      })
      expect(sorted.map((t) => t.id)).toEqual([2, 3, 1])
    })

    it('sorts video tabs in descending order (longest first)', () => {
      const sorted = sortTabsByCriteria(videoTabs, {
        sortBy: 'duration',
        direction: 'desc'
      })
      expect(sorted.map((t) => t.id)).toEqual([1, 3, 2])
    })
  })

  describe('Mixed Window - Grouped Mode', () => {
    const mixedTabs = [
      {
        id: 10,
        windowId: 1,
        index: 0,
        title: 'Docs',
        url: 'https://docs.google.com'
      },
      {
        id: 11,
        windowId: 1,
        index: 1,
        title: 'Long Video',
        url: 'https://youtube.com/watch?v=long',
        youtubeInfo: { duration: 600 }
      },
      {
        id: 12,
        windowId: 1,
        index: 2,
        title: 'GitHub',
        url: 'https://github.com'
      },
      {
        id: 13,
        windowId: 1,
        index: 3,
        title: 'Short Video',
        url: 'https://youtube.com/watch?v=short',
        youtubeInfo: { duration: 90 }
      },
      {
        id: 14,
        windowId: 1,
        index: 4,
        title: 'Medium Video',
        url: 'https://youtube.com/watch?v=med',
        youtubeInfo: { duration: 250 }
      }
    ]

    it('groups videos first and sorts them ascending, regular tabs follow in relative order', () => {
      const sorted = sortTabsByCriteria(mixedTabs, {
        sortBy: 'duration',
        direction: 'asc',
        mixedMode: 'grouped',
        videoPlacement: 'first'
      })

      // Videos (90, 250, 600) -> [13, 14, 11]
      // Followed by regular tabs -> [10, 12]
      expect(sorted.map((t) => t.id)).toEqual([13, 14, 11, 10, 12])
    })

    it('groups videos first and sorts them descending', () => {
      const sorted = sortTabsByCriteria(mixedTabs, {
        sortBy: 'duration',
        direction: 'desc',
        mixedMode: 'grouped',
        videoPlacement: 'first'
      })

      // Videos (600, 250, 90) -> [11, 14, 13]
      // Followed by regular tabs -> [10, 12]
      expect(sorted.map((t) => t.id)).toEqual([11, 14, 13, 10, 12])
    })

    it('places regular tabs first and videos last when videoPlacement is "last"', () => {
      const sorted = sortTabsByCriteria(mixedTabs, {
        sortBy: 'duration',
        direction: 'asc',
        mixedMode: 'grouped',
        videoPlacement: 'last'
      })

      // Regular tabs -> [10, 12]
      // Followed by Videos (90, 250, 600) -> [13, 14, 11]
      expect(sorted.map((t) => t.id)).toEqual([10, 12, 13, 14, 11])
    })
  })

  describe('Mixed Window - In-Place Mode', () => {
    const mixedTabs = [
      {
        id: 20,
        windowId: 1,
        index: 0,
        title: 'Email',
        url: 'https://mail.google.com'
      },
      {
        id: 21,
        windowId: 1,
        index: 1,
        title: 'Video 300s',
        url: 'https://youtube.com/watch?v=a',
        youtubeInfo: { duration: 300 }
      },
      {
        id: 22,
        windowId: 1,
        index: 2,
        title: 'Slack',
        url: 'https://slack.com'
      },
      {
        id: 23,
        windowId: 1,
        index: 3,
        title: 'Video 60s',
        url: 'https://youtube.com/watch?v=b',
        youtubeInfo: { duration: 60 }
      },
      {
        id: 24,
        windowId: 1,
        index: 4,
        title: 'Video 180s',
        url: 'https://youtube.com/watch?v=c',
        youtubeInfo: { duration: 180 }
      },
      {
        id: 25,
        windowId: 1,
        index: 5,
        title: 'Notion',
        url: 'https://notion.so'
      }
    ]

    it('preserves non-video tab slot positions and only reorders video slots (asc)', () => {
      const sorted = sortTabsByCriteria(mixedTabs, {
        sortBy: 'duration',
        direction: 'asc',
        mixedMode: 'in-place'
      })

      // Non-video slots: index 0 (Email id:20), index 2 (Slack id:22), index 5 (Notion id:25)
      // Video slots: indices 1, 3, 4 -> Sorted durations (60s id:23, 180s id:24, 300s id:21)
      expect(sorted.map((t) => t.id)).toEqual([20, 23, 22, 24, 21, 25])
    })

    it('preserves non-video tab slot positions and only reorders video slots (desc)', () => {
      const sorted = sortTabsByCriteria(mixedTabs, {
        sortBy: 'duration',
        direction: 'desc',
        mixedMode: 'in-place'
      })

      // Video slots: indices 1, 3, 4 -> Sorted durations desc (300s id:21, 180s id:24, 60s id:23)
      expect(sorted.map((t) => t.id)).toEqual([20, 21, 22, 24, 23, 25])
    })
  })

  describe('Pinned Tabs Guarantee', () => {
    const tabsWithPinned = [
      {
        id: 30,
        windowId: 1,
        pinned: true,
        title: 'Pinned Doc',
        url: 'https://docs.google.com'
      },
      {
        id: 31,
        windowId: 1,
        pinned: true,
        title: 'Pinned Video 200s',
        url: 'https://youtube.com/watch?v=p2',
        youtubeInfo: { duration: 200 }
      },
      {
        id: 32,
        windowId: 1,
        pinned: true,
        title: 'Pinned Video 50s',
        url: 'https://youtube.com/watch?v=p1',
        youtubeInfo: { duration: 50 }
      },
      {
        id: 33,
        windowId: 1,
        pinned: false,
        title: 'Unpinned Video 500s',
        url: 'https://youtube.com/watch?v=u2',
        youtubeInfo: { duration: 500 }
      },
      {
        id: 34,
        windowId: 1,
        pinned: false,
        title: 'Unpinned Video 100s',
        url: 'https://youtube.com/watch?v=u1',
        youtubeInfo: { duration: 100 }
      },
      {
        id: 35,
        windowId: 1,
        pinned: false,
        title: 'Unpinned Web',
        url: 'https://web.dev'
      }
    ]

    it('keeps pinned tabs at the beginning and never moves unpinned before pinned', () => {
      const sorted = sortTabsByCriteria(tabsWithPinned, {
        sortBy: 'duration',
        direction: 'asc',
        mixedMode: 'grouped',
        videoPlacement: 'first'
      })

      // Pinned section (first 3 items):
      const pinnedSection = sorted.slice(0, 3)
      expect(pinnedSection.every((t) => t.pinned)).toBe(true)

      // Unpinned section (remaining 3 items):
      const unpinnedSection = sorted.slice(3)
      expect(unpinnedSection.every((t) => !t.pinned)).toBe(true)
    })
  })

  describe('Handling Unknown / Zero Duration Video Tabs', () => {
    const tabsWithZeroDuration = [
      {
        id: 40,
        windowId: 1,
        title: 'Channel',
        url: 'https://youtube.com/@somechannel'
      },
      {
        id: 41,
        windowId: 1,
        title: 'Video 120s',
        url: 'https://youtube.com/watch?v=120',
        youtubeInfo: { duration: 120 }
      },
      {
        id: 42,
        windowId: 1,
        title: 'Video 0s (loading)',
        url: 'https://youtube.com/watch?v=0',
        youtubeInfo: { duration: 0 }
      },
      {
        id: 43,
        windowId: 1,
        title: 'Video 40s',
        url: 'https://youtube.com/watch?v=40',
        youtubeInfo: { duration: 40 }
      }
    ]

    it('places unknown/zero duration videos at the end of the video cluster in asc sort', () => {
      const sorted = sortTabsByCriteria(tabsWithZeroDuration, {
        sortBy: 'duration',
        direction: 'asc'
      })

      // Known durations sorted asc: 40s (43), 120s (41)
      // Then 0 or unknown duration videos (40, 42)
      expect(sorted[0].id).toBe(43)
      expect(sorted[1].id).toBe(41)
      expect([40, 42]).toContain(sorted[2].id)
      expect([40, 42]).toContain(sorted[3].id)
    })
  })

  describe('Multi-Window Isolation', () => {
    const multiWindowTabs = [
      {
        id: 50,
        windowId: 1,
        index: 0,
        url: 'https://youtube.com/watch?v=w1b',
        youtubeInfo: { duration: 200 }
      },
      {
        id: 51,
        windowId: 1,
        index: 1,
        url: 'https://youtube.com/watch?v=w1a',
        youtubeInfo: { duration: 50 }
      },
      {
        id: 60,
        windowId: 2,
        index: 0,
        url: 'https://youtube.com/watch?v=w2b',
        youtubeInfo: { duration: 900 }
      },
      {
        id: 61,
        windowId: 2,
        index: 1,
        url: 'https://youtube.com/watch?v=w2a',
        youtubeInfo: { duration: 100 }
      }
    ]

    it('sorts tabs strictly within their respective windows without mixing windowIds', () => {
      const sorted = sortTabsByCriteria(multiWindowTabs, {
        sortBy: 'duration',
        direction: 'asc'
      })

      const win1 = sorted.filter((t) => t.windowId === 1)
      const win2 = sorted.filter((t) => t.windowId === 2)

      expect(win1.map((t) => t.id)).toEqual([51, 50])
      expect(win2.map((t) => t.id)).toEqual([61, 60])
    })
  })
})
