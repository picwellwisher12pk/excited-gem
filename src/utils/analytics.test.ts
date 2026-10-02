import { describe, expect, it, beforeEach } from 'bun:test'
import { analytics } from './analytics'
import type { BugReportPayload } from '../types/telemetry'

describe('Analytics & Bug Reporting Utility', () => {
  it('should initialize and provide default configuration', () => {
    const config = analytics.getConfig()
    expect(config).toBeDefined()
    expect(config.enabled).toBe(true)
    expect(typeof config.measurementId).toBe('string')
  })

  it('should format bug report as clean GitHub Markdown', () => {
    const payload: BugReportPayload = {
      category: 'bug',
      title: 'Video duration sort issue',
      description: 'Sort button puts some shorts into new window unexpectedly',
      email: 'tester@example.com',
      includeDiagnostics: true,
      diagnostics: {
        appVersion: '1.9.0',
        browser: 'Chrome/124.0',
        platform: 'Win32',
        userAgent: 'Mozilla/5.0 Windows',
        windowCount: 2,
        tabCount: 15,
        timestamp: '2026-10-02T12:00:00.000Z'
      },
      errorLog: {
        id: 'err_123',
        timestamp: 12345678,
        message: 'Cannot read properties of undefined',
        stack: 'TypeError: Cannot read properties...',
        componentStack: 'in VideoCard'
      }
    }

    const markdown = analytics.formatReportMarkdown(payload)

    expect(markdown).toContain('### Issue Category: bug')
    expect(markdown).toContain('**Title:** Video duration sort issue')
    expect(markdown).toContain('Sort button puts some shorts into new window unexpectedly')
    expect(markdown).toContain('**Contact:** tester@example.com')
    expect(markdown).toContain('- **Excited Gem Version:** 1.9.0')
    expect(markdown).toContain('- **Active Windows:** 2')
    expect(markdown).toContain('- **Active Tabs:** 15')
    expect(markdown).toContain('Message: Cannot read properties of undefined')
    expect(markdown).toContain('in VideoCard')
  })

  it('should allow updating telemetry configuration dynamically', async () => {
    await analytics.updateConfig({
      measurementId: 'G-NEWTEST123',
      webhookUrl: 'https://api.example.com/webhook'
    })

    const updated = analytics.getConfig()
    expect(updated.measurementId).toBe('G-NEWTEST123')
    expect(updated.webhookUrl).toBe('https://api.example.com/webhook')
  })

  it('should collect diagnostic info with non-empty version and platform', async () => {
    const diag = await analytics.getDiagnostics()
    expect(diag).toBeDefined()
    expect(diag.appVersion).toBeDefined()
    expect(diag.timestamp).toBeDefined()
  })

  it('should report bug without throwing unhandled exceptions', async () => {
    const res = await analytics.reportBug({
      category: 'general',
      title: 'Great extension',
      description: 'Really liking the new tab sorter.',
      includeDiagnostics: false
    })

    expect(res.success).toBe(true)
    expect(typeof res.message).toBe('string')
  })
})
