import React, { useState, useEffect } from 'react'
import {
  Modal,
  Input,
  Select,
  Checkbox,
  Button,
  Tag,
  Switch,
  InputNumber,
  message,
  Tooltip
} from 'antd'
import {
  Plus,
  Trash2,
  MoveUp,
  MoveDown,
  Copy,
  Play,
  Zap,
  Sparkles,
  Layers,
  VolumeX,
  Volume2,
  Pin,
  Bookmark,
  Cpu,
  ArrowUpDown,
  Clock,
  Globe,
  FolderPlus,
  Search,
  Sliders,
  CheckCircle2,
  HelpCircle,
  X
} from 'lucide-react'
import type { Routine, RoutineStep, StepActionType, RoutineScope, StepParams } from '../../types/routine'
import { getRoutineIcon, getStepTypeLabel } from './RoutineCard'
import { executeRoutine } from '../../services/routineEngine'

const { TextArea } = Input

interface RoutineEditorModalProps {
  visible: boolean
  routine: Routine | null
  onSave: (routine: Routine) => void
  onClose: () => void
}

const AVAILABLE_ICONS = [
  'Sparkles',
  'Zap',
  'Cpu',
  'Bookmark',
  'Layers',
  'VolumeX',
  'Volume2',
  'Pin',
  'ArrowUpDown',
  'Clock'
]

const AVAILABLE_COLORS = [
  '#3b82f6', // blue
  '#8b5cf6', // purple
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#06b6d4', // cyan
  '#ec4899', // pink
  '#64748b'  // slate
]

interface ActionStepDefinition {
  type: StepActionType
  title: string
  description: string
  icon: React.ReactNode
  category: 'filter' | 'cleanup' | 'organize' | 'state' | 'sessions'
}

const ACTION_CATALOG: ActionStepDefinition[] = [
  // Search & Filter Working Scope
  {
    type: 'filter-tabs',
    title: 'Filter / Search Tabs (Set Working Scope)',
    description: 'Searches tabs matching URL or Title pattern/regex. All subsequent steps in this routine will run ONLY on these tabs.',
    icon: <Search size={16} className="text-blue-600" />,
    category: 'filter'
  },
  {
    type: 'reset-filter',
    title: 'Reset Filter Scope',
    description: 'Resets the working scope back to the full window tabs for any following steps.',
    icon: <Sparkles size={16} className="text-gray-500" />,
    category: 'filter'
  },

  // Tab Cleanup
  {
    type: 'close-duplicates',
    title: 'Close Duplicate Tabs',
    description: 'Finds identical URLs and closes redundant copies, keeping pinned tabs.',
    icon: <Sparkles size={16} className="text-blue-500" />,
    category: 'cleanup'
  },
  {
    type: 'discard-tabs',
    title: 'Suspend Background Tabs (Save RAM)',
    description: 'Hibernates inactive tabs to free memory without closing them.',
    icon: <Cpu size={16} className="text-emerald-500" />,
    category: 'cleanup'
  },
  {
    type: 'close-tabs',
    title: 'Close Filtered Tabs / Distractions',
    description: 'Closes tabs matching domain blacklists (social media) or URL patterns.',
    icon: <Trash2 size={16} className="text-red-500" />,
    category: 'cleanup'
  },

  // Tab Organization
  {
    type: 'group-by-domain',
    title: 'Auto-Group Tabs by Domain',
    description: 'Groups multiple tabs from the same site into colored Chrome tab groups.',
    icon: <Layers size={16} className="text-indigo-500" />,
    category: 'organize'
  },
  {
    type: 'group-by-rule',
    title: 'Group Tabs by Rule / Regex',
    description: 'Matches specific URLs or titles and puts them in a named group.',
    icon: <Layers size={16} className="text-purple-500" />,
    category: 'organize'
  },
  {
    type: 'sort-tabs',
    title: 'Sort Tabs (Domain, Title, URL)',
    description: 'Reorders tabs in your window alphabetically, keeping pinned tabs first.',
    icon: <ArrowUpDown size={16} className="text-cyan-500" />,
    category: 'organize'
  },
  {
    type: 'move-to-window',
    title: 'Move Matching Tabs to New Window',
    description: 'Gathers matching or selected tabs (e.g. YouTube Shorts) into a clean new window.',
    icon: <Layers size={16} className="text-amber-500" />,
    category: 'organize'
  },

  // State & Audio Control
  {
    type: 'mute-tabs',
    title: 'Mute Tabs (All / Background)',
    description: 'Silences noisy tabs or all background tabs immediately.',
    icon: <VolumeX size={16} className="text-orange-500" />,
    category: 'state'
  },
  {
    type: 'unmute-tabs',
    title: 'Unmute Tabs',
    description: 'Restores audio for muted tabs.',
    icon: <Volume2 size={16} className="text-teal-500" />,
    category: 'state'
  },
  {
    type: 'pin-tabs',
    title: 'Pin Tabs (Rule / All)',
    description: 'Pins matching tabs to keep important tools handy.',
    icon: <Pin size={16} className="text-rose-500" />,
    category: 'state'
  },
  {
    type: 'unpin-tabs',
    title: 'Unpin Tabs',
    description: 'Unpins tabs back to normal tabs.',
    icon: <Pin size={16} className="text-gray-400" />,
    category: 'state'
  },

  // Sessions & Lists
  {
    type: 'save-session',
    title: 'Save Window Tabs to Session',
    description: 'Saves current window tabs into a timestamped Session backup.',
    icon: <Bookmark size={16} className="text-amber-500" />,
    category: 'sessions'
  },
  {
    type: 'save-list',
    title: 'Save Tabs to List',
    description: 'Saves matching or selected tabs into your Lists library.',
    icon: <FolderPlus size={16} className="text-blue-500" />,
    category: 'sessions'
  },
  {
    type: 'open-urls',
    title: 'Open Specific URLs',
    description: 'Opens a defined list of websites in new tabs or a new window.',
    icon: <Globe size={16} className="text-green-500" />,
    category: 'sessions'
  },
  {
    type: 'wait',
    title: 'Delay / Wait',
    description: 'Pauses for a specified number of seconds before the next step.',
    icon: <Clock size={16} className="text-gray-500" />,
    category: 'sessions'
  }
]

