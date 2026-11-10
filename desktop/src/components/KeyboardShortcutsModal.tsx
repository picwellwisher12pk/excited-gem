import React from 'react'
import { Modal } from 'antd'
import { Keyboard } from 'lucide-react'

interface KeyboardShortcutsModalProps {
  open: boolean
  onClose: () => void
}

export const KeyboardShortcutsModal: React.FC<KeyboardShortcutsModalProps> = ({
  open,
  onClose
}) => {
  return (
    <Modal
      title={
        <div className="flex items-center gap-2.5 text-base font-semibold">
          <Keyboard className="w-5 h-5 text-[#0078d4]" />
          <span>Keyboard Shortcuts</span>
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={
        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-[#0078d4] text-white hover:brightness-110 transition-all shadow-sm"
          >
            Got it
          </button>
        </div>
      }
      centered
      width={520}
    >
      <div className="flex flex-col gap-4 py-2 font-sans">
        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#888888] mb-2.5">
            Navigation & Views
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5">
              <span>Workspace</span>
              <kbd className="px-2 py-0.5 rounded font-mono font-semibold text-[11px] bg-black/10 dark:bg-white/10">
                Ctrl+1
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5">
              <span>Analytics</span>
              <kbd className="px-2 py-0.5 rounded font-mono font-semibold text-[11px] bg-black/10 dark:bg-white/10">
                Ctrl+2
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5">
              <span>Bookmarks</span>
              <kbd className="px-2 py-0.5 rounded font-mono font-semibold text-[11px] bg-black/10 dark:bg-white/10">
                Ctrl+3
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5">
              <span>Routines</span>
              <kbd className="px-2 py-0.5 rounded font-mono font-semibold text-[11px] bg-black/10 dark:bg-white/10">
                Ctrl+4
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5">
              <span>Sessions</span>
              <kbd className="px-2 py-0.5 rounded font-mono font-semibold text-[11px] bg-black/10 dark:bg-white/10">
                Ctrl+5
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5">
              <span>Settings</span>
              <kbd className="px-2 py-0.5 rounded font-mono font-semibold text-[11px] bg-black/10 dark:bg-white/10">
                Ctrl+6
              </kbd>
            </div>
          </div>
        </div>

        <div>
          <h4 className="text-xs font-bold uppercase tracking-wider text-[#888888] mb-2.5">
            Search & Commands
          </h4>
          <div className="flex flex-col gap-2 text-xs">
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5">
              <span>Focus Tab & Domain Search</span>
              <kbd className="px-2 py-0.5 rounded font-mono font-semibold text-[11px] bg-black/10 dark:bg-white/10">
                Ctrl+K
              </kbd>
            </div>
            <div className="flex items-center justify-between p-2 rounded-lg bg-black/5 dark:bg-white/5">
              <span>Open Shortcuts Cheatsheet</span>
              <kbd className="px-2 py-0.5 rounded font-mono font-semibold text-[11px] bg-black/10 dark:bg-white/10">
                Ctrl+/ or ?
              </kbd>
            </div>
          </div>
        </div>
      </div>
    </Modal>
  )
}
