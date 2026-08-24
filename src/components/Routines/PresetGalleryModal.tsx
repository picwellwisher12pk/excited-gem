import React from 'react'
import { Modal, Button, Tag, Typography } from 'antd'
import { Plus, Sparkles, Check } from 'lucide-react'
import type { RoutinePreset, Routine } from '../../types/routine'
import { DEFAULT_ROUTINE_PRESETS } from '../../services/defaultRoutines'
import { getRoutineIcon, getStepTypeLabel } from './RoutineCard'

const { Title, Text } = Typography

interface PresetGalleryModalProps {
  visible: boolean
  onClose: () => void
  onAddPreset: (preset: RoutinePreset) => void
  existingRoutines: Routine[]
}

export const PresetGalleryModal: React.FC<PresetGalleryModalProps> = ({
  visible,
  onClose,
  onAddPreset,
  existingRoutines
}) => {
  const existingNames = new Set(existingRoutines.map((r) => r.name.toLowerCase()))

  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-base font-semibold">
          <Sparkles size={18} className="text-blue-500" />
          <span>Preset Routines & Templates Gallery</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      width={740}
      footer={[
        <Button key="close" type="primary" onClick={onClose}>
          Done
        </Button>
      ]}
    >
      <div className="py-2">
        <Text type="secondary" className="text-xs mb-4 block">
          Choose from curated routine templates to automate your tab cleanup, focus time, and memory optimization with one click.
        </Text>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-[60vh] overflow-y-auto pr-1">
          {DEFAULT_ROUTINE_PRESETS.map((preset) => {
            const alreadyAdded = existingNames.has(preset.name.toLowerCase())

            return (
              <div
                key={preset.id}
                className="border border-gray-200 rounded-xl p-4 bg-white hover:border-blue-400 hover:shadow-sm transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-white shadow-sm flex-shrink-0"
                        style={{ backgroundColor: preset.color }}
                      >
                        {getRoutineIcon(preset.icon, 18, '#ffffff')}
                      </div>
                      <div>
                        <div className="font-semibold text-sm text-gray-800">{preset.name}</div>
                        <Tag color="blue" className="text-[10px] !m-0 !px-1.5 !rounded">
                          {preset.category}
                        </Tag>
                      </div>
                    </div>
                  </div>

                  <p className="text-xs text-gray-600 mb-3 min-h-[32px]">
                    {preset.description}
                  </p>

                  {/* Steps preview */}
                  <div className="bg-gray-50 rounded-lg p-2 mb-3">
                    <div className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">
                      Includes {preset.routine.steps.length} Steps
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {preset.routine.steps.map((st, idx) => (
                        <span
                          key={idx}
                          className="text-[10px] bg-white border border-gray-200 text-gray-700 px-1.5 py-0.5 rounded"
                        >
                          {st.name || getStepTypeLabel(st.type)}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-100 flex items-center justify-between">
                  <span className="text-[11px] text-gray-400">
                    Scope: {preset.routine.targetScope === 'active-window' ? 'Current Window' : 'All Windows'}
                  </span>

                  <button
                    type="button"
                    disabled={alreadyAdded}
                    onClick={() => onAddPreset(preset)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                      alreadyAdded
                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        : 'bg-blue-50 text-blue-600 hover:bg-blue-600 hover:text-white'
                    }`}
                  >
                    {alreadyAdded ? (
                      <>
                        <Check size={13} />
                        <span>Added</span>
                      </>
                    ) : (
                      <>
                        <Plus size={13} />
                        <span>Add Routine</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </Modal>
  )
}
