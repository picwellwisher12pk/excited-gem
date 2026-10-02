import React, { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertTriangle, RefreshCw, Bug, ShieldAlert } from 'lucide-react'
import { Button, Typography, Space } from 'antd'
import { analytics } from '../../utils/analytics'
import type { StoredErrorLog } from '../../types/telemetry'
import { BugReportModal } from '../Modals/BugReportModal'

const { Title, Paragraph, Text } = Typography

interface Props {
  children: ReactNode
  fallbackTitle?: string
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
  isReportModalOpen: boolean
  capturedErrorLog: StoredErrorLog | null
}

export class CrashBoundary extends Component<Props, State> {
  private unhandledRejectionHandler?: (event: PromiseRejectionEvent) => void
  private errorHandler?: (event: ErrorEvent) => void

  constructor(props: Props) {
    super(props)
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      isReportModalOpen: false,
      capturedErrorLog: null
    }
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error }
  }

  componentDidMount() {
    this.unhandledRejectionHandler = (event: PromiseRejectionEvent) => {
      const reason = event.reason
      const message = reason instanceof Error ? reason.message : String(reason)
      const stack = reason instanceof Error ? reason.stack : undefined

      console.error('[Excited Gem] Unhandled Promise Rejection:', reason)
      analytics.trackError({
        message: `Unhandled Promise: ${message}`,
        stack,
        fatal: false
      })
    }

    this.errorHandler = (event: ErrorEvent) => {
      console.error('[Excited Gem] Uncaught Runtime Error:', event.error || event.message)
      analytics.trackError({
        message: event.message || 'Uncaught error event',
        stack: event.error?.stack,
        url: event.filename,
        fatal: false
      })
    }

    window.addEventListener('unhandledrejection', this.unhandledRejectionHandler)
    window.addEventListener('error', this.errorHandler)
  }

  componentWillUnmount() {
    if (this.unhandledRejectionHandler) {
      window.removeEventListener('unhandledrejection', this.unhandledRejectionHandler)
    }
    if (this.errorHandler) {
      window.removeEventListener('error', this.errorHandler)
    }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[Excited Gem CrashBoundary] Caught render error:', error, info.componentStack)

    const errorLog: StoredErrorLog = {
      id: `crash_${Date.now()}`,
      timestamp: Date.now(),
      message: error.message || 'Unknown render crash',
      stack: error.stack,
      componentStack: info.componentStack,
      fatal: true
    }

    this.setState({
      errorInfo: info,
      capturedErrorLog: errorLog
    })

    analytics.trackError({
      message: error.message,
      stack: error.stack,
      componentStack: info.componentStack,
      fatal: true
    })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleOpenReport = () => {
    this.setState({ isReportModalOpen: true })
  }

  handleCloseReport = () => {
    this.setState({ isReportModalOpen: false })
  }

  render() {
    if (this.state.hasError) {
      const { error, capturedErrorLog, isReportModalOpen } = this.state

      return (
        <div className="min-h-[300px] flex items-center justify-center p-6 bg-gray-50/50">
          <div className="max-w-lg w-full bg-white border border-red-200 shadow-sm rounded-xl p-6 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <ShieldAlert className="w-6 h-6" />
            </div>

            <div>
              <Title level={4} className="text-gray-900 !mb-1">
                {this.props.fallbackTitle || 'Something went wrong in Excited Gem'}
              </Title>
              <Paragraph className="text-xs text-gray-500 mb-0">
                A component crashed unexpectedly. Your tabs are safe in Chrome.
              </Paragraph>
            </div>

            {error && (
              <div className="p-3 bg-red-50/60 rounded border border-red-100 text-left font-mono text-xs text-red-700 max-h-24 overflow-y-auto">
                {error.message}
              </div>
            )}

            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                icon={<RefreshCw className="w-4 h-4 inline mr-1" />}
                onClick={this.handleReload}
              >
                Reload View
              </Button>
              <Button
                type="primary"
                danger
                icon={<Bug className="w-4 h-4 inline mr-1" />}
                onClick={this.handleOpenReport}
              >
                Report this Crash
              </Button>
            </div>

            {isReportModalOpen && (
              <BugReportModal
                visible={isReportModalOpen}
                onClose={this.handleCloseReport}
                initialError={capturedErrorLog}
              />
            )}
          </div>
        </div>
      )
    }

    return this.props.children
  }
}

export default CrashBoundary
