import {
  Button,
  Checkbox,
  List,
  Modal,
  Typography,
  Space,
  Tooltip,
  Progress
} from 'antd'
import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { ExternalLink } from 'lucide-react'
import { batchRemoveTabs } from '../../utils/bulkOperations'

const { Text, Title } = Typography

interface DuplicateTabsModalProps {
  visible: boolean
  onClose: () => void
}

export const DuplicateTabsModal: React.FC<DuplicateTabsModalProps> = ({
  visible,
  onClose
}) => {
  const { tabs } = useSelector((state: any) => state.tabs)
  const [selectedTabIds, setSelectedTabIds] = useState<number[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number }>({
    current: 0,
    total: 0
  })

  // Group tabs by URL
  const duplicates = useMemo(() => {
    const urlGroups: Record<string, any[]> = {}
    tabs.forEach((tab: any) => {
      if (tab?.url) {
        if (!urlGroups[tab.url]) {
          urlGroups[tab.url] = []
        }
        urlGroups[tab.url].push(tab)
      }
    })

    // Filter only those with > 1 occurrence
    return Object.entries(urlGroups)
      .filter(([_, group]) => group.length > 1)
      .map(([url, group]) => ({ url, tabs: group }))
  }, [tabs])

  const handleCloseSelected = async () => {
    if (selectedTabIds.length === 0 || isProcessing) return
    try {
      setIsProcessing(true)
      setProgress({ current: 0, total: selectedTabIds.length })
      await batchRemoveTabs(selectedTabIds, (current, total) => {
        setProgress({ current, total })
      })
      setSelectedTabIds([])
    } catch (error) {
      console.error('Failed to close duplicate tabs:', error)
    } finally {
      setIsProcessing(false)
    }
  }

  const handleSelectAllDuplicates = () => {
    if (isProcessing) return
    const idsToSelect: number[] = []
    duplicates.forEach(({ tabs }) => {
      tabs.slice(1).forEach((tab) => idsToSelect.push(tab.id))
    })
    setSelectedTabIds(idsToSelect)
  }

  const handleSelectAll = () => {
    if (isProcessing) return
    const idsToSelect: number[] = []
    duplicates.forEach(({ tabs }) => {
      tabs.forEach((tab) => idsToSelect.push(tab.id))
    })
    setSelectedTabIds(idsToSelect)
  }

  const toggleSelection = (id: number) => {
    if (isProcessing) return
    setSelectedTabIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    )
  }

  const progressPercent =
    progress.total > 0
      ? Math.round((progress.current / progress.total) * 100)
      : 0

  return (
    <Modal
      title={
        <Space>
          <Title level={4} style={{ margin: 0 }}>
            Duplicate Tabs
          </Title>
          <Text type="secondary">({duplicates.length} groups found)</Text>
        </Space>
      }
      open={visible}
      onCancel={() => {
        if (!isProcessing) onClose()
      }}
      width={800}
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="w-full sm:w-auto text-left">
            {isProcessing && (
              <span className="text-xs text-blue-600 font-medium">
                Closing {progress.current} of {progress.total} tabs...
              </span>
            )}
          </div>
          <div className="flex justify-end gap-2 w-full sm:w-auto">
            <Button key="close" onClick={onClose} disabled={isProcessing}>
              Done
            </Button>
            <Button
              key="keep-one"
              onClick={handleSelectAllDuplicates}
              disabled={isProcessing}
            >
              Select Duplicates (Keep 1st)
            </Button>
            <Button
              key="select-all"
              onClick={handleSelectAll}
              disabled={isProcessing}
            >
              Select All
            </Button>
            <Button
              key="remove"
              type="primary"
              danger
              loading={isProcessing}
              disabled={selectedTabIds.length === 0}
              onClick={handleCloseSelected}
            >
              Close Selected ({selectedTabIds.length})
            </Button>
          </div>
        </div>
      }
    >
      {isProcessing && (
        <div className="mb-4">
          <Progress percent={progressPercent} status="active" />
        </div>
      )}

      {duplicates.length === 0 ? (
        <div className="text-center py-10 text-gray-500">
          No duplicate tabs found.
        </div>
      ) : (
        <div className="max-h-[60vh] overflow-y-auto">
          <List
            itemLayout="vertical"
            dataSource={duplicates}
            renderItem={({ url, tabs: groupTabs }) => (
              <List.Item className="border-b border-gray-100 py-4">
                <div
                  className="mb-2 font-medium text-blue-600 truncate"
                  title={url}
                >
                  {url}
                </div>
                <div className="pl-4 space-y-2">
                  {groupTabs.map((tab: any) => (
                    <div
                      key={tab.id}
                      className="flex items-center justify-between bg-slate-50 p-2 rounded hover:bg-slate-100 transition-colors"
                    >
                      <div className="flex items-center gap-3 overflow-hidden">
                        <Checkbox
                          checked={selectedTabIds.includes(tab.id)}
                          disabled={isProcessing}
                          onChange={() => toggleSelection(tab.id)}
                        />
                        {tab.favIconUrl && (
                          <img
                            src={tab.favIconUrl}
                            alt=""
                            className="w-4 h-4 flex-shrink-0"
                          />
                        )}
                        <span
                          className="truncate text-sm text-gray-700"
                          title={tab.title}
                        >
                          {tab.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-gray-400 flex-shrink-0">
                        <span>Win: {tab.windowId}</span>
                        <Tooltip title="Go to tab">
                          <Button
                            type="text"
                            size="small"
                            disabled={isProcessing}
                            icon={<ExternalLink size={12} />}
                            onClick={() => {
                              chrome.windows.update(tab.windowId, {
                                focused: true
                              })
                              chrome.tabs.update(tab.id, { active: true })
                            }}
                          />
                        </Tooltip>
                      </div>
                    </div>
                  ))}
                </div>
              </List.Item>
            )}
          />
        </div>
      )}
    </Modal>
  )
}
