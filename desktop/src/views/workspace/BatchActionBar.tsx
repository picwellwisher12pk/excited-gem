import React from 'react'
import { motion } from 'framer-motion'
import { Modal, message, Tooltip, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import { X, Trash2, CircleDashed, Copy, Globe } from 'lucide-react'
import type { SelectedTabIdentifier } from './types'
import type { ConnectedBrowser } from '../../../src/adapter/types'

interface BatchActionBarProps {
  selectedTabs: SelectedTabIdentifier[]
  browsers: ConnectedBrowser[]
  onClearSelection: () => void
  onCloseSelected: () => void
  onDiscardSelected: () => void
  onMigrateSelected?: (targetBrowserId: string) => void
}

export const BatchActionBar: React.FC<BatchActionBarProps> = ({
  selectedTabs,
  browsers,
  onClearSelection,
  onCloseSelected,
  onDiscardSelected,
  onMigrateSelected
}) => {
  const count = selectedTabs.length
  if (count === 0) return null

  const handleCopyUrls = async () => {
    try {
      const urls = selectedTabs.map((t) => t.url).filter(Boolean).join('\n')
      await navigator.clipboard.writeText(urls)
      message.success(`Copied ${count} URLs to clipboard`)
    } catch (err) {
      console.error('Failed to copy URLs to clipboard:', err)
      message.error('Could not copy URLs to clipboard')
    }
  }

  const handleConfirmClose = () => {
    Modal.confirm({
      title: 'Close Selected Tabs',
      content: `Are you sure you want to close ${count} selected ${count === 1 ? 'tab' : 'tabs'}?`,
      okText: 'Close Tabs',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => onCloseSelected()
    })
  }

  const availableBrowsers = browsers.filter((b) => b.isConnected)
  const migrateMenuItems: MenuProps['items'] = availableBrowsers.map((b) => ({
    key: b.id,
    label: `Move to ${b.name}`,
    onClick: () => {
      if (onMigrateSelected) {
        onMigrateSelected(b.id)
      }
    }
  }))

  return (
    <motion.div
      initial={{ y: 40, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      exit={{ y: 40, opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 px-4 py-2.5 rounded-full select-none"
      style={{
        background: 'var(--glass-bg-heavy)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--border-accent)',
        boxShadow: 'var(--shadow-lg), var(--shadow-glow)'
      }}
    >
      {/* Selected Counter Badge */}
      <div className="flex items-center gap-2 pr-2 border-r" style={{ borderColor: 'var(--border-subtle)' }}>
        <span
          className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            background: 'var(--accent)',
            color: 'var(--text-on-accent)'
          }}
        >
          {count}
        </span>
        <span
          className="text-xs font-semibold"
          style={{ color: 'var(--text-primary)' }}
        >
          {count === 1 ? 'tab selected' : 'tabs selected'}
        </span>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-1.5">
        <Tooltip title="Suspend / sleep selected tabs">
          <button
            type="button"
            onClick={onDiscardSelected}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 active:scale-95 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-4)]"
            style={{
              background: 'var(--surface-3)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <CircleDashed size={14} strokeWidth={1.75} style={{ color: 'var(--status-warning)' }} />
            <span>Suspend</span>
          </button>
        </Tooltip>

        {availableBrowsers.length > 1 && onMigrateSelected && (
          <Dropdown menu={{ items: migrateMenuItems }} trigger={['click']}>
            <button
              type="button"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 active:scale-95 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-4)]"
              style={{
                background: 'var(--surface-3)',
                border: '1px solid var(--border-subtle)'
              }}
            >
              <Globe size={13} style={{ color: 'var(--accent)' }} />
              <span>Move to Browser</span>
            </button>
          </Dropdown>
        )}

        <Tooltip title="Copy URLs of selected tabs">
          <button
            type="button"
            onClick={handleCopyUrls}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 active:scale-95 text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-4)]"
            style={{
              background: 'var(--surface-3)',
              border: '1px solid var(--border-subtle)'
            }}
          >
            <Copy size={13} style={{ color: 'var(--accent)' }} />
            <span>Copy URLs</span>
          </button>
        </Tooltip>

        <Tooltip title="Close selected tabs">
          <button
            type="button"
            onClick={handleConfirmClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all duration-150 active:scale-95 text-red-500 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20"
          >
            <Trash2 size={13} />
            <span>Close</span>
          </button>
        </Tooltip>

        <Tooltip title="Clear selection">
          <button
            type="button"
            onClick={onClearSelection}
            className="w-7 h-7 ml-1 rounded-full flex items-center justify-center transition-all duration-150 active:scale-95 text-[var(--text-tertiary)] hover:bg-[var(--surface-4)] hover:text-[var(--text-primary)]"
          >
            <X size={14} />
          </button>
        </Tooltip>
      </div>
    </motion.div>
  )
}
