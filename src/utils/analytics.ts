import type {
  AnalyticsConfig,
  BugReportPayload,
  DiagnosticInfo,
  StoredErrorLog
} from '../types/telemetry'

const DEFAULT_MEASUREMENT_ID = 'G-XXXXXXXXXX'
const SETTINGS_STORAGE_KEY = 'excited_gem_analytics_config'
const CLIENT_ID_STORAGE_KEY = 'ga_client_id'
const ERROR_LOGS_STORAGE_KEY = 'excited_gem_error_logs'
const QUEUED_EVENTS_STORAGE_KEY = 'excited_gem_queued_events'
const MAX_STORED_ERRORS = 25
const MAX_QUEUED_EVENTS = 50

class Analytics {
  private config: AnalyticsConfig = {
    measurementId: DEFAULT_MEASUREMENT_ID,
    apiSecret: '',
    enabled: true,
    webhookUrl: ''
  }

  private clientId: string = ''
  private isInitialized = false

  async initialize(): Promise<void> {
    if (this.isInitialized) return

    try {
      if (typeof chrome !== 'undefined' && chrome.storage?.local) {
        const stored = await chrome.storage.local.get([
          CLIENT_ID_STORAGE_KEY,
          SETTINGS_STORAGE_KEY
        ])

        if (stored[CLIENT_ID_STORAGE_KEY]) {
          this.clientId = stored[CLIENT_ID_STORAGE_KEY]
        } else {
          this.clientId = this.generateClientId()
          await chrome.storage.local.set({ [CLIENT_ID_STORAGE_KEY]: this.clientId })
        }

        if (stored[SETTINGS_STORAGE_KEY]) {
          this.config = { ...this.config, ...stored[SETTINGS_STORAGE_KEY] }
        }
      } else {
        this.clientId = this.generateClientId()
      }

      this.isInitialized = true
    } catch (err) {
      console.warn('[Analytics] Initialization failed:', err)
      this.clientId = this.generateClientId()
    }
  }

  private generateClientId(): string {
    return `${Date.now()}.${Math.random().toString(36).substring(2, 15)}`
  }

