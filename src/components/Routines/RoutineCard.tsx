import React from 'react'
import { Card, Switch, Tooltip, Tag, Popconfirm } from 'antd'
import {
  Play,
  Edit3,
  Copy,
  Trash2,
  Clock,
  Zap,
  Sparkles,
  Layers,
  VolumeX,
  Volume2,
  Pin,
  Bookmark,
  Cpu,
  ArrowUpDown,
  CheckCircle2,
  XCircle
} from 'lucide-react'
import type { Routine } from '../../types/routine'

interface RoutineCardProps {
  routine: Routine
  onRun: (routine: Routine) => void
  onEdit: (routine: Routine) => void
  onDuplicate: (routine: Routine) => void
  onDelete: (routineId: string) => void
  onToggleEnabled: (routineId: string, enabled: boolean) => void
  isRunning?: boolean
}

export const getRoutineIcon = (iconName: string, size = 18, color?: string) => {
  const props = { size, color: color || 'currentColor' }
  switch (iconName) {
    case 'Sparkles':
      return <Sparkles {...props} />
    case 'Zap':
      return <Zap {...props} />
    case 'Cpu':
      return <Cpu {...props} />
    case 'Bookmark':
      return <Bookmark {...props} />
    case 'Layers':
      return <Layers {...props} />
    case 'VolumeX':
      return <VolumeX {...props} />
    case 'Volume2':
      return <Volume2 {...props} />
    case 'Pin':
      return <Pin {...props} />
    case 'ArrowUpDown':
      return <ArrowUpDown {...props} />
    case 'Clock':
      return <Clock {...props} />
    default:
      return <Zap {...props} />
  }
}

export const getStepTypeLabel = (type: string): string => {
  switch (type) {
    case 'filter-tabs':
      return 'Filter / Search Tabs'
    case 'reset-filter':
      return 'Reset Filter Scope'
    case 'close-duplicates':
      return 'Close Duplicates'
    case 'group-by-domain':
      return 'Group by Domain'
    case 'group-by-rule':
      return 'Group by Rule'
    case 'sort-tabs':
      return 'Sort Tabs'
    case 'move-to-window':
      return 'Move to Window'
    case 'discard-tabs':
      return 'Suspend / Free RAM'
    case 'mute-tabs':
      return 'Mute Tabs'
    case 'unmute-tabs':
      return 'Unmute Tabs'
    case 'pin-tabs':
      return 'Pin Tabs'
    case 'unpin-tabs':
      return 'Unpin Tabs'
    case 'close-tabs':
      return 'Close Filtered Tabs'
    case 'save-session':
      return 'Save Session'
    case 'save-list':
      return 'Save to List'
    case 'open-urls':
      return 'Open URLs'
    case 'wait':
      return 'Delay'
    case 'show-notification':
      return 'Notify'
    default:
      return type
  }
}

