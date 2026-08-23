import { useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Trash2,
  FolderInput,
  XCircle,
  Pin,
  BookmarkPlus,
  Loader2
} from 'lucide-react'
import { clearSelectedTabs, toggleSelectionMode } from '../store/tabSlice'
import type { RootState } from '../store/store'
import { SaveListModal } from './Modals/SaveListModal'
import { message } from 'antd'
import { batchRemoveTabs, batchUpdateTabs } from '../utils/bulkOperations'

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
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null)

  // Show whenever any tabs are selected (regardless of selection mode flag)
  if (selectedTabs.length === 0) return null

  const handleClose = () => {
    if (isProcessing) return
    dispatch(clearSelectedTabs())
    if (isSelectionMode) dispatch(toggleSelectionMode(false))
  }

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
      await batchUpdateTabs(
        selectedTabs,
        { pinned: true },
        (current, total) => setProgress({ current, total })
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
      <div className="fixed bottom-4 left-4 right-4 bg-slate-800 text-white rounded-xl shadow-xl flex items-center justify-between px-4 py-3 z-50 animate-in slide-in-from-bottom duration-300">
        <div className="flex items-center gap-4">
          <span className="font-semibold">{selectedTabs.length} Selected</span>
          {progress && (
            <span className="text-xs text-blue-300">
              ({progress.current}/{progress.total})
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {isProcessing ? (
            <Loader2 size={20} className="animate-spin text-blue-400 mx-2" />
          ) : (
            <>
              <button
                onClick={() => setSaveListOpen(true)}
                className="p-2 hover:bg-blue-600 rounded-full transition-colors"
                title="Save as List"
              >
                <BookmarkPlus size={20} />
              </button>
              <button
                onClick={handleBulkPin}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors"
                title="Pin Selected"
              >
                <Pin size={20} />
              </button>
              <button
                onClick={handleBulkGroup}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors"
                title="Group Selected"
              >
                <FolderInput size={20} />
              </button>
              <button
                onClick={handleBulkDelete}
                className="p-2 hover:bg-red-900/50 text-red-400 rounded-full transition-colors"
                title="Close Selected"
              >
                <Trash2 size={20} />
              </button>
              <div className="w-px h-6 bg-slate-600 mx-1" />
              <button
                onClick={handleClose}
                className="p-2 hover:bg-slate-700 rounded-full transition-colors"
                title="Cancel Selection"
              >
                <XCircle size={20} />
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