  public async updateConfig(newConfig: Partial<AnalyticsConfig>): Promise<void> {
    this.config = { ...this.config, ...newConfig }
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      await chrome.storage.local.set({ [SETTINGS_STORAGE_KEY]: this.config })
    }
  }

  public getConfig(): AnalyticsConfig {
    return { ...this.config }
  }

  /**
   * Dispatches events using GA4 Measurement Protocol
   */
  private async sendGa4Event(
    eventName: string,
    params: Record<string, any> = {}
  ): Promise<boolean> {
    await this.initialize()

    if (!this.config.enabled) return false

    // Normalize event name for GA4 (only lowercase letters, numbers, and underscores)
    const normalizedEventName = eventName
      .toLowerCase()
      .replace(/[^a-z0-9_]/g, '_')
      .slice(0, 40)

    const payload = {
      client_id: this.clientId,
      events: [
        {
          name: normalizedEventName,
          params: {
            ...params,
            engagement_time_msec: 100
          }
        }
      ]
    }

    // If measurement ID is not yet configured, queue locally for diagnostics
    if (
      !this.config.measurementId ||
      this.config.measurementId === DEFAULT_MEASUREMENT_ID
    ) {
      await this.queueLocalEvent(normalizedEventName, params)
      return false
    }

    try {
      let url = `https://www.google-analytics.com/mp/collect?measurement_id=${encodeURIComponent(
        this.config.measurementId
      )}`
      if (this.config.apiSecret) {
        url += `&api_secret=${encodeURIComponent(this.config.apiSecret)}`
      }

      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      return res.ok
    } catch (err) {
      console.warn('[Analytics] GA4 event dispatch failed:', err)
      await this.queueLocalEvent(normalizedEventName, params)
      return false
    }
  }

  private async queueLocalEvent(
    eventName: string,
    params: Record<string, any>
  ): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return

    try {
      const stored = await chrome.storage.local.get([QUEUED_EVENTS_STORAGE_KEY])
      const list = stored[QUEUED_EVENTS_STORAGE_KEY] || []
      list.push({
        eventName,
        params,
        timestamp: Date.now()
      })
      if (list.length > MAX_QUEUED_EVENTS) {
        list.splice(0, list.length - MAX_QUEUED_EVENTS)
      }
      await chrome.storage.local.set({ [QUEUED_EVENTS_STORAGE_KEY]: list })
    } catch {
      // ignore storage queue errors
    }
  }

  async trackPageView(pagePath: string, pageTitle: string): Promise<void> {
    await this.sendGa4Event('page_view', {
      page_location: `chrome-extension://${
        typeof chrome !== 'undefined' ? chrome.runtime?.id || 'excited-gem' : 'excited-gem'
      }${pagePath}`,
      page_path: pagePath,
      page_title: pageTitle
    })
  }

  async trackEvent(
    category: string,
    action: string,
    label?: string,
    value?: number,
    customParams?: Record<string, any>
  ): Promise<void> {
    const params: Record<string, any> = {
      event_category: category,
      event_action: action,
      ...customParams
    }
    if (label !== undefined) params.event_label = label
    if (value !== undefined) params.value = value

    // Map common actions to clear GA4 event names
    const eventName = `${category.toLowerCase()}_${action.toLowerCase()}`
      .replace(/[^a-z0-9_]/g, '_')
      .slice(0, 40)

    await this.sendGa4Event(eventName, params)
  }

  /**
   * Logs runtime error to local storage and dispatches error event to telemetry
   */
  async trackError(errorDetails: {
    message: string
    stack?: string
    componentStack?: string
    fatal?: boolean
    url?: string
  }): Promise<void> {
    await this.initialize()

    const errorLog: StoredErrorLog = {
      id: `err_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      timestamp: Date.now(),
      message: errorDetails.message || 'Unknown runtime error',
      stack: errorDetails.stack?.slice(0, 2000),
      componentStack: errorDetails.componentStack?.slice(0, 2000),
      fatal: !!errorDetails.fatal,
      url: errorDetails.url || (typeof window !== 'undefined' ? window.location.href : undefined)
    }

    // Persist to local storage for user/diagnostic export
    if (typeof chrome !== 'undefined' && chrome.storage?.local) {
      try {
        const stored = await chrome.storage.local.get([ERROR_LOGS_STORAGE_KEY])
        const existing: StoredErrorLog[] = stored[ERROR_LOGS_STORAGE_KEY] || []
        existing.unshift(errorLog)
        if (existing.length > MAX_STORED_ERRORS) {
          existing.splice(MAX_STORED_ERRORS)
        }
        await chrome.storage.local.set({ [ERROR_LOGS_STORAGE_KEY]: existing })
      } catch (e) {
        console.warn('[Analytics] Failed to save error log to storage:', e)
      }
    }

    // Send telemetry event
    await this.sendGa4Event('app_exception', {
      description: errorDetails.message.slice(0, 100),
      fatal: errorDetails.fatal ? 1 : 0
    })
  }

  async getStoredErrorLogs(): Promise<StoredErrorLog[]> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return []
    try {
      const stored = await chrome.storage.local.get([ERROR_LOGS_STORAGE_KEY])
      return stored[ERROR_LOGS_STORAGE_KEY] || []
    } catch {
      return []
    }
  }

  async clearStoredErrorLogs(): Promise<void> {
    if (typeof chrome === 'undefined' || !chrome.storage?.local) return
    try {
      await chrome.storage.local.remove([ERROR_LOGS_STORAGE_KEY])
    } catch {}
  }

  /**
   * Gathers non-PII diagnostic metadata
   */
  async getDiagnostics(): Promise<DiagnosticInfo> {
    let windowCount = 0
    let tabCount = 0
    let appVersion = '1.9.0'

    if (typeof chrome !== 'undefined') {
      try {
        if (chrome.runtime?.getManifest) {
          appVersion = chrome.runtime.getManifest().version || '1.9.0'
        }
        if (chrome.windows?.getAll) {
          const wins = await chrome.windows.getAll({ populate: true })
          windowCount = wins.length
          tabCount = wins.reduce((acc, w) => acc + (w.tabs?.length || 0), 0)
        }
      } catch {
        // ignore permissions or context errors
      }
    }

    return {
      appVersion,
      browser: typeof navigator !== 'undefined' ? navigator.userAgent.split(' ')[0] : 'Unknown',
      platform: typeof navigator !== 'undefined' ? navigator.platform : 'Unknown',
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : '',
      windowCount,
      tabCount,
      timestamp: new Date().toISOString()
    }
  }

  /**
   * Submits user bug report or feedback
   */
  async reportBug(payload: BugReportPayload): Promise<{ success: boolean; message: string }> {
    await this.initialize()

    // Dispatch event to GA4
    await this.sendGa4Event('user_feedback_submitted', {
      category: payload.category,
      has_email: payload.email ? 1 : 0,
      has_error_attached: payload.errorLog ? 1 : 0
    })

    // Dispatch to webhook if configured
    if (this.config.webhookUrl) {
      try {
        const res = await fetch(this.config.webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        })
        if (res.ok) {
          return { success: true, message: 'Bug report submitted successfully.' }
        }
      } catch (err: any) {
        console.warn('[Analytics] Webhook report submission failed:', err)
      }
    }

    // If no webhook configured, it is logged locally and available for Markdown copy/GitHub filing
    return {
      success: true,
      message: 'Feedback recorded. You can also copy the report to paste directly into GitHub Issues.'
    }
  }

  /**
   * Helper to format a bug report payload into clean Markdown for GitHub issues
   */
  formatReportMarkdown(payload: BugReportPayload): string {
    const lines = [
      `### Issue Category: ${payload.category}`,
      `**Title:** ${payload.title}`,
      '',
      '#### Description',
      payload.description,
      ''
    ]

    if (payload.email) {
      lines.push(`**Contact:** ${payload.email}`, '')
    }

    if (payload.diagnostics) {
      lines.push(
        '#### Diagnostic Environment',
        `- **Excited Gem Version:** ${payload.diagnostics.appVersion}`,
        `- **Platform:** ${payload.diagnostics.platform}`,
        `- **Browser User Agent:** \`${payload.diagnostics.userAgent}\``,
        `- **Active Windows:** ${payload.diagnostics.windowCount}`,
        `- **Active Tabs:** ${payload.diagnostics.tabCount}`,
        `- **Timestamp:** ${payload.diagnostics.timestamp}`,
        ''
      )
    }

    if (payload.errorLog) {
      lines.push(
        '#### Captured Error Stack Trace',
        '```',
        `Message: ${payload.errorLog.message}`,
        payload.errorLog.stack ? `Stack:\n${payload.errorLog.stack}` : '',
        payload.errorLog.componentStack ? `Component:\n${payload.errorLog.componentStack}` : '',
        '```',
        ''
      )
    }

    return lines.join('\n')
  }
}

export const analytics = new Analytics()
analytics.initialize()
