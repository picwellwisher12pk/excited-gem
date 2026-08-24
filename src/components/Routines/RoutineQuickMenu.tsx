import React, { useState, useEffect } from 'react'
import { Dropdown, Button, message } from 'antd'
import type { MenuProps } from 'antd'
import {
  Zap,
  ChevronDown,
  Settings,
} from 'lucide-react'
import Btn from '../Btn'
import type { Routine, RoutineExecutionResult, RoutineScope } from '../../types/routine'
import { getRoutines } from '../../services/routineStorage'
import { executeRoutine } from '../../services/routineEngine'
import { getRoutineIcon } from './RoutineCard'
import { RoutineExecutionModal } from './RoutineExecutionModal'

interface RoutineQuickMenuProps {
  targetScope?: RoutineScope
  selectedTabIds?: number[]
  className?: string
  buttonText?: string
  title?: string
  iconOnly?: boolean
  useBtn?: boolean
  type?: 'primary' | 'default' | 'text' | 'dashed'
  size?: 'small' | 'middle' | 'large'
}

export const RoutineQuickMenu: React.FC<RoutineQuickMenuProps> = ({
  targetScope = 'active-window',
  selectedTabIds,
  className = '',
  buttonText = 'Routines',
  title = 'Routines & Macros',
  iconOnly = false,
  useBtn = false,
  type = 'default',
  size = 'middle'
}) => {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [executionResult, setExecutionResult] = useState<RoutineExecutionResult | null>(null)
  const [execModalOpen, setExecModalOpen] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number; currentStepName?: string } | null>(null)

  const loadRoutinesList = async () => {
    try {
      const list = await getRoutines()
      setRoutines(list)
    } catch (err) {
      console.error('Failed to load routines:', err)
    }
  }

  useEffect(() => {
    loadRoutinesList()
  }, [])

  const handleRun = async (routine: Routine) => {
    setActiveRoutine(routine)
    setIsRunning(true)
    setExecutionResult(null)
    setProgress({ current: 0, total: routine.steps.filter((s) => s.enabled).length })
    setExecModalOpen(true)

    try {
      const result = await executeRoutine(routine, {
        targetScope: selectedTabIds && selectedTabIds.length > 0 ? 'selected-tabs' : targetScope,
        selectedTabIds,
        onStepProgress: (stepRes, current, total) => {
          setProgress({ current, total, currentStepName: stepRes.stepName })
        }
      })
      setExecutionResult(result)
      if (result.success) {
        message.success(`"${routine.name}" completed!`)
      } else {
        message.error(`"${routine.name}" failed: ${result.error}`)
      }
    } catch (err: any) {
      message.error(`Execution error: ${err.message}`)
    } finally {
      setIsRunning(false)
      loadRoutinesList()
    }
  }

  const enabledRoutines = routines.filter((r) => r.enabled)

  const menuItems: MenuProps['items'] = [
    {
      type: 'group',
      label: (
        <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
          {selectedTabIds && selectedTabIds.length > 0
            ? `Run Routine on ${selectedTabIds.length} Selected Tabs`
            : 'Quick Run Routines'}
        </span>
      ),
      children:
        enabledRoutines.length > 0
          ? enabledRoutines.map((routine) => ({
              key: routine.id,
              icon: (
                <span style={{ color: routine.color }}>
                  {getRoutineIcon(routine.icon, 14, routine.color)}
                </span>
              ),
              label: (
                <div className="flex items-center justify-between gap-4 py-0.5">
                  <span className="font-medium text-xs text-gray-800">{routine.name}</span>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {routine.steps.filter((s) => s.enabled).length} steps
                  </span>
                </div>
              ),
              onClick: () => handleRun(routine)
            }))
          : [
              {
                key: 'no-routines',
                disabled: true,
                label: <span className="text-xs text-gray-400 italic">No routines enabled</span>
              }
            ]
    },
    {
      type: 'divider'
    },
    {
      key: 'manage-routines',
      icon: <Settings size={14} className="text-gray-500" />,
      label: <a href="/tabs/settings.html#routines">Manage & Create Routines</a>
    }
  ]

  return (
    <>
      <Dropdown
        menu={{ items: menuItems }}
        placement="bottomRight"
        trigger={['click']}
        onOpenChange={(open) => {
          if (open) loadRoutinesList()
        }}
      >
        {useBtn ? (
          <Btn
            title={title || 'Routines & Macros'}
            className={`flex items-center justify-center ${iconOnly ? 'px-2 min-w-[36px]' : 'gap-1'} ${className}`}
          >
            <Zap size={14} className="text-amber-500 fill-amber-500" />
            {!iconOnly && <span>{buttonText}</span>}
          </Btn>
        ) : (
          <Button
            type={type}
            size={size}
            className={`flex items-center gap-1.5 ${className}`}
            icon={<Zap size={14} className="text-amber-500 fill-amber-500" />}
          >
            {!iconOnly && <span>{buttonText}</span>}
            <ChevronDown size={12} className="text-gray-400 ml-0.5" />
          </Button>
        )}
      </Dropdown>

      <RoutineExecutionModal
        visible={execModalOpen}
        routine={activeRoutine}
        isRunning={isRunning}
        progress={progress}
        result={executionResult}
        onClose={() => setExecModalOpen(false)}
      />
    </>
  )
}
