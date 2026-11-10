import { describe, expect, it, beforeEach } from 'bun:test'
import { combineAllWindows } from './windowManagerService'

describe('windowManagerService - combineAllWindows', () => {
  beforeEach(() => {
    ;(globalThis as any).chrome = undefined
  })

  it('returns error if Chrome API is not present', async () => {
    const res = await combineAllWindows()
    expect(res.success).toBe(false)
    expect(res.error).toContain('not available')
  })

  it('succeeds gracefully if 1 or 0 windows exist', async () => {
    ;(globalThis as any).chrome = {
      windows: {
        getAll: (opts: any, cb: (wins: any[]) => void) => {
          cb([{ id: 1, incognito: false, tabs: [{ id: 101, pinned: false }] }])
        },
        getCurrent: (cb: (curr: any) => void) => {
          cb({ id: 1, incognito: false })
        }
      },
      tabs: {
        move: () => {}
      }
    }

    const res = await combineAllWindows()
    expect(res.success).toBe(true)
    expect(res.movedCount).toBe(0)
    expect(res.closedWindowsCount).toBe(0)
  })

  it('safely merges normal windows while skipping incognito windows', async () => {
    const movedCalls: any[] = []

    ;(globalThis as any).chrome = {
      windows: {
        getAll: (opts: any, cb: (wins: any[]) => void) => {
          cb([
            {
              id: 1,
              incognito: false,
              tabs: [
                { id: 10, pinned: true },
                { id: 11, pinned: false }
              ]
            },
            {
              id: 2,
              incognito: false,
              tabs: [
                { id: 20, pinned: true },
                { id: 21, pinned: false }
              ]
            },
            {
              id: 3,
              incognito: true, // Incognito window!
              tabs: [
                { id: 30, pinned: false }
              ]
            }
          ])
        },
        getCurrent: (cb: (curr: any) => void) => {
          cb({ id: 1, incognito: false })
        },
        update: () => {}
      },
      tabs: {
        move: (tabIds: number[], props: any, cb: () => void) => {
          movedCalls.push({ tabIds, props })
          cb()
        }
      }
    }

    const res = await combineAllWindows()
    expect(res.success).toBe(true)
    expect(res.movedCount).toBe(2) // Only from window 2, window 3 skipped
    expect(res.skippedIncognitoCount).toBe(1)
    expect(res.closedWindowsCount).toBe(1)

    // Window 3 was NEVER touched
    expect(movedCalls.some((c) => c.tabIds.includes(30))).toBe(false)
  })

  it('supports filtering tabs across windows by keyword', async () => {
    const movedCalls: any[] = []

    ;(globalThis as any).chrome = {
      windows: {
        getAll: (opts: any, cb: (wins: any[]) => void) => {
          cb([
            {
              id: 1,
              incognito: false,
              tabs: [{ id: 10, title: 'Main' }]
            },
            {
              id: 2,
              incognito: false,
              tabs: [
                { id: 21, title: 'GitHub PR #42', url: 'https://github.com/pulls' },
                { id: 22, title: 'Amazon Shopping', url: 'https://amazon.com' }
              ]
            }
          ])
        },
        getCurrent: (cb: (curr: any) => void) => {
          cb({ id: 1, incognito: false })
        },
        update: () => {}
      },
      tabs: {
        move: (tabIds: number[], props: any, cb: () => void) => {
          movedCalls.push({ tabIds, props })
          cb()
        }
      }
    }

    const res = await combineAllWindows({ filter: 'github' })
    expect(res.success).toBe(true)
    expect(res.movedCount).toBe(1)
    expect(movedCalls[0].tabIds).toEqual([21])
  })
})
