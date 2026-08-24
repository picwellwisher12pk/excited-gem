import React from 'react'
import { Modal, Progress, Button, Typography, } from 'antd'
import {
  CheckCircle2,
  XCircle,
  Loader2,
} from 'lucide-react'
import type { Routine, RoutineExecutionResult, } from '../../types/routine'

const { Title, Text } = Typography

interface RoutineExecutionModalProps {
  visible: boolean
  routine: Routine | null
  isRunning: boolean
  progress: { current: number; total: number; currentStepName?: string } | null
  result: RoutineExecutionResult | null
  onClose: () => void
}

export const RoutineExecutionModal: React.FC<RoutineExecutionModalProps> = ({
  visible,
  routine,
  isRunning,
  progress,
  result,
  onClose
}) => {
  if (!routine) return null

  const percent =
    progress && progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : isRunning
      ? 50
      : 100

  return (
    <Modal
      title={
        <div className="flex items-center gap-2">
          {isRunning ? (
            <Loader2 size={18} className="animate-spin text-blue-500" />
          ) : result?.success ? (
            <CheckCircle2 size={18} className="text-emerald-500" />
          ) : (
            <XCircle size={18} className="text-rose-500" />
          )}
          <span className="font-semibold text-base">
            {isRunning
              ? `Executing: ${routine.name}`
              : result?.success
              ? `Completed: ${routine.name}`
              : `Routine Failed`}
          </span>
        </div>
      }
      open={visible}
      onCancel={isRunning ? undefined : onClose}
      closable={!isRunning}
      maskClosable={!isRunning}
      width={580}
      footer={[
        <Button key="close" type="primary" disabled={isRunning} onClick={onClose}>
          {isRunning ? 'Running...' : 'Close'}
        </Button>
      ]}
    >
      <div className="py-2 space-y-4">
        {/* Progress Bar */}
        <div>
          <div className="flex justify-between text-xs text-gray-500 mb-1">
            <span>{progress?.currentStepName || (isRunning ? 'Processing steps...' : 'Completed')}</span>
            <span>
              {progress ? `${progress.current} of ${progress.total} steps` : `${percent}%`}
            </span>
          </div>
          <Progress
            percent={percent}
            status={isRunning ? 'active' : result?.success ? 'success' : 'exception'}
            showInfo={false}
            strokeColor={routine.color || '#3b82f6'}
          />
        </div>

        {/* Live Step Results */}
        {result && result.stepResults && (
          <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
            {result.stepResults.map((step, idx) => (
              <div
                key={step.stepId || idx}
                className={`p-2.5 rounded-lg border text-xs flex items-center justify-between ${
                  step.success
                    ? 'bg-emerald-50/50 border-emerald-100 text-gray-800'
                    : 'bg-rose-50/50 border-rose-100 text-gray-800'
                }`}
              >
                <div className="flex items-center gap-2">
                  {step.success ? (
                    <CheckCircle2 size={14} className="text-emerald-500 flex-shrink-0" />
                  ) : (
                    <XCircle size={14} className="text-rose-500 flex-shrink-0" />
                  )}
                  <div>
                    <div className="font-semibold">{step.stepName}</div>
                    <div className="text-[11px] text-gray-500">{step.message}</div>
                  </div>
                </div>
                <div className="text-[10px] text-gray-400 font-mono">
                  {step.durationMs}ms
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Summary Stats Grid */}
        {result && (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <div className="text-xs font-semibold text-gray-700 uppercase tracking-wider mb-2">
              Execution Impact
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-white p-2 rounded-lg border border-gray-100">
                <div className="font-bold text-gray-800 text-sm">{result.summary.closedTabs}</div>
                <div className="text-[10px] text-gray-400">Tabs Closed</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-100">
                <div className="font-bold text-gray-800 text-sm">{result.summary.groupedTabs}</div>
                <div className="text-[10px] text-gray-400">Tabs Grouped</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-100">
                <div className="font-bold text-gray-800 text-sm">{result.summary.discardedTabs}</div>
                <div className="text-[10px] text-gray-400">Tabs Suspended</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-100">
                <div className="font-bold text-gray-800 text-sm">{result.summary.mutedTabs}</div>
                <div className="text-[10px] text-gray-400">Tabs Muted</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-100">
                <div className="font-bold text-gray-800 text-sm">{result.summary.savedSessions}</div>
                <div className="text-[10px] text-gray-400">Sessions Saved</div>
              </div>
              <div className="bg-white p-2 rounded-lg border border-gray-100">
                <div className="font-bold text-gray-800 text-sm">{result.durationMs}ms</div>
                <div className="text-[10px] text-gray-400">Duration</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  )
}
