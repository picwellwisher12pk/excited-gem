import { useState, useEffect } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Trash2,
  FolderInput,
  XCircle,
  Pin,
  BookmarkPlus,
  Loader2,
  Layers
} from 'lucide-react'
import { clearSelectedTabs, toggleSelectionMode } from '../store/tabSlice'
import type { RootState } from '../store/store'
import { SaveListModal } from './Modals/SaveListModal'
import { message, Dropdown } from 'antd'
import type { MenuProps } from 'antd'
import {
  batchRemoveTabs,
  batchUpdateTabs,
  batchMoveTabs
} from '../utils/bulkOperations'
import { RoutineQuickMenu } from './Routines/RoutineQuickMenu'

export function FloatingActionBar() {
  const dispatch = useDispatch()
  const selectedTabs = useSelector(
    (state: RootState) => state.tabs.selectedTabs
  )
  const isSelectionMode = useSelector(
    (state: RootState) => state.tabs.isSelectionMode
  )
  const [saveListOpen, setSaveListOpen] = useState(false)
  const [isProcessing, setIsProcessing] = useState(false)
  const [windowsList, setWindowsList] = useState<chrome.windows.Window[]>([])
  const [progress, setProgress] = useState<{
    current: number
    total: number
  } | null>(null)

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.windows) {
      chrome.windows.getAll((wins) => {
        setWindowsList(wins || [])
      })
    }
  }, [selectedTabs])

  // Show whenever any tabs are selected (regardless of selection mode flag)
  if (selectedTabs.length === 0) return null

  const handleClose = () => {
    if (isProcessing) return
    dispatch(clearSelectedTabs())
    if (isSelectionMode) dispatch(toggleSelectionMode(false))
  }

  const handleMoveToWindow = async (targetWindowId: number) => {
    if (isProcessing || selectedTabs.length === 0) return
    try {
      setIsProcessing(true)
      setProgress({ current: 0, total: selectedTabs.length })
      await batchMoveTabs(
        selectedTabs,
        { windowId: targetWindowId, index: -1 },
        (current, total) => setProgress({ current, total })
      )
      message.success(
        `Moved ${selectedTabs.length} tabs to Window #${targetWindowId}`
      )
      handleClose()
    } catch (err) {
      console.error('Move to window failed:', err)
      message.error('Failed to move tabs to target window')
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }

  const windowMenuItems: MenuProps['items'] = [
    ...windowsList.map((w, idx) => ({
      key: `win-${w.id}`,
      label: `Window #${w.id || idx + 1}${w.focused ? ' (Current)' : ''}`,
      onClick: () => w.id && handleMoveToWindow(w.id)
    })),
    {
      key: 'new-win',
      label: '+ New Window',
      onClick: async () => {
        if (typeof chrome !== 'undefined' && chrome.windows) {
          const newWin = await chrome.windows.create({ focused: true })
          if (newWin && newWin.id) {
            await handleMoveToWindow(newWin.id)
          }
        }
      }
    }
  ]

  const handleBulkDelete = async () => {
    if (isProcessing) return
    if (confirm(`Close ${selectedTabs.length} tabs?`)) {
      try {
        setIsProcessing(true)
        setProgress({ current: 0, total: selectedTabs.length })
        await batchRemoveTabs(selectedTabs, (current, total) => {
          setProgress({ current, total })
        })
        handleClose()
      } catch (err) {
        console.error('Bulk delete failed:', err)
      } finally {
        setIsProcessing(false)
        setProgress(null)
      }
    }
  }

  const handleBulkPin = async () => {
    if (isProcessing) return
    try {
      setIsProcessing(true)
      setProgress({ current: 0, total: selectedTabs.length })
      await batchUpdateTabs(selectedTabs, { pinned: true }, (current, total) =>
        setProgress({ current, total })
      )
      handleClose()
    } catch (err) {
      console.error('Bulk pin failed:', err)
    } finally {
      setIsProcessing(false)
      setProgress(null)
    }
  }

  const handleBulkGroup = async () => {
    if (isProcessing) return
    try {
      if (chrome.tabs?.group) {
        // @ts-ignore
        await chrome.tabs.group({ tabIds: selectedTabs })
        handleClose()
      }
    } catch (err) {
      console.error('Bulk group failed:', err)
    }
  }

  const handleSaved = () => {
    message.success('List saved!')
    dispatch(clearSelectedTabs())
    if (isSelectionMode) dispatch(toggleSelectionMode(false))
  }

  return (
    <>
      <div className="fixed bottom-4 left-4 right-4 bg-slate-900/95 dark:bg-zinc-900/95 text-slate-100 dark:text-zinc-100 border border-slate-700/80 dark:border-zinc-700/80 backdrop-blur-md rounded-xl shadow-2xl flex items-center justify-between px-4 py-3 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center gap-3">
          <span className="font-semibold text-sm">
            {selectedTabs.length} Selected
          </span>
          {progress && (
            <span className="text-xs text-blue-300 font-mono">
              ({progress.current}/{progress.total})
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2">
          {isProcessing ? (
            <Loader2 size={20} className="animate-spin text-blue-400 mx-2" />
          ) : (
            <>
              {/* Move to Window Dropdown */}
              {windowsList.length > 0 && (
                <Dropdown menu={{ items: windowMenuItems }} placement="topRight">
                  <button
                    type="button"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/35 text-blue-300 hover:text-blue-200 border border-blue-500/30 transition-colors"
                    title="Move selected tabs to another window"
                  >
                    <Layers size={14} />
                    <span className="hidden sm:inline">Move to Window</span>
                  </button>
                </Dropdown>
              )}

              <button
                onClick={() => setSaveListOpen(true)}
                className="p-2 hover:bg-blue-600/30 text-blue-300 hover:text-blue-100 rounded-full transition-colors"
                title="Save as List"
              >
                <BookmarkPlus size={18} />
              </button>
              <button
                onClick={handleBulkPin}
                className="p-2 hover:bg-slate-700 dark:hover:bg-zinc-700 rounded-full transition-colors text-slate-300 hover:text-slate-100"
                title="Pin Selected"
              >
                <Pin size={18} />
              </button>
              <button
                onClick={handleBulkGroup}
                className="p-2 hover:bg-slate-700 dark:hover:bg-zinc-700 rounded-full transition-colors text-slate-300 hover:text-slate-100"
                title="Group Selected"
              >
                <FolderInput size={18} />
              </button>
              <button
                onClick={handleBulkDelete}
                className="p-2 hover:bg-red-900/50 text-red-400 hover:text-red-300 rounded-full transition-colors"
                title="Close Selected"
              >
                <Trash2 size={18} />
              </button>
              <div className="w-px h-6 bg-slate-700 dark:bg-zinc-700 mx-1" />
              <RoutineQuickMenu
                selectedTabIds={selectedTabs.map(Number)}
                targetScope="selected-tabs"
                size="small"
                buttonText="Run Routine"
                className="!bg-blue-600 !border-blue-600 !text-white hover:!bg-blue-700"
              />
              <div className="w-px h-6 bg-slate-700 dark:bg-zinc-700 mx-1" />
              <button
                onClick={handleClose}
                className="p-2 hover:bg-slate-700 dark:hover:bg-zinc-700 rounded-full transition-colors text-slate-400 hover:text-slate-200"
                title="Deselect All"
              >
                <XCircle size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      <SaveListModal
        open={saveListOpen}
        selectedTabIds={selectedTabs}
        onClose={() => setSaveListOpen(false)}
        onSaved={handleSaved}
      />
    </>
  )
}
