import React from 'react'
import { Modal, Input, Select } from 'antd'
import { Plus } from 'lucide-react'

interface AddBookmarkModalProps {
  visible: boolean
  folders: string[]
  openTabs: Array<{ title: string; url: string; favIconUrl?: string }>
  newTitle: string
  newUrl: string
  newFolder: string
  selectedFromTab: string
  onClose: () => void
  onSave: () => void
  onTitleChange: (val: string) => void
  onUrlChange: (val: string) => void
  onFolderChange: (val: string) => void
  onSelectTab: (url: string) => void
}

export const AddBookmarkModal: React.FC<AddBookmarkModalProps> = ({
  visible,
  folders,
  openTabs,
  newTitle,
  newUrl,
  newFolder,
  selectedFromTab,
  onClose,
  onSave,
  onTitleChange,
  onUrlChange,
  onFolderChange,
  onSelectTab
}) => {
  return (
    <Modal
      title={
        <div className="flex items-center gap-2 text-sm font-semibold">
          <Plus className="w-4 h-4 text-[#0078d4]" />
          <span>Add New Bookmark</span>
        </div>
      }
      open={visible}
      onCancel={onClose}
      onOk={onSave}
      okText="Save Bookmark"
      okButtonProps={{ className: 'bg-[#0078d4]' }}
      centered
    >
      <div className="flex flex-col gap-3.5 py-3">
        {/* Quick pick from active browser tabs */}
        {openTabs.length > 0 && (
          <div>
            <label className="text-[11px] font-semibold text-[#888888] block mb-1">
              Quick Import from Active Browser Tabs
            </label>
            <Select
              value={selectedFromTab || undefined}
              placeholder="Select an open tab to autofill..."
              onChange={onSelectTab}
              className="w-full text-xs"
              allowClear
              options={openTabs.map((t) => ({
                value: t.url,
                label: (
                  <div className="flex items-center gap-2 truncate">
                    {t.favIconUrl && (
                      <img
                        src={t.favIconUrl}
                        alt=""
                        className="w-3.5 h-3.5 rounded shrink-0"
                      />
                    )}
                    <span className="truncate">{t.title}</span>
                  </div>
                )
              }))}
            />
          </div>
        )}

        <div>
          <label className="text-[11px] font-semibold text-[#888888] block mb-1">
            Title
          </label>
          <Input
            value={newTitle}
            onChange={(e) => onTitleChange(e.target.value)}
            placeholder="e.g. GitHub Dashboard"
            className="rounded-lg text-xs"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-[#888888] block mb-1">
            URL *
          </label>
          <Input
            value={newUrl}
            onChange={(e) => onUrlChange(e.target.value)}
            placeholder="https://example.com"
            className="rounded-lg text-xs font-mono"
          />
        </div>

        <div>
          <label className="text-[11px] font-semibold text-[#888888] block mb-1">
            Category Folder
          </label>
          <Select
            value={newFolder}
            onChange={onFolderChange}
            className="w-full text-xs"
            options={folders
              .filter((f) => f !== 'All')
              .map((f) => ({ value: f, label: f }))}
          />
        </div>
      </div>
    </Modal>
  )
}