const DEFAULT_EMPTY_ROUTINE: Routine = {
  id: '',
  name: 'New Routine',
  description: '',
  icon: 'Zap',
  color: '#3b82f6',
  enabled: true,
  targetScope: 'active-window',
  triggers: {
    manual: true,
    onStartup: false,
    intervalMinutes: null
  },
  steps: [],
  createdAt: 0,
  updatedAt: 0
}

export const RoutineEditorModal: React.FC<RoutineEditorModalProps> = ({
  visible,
  routine,
  onSave,
  onClose
}) => {
  const [formData, setFormData] = useState<Routine>(DEFAULT_EMPTY_ROUTINE)
  const [isTesting, setIsTesting] = useState(false)
  const [stepPickerOpen, setStepPickerOpen] = useState(false)
  const [stepSearch, setStepSearch] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'filter' | 'cleanup' | 'organize' | 'state' | 'sessions'
  >('all')

  useEffect(() => {
    if (routine) {
      setFormData(JSON.parse(JSON.stringify(routine)))
    } else {
      setFormData({
        ...DEFAULT_EMPTY_ROUTINE,
        id: `routine_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        createdAt: Date.now(),
        updatedAt: Date.now()
      })
    }
  }, [routine, visible])

  const handleAddStep = (type: StepActionType) => {
    const newStep: RoutineStep = {
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      type,
      name: getStepTypeLabel(type),
      enabled: true,
      params: getDefaultParamsForType(type)
    }

    setFormData((prev) => ({
      ...prev,
      steps: [...prev.steps, newStep]
    }))
    setStepPickerOpen(false)
  }

  const getDefaultParamsForType = (type: StepActionType): StepParams => {
    switch (type) {
      case 'filter-tabs':
        return { filterPattern: '', filterField: 'url', isRegex: false, invertMatch: false }
      case 'reset-filter':
        return {}
      case 'close-duplicates':
        return { preferPinned: true, acrossAllWindows: false }
      case 'group-by-domain':
        return { minTabsPerGroup: 2 }
      case 'group-by-rule':
        return { groupTitle: 'Work', rulePattern: 'github.com', ruleField: 'url', isRegex: false }
      case 'sort-tabs':
        return { sortBy: 'domain', sortDirection: 'asc' }
      case 'move-to-window':
        return { filterPattern: '', filterField: 'url', isRegex: false, newWindowIncognito: false }
      case 'discard-tabs':
        return { discardScope: 'all-background' }
      case 'mute-tabs':
        return { muteScope: 'all-except-active' }
      case 'unmute-tabs':
        return {}
      case 'pin-tabs':
        return { pinScope: 'all' }
      case 'unpin-tabs':
        return {}
      case 'close-tabs':
        return { closeCondition: 'domain-list', domainList: ['twitter.com', 'reddit.com'] }
      case 'save-session':
        return { sessionNameTemplate: 'Routine Snapshot - {date} {time}', closeAfterSave: false }
      case 'save-list':
        return { filterPattern: '', sessionNameTemplate: 'Routine List - {date} {time}', closeAfterSave: false }
      case 'open-urls':
        return { urls: ['https://google.com'], openInNewWindow: false, pinOpenedTabs: false }
      case 'wait':
        return { delayMs: 1000 }
      case 'show-notification':
        return { messageText: 'Routine step finished' }
      default:
        return {}
    }
  }

  const handleRemoveStep = (stepId: string) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.filter((s) => s.id !== stepId)
    }))
  }

  const handleDuplicateStep = (step: RoutineStep, idx: number) => {
    const duplicated: RoutineStep = {
      ...JSON.parse(JSON.stringify(step)),
      id: `step_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: `${step.name} (Copy)`
    }
    const newSteps = [...formData.steps]
    newSteps.splice(idx + 1, 0, duplicated)
    setFormData((prev) => ({ ...prev, steps: newSteps }))
  }

  const handleMoveStep = (idx: number, direction: 'up' | 'down') => {
    const targetIdx = direction === 'up' ? idx - 1 : idx + 1
    if (targetIdx < 0 || targetIdx >= formData.steps.length) return
    const newSteps = [...formData.steps]
    const temp = newSteps[idx]
    newSteps[idx] = newSteps[targetIdx]
    newSteps[targetIdx] = temp
    setFormData((prev) => ({ ...prev, steps: newSteps }))
  }

  const handleUpdateStep = (stepId: string, updates: Partial<RoutineStep>) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.map((s) => (s.id === stepId ? { ...s, ...updates } : s))
    }))
  }

  const handleUpdateStepParams = (stepId: string, paramUpdates: any) => {
    setFormData((prev) => ({
      ...prev,
      steps: prev.steps.map((s) =>
        s.id === stepId ? { ...s, params: { ...s.params, ...paramUpdates } } : s
      )
    }))
  }

  const handleSave = () => {
    if (!formData.name.trim()) {
      message.error('Routine name cannot be empty')
      return
    }
    if (formData.steps.length === 0) {
      message.warning('Please add at least one step to this routine')
      return
    }
    onSave(formData)
    onClose()
  }

  const handleTestRun = async () => {
    if (formData.steps.length === 0) {
      message.warning('Add at least one step to test')
      return
    }
    setIsTesting(true)
    try {
      const result = await executeRoutine(formData)
      if (result.success) {
        message.success(`Test Run Succeeded! Duration: ${result.durationMs}ms`)
      } else {
        message.error(`Test Run Failed: ${result.error}`)
      }
    } catch (err: any) {
      message.error(`Test Run Error: ${err.message}`)
    } finally {
      setIsTesting(false)
    }
  }

  const filteredCatalog = ACTION_CATALOG.filter((item) => {
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory
    const matchesSearch =
      item.title.toLowerCase().includes(stepSearch.toLowerCase()) ||
      item.description.toLowerCase().includes(stepSearch.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <>
      <Modal
        title={
          <div className="flex items-center gap-2 text-base font-semibold pb-1">
            <div
              className="w-7 h-7 rounded-lg flex items-center justify-center text-white"
              style={{ backgroundColor: formData.color || '#3b82f6' }}
            >
              {getRoutineIcon(formData.icon, 16, '#ffffff')}
            </div>
            <span>{routine ? 'Edit Routine' : 'Create New Routine'}</span>
          </div>
        }
        open={visible}
        onCancel={onClose}
        width={760}
        footer={
          <div className="flex items-center justify-between pt-2 border-t border-gray-100 w-full">
            <Button
              icon={<Play size={13} fill="currentColor" />}
              loading={isTesting}
              onClick={handleTestRun}
            >
              Test Run
            </Button>
            <div className="flex items-center gap-2">
              <Button onClick={onClose}>Cancel</Button>
              <Button type="primary" onClick={handleSave} className="!bg-blue-600">
                Save Routine
              </Button>
            </div>
          </div>
        }
      >
        <div className="space-y-4 max-h-[72vh] overflow-y-auto pr-1">
          {/* Basic Settings */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">Routine Name</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Focus & Tidy"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1 block">Description</label>
              <Input
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="e.g. Cleans duplicates and organizes tabs"
              />
            </div>
          </div>

          {/* Icon & Color Selector */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-gray-50 p-3 rounded-lg border border-gray-100">
            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Icon</label>
              <div className="flex flex-wrap gap-1.5">
                {AVAILABLE_ICONS.map((ic) => (
                  <button
                    key={ic}
                    type="button"
                    onClick={() => setFormData({ ...formData, icon: ic })}
                    className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                      formData.icon === ic
                        ? 'border-blue-500 bg-blue-50 text-blue-600 shadow-sm'
                        : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    {getRoutineIcon(ic, 15)}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-700 mb-1.5 block">Theme Color</label>
              <div className="flex flex-wrap gap-2 pt-1">
                {AVAILABLE_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setFormData({ ...formData, color: c })}
                    className={`w-6 h-6 rounded-full transition-transform cursor-pointer border-2 ${
                      formData.color === c ? 'scale-110 border-gray-800 shadow-sm' : 'border-transparent hover:scale-105'
                    }`}
                    style={{ backgroundColor: c }}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Scope & Automation Triggers */}
          <div className="border border-gray-200 rounded-lg p-3 bg-white space-y-2.5">
            <div className="font-semibold text-[11px] text-gray-800 uppercase tracking-wider">
              Scope & Automation Triggers
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Default Target Scope</label>
                <Select
                  value={formData.targetScope}
                  onChange={(val: RoutineScope) => setFormData({ ...formData, targetScope: val })}
                  className="w-full"
                  options={[
                    { value: 'active-window', label: 'Current Window Tabs' },
                    { value: 'all-windows', label: 'All Windows Tabs' },
                    { value: 'selected-tabs', label: 'Selected Tabs (When Running on Selection)' }
                  ]}
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Scheduled Interval</label>
                <Select
                  value={formData.triggers.intervalMinutes || null}
                  onChange={(val) =>
                    setFormData({
                      ...formData,
                      triggers: { ...formData.triggers, intervalMinutes: val }
                    })
                  }
                  className="w-full"
                  options={[
                    { value: null, label: 'Manual Only (No Schedule)' },
                    { value: 15, label: 'Every 15 minutes' },
                    { value: 30, label: 'Every 30 minutes' },
                    { value: 60, label: 'Every 1 hour' },
                    { value: 120, label: 'Every 2 hours' },
                    { value: 240, label: 'Every 4 hours' },
                    { value: 1440, label: 'Once Daily (24h)' }
                  ]}
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-6 pt-1">
              <Checkbox
                checked={formData.triggers.onStartup}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    triggers: { ...formData.triggers, onStartup: e.target.checked }
                  })
                }
              >
                <span className="text-xs font-medium text-gray-700">
                  Run automatically on browser startup
                </span>
              </Checkbox>

              <Checkbox
                checked={formData.enabled}
                onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
              >
                <span className="text-xs font-medium text-gray-700">Routine Enabled</span>
              </Checkbox>
            </div>
          </div>

          {/* Steps Pipeline Builder */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="font-semibold text-sm text-gray-800">
                  Action Pipeline ({formData.steps.length} Steps)
                </div>
                <div className="text-xs text-gray-500">
                  Steps execute sequentially from top to bottom.
                </div>
              </div>

              <Button
                type="primary"
                className="!bg-blue-600"
                icon={<Plus size={14} />}
                onClick={() => {
                  setStepSearch('')
                  setSelectedCategory('all')
                  setStepPickerOpen(true)
                }}
              >
                Add Action Step
              </Button>
            </div>

            {formData.steps.length === 0 ? (
              <div className="text-center py-8 border-2 border-dashed border-gray-200 rounded-xl bg-gray-50">
                <Sparkles size={28} className="mx-auto text-gray-400 mb-2" />
                <div className="text-sm font-medium text-gray-700">No steps in this routine yet</div>
                <div className="text-xs text-gray-500 mb-3">
                  Add cleanup, grouping, suspension, window move, or session actions.
                </div>
                <Button
                  type="primary"
                  size="small"
                  className="!bg-blue-600"
                  icon={<Plus size={13} />}
                  onClick={() => {
                    setStepSearch('')
                    setSelectedCategory('all')
                    setStepPickerOpen(true)
                  }}
                >
                  Add First Step
                </Button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {formData.steps.map((step, idx) => (
                  <div
                    key={step.id}
                    className={`border rounded-xl p-3 transition-all ${
                      step.enabled
                        ? 'bg-white border-gray-200 shadow-sm'
                        : 'bg-gray-50 border-gray-200 opacity-60'
                    }`}
                  >
                    {/* Step Header */}
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2 flex-1">
                        <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {idx + 1}
                        </span>
                        <Input
                          value={step.name}
                          onChange={(e) => handleUpdateStep(step.id, { name: e.target.value })}
                          className="font-medium text-sm !border-transparent hover:!border-gray-300 focus:!border-blue-500 max-w-[280px]"
                        />
                        <Tag color="blue" className="text-xs">
                          {getStepTypeLabel(step.type)}
                        </Tag>
                      </div>

                      <div className="flex items-center gap-1">
                        <Switch
                          checked={step.enabled}
                          onChange={(checked) => handleUpdateStep(step.id, { enabled: checked })}
                          size="small"
                        />

                        <Tooltip title="Move Up">
                          <button
                            type="button"
                            disabled={idx === 0}
                            onClick={() => handleMoveStep(idx, 'up')}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer"
                          >
                            <MoveUp size={14} />
                          </button>
                        </Tooltip>

                        <Tooltip title="Move Down">
                          <button
                            type="button"
                            disabled={idx === formData.steps.length - 1}
                            onClick={() => handleMoveStep(idx, 'down')}
                            className="p-1 text-gray-400 hover:text-gray-700 disabled:opacity-30 cursor-pointer"
                          >
                            <MoveDown size={14} />
                          </button>
                        </Tooltip>

                        <Tooltip title="Duplicate Step">
                          <button
                            type="button"
                            onClick={() => handleDuplicateStep(step, idx)}
                            className="p-1 text-gray-400 hover:text-purple-600 cursor-pointer"
                          >
                            <Copy size={14} />
                          </button>
                        </Tooltip>

                        <Tooltip title="Remove Step">
                          <button
                            type="button"
                            onClick={() => handleRemoveStep(step.id)}
                            className="p-1 text-gray-400 hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 size={14} />
                          </button>
                        </Tooltip>
                      </div>
                    </div>

                    {/* Step Specific Parameters */}
                    <div className="bg-gray-50 rounded-lg p-2.5 text-xs text-gray-700">
                      {step.type === 'filter-tabs' && (
                        <div className="space-y-2">
                          <div className="text-[11px] text-blue-700 bg-blue-50/80 p-2 rounded border border-blue-100 flex items-center gap-1.5">
                            <Search size={13} className="text-blue-500 flex-shrink-0" />
                            <span>
                              <strong>Working Scope Filter:</strong> All upcoming steps below this will execute only on tabs matching this filter.
                            </span>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="md:col-span-2">
                              <label className="block text-[10px] text-gray-500 mb-0.5">
                                Search Pattern (URL / Title keyword or Regex):
                              </label>
                              <Input
                                size="small"
                                value={step.params.filterPattern || ''}
                                onChange={(e) =>
                                  handleUpdateStepParams(step.id, { filterPattern: e.target.value })
                                }
                                placeholder="e.g. youtube.com/shorts or github.com or /doc/i"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">Match Field</label>
                              <Select
                                size="small"
                                className="w-full"
                                value={step.params.filterField || 'url'}
                                onChange={(val) =>
                                  handleUpdateStepParams(step.id, { filterField: val })
                                }
                                options={[
                                  { value: 'url', label: 'URL' },
                                  { value: 'title', label: 'Page Title' },
                                  { value: 'domain', label: 'Domain' }
                                ]}
                              />
                            </div>
                          </div>
                          <div className="flex flex-wrap gap-4 pt-0.5">
                            <Checkbox
                              checked={step.params.isRegex ?? false}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, { isRegex: e.target.checked })
                              }
                            >
                              Use Regular Expression (Regex)
                            </Checkbox>
                            <Checkbox
                              checked={step.params.invertMatch ?? false}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, { invertMatch: e.target.checked })
                              }
                            >
                              Invert Filter (Exclude matching tabs)
                            </Checkbox>
                          </div>
                        </div>
                      )}

                      {step.type === 'reset-filter' && (
                        <div className="text-xs text-gray-600 italic py-1">
                          Resets any previous working scope filter. Following steps will target all tabs in the window.
                        </div>
                      )}

                      {step.type === 'close-duplicates' && (
                        <div className="flex flex-wrap gap-4 items-center">
                          <Checkbox
                            checked={step.params.preferPinned ?? true}
                            onChange={(e) =>
                              handleUpdateStepParams(step.id, { preferPinned: e.target.checked })
                            }
                          >
                            Prefer keeping pinned tabs
                          </Checkbox>
                          <Checkbox
                            checked={step.params.acrossAllWindows ?? false}
                            onChange={(e) =>
                              handleUpdateStepParams(step.id, { acrossAllWindows: e.target.checked })
                            }
                          >
                            Deduplicate across all browser windows
                          </Checkbox>
                        </div>
                      )}

                      {step.type === 'group-by-domain' && (
                        <div className="flex items-center gap-3">
                          <span>Minimum tabs per domain group:</span>
                          <InputNumber
                            min={1}
                            max={20}
                            value={step.params.minTabsPerGroup || 2}
                            onChange={(val) =>
                              handleUpdateStepParams(step.id, { minTabsPerGroup: val || 2 })
                            }
                            size="small"
                          />
                        </div>
                      )}

                      {step.type === 'group-by-rule' && (
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Group Title</label>
                            <Input
                              size="small"
                              value={step.params.groupTitle || ''}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, { groupTitle: e.target.value })
                              }
                              placeholder="e.g. Work"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Pattern to Match</label>
                            <Input
                              size="small"
                              value={step.params.rulePattern || ''}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, { rulePattern: e.target.value })
                              }
                              placeholder="e.g. github.com"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] text-gray-500 mb-0.5">Field</label>
                            <Select
                              size="small"
                              className="w-full"
                              value={step.params.ruleField || 'url'}
                              onChange={(val) => handleUpdateStepParams(step.id, { ruleField: val })}
                              options={[
                                { value: 'url', label: 'URL' },
                                { value: 'title', label: 'Page Title' },
                                { value: 'domain', label: 'Domain' }
                              ]}
                            />
                          </div>
                        </div>
                      )}

                      {step.type === 'sort-tabs' && (
                        <div className="flex flex-wrap items-center gap-4">
                          <div className="flex items-center gap-2">
                            <span>Sort by:</span>
                            <Select
                              size="small"
                              value={step.params.sortBy || 'domain'}
                              onChange={(val) => handleUpdateStepParams(step.id, { sortBy: val })}
                              options={[
                                { value: 'domain', label: 'Domain' },
                                { value: 'title', label: 'Page Title' },
                                { value: 'url', label: 'Full URL' },
                                { value: 'audible-first', label: 'Audible tabs first' }
                              ]}
                            />
                          </div>
                          <div className="flex items-center gap-2">
                            <span>Direction:</span>
                            <Select
                              size="small"
                              value={step.params.sortDirection || 'asc'}
                              onChange={(val) =>
                                handleUpdateStepParams(step.id, { sortDirection: val })
                              }
                              options={[
                                { value: 'asc', label: 'Ascending (A-Z)' },
                                { value: 'desc', label: 'Descending (Z-A)' }
                              ]}
                            />
                          </div>
                        </div>
                      )}

                      {step.type === 'move-to-window' && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                            <div className="md:col-span-2">
                              <label className="block text-[10px] text-gray-500 mb-0.5">
                                Filter Pattern (leave blank to move all tabs in scope):
                              </label>
                              <Input
                                size="small"
                                value={step.params.filterPattern || ''}
                                onChange={(e) =>
                                  handleUpdateStepParams(step.id, { filterPattern: e.target.value })
                                }
                                placeholder="e.g. youtube.com/shorts or github.com"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">Match In</label>
                              <Select
                                size="small"
                                className="w-full"
                                value={step.params.filterField || 'url'}
                                onChange={(val) =>
                                  handleUpdateStepParams(step.id, { filterField: val })
                                }
                                options={[
                                  { value: 'url', label: 'URL' },
                                  { value: 'title', label: 'Title' },
                                  { value: 'domain', label: 'Domain' }
                                ]}
                              />
                            </div>
                          </div>
                          <Checkbox
                            checked={step.params.newWindowIncognito ?? false}
                            onChange={(e) =>
                              handleUpdateStepParams(step.id, {
                                newWindowIncognito: e.target.checked
                              })
                            }
                          >
                            Open as Incognito Window
                          </Checkbox>
                        </div>
                      )}

                      {step.type === 'discard-tabs' && (
                        <div className="flex items-center gap-2">
                          <span>Suspend scope:</span>
                          <Select
                            size="small"
                            value={step.params.discardScope || 'all-background'}
                            onChange={(val) =>
                              handleUpdateStepParams(step.id, { discardScope: val })
                            }
                            options={[
                              { value: 'all-background', label: 'All background tabs (non-active)' }
                            ]}
                          />
                          <span className="text-gray-400 text-[11px]">
                            Frees RAM immediately without closing tabs.
                          </span>
                        </div>
                      )}

                      {step.type === 'mute-tabs' && (
                        <div className="flex items-center gap-2">
                          <span>Target:</span>
                          <Select
                            size="small"
                            value={step.params.muteScope || 'all-except-active'}
                            onChange={(val) => handleUpdateStepParams(step.id, { muteScope: val })}
                            options={[
                              { value: 'all-except-active', label: 'All tabs except currently active' },
                              { value: 'all', label: 'All tabs' },
                              { value: 'audible-only', label: 'Only currently audible tabs' }
                            ]}
                          />
                        </div>
                      )}

                      {step.type === 'pin-tabs' && (
                        <div className="flex flex-wrap items-center gap-2">
                          <span>Pin scope:</span>
                          <Select
                            size="small"
                            value={step.params.pinScope || 'all'}
                            onChange={(val) => handleUpdateStepParams(step.id, { pinScope: val })}
                            options={[
                              { value: 'all', label: 'All tabs in scope' },
                              { value: 'domain-matches', label: 'Domain matches pattern' },
                              { value: 'url-contains', label: 'URL contains string' }
                            ]}
                          />
                          {step.params.pinScope !== 'all' && (
                            <Input
                              size="small"
                              placeholder="Pattern to match (e.g. mail.google.com)"
                              value={step.params.matchPattern || ''}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, { matchPattern: e.target.value })
                              }
                              className="max-w-[200px]"
                            />
                          )}
                        </div>
                      )}

                      {step.type === 'close-tabs' && (
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span>Close condition:</span>
                            <Select
                              size="small"
                              value={step.params.closeCondition || 'domain-list'}
                              onChange={(val) =>
                                handleUpdateStepParams(step.id, { closeCondition: val })
                              }
                              options={[
                                { value: 'domain-list', label: 'Matching specific domains' },
                                { value: 'pattern-match', label: 'Matching URL or Title text' }
                              ]}
                            />
                          </div>

                          {step.params.closeCondition === 'domain-list' ? (
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">
                                Comma-separated domains to close (e.g. twitter.com, reddit.com, tiktok.com):
                              </label>
                              <Input
                                size="small"
                                value={(step.params.domainList || []).join(', ')}
                                onChange={(e) =>
                                  handleUpdateStepParams(step.id, {
                                    domainList: e.target.value
                                      .split(',')
                                      .map((s) => s.trim())
                                      .filter(Boolean)
                                  })
                                }
                                placeholder="twitter.com, reddit.com, netflix.com"
                              />
                            </div>
                          ) : (
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">
                                Pattern to match in URL/Title:
                              </label>
                              <Input
                                size="small"
                                value={step.params.closePattern || ''}
                                onChange={(e) =>
                                  handleUpdateStepParams(step.id, { closePattern: e.target.value })
                                }
                                placeholder="e.g. /video/ or youtube.com"
                              />
                            </div>
                          )}
                        </div>
                      )}

                      {step.type === 'save-list' && (
                        <div className="space-y-2">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">
                                List Name Template:
                              </label>
                              <Input
                                size="small"
                                value={step.params.sessionNameTemplate || ''}
                                onChange={(e) =>
                                  handleUpdateStepParams(step.id, {
                                    sessionNameTemplate: e.target.value
                                  })
                                }
                                placeholder="List - {date} {time}"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">
                                Filter Pattern (Optional):
                              </label>
                              <Input
                                size="small"
                                value={step.params.filterPattern || ''}
                                onChange={(e) =>
                                  handleUpdateStepParams(step.id, { filterPattern: e.target.value })
                                }
                                placeholder="e.g. youtube.com/shorts"
                              />
                            </div>
                          </div>
                          <Checkbox
                            checked={step.params.closeAfterSave ?? false}
                            onChange={(e) =>
                              handleUpdateStepParams(step.id, { closeAfterSave: e.target.checked })
                            }
                          >
                            Close tabs after saving to list
                          </Checkbox>
                        </div>
                      )}

                      {step.type === 'save-session' && (
                        <div className="space-y-1.5">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">
                                Session Name Template:
                              </label>
                              <Input
                                size="small"
                                value={step.params.sessionNameTemplate || ''}
                                onChange={(e) =>
                                  handleUpdateStepParams(step.id, {
                                    sessionNameTemplate: e.target.value
                                  })
                                }
                                placeholder="Snapshot - {date} {time}"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] text-gray-500 mb-0.5">
                                Filter Pattern (Optional):
                              </label>
                              <Input
                                size="small"
                                value={step.params.filterPattern || ''}
                                onChange={(e) =>
                                  handleUpdateStepParams(step.id, { filterPattern: e.target.value })
                                }
                                placeholder="e.g. youtube.com/shorts"
                              />
                            </div>
                          </div>
                          <Checkbox
                            checked={step.params.closeAfterSave ?? false}
                            onChange={(e) =>
                              handleUpdateStepParams(step.id, { closeAfterSave: e.target.checked })
                            }
                          >
                            Close tabs after saving session
                          </Checkbox>
                        </div>
                      )}

                      {step.type === 'open-urls' && (
                        <div className="space-y-1.5">
                          <label className="block text-[10px] text-gray-500 mb-0.5">
                            URLs to open (one per line):
                          </label>
                          <TextArea
                            rows={2}
                            size="small"
                            value={(step.params.urls || []).join('\n')}
                            onChange={(e) =>
                              handleUpdateStepParams(step.id, {
                                urls: e.target.value.split('\n').map((u) => u.trim()).filter(Boolean)
                              })
                            }
                            placeholder="https://mail.google.com&#10;https://calendar.google.com&#10;https://github.com"
                          />
                          <div className="flex gap-4">
                            <Checkbox
                              checked={step.params.openInNewWindow ?? false}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, {
                                  openInNewWindow: e.target.checked
                                })
                              }
                            >
                              Open in new window
                            </Checkbox>
                            <Checkbox
                              checked={step.params.pinOpenedTabs ?? false}
                              onChange={(e) =>
                                handleUpdateStepParams(step.id, {
                                  pinOpenedTabs: e.target.checked
                                })
                              }
                            >
                              Pin opened tabs
                            </Checkbox>
                          </div>
                        </div>
                      )}

                      {step.type === 'wait' && (
                        <div className="flex items-center gap-2">
                          <span>Delay in milliseconds:</span>
                          <InputNumber
                            min={100}
                            max={30000}
                            step={500}
                            value={step.params.delayMs || 1000}
                            onChange={(val) => handleUpdateStepParams(step.id, { delayMs: val || 1000 })}
                            size="small"
                          />
                          <span className="text-gray-400">({(step.params.delayMs || 1000) / 1000}s)</span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </Modal>

      {/* Action Step Catalog Picker Modal */}
      <Modal
        title={
          <div className="flex items-center gap-2 text-base font-semibold">
            <Plus size={18} className="text-blue-500" />
            <span>Select Action Step to Add</span>
          </div>
        }
        open={stepPickerOpen}
        onCancel={() => setStepPickerOpen(false)}
        width={680}
        footer={[
          <Button key="close" onClick={() => setStepPickerOpen(false)}>
            Cancel
          </Button>
        ]}
      >
        <div className="py-1 space-y-3">
          {/* Search & Categories */}
          <div className="flex flex-col sm:flex-row gap-2">
            <Input
              placeholder="Search action steps (e.g. shorts, duplicate, mute, sort)..."
              prefix={<Search size={14} className="text-gray-400 mr-1" />}
              value={stepSearch}
              onChange={(e) => setStepSearch(e.target.value)}
              allowClear
              className="flex-1"
            />
            <div className="flex gap-1 overflow-x-auto pb-1 sm:pb-0">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium cursor-pointer transition-colors ${
                  selectedCategory === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('filter')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium cursor-pointer transition-colors ${
                  selectedCategory === 'filter'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Search & Filters
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('cleanup')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium cursor-pointer transition-colors ${
                  selectedCategory === 'cleanup'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Cleanup & RAM
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('organize')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium cursor-pointer transition-colors ${
                  selectedCategory === 'organize'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Organization
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('state')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium cursor-pointer transition-colors ${
                  selectedCategory === 'state'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                State & Audio
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('sessions')}
                className={`px-2.5 py-1 text-xs rounded-lg font-medium cursor-pointer transition-colors ${
                  selectedCategory === 'sessions'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                Sessions & Lists
              </button>
            </div>
          </div>

          {/* Action List Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 max-h-[50vh] overflow-y-auto pr-1">
            {filteredCatalog.map((item) => (
              <div
                key={item.type}
                onClick={() => handleAddStep(item.type)}
                className="border border-gray-200 rounded-xl p-3 bg-white hover:border-blue-500 hover:bg-blue-50/40 transition-all cursor-pointer flex flex-col justify-between group shadow-sm"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className="p-1.5 bg-gray-50 rounded-lg group-hover:bg-white group-hover:shadow-sm transition-all">
                      {item.icon}
                    </div>
                    <span className="font-semibold text-xs text-gray-800 group-hover:text-blue-600 transition-colors">
                      {item.title}
                    </span>
                  </div>
                  <p className="text-[11px] text-gray-500 m-0 line-clamp-2">
                    {item.description}
                  </p>
                </div>
                <div className="pt-2 mt-1 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                  <span className="capitalize">{item.category}</span>
                  <span className="text-blue-500 font-medium group-hover:underline flex items-center gap-0.5">
                    + Add Step
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </Modal>
    </>
  )
}
export default RoutineEditorModal
