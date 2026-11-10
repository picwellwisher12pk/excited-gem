import React, { useState } from 'react'
import {
  Zap,
  Copy,
  FolderArchive,
  Compass,
  Plus,
  ShieldCheck,
} from 'lucide-react'
import { notification } from 'antd'
import { useTheme } from '../theme/ThemeContext'
import { RoutineCard } from './routines/RoutineCard'
import { CustomRoutineModal } from './routines/CustomRoutineModal'
import { useRoutinesManager } from './routines/useRoutinesManager'
import type { RoutinesViewProps } from './routines/types'

export type { CustomRoutine, RoutinesViewProps } from './routines/types'

export const RoutinesView: React.FC<RoutinesViewProps> = ({
  windows,
  onDiscardTab,
  onCloseTab
}) => {
  const { isDark } = useTheme()
  const [api, contextHolder] = notification.useNotification()
  const [isModalOpen, setIsModalOpen] = useState(false)

  const {
    customRoutines,
    routineStatus,
    runWithAnimation,
    handleRunMemorySaver,
    handleRunDeduplication,
    handleRunFocusMode,
    handleRunEndOfDay,
    handleRunCustomRoutine,
    addCustomRoutine,
    deleteCustomRoutine
  } = useRoutinesManager(api, windows, onDiscardTab, onCloseTab)

  const builtInRoutines = [
    {
      id: 'memory',
      title: 'Memory Saver',
      desc: 'Suspends inactive, non-playing tabs across all browsers to reclaim system memory.',
      icon: Zap,
      tag: 'Memory Hygiene',
      gradient: 'linear-gradient(135deg, #d29922, #f0c000)',
      onRun: () => runWithAnimation('memory', handleRunMemorySaver)
    },
    {
      id: 'dedup',
      title: 'Cross-Browser Deduplicator',
      desc: 'Finds identical URLs opened across different browsers and closes duplicate instances.',
      icon: Copy,
      tag: 'Deduplication',
      gradient: 'linear-gradient(135deg, #0078d4, #60cdff)',
      onRun: () => runWithAnimation('dedup', handleRunDeduplication)
    },
    {
      id: 'focus',
      title: 'Deep Focus Mode',
      desc: 'Silences and suspends distracting social media and video streaming tabs.',
      icon: ShieldCheck,
      tag: 'Productivity',
      gradient: 'linear-gradient(135deg, #7928ca, #ff0080)',
      onRun: () => runWithAnimation('focus', handleRunFocusMode)
    },
    {
      id: 'eod',
      title: 'End-of-Day Workspace Archival',
      desc: 'Saves current tabs to a dated snapshot and cools down system memory for the night.',
      icon: FolderArchive,
      tag: 'Snapshot & Sleep',
      gradient: 'linear-gradient(135deg, #0e7090, #0284c7)',
      onRun: () => runWithAnimation('eod', handleRunEndOfDay)
    }
  ]

  return (
    <div
      className={`flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-5xl font-sans transition-colors ${
        isDark ? 'bg-[#181818] text-white' : 'bg-[#f4f4f4] text-[#1a1a1a]'
      }`}
    >
      {contextHolder}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold tracking-tight m-0 flex items-center gap-2">
            <Zap className="w-5 h-5 text-[#d29922]" />
            Workflow & Automation Routines
          </h2>
          <p className={`text-xs m-0 mt-0.5 ${isDark ? 'text-[#888888]' : 'text-[#666666]'}`}>
            Execute one-click optimizations and custom multi-browser presets.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-[#0078d4] to-[#106ebe] hover:brightness-110 active:scale-95 shadow-sm shadow-[#0078d4]/30 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>New Custom Routine</span>
        </button>
      </div>

      {/* Built-in System Routines */}
      <div>
        <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-[#888888]' : 'text-[#666666]'}`}>
          System Optimization Presets
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {builtInRoutines.map((routine) => (
            <RoutineCard
              key={routine.id}
              id={routine.id}
              title={routine.title}
              desc={routine.desc}
              tag={routine.tag}
              icon={routine.icon}
              gradient={routine.gradient}
              status={routineStatus[routine.id] || 'idle'}
              isDark={isDark}
              onRun={routine.onRun}
            />
          ))}
        </div>
      </div>

      {/* Custom User Routines */}
      {customRoutines.length > 0 && (
        <div>
          <h3 className={`text-xs font-semibold uppercase tracking-wider mb-3 ${isDark ? 'text-[#888888]' : 'text-[#666666]'}`}>
            Custom Workflow Launchers
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {customRoutines.map((routine) => (
              <RoutineCard
                key={routine.id}
                id={routine.id}
                title={routine.name}
                desc={routine.desc}
                tag={routine.targetBrowser || 'Launcher'}
                icon={Compass}
                gradient="linear-gradient(135deg, #107c41, #2eaadc)"
                status={routineStatus[routine.id] || 'idle'}
                isDark={isDark}
                isCustom={true}
                onRun={() => runWithAnimation(routine.id, () => handleRunCustomRoutine(routine))}
                onDelete={() => deleteCustomRoutine(routine.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Custom Routine Modal */}
      <CustomRoutineModal
        visible={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={addCustomRoutine}
      />
    </div>
  )
}
