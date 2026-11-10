import { describe, it, expect, beforeEach } from 'bun:test'
import { DesktopAdapter } from './DesktopAdapter'
import { getBrowserBadge } from '../../desktop/src/views/workspace/types'

describe('DesktopAdapter & Workspace Logic', () => {
  let adapter: DesktopAdapter

  beforeEach(() => {
    // Port 0 or arbitrary port for offline test
    adapter = new DesktopAdapter(59999)
  })

  it('should match browser badges correctly for all supported browsers', () => {
    expect(getBrowserBadge('opera-main').name).toBe('Opera')
    expect(getBrowserBadge('opera').name).toBe('Opera')
    expect(getBrowserBadge('chrome-main').name).toBe('Google Chrome')
    expect(getBrowserBadge('chrome').name).toBe('Google Chrome')
    expect(getBrowserBadge('edge-main').name).toBe('Microsoft Edge')
    expect(getBrowserBadge('edge').name).toBe('Microsoft Edge')
    expect(getBrowserBadge('brave-main').name).toBe('Brave')
    expect(getBrowserBadge('firefox-main').name).toBe('Mozilla Firefox')
    expect(getBrowserBadge('safari').name).toBe('Safari')
    expect(getBrowserBadge('unknown-browser').name).toBe('Browser')
  })

  it('should merge connected browsers without wiping previous browsers', async () => {
    // Simulate Chrome connecting
    ;(adapter as any).handleMessage({
      type: 'CONNECTED_BROWSERS_UPDATE',
      browsers: [
        {
          id: 'chrome-main',
          name: 'Google Chrome',
          engine: 'chrome',
          isConnected: true,
          windowCount: 1,
          tabCount: 10
        }
      ]
    })

    let browsers = await adapter.getConnectedBrowsers()
    expect(browsers.length).toBe(1)
    expect(browsers[0].id).toBe('chrome-main')

    // Simulate Edge connecting later
    ;(adapter as any).handleMessage({
      type: 'CONNECTED_BROWSERS_UPDATE',
      browsers: [
        {
          id: 'edge-main',
          name: 'Microsoft Edge',
          engine: 'edge',
          isConnected: true,
          windowCount: 2,
          tabCount: 25
        }
      ]
    })

    browsers = await adapter.getConnectedBrowsers()
    // Both browsers should exist!
    expect(browsers.length).toBe(2)
    expect(browsers.some((b) => b.id === 'chrome-main')).toBe(true)
    expect(browsers.some((b) => b.id === 'edge-main')).toBe(true)
  })

  it('should filter windows correctly by engine name (edge, chrome, opera)', async () => {
    // Inject windows from chrome, edge, and opera
    ;(adapter as any).handleMessage({
      type: 'WINDOWS_UPDATE',
      browserId: 'chrome-main',
      windows: [
        {
          id: 101,
          browserId: 'chrome-main',
          focused: true,
          incognito: false,
          tabs: [
            { id: 1, browserId: 'chrome-main', windowId: 101, title: 'Chrome Tab 1', url: 'https://chrome.com' }
          ]
        }
      ]
    })

    ;(adapter as any).handleMessage({
      type: 'WINDOWS_UPDATE',
      browserId: 'edge-main',
      windows: [
        {
          id: 201,
          browserId: 'edge-main',
          focused: false,
          incognito: false,
          tabs: [
            { id: 2, browserId: 'edge-main', windowId: 201, title: 'Edge Tab 1', url: 'https://edge.com' },
            { id: 3, browserId: 'edge-main', windowId: 201, title: 'Edge Tab 2', url: 'https://bing.com' }
          ]
        }
      ]
    })

    ;(adapter as any).handleMessage({
      type: 'WINDOWS_UPDATE',
      browserId: 'opera-main',
      windows: [
        {
          id: 301,
          browserId: 'opera-main',
          focused: false,
          incognito: false,
          tabs: [
            { id: 4, browserId: 'opera-main', windowId: 301, title: 'Opera Tab 1', url: 'https://opera.com' }
          ]
        }
      ]
    })

    // getAllWindows() with no filter -> returns all 3 windows
    const allWins = await adapter.getAllWindows()
    expect(allWins.length).toBe(3)

    // Filter by 'chrome' -> should match 'chrome-main'
    const chromeWins = await adapter.getAllWindows('chrome')
    expect(chromeWins.length).toBe(1)
    expect(chromeWins[0].id).toBe(101)

    // Filter by 'edge' -> should match 'edge-main'
    const edgeWins = await adapter.getAllWindows('edge')
    expect(edgeWins.length).toBe(1)
    expect(edgeWins[0].id).toBe(201)

    // Filter by 'opera' -> should match 'opera-main'
    const operaWins = await adapter.getAllWindows('opera')
    expect(operaWins.length).toBe(1)
    expect(operaWins[0].id).toBe(301)

    // Filter by 'all' -> returns all 3 windows
    const allFilterWins = await adapter.getAllWindows('all')
    expect(allFilterWins.length).toBe(3)
  })

  it('should normalize browser engines and verify equality accurately', () => {
    const { normalizeBrowserEngine, isSameBrowserEngine } = require('./types')

    expect(normalizeBrowserEngine('opera')).toBe('opera')
    expect(normalizeBrowserEngine('opera-main')).toBe('opera')
    expect(normalizeBrowserEngine('opr-1')).toBe('opera')
    expect(normalizeBrowserEngine('chrome-main')).toBe('chrome')
    expect(normalizeBrowserEngine('edge-main')).toBe('edge')
    expect(normalizeBrowserEngine('msedge')).toBe('edge')
    expect(normalizeBrowserEngine('brave-main')).toBe('brave')
    expect(normalizeBrowserEngine('firefox-main')).toBe('firefox')
    expect(normalizeBrowserEngine('safari')).toBe('safari')

    // isSameBrowserEngine comparisons
    expect(isSameBrowserEngine('opera', 'opr-main')).toBe(true)
    expect(isSameBrowserEngine('opera-main', 'opera')).toBe(true)
    expect(isSameBrowserEngine('edge-main', 'edge')).toBe(true)
    expect(isSameBrowserEngine('msedge', 'edge-main')).toBe(true)
    expect(isSameBrowserEngine('chrome-main', 'chrome')).toBe(true)
    expect(isSameBrowserEngine('edge', 'chrome')).toBe(false)
    expect(isSameBrowserEngine('opera', 'chrome')).toBe(false)
  })
})
