import React, { Component, ErrorInfo, ReactNode } from 'react'
import ReactDOM from 'react-dom/client'
import { Provider } from 'react-redux'

import store from '../../src/store/store'
import App from './App'
import '../src/theme/tokens.css'
import '../../src/styles/index.css'
import '../../src/styles/accessibility.css'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

class DesktopErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props)
    this.state = { hasError: false, error: null, errorInfo: null }
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Desktop App Crash caught by ErrorBoundary:', error, errorInfo)
    this.setState({ errorInfo })
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            padding: 32,
            fontFamily: 'system-ui, -apple-system, sans-serif',
            background: 'var(--surface-0, #141414)',
            color: 'var(--text-primary, #ffffff)',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            boxSizing: 'border-box'
          }}
        >
          <div
            style={{
              maxWidth: 580,
              width: '100%',
              padding: 24,
              borderRadius: 12,
              background: 'var(--surface-2, #1f1f1f)',
              border: '1px solid var(--border-subtle, #333333)',
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.4)'
            }}
          >
            <h3 style={{ margin: '0 0 8px', color: '#ff6b6b' }}>
              Something went wrong in Desktop UI
            </h3>
            <p style={{ margin: '0 0 16px', fontSize: 13, color: 'var(--text-secondary, #999)' }}>
              {this.state.error?.message || 'An unexpected runtime error occurred.'}
            </p>
            {this.state.error?.stack && (
              <pre
                style={{
                  maxHeight: 180,
                  overflow: 'auto',
                  padding: 12,
                  borderRadius: 6,
                  background: 'var(--surface-3, #181818)',
                  fontSize: 11,
                  fontFamily: 'monospace',
                  color: 'var(--text-tertiary, #888)',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}
              >
                {this.state.error.stack}
              </pre>
            )}
            <div style={{ marginTop: 20, display: 'flex', gap: 10 }}>
              <button
                type="button"
                onClick={() => window.location.reload()}
                style={{
                  padding: '8px 16px',
                  borderRadius: 8,
                  border: 'none',
                  background: 'var(--accent, #0ea5e9)',
                  color: '#ffffff',
                  fontWeight: 600,
                  fontSize: 13,
                  cursor: 'pointer'
                }}
              >
                Reload App
              </button>
            </div>
          </div>
        </div>
      )
    }
    return this.props.children
  }
}

ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
  <React.StrictMode>
    <DesktopErrorBoundary>
      <Provider store={store}>
        <App />
      </Provider>
    </DesktopErrorBoundary>
  </React.StrictMode>
)
