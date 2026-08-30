import React, { useState, useEffect, useRef } from 'react'
import { Button, Input, Radio, message, Typography, Empty } from 'antd'
import {
  Plus,
  Sparkles,
  Zap,
  Download,
  Upload,
  Search as SearchIcon
} from 'lucide-react'
import type {
  Routine,
  RoutinePreset,
  RoutineExecutionResult
} from '../../types/routine'
import {
  getRoutines,
  saveRoutine,
  deleteRoutine,
  toggleRoutineEnabled,
  addRoutineFromPreset,
  exportRoutinesJson,
  importRoutinesJson
} from '../../services/routineStorage'
import { executeRoutine } from '../../services/routineEngine'
import { RoutineCard } from './RoutineCard'
import { RoutineEditorModal } from './RoutineEditorModal'
import { PresetGalleryModal } from './PresetGalleryModal'
import { RoutineExecutionModal } from './RoutineExecutionModal'

const { Title, Text } = Typography

export const RoutinesManager: React.FC = () => {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterMode, setFilterMode] = useState<
    'all' | 'scheduled' | 'startup' | 'enabled' | 'disabled'
  >('all')

  // Modals state
  const [editorModalOpen, setEditorModalOpen] = useState(false)
  const [editingRoutine, setEditingRoutine] = useState<Routine | null>(null)
  const [presetModalOpen, setPresetModalOpen] = useState(false)

  // Execution state
  const [execModalOpen, setExecModalOpen] = useState(false)
  const [executingRoutine, setExecutingRoutine] = useState<Routine | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [executionResult, setExecutionResult] =
    useState<RoutineExecutionResult | null>(null)
  const [progress, setProgress] = useState<{
    current: number
    total: number
    currentStepName?: string
  } | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const loadData = async () => {
    setLoading(true)
    try {
      const data = await getRoutines()
      setRoutines(data)
    } catch (err) {
      console.error('Failed to load routines:', err)
      message.error('Failed to load routines.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleRunRoutine = async (routine: Routine) => {
    setExecutingRoutine(routine)
    setIsRunning(true)
    setExecutionResult(null)
    const enabledSteps = routine.steps.filter((s) => s.enabled)
    setProgress({ current: 0, total: enabledSteps.length })
    setExecModalOpen(true)

    try {
      const result = await executeRoutine(routine, {
        targetScope: routine.targetScope,
        onStepProgress: (stepRes, current, total) => {
          setProgress({ current, total, currentStepName: stepRes.stepName })
        }
      })
      setExecutionResult(result)
      if (result.success) {
        message.success(`Routine "${routine.name}" finished successfully!`)
      } else {
        message.error(`Routine "${routine.name}" completed with errors.`)
      }
    } catch (err: any) {
      message.error(`Execution failed: ${err.message}`)
    } finally {
      setIsRunning(false)
      loadData()
    }
  }

  const handleSaveRoutine = async (routine: Routine) => {
    try {
      const updated = await saveRoutine(routine)
      setRoutines(updated)
      message.success(`Routine "${routine.name}" saved!`)
    } catch (err: any) {
      message.error(`Failed to save: ${err.message}`)
    }
  }

  const handleDeleteRoutine = async (routineId: string) => {
    try {
      const updated = await deleteRoutine(routineId)
      setRoutines(updated)
      message.success('Routine deleted')
    } catch (err: any) {
      message.error(`Failed to delete: ${err.message}`)
    }
  }

  const handleDuplicateRoutine = async (routine: Routine) => {
    try {
      const duplicated: Routine = {
        ...JSON.parse(JSON.stringify(routine)),
        id: `routine_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        name: `${routine.name} (Copy)`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      }
      const updated = await saveRoutine(duplicated)
      setRoutines(updated)
      message.success(`Duplicated as "${duplicated.name}"`)
    } catch (err: any) {
      message.error(`Failed to duplicate: ${err.message}`)
    }
  }

  const handleToggleEnabled = async (routineId: string, enabled: boolean) => {
    try {
      const updated = await toggleRoutineEnabled(routineId, enabled)
      setRoutines(updated)
      message.success(enabled ? 'Routine enabled' : 'Routine disabled')
    } catch (err: any) {
      message.error('Failed to update status')
    }
  }

  const handleAddFromPreset = async (preset: RoutinePreset) => {
    try {
      const newRoutine = await addRoutineFromPreset(preset)
      setRoutines((prev) => [newRoutine, ...prev])
      message.success(`Added "${preset.name}" to routines!`)
      setPresetModalOpen(false)
    } catch (err: any) {
      message.error('Failed to add preset')
    }
  }

  const handleExportAll = () => {
    const jsonStr = exportRoutinesJson(routines)
    const blob = new Blob([jsonStr], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `excited-gem-routines-${new Date().toISOString().split('T')[0]}.json`
    a.click()
    URL.revokeObjectURL(url)
    message.success('Routines exported to JSON')
  }

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = async (event) => {
      const content = event.target?.result as string
      if (content) {
        const res = await importRoutinesJson(content)
        if (res.success) {
          message.success(`Successfully imported ${res.count} routines!`)
          loadData()
        } else {
          message.error(`Import failed: ${res.error}`)
        }
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const filteredRoutines = routines.filter((r) => {
    const matchesSearch =
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.description.toLowerCase().includes(searchQuery.toLowerCase())

    if (!matchesSearch) return false

    if (filterMode === 'scheduled') {
      return !!r.triggers.intervalMinutes && r.triggers.intervalMinutes > 0
    }
    if (filterMode === 'startup') {
      return !!r.triggers.onStartup
    }
    if (filterMode === 'enabled') {
      return r.enabled
    }
    if (filterMode === 'disabled') {
      return !r.enabled
    }
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 rounded-2xl p-6 text-white shadow-md">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="p-1.5 bg-white/20 rounded-lg">
                <Zap size={20} className="text-amber-300" />
              </span>
              <h2 className="text-xl font-bold text-white m-0">
                Routines & Automated Macros
              </h2>
            </div>
            <p className="text-xs text-blue-100 max-w-xl m-0">
              Build custom multi-step actions to clean up duplicate tabs,
              auto-group by domain, mute background noise, free RAM, and save
              workspaces in one click or on a recurring schedule.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="primary"
              className="!bg-white !text-blue-700 hover:!bg-blue-50 font-semibold shadow-sm flex items-center gap-1.5 border-none"
              onClick={() => {
                setEditingRoutine(null)
                setEditorModalOpen(true)
              }}
              icon={<Plus size={15} />}
            >
              Create Routine
            </Button>

            <Button
              className="!bg-white/15 !text-white hover:!bg-white/25 !border-white/30 flex items-center gap-1.5"
              onClick={() => setPresetModalOpen(true)}
              icon={<Sparkles size={14} />}
            >
              Preset Gallery
            </Button>

            <Button
              className="!bg-white/10 !text-white hover:!bg-white/20 !border-white/20 flex items-center"
              onClick={handleExportAll}
              title="Export routines as JSON"
              icon={<Download size={14} />}
            />

            <Button
              className="!bg-white/10 !text-white hover:!bg-white/20 !border-white/20 flex items-center"
              onClick={() => fileInputRef.current?.click()}
              title="Import routines from JSON"
              icon={<Upload size={14} />}
            />
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleImportFile}
              accept=".json"
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-gray-200 shadow-sm">
        <div className="w-full sm:w-72">
          <Input
            placeholder="Search routines..."
            prefix={<SearchIcon size={14} className="text-gray-400 mr-1" />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            allowClear
            size="middle"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          <Radio.Group
            value={filterMode}
            onChange={(e) => setFilterMode(e.target.value)}
            size="small"
            buttonStyle="solid"
          >
            <Radio.Button value="all">All ({routines.length})</Radio.Button>
            <Radio.Button value="scheduled">
              Scheduled (
              {routines.filter((r) => r.triggers.intervalMinutes).length})
            </Radio.Button>
            <Radio.Button value="startup">
              Startup ({routines.filter((r) => r.triggers.onStartup).length})
            </Radio.Button>
            <Radio.Button value="enabled">
              Enabled ({routines.filter((r) => r.enabled).length})
            </Radio.Button>
            <Radio.Button value="disabled">
              Disabled ({routines.filter((r) => !r.enabled).length})
            </Radio.Button>
          </Radio.Group>
        </div>
      </div>

      {/* Routine Cards Grid */}
      {filteredRoutines.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-2xl p-12 text-center shadow-sm">
          <Empty
            description={
              <div className="mt-2">
                <div className="text-sm font-semibold text-gray-700">
                  {searchQuery
                    ? 'No matching routines found'
                    : 'No routines yet'}
                </div>
                <div className="text-xs text-gray-500 mt-1 max-w-md mx-auto">
                  {searchQuery
                    ? 'Try clearing your search query or changing filter criteria.'
                    : 'Create your first automated routine or install ready-to-use templates from the gallery.'}
                </div>
              </div>
            }
          >
            <div className="flex items-center justify-center gap-3 mt-4">
              <Button
                type="primary"
                icon={<Plus size={14} />}
                onClick={() => {
                  setEditingRoutine(null)
                  setEditorModalOpen(true)
                }}
              >
                Create Custom Routine
              </Button>
              <Button
                icon={<Sparkles size={14} />}
                onClick={() => setPresetModalOpen(true)}
              >
                Browse Presets
              </Button>
            </div>
          </Empty>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredRoutines.map((routine) => (
            <RoutineCard
              key={routine.id}
              routine={routine}
              onRun={handleRunRoutine}
              onEdit={(r) => {
                setEditingRoutine(r)
                setEditorModalOpen(true)
              }}
              onDuplicate={handleDuplicateRoutine}
              onDelete={handleDeleteRoutine}
              onToggleEnabled={handleToggleEnabled}
              isRunning={isRunning && executingRoutine?.id === routine.id}
            />
          ))}
        </div>
      )}

      {/* Editor Modal */}
      <RoutineEditorModal
        visible={editorModalOpen}
        routine={editingRoutine}
        onSave={handleSaveRoutine}
        onClose={() => {
          setEditorModalOpen(false)
          setEditingRoutine(null)
        }}
      />

      {/* Preset Gallery Modal */}
      <PresetGalleryModal
        visible={presetModalOpen}
        onClose={() => setPresetModalOpen(false)}
        onAddPreset={handleAddFromPreset}
        existingRoutines={routines}
      />

      {/* Execution Progress / Result Modal */}
      <RoutineExecutionModal
        visible={execModalOpen}
        routine={executingRoutine}
        isRunning={isRunning}
        progress={progress}
        result={executionResult}
        onClose={() => {
          setExecModalOpen(false)
          setExecutingRoutine(null)
        }}
      />
    </div>
  )
}
export default RoutinesManager
