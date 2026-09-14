import { DownOutlined } from '@ant-design/icons'
import { useState, useEffect, useRef } from 'react'
import {
  ArrowDownWideNarrow,
  Clock,
  ArrowUp,
  ArrowDown,
  Globe,
  Type,
  Settings2,
  Layers,
} from 'lucide-react'
import { message } from 'antd'
import Btn from '../../components/Btn'
import {
  executeTabSort,
  getSavedTabSortSettings,
  saveTabSortSettings,
  type TabSortBy,
  type SortDirection,
  type TabSortSettings,
  DEFAULT_TAB_SORT_SETTINGS
} from '../../utils/tabSort'

interface SortButtonProps {
  tabs: any[]
}

const SortButton = ({ tabs }: SortButtonProps) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showConfig, setShowConfig] = useState(false)
  const [settings, setSettings] = useState<TabSortSettings>(
    DEFAULT_TAB_SORT_SETTINGS
  )
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Load persisted settings on mount
  useEffect(() => {
    getSavedTabSortSettings().then((s) => setSettings(s))
  }, [])

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
        setShowConfig(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSort = async (
    sortBy: TabSortBy,
    direction: SortDirection,
    label: string
  ) => {
    try {
      const movedCount = await executeTabSort(tabs, {
        sortBy,
        direction,
        mixedMode: settings.mixedMode,
        videoPlacement: settings.videoPlacement
      })
      message.success(`Sorted tabs by ${label}`)
    } catch (err: any) {
      message.error(`Failed to sort tabs: ${err?.message || err}`)
    } finally {
      setIsOpen(false)
      setShowConfig(false)
    }
  }

  const updateSetting = <K extends keyof TabSortSettings>(
    key: K,
    val: TabSortSettings[K]
  ) => {
    const next = { ...settings, [key]: val }
    setSettings(next)
    saveTabSortSettings(next)
  }

  return (
    <div className="relative mr-3" ref={dropdownRef}>
      <Btn
        className="flex items-center gap-1.5"
        onClick={() => setIsOpen(!isOpen)}
        title="Sort Tabs"
      >
        <ArrowDownWideNarrow size={14} className="text-zinc-600" />
        <span className="hidden sm:inline">Sort Tabs</span>
        <DownOutlined style={{ fontSize: 10, color: '#8c8c8c' }} />
      </Btn>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-xl shadow-2xl z-50 w-72 text-sm overflow-hidden animate-in fade-in slide-in-from-top-1 duration-150">
          {/* Header */}
          <div className="px-3 py-2 bg-slate-50 border-b border-gray-100 flex items-center justify-between">
            <span className="font-semibold text-xs text-gray-500 uppercase tracking-wider">
              Sort Tabs
            </span>
            <button
              onClick={() => setShowConfig(!showConfig)}
              className={`p-1 rounded hover:bg-gray-200 transition-colors text-xs flex items-center gap-1 ${
                showConfig
                  ? 'text-blue-600 font-semibold bg-blue-50'
                  : 'text-gray-500'
              }`}
              title="Configure mixed-tab window behavior"
            >
              <Settings2 size={13} />
              <span>Options</span>
            </button>
          </div>

          {/* Config Panel (Toggleable) */}
          {showConfig && (
            <div className="p-3 bg-blue-50/50 border-b border-blue-100 space-y-2.5 text-xs text-gray-700">
              <div className="font-medium text-gray-800 flex items-center gap-1">
                <Layers size={13} className="text-blue-600" />
                <span>Mixed Windows (Videos + Pages):</span>
              </div>

              {/* Mixed Mode Toggle */}
              <div className="grid grid-cols-2 gap-1.5 bg-white p-1 rounded-lg border border-gray-200">
                <button
                  type="button"
                  onClick={() => updateSetting('mixedMode', 'grouped')}
                  className={`py-1 px-2 rounded font-medium text-center transition-all ${
                    settings.mixedMode === 'grouped'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Group all video tabs together sorted by duration"
                >
                  Grouped
                </button>
                <button
                  type="button"
                  onClick={() => updateSetting('mixedMode', 'in-place')}
                  className={`py-1 px-2 rounded font-medium text-center transition-all ${
                    settings.mixedMode === 'in-place'
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-gray-600 hover:bg-gray-100'
                  }`}
                  title="Keep non-video tabs in their exact slots, only reorder video slots"
                >
                  In-Place
                </button>
              </div>

              {/* Grouped Placement Options */}
              {settings.mixedMode === 'grouped' ? (
                <div className="flex items-center justify-between pt-1">
                  <span className="text-gray-500">Video Group Position:</span>
                  <div className="flex items-center gap-1 bg-white p-0.5 rounded border border-gray-200">
                    <button
                      type="button"
                      onClick={() => updateSetting('videoPlacement', 'first')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        settings.videoPlacement === 'first'
                          ? 'bg-blue-100 text-blue-800'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      At Top
                    </button>
                    <button
                      type="button"
                      onClick={() => updateSetting('videoPlacement', 'last')}
                      className={`px-2 py-0.5 rounded text-[11px] font-medium ${
                        settings.videoPlacement === 'last'
                          ? 'bg-blue-100 text-blue-800'
                          : 'text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      At Bottom
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-[11px] text-gray-500 italic">
                  Non-video tabs stay exactly in their slots; only video slots
                  reorder.
                </p>
              )}
            </div>
          )}

          {/* Video Duration Section */}
          <div className="p-1.5 border-b border-gray-100">
            <div className="px-2 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <Clock size={12} className="text-red-500" />
              <span>Video Duration</span>
            </div>
            <button
              onClick={() =>
                handleSort('duration', 'asc', 'Video Duration (Shortest first)')
              }
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Clock size={14} className="text-blue-500" />
                <span>Shortest First</span>
              </span>
              <span className="text-xs text-gray-400 flex items-center">
                Asc <ArrowUp size={12} className="ml-0.5" />
              </span>
            </button>
            <button
              onClick={() =>
                handleSort('duration', 'desc', 'Video Duration (Longest first)')
              }
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Clock size={14} className="text-purple-500" />
                <span>Longest First</span>
              </span>
              <span className="text-xs text-gray-400 flex items-center">
                Desc <ArrowDown size={12} className="ml-0.5" />
              </span>
            </button>
          </div>

          {/* Standard Sort Section */}
          <div className="p-1.5">
            <div className="px-2 py-1 text-[11px] font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1">
              <Type size={12} />
              <span>Standard Sort</span>
            </div>
            <button
              onClick={() => handleSort('title', 'asc', 'Title (A → Z)')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Type size={14} className="text-emerald-500" />
                <span>By Title (A → Z)</span>
              </span>
              <span className="text-xs text-gray-400">A→Z</span>
            </button>
            <button
              onClick={() => handleSort('title', 'desc', 'Title (Z → A)')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Type size={14} className="text-emerald-600" />
                <span>By Title (Z → A)</span>
              </span>
              <span className="text-xs text-gray-400">Z→A</span>
            </button>
            <button
              onClick={() => handleSort('url', 'asc', 'URL (A → Z)')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Globe size={14} className="text-sky-500" />
                <span>By URL</span>
              </span>
            </button>
            <button
              onClick={() => handleSort('domain', 'asc', 'Domain (A → Z)')}
              className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg hover:bg-gray-100 text-gray-700 transition-colors text-left"
            >
              <span className="flex items-center gap-2">
                <Globe size={14} className="text-indigo-500" />
                <span>By Domain</span>
              </span>
            </button>
          </div>

          {/* Quick status footer */}
          <div className="px-3 py-1.5 bg-gray-50 border-t border-gray-100 text-[11px] text-gray-500 flex items-center justify-between">
            <span>Mixed mode:</span>
            <span className="font-medium text-gray-700 capitalize">
              {settings.mixedMode === 'grouped'
                ? `Grouped (${settings.videoPlacement === 'first' ? 'Top' : 'Bottom'})`
                : 'In-Place'}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}

export default SortButton