export const RoutineCard: React.FC<RoutineCardProps> = ({
  routine,
  onRun,
  onEdit,
  onDuplicate,
  onDelete,
  onToggleEnabled,
  isRunning = false
}) => {
  const enabledStepsCount = routine.steps.filter((s) => s.enabled).length

  return (
    <Card
      className="shadow-sm hover:shadow-md transition-shadow border-gray-200 rounded-xl overflow-hidden flex flex-col justify-between"
      bodyStyle={{
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
              style={{ backgroundColor: routine.color || '#3b82f6' }}
            >
              {getRoutineIcon(routine.icon, 20, '#ffffff')}
            </div>
            <div>
              <div className="font-semibold text-base text-gray-800 flex items-center gap-2">
                <span>{routine.name}</span>
                {!routine.enabled && (
                  <Tag color="default" className="text-xs">
                    Disabled
                  </Tag>
                )}
              </div>
              <div className="text-xs text-gray-500 line-clamp-1">
                {routine.description || 'No description provided'}
              </div>
            </div>
          </div>

          <Switch
            checked={routine.enabled}
            onChange={(checked) => onToggleEnabled(routine.id, checked)}
            size="small"
          />
        </div>

        {/* Triggers & Scope Badges */}
        <div className="flex flex-wrap items-center gap-1.5 my-3">
          <Tag color="blue" className="text-xs !m-0 !rounded-md">
            Scope:{' '}
            {routine.targetScope === 'active-window'
              ? 'Current Window'
              : routine.targetScope === 'all-windows'
                ? 'All Windows'
                : routine.targetScope === 'selected-tabs'
                  ? 'Selected Tabs'
                  : 'Target'}
          </Tag>

          {routine.triggers.intervalMinutes &&
          routine.triggers.intervalMinutes > 0 ? (
            <Tag
              color="purple"
              icon={<Clock size={11} className="inline mr-1" />}
              className="text-xs !m-0 !rounded-md"
            >
              Every {routine.triggers.intervalMinutes}m
            </Tag>
          ) : null}

          {routine.triggers.onStartup && (
            <Tag
              color="green"
              icon={<Zap size={11} className="inline mr-1" />}
              className="text-xs !m-0 !rounded-md"
            >
              On Startup
            </Tag>
          )}

          <Tag color="default" className="text-xs !m-0 !rounded-md">
            {enabledStepsCount} {enabledStepsCount === 1 ? 'step' : 'steps'}
          </Tag>
        </div>

        {/* Step Chips Preview */}
        <div className="bg-gray-50 border border-gray-100 rounded-lg p-2 mb-3">
          <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider mb-1.5">
            Execution Pipeline
          </div>
          <div className="flex flex-wrap gap-1">
            {routine.steps.map((step, idx) => (
              <span
                key={step.id || idx}
                className={`text-[11px] px-2 py-0.5 rounded-md border flex items-center gap-1 ${
                  step.enabled
                    ? 'bg-white text-gray-700 border-gray-200'
                    : 'bg-gray-100 text-gray-400 border-gray-200 line-through'
                }`}
              >
                <span className="text-gray-400 font-mono text-[9px]">
                  {idx + 1}.
                </span>
                <span>{step.name || getStepTypeLabel(step.type)}</span>
              </span>
            ))}
          </div>
        </div>

        {/* Last Run Status */}
        {routine.lastRunAt && (
          <div className="text-xs text-gray-500 mb-3 flex items-center justify-between border-t border-gray-100 pt-2">
            <span className="flex items-center gap-1">
              {routine.lastRunSuccess ? (
                <CheckCircle2 size={13} className="text-emerald-500" />
              ) : (
                <XCircle size={13} className="text-rose-500" />
              )}
              <span>
                Last run:{' '}
                {new Date(routine.lastRunAt).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </span>
            </span>
            {routine.lastRunSummary && (
              <span
                className="text-[11px] text-gray-400 max-w-[150px] truncate"
                title={routine.lastRunSummary}
              >
                {routine.lastRunSummary}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Action Footer */}
      <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-auto">
        <button
          type="button"
          onClick={() => onRun(routine)}
          disabled={isRunning}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-medium transition-colors shadow-sm disabled:opacity-50 cursor-pointer"
        >
          <Play size={13} fill="currentColor" />
          <span>{isRunning ? 'Running...' : 'Run Now'}</span>
        </button>

        <div className="flex items-center gap-1">
          <Tooltip title="Edit Routine">
            <button
              type="button"
              onClick={() => onEdit(routine)}
              className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors cursor-pointer"
            >
              <Edit3 size={15} />
            </button>
          </Tooltip>

          <Tooltip title="Duplicate">
            <button
              type="button"
              onClick={() => onDuplicate(routine)}
              className="p-1.5 text-gray-500 hover:text-purple-600 hover:bg-purple-50 rounded-md transition-colors cursor-pointer"
            >
              <Copy size={15} />
            </button>
          </Tooltip>

          <Popconfirm
            title="Delete Routine"
            description={`Are you sure you want to delete "${routine.name}"?`}
            onConfirm={() => onDelete(routine.id)}
            okText="Delete"
            cancelText="Cancel"
            okButtonProps={{ danger: true }}
          >
            <button
              type="button"
              className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors cursor-pointer"
            >
              <Trash2 size={15} />
            </button>
          </Popconfirm>
        </div>
      </div>
    </Card>
  )
}
