import React from 'react'
import { Tooltip } from 'antd'
import {
  Volume2,
  Pin,
  CircleDashed,
  X
} from 'lucide-react'
import type { DesktopSearchFilters } from './types'

interface WorkspaceFilterButtonsProps {
  filters: DesktopSearchFilters
  onFiltersChange: React.Dispatch<React.SetStateAction<DesktopSearchFilters>>
}

export const WorkspaceFilterButtons: React.FC<WorkspaceFilterButtonsProps> = ({
  filters,
  onFiltersChange
}) => {
  const hasActiveStatusFilters =
    filters.audibleOnly ||
    filters.pinnedOnly ||
    filters.suspendedOnly ||
    filters.isRegex ||
    !filters.searchInTitle ||
    !filters.searchInUrl

  const handleResetFilters = () => {
    onFiltersChange((prev) => ({
      ...prev,
      audibleOnly: false,
      pinnedOnly: false,
      suspendedOnly: false,
      isRegex: false,
      searchInTitle: true,
      searchInUrl: true
    }))
  }

  return (
    <div className="flex items-center gap-1.5 shrink-0">
      {/* Audible Filter Toggle */}
      <Tooltip title="Filter tabs playing audio">
        <button
          type="button"
          onClick={() =>
            onFiltersChange((prev) => ({
              ...prev,
              audibleOnly: !prev.audibleOnly
            }))
          }
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95"
          style={{
            background: filters.audibleOnly
              ? 'rgba(46, 204, 113, 0.15)'
              : 'var(--surface-3)',
            color: filters.audibleOnly
              ? 'var(--status-success)'
              : 'var(--text-secondary)',
            border: `1px solid ${
              filters.audibleOnly
                ? 'rgba(46, 204, 113, 0.4)'
                : 'var(--border-subtle)'
            }`
          }}
        >
          <Volume2 size={13} strokeWidth={1.75} />
          <span>Audible</span>
        </button>
      </Tooltip>

      {/* Pinned Filter Toggle */}
      <Tooltip title="Filter pinned tabs">
        <button
          type="button"
          onClick={() =>
            onFiltersChange((prev) => ({
              ...prev,
              pinnedOnly: !prev.pinnedOnly
            }))
          }
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95"
          style={{
            background: filters.pinnedOnly
              ? 'rgba(243, 156, 18, 0.15)'
              : 'var(--surface-3)',
            color: filters.pinnedOnly
              ? 'var(--status-warning)'
              : 'var(--text-secondary)',
            border: `1px solid ${
              filters.pinnedOnly
                ? 'rgba(243, 156, 18, 0.4)'
                : 'var(--border-subtle)'
            }`
          }}
        >
          <Pin size={13} strokeWidth={1.75} />
          <span>Pinned</span>
        </button>
      </Tooltip>

      {/* Suspended Filter Toggle */}
      <Tooltip title="Filter suspended / discarded tabs">
        <button
          type="button"
          onClick={() =>
            onFiltersChange((prev) => ({
              ...prev,
              suspendedOnly: !prev.suspendedOnly
            }))
          }
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all active:scale-95"
          style={{
            background: filters.suspendedOnly
              ? 'var(--accent-subtle)'
              : 'var(--surface-3)',
            color: filters.suspendedOnly
              ? 'var(--accent)'
              : 'var(--text-secondary)',
            border: `1px solid ${
              filters.suspendedOnly
                ? 'var(--border-accent)'
                : 'var(--border-subtle)'
            }`
          }}
        >
          <CircleDashed size={13} strokeWidth={1.75} />
          <span>Suspended</span>
        </button>
      </Tooltip>

      {/* Reset status filters if any are active */}
      {hasActiveStatusFilters && (
        <Tooltip title="Reset status filters">
          <button
            type="button"
            onClick={handleResetFilters}
            className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg transition-colors hover:text-red-500 active:scale-95"
            style={{ color: 'var(--text-tertiary)' }}
          >
            <X size={12} strokeWidth={1.75} />
            <span>Reset</span>
          </button>
        </Tooltip>
      )}
    </div>
  )
}
