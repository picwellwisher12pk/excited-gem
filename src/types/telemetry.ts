export type IssueCategory =
  | 'bug'
  | 'crash'
  | 'youtube'
  | 'performance'
  | 'feature_request'
  | 'general'

export interface DiagnosticInfo {
  appVersion: string
  browser: string
  platform: string
  userAgent: string
  windowCount: number
  tabCount: number
  timestamp: string
}

export interface StoredErrorLog {
  id: string
  timestamp: number
  message: string
  stack?: string
  componentStack?: string
  fatal?: boolean
  url?: string
}

export interface BugReportPayload {
  category: IssueCategory
  title: string
  description: string
  email?: string
  includeDiagnostics: boolean
  diagnostics?: DiagnosticInfo
  errorLog?: StoredErrorLog | null
}

export interface AnalyticsConfig {
  measurementId: string
  apiSecret?: string
  enabled: boolean
  webhookUrl?: string
}
