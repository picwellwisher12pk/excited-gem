import React, { useState } from 'react'
import { Modal } from 'antd'
import { Plus, } from 'lucide-react'
import type { CustomRoutine } from './types'

interface CustomRoutineModalProps {
  visible: boolean
  onClose: () => void
  onSave: (routine: CustomRoutine) => void
}

export const CustomRoutineModal: React.FC<CustomRoutineModalProps> = ({
  visible,
  onClose,
  onSave
}) => {
  const [name, setName] = useState('')
  const [desc, setDesc] = useState('')
  const [urlsText, setUrlsText] = useState('')
  const [targetBrowser, setTargetBrowser] = useState('chrome')

  const handleSave = () => {
    if (!name.trim()) return

    const urls = urlsText
      .split('\n')
      .map((u) => u.trim())
      .filter((u) => u.length > 0)
      .map((u) => (/^https?:\/\//i.test(u) ? u : `https://${u}`))

    onSave({
      id: `routine_${Date.now()}`,
      name: name.trim(),
      desc: desc.trim() || `Launches ${urls.length} tabs in ${targetBrowser}`,
      urls,
      targetBrowser,
      tags: ['Custom']
    })

    setName('')
    setDesc('')
    setUrlsText('')
    onClose()
  }

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      onOk={handleSave}
      title={
        <div className="flex items-center gap-2">
          <Plus className="w-4 h-4 text-[#0078d4]" />
          <span>Create Custom Workflow Routine</span>
        </div>
      }
      okText="Create Routine"
      okButtonProps={{ disabled: !name.trim() }}
      className="custom-modal"
    >
      <div className="flex flex-col gap-3 py-2 text-xs">
        <div>
          <label className="font-semibold block mb-1">Routine Name</label>
          <input
            type="text"
            placeholder="e.g. Morning Standup, Project Sprint, Deep Focus..."
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border outline-none dark:bg-[#252525] dark:border-[#383838] focus:border-[#0078d4]"
          />
        </div>

        <div>
          <label className="font-semibold block mb-1">Description (Optional)</label>
          <input
            type="text"
            placeholder="Brief summary of what this automation does"
            value={desc}
            onChange={(e) => setDesc(e.target.value)}
            className="w-full text-xs px-3 py-2 rounded-lg border outline-none dark:bg-[#252525] dark:border-[#383838] focus:border-[#0078d4]"
          />
        </div>

        <div>
          <label className="font-semibold block mb-1">Target Browser</label>
          <div className="flex items-center gap-2">
            {['chrome', 'edge', 'firefox', 'brave'].map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setTargetBrowser(b)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium capitalize border transition-all ${
                  targetBrowser === b
                    ? 'bg-[#0078d4] text-white border-[#0078d4]'
                    : 'dark:bg-[#252525] dark:border-[#383838] hover:bg-black/5 dark:hover:bg-white/5'
                }`}
              >
                {b}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="font-semibold block mb-1">URLs to Launch (One per line)</label>
          <textarea
            rows={4}
            placeholder={`https://github.com\nhttps://jira.atlassian.com\nhttps://mail.google.com`}
            value={urlsText}
            onChange={(e) => setUrlsText(e.target.value)}
            className="w-full text-xs p-3 rounded-lg border outline-none font-mono dark:bg-[#252525] dark:border-[#383838] focus:border-[#0078d4]"
          />
        </div>
      </div>
    </Modal>
  )
}
