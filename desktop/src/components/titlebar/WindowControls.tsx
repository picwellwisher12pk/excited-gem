import React, { useState, useEffect } from 'react'

interface WindowControlsProps {
  onMinimize?: () => void
  onToggleMaximize?: () => void
  onClose?: () => void
}

export const WindowControls: React.FC<WindowControlsProps> = () => {
  const [isMaximized, setIsMaximized] = useState(false)

  const checkIsTauri = () => {
    return (
      typeof window !== 'undefined' &&
      ('__TAURI__' in window ||
        '__TAURI_INTERNALS__' in window ||
        Boolean((window as unknown as { __TAURI_INTERNALS__?: unknown }).__TAURI_INTERNALS__))
    )
  }

  useEffect(() => {
    if (!checkIsTauri()) return
    let unlisten: (() => void) | undefined
    import('@tauri-apps/api/window')
      .then(({ getCurrentWindow }) => {
        const win = getCurrentWindow()
        win.isMaximized().then(setIsMaximized).catch(() => {})
        win
          .onResized(async () => {
            try {
              const max = await win.isMaximized()
              setIsMaximized(max)
            } catch {}
          })
          .then((fn) => {
            unlisten = fn
          })
          .catch(() => {})
      })
      .catch((e) => console.warn('Could not initialize window state:', e))

    return () => {
      if (unlisten) unlisten()
    }
  }, [])

  const handleMinimize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().minimize()
    } catch (e) {
      console.error('Failed to minimize window:', e)
    }
  }

  const handleToggleMaximize = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      const win = getCurrentWindow()
      await win.toggleMaximize()
      const max = await win.isMaximized()
      setIsMaximized(max)
    } catch (e) {
      console.error('Failed to toggle maximize:', e)
    }
  }

  const handleClose = async () => {
    try {
      const { getCurrentWindow } = await import('@tauri-apps/api/window')
      await getCurrentWindow().close()
    } catch (e) {
      console.error('Failed to close window:', e)
    }
  }

  return (
    <div
      className="flex items-center ml-1.5 pl-1.5"
      style={{ borderLeft: '1px solid var(--border-subtle)' }}
    >
      {/* Minimize */}
      <button
        type="button"
        onClick={handleMinimize}
        className="w-10 h-8 rounded flex items-center justify-center transition-all duration-150"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--surface-4)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
        title="Minimize"
      >
        <span className="inline-block w-2.5 h-[1.5px] bg-current rounded-full" />
      </button>

      {/* Maximize / Restore */}
      <button
        type="button"
        onClick={handleToggleMaximize}
        className="w-10 h-8 rounded flex items-center justify-center transition-all duration-150"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'var(--surface-4)'
          e.currentTarget.style.color = 'var(--text-primary)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
        title={isMaximized ? 'Restore' : 'Maximize'}
      >
        {isMaximized ? (
          <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
            <rect x="2" y="0" width="7" height="7" stroke="currentColor" strokeWidth="1" />
            <path d="M0 3h2v5h5v2H0V3z" fill="currentColor" />
          </svg>
        ) : (
          <span className="inline-block w-2.5 h-2.5 border border-current rounded-[1px]" />
        )}
      </button>

      {/* Close */}
      <button
        type="button"
        onClick={handleClose}
        className="w-10 h-8 rounded flex items-center justify-center transition-all duration-150"
        style={{ color: 'var(--text-secondary)' }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = '#c42b1c'
          e.currentTarget.style.color = '#ffffff'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'transparent'
          e.currentTarget.style.color = 'var(--text-secondary)'
        }}
        title="Close"
      >
        <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
          <path
            d="M1 1L9 9M9 1L1 9"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="round"
          />
        </svg>
      </button>
    </div>
  )
}
