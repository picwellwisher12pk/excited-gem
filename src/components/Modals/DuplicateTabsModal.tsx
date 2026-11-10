import {
  Button,
  Checkbox,
  List,
  Modal,
  Typography,
  Space,
  Tooltip,
  Progress,
  Segmented,
  Tag
} from 'antd'
import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { ExternalLink, Sparkles, Copy } from 'lucide-react'
import { batchRemoveTabs } from '../../utils/bulkOperations'
import {
  findSemanticDuplicates,
  type RedundantTabGroup
} from '../../services/tabDeduplicationService'

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
  const [activeMode, setActiveMode] = useState<'exact' | 'semantic'>('exact')
  const [semanticGroups, setSemanticGroups] = useState<RedundantTabGroup[]>([])
  const [isAnalyzingSemantic, setIsAnalyzingSemantic] = useState(false)
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

  // Compute semantic groups when modal opens or mode changes
  useEffect(() => {
    if (visible && activeMode === 'semantic') {
      setIsAnalyzingSemantic(true)
      findSemanticDuplicates(tabs)
        .then((groups) => {
          setSemanticGroups(groups)
        })
        .finally(() => {
          setIsAnalyzingSemantic(false)
        })
    }
  }, [visible, activeMode, tabs])

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
    if (activeMode === 'exact') {
      duplicates.forEach(({ tabs }) => {
        tabs.slice(1).forEach((tab) => idsToSelect.push(tab.id))
      })
    } else {
      semanticGroups.forEach(({ tabs }) => {
        tabs.slice(1).forEach((tab) => idsToSelect.push(tab.id))
      })
    }
    setSelectedTabIds(idsToSelect)
  }

  const handleSelectAll = () => {
    if (isProcessing) return
    const idsToSelect: number[] = []
    if (activeMode === 'exact') {
      duplicates.forEach(({ tabs }) => {
        tabs.forEach((tab) => idsToSelect.push(tab.id))
      })
    } else {
      semanticGroups.forEach(({ tabs }) => {
        tabs.forEach((tab) => idsToSelect.push(tab.id))
      })
    }
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

  const activeGroupCount =
    activeMode === 'exact' ? duplicates.length : semanticGroups.length

  return (
    <Modal
      title={
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pr-6">
          <Space>
            <Title level={4} style={{ margin: 0 }}>
              Duplicate & Similar Tabs
            </Title>
            <Text type="secondary">({activeGroupCount} clusters)</Text>
          </Space>
          <Segmented
            value={activeMode}
            onChange={(val) => {
              setActiveMode(val as 'exact' | 'semantic')
              setSelectedTabIds([])
            }}
            options={[
              {
                value: 'exact',
                label: (
                  <span className="flex items-center gap-1.5 px-1">
                    <Copy size={13} />
                    <span>Exact URL ({duplicates.length})</span>
                  </span>
                )
              },
              {
                value: 'semantic',
                label: (
                  <span className="flex items-center gap-1.5 px-1">
                    <Sparkles size={13} className="text-purple-600" />
                    <span>AI Similar Topics</span>
                  </span>
                )
              }
            ]}
          />
        </div>
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

      {activeMode === 'exact' ? (
        duplicates.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No exact duplicate URLs found.
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
        )
      ) : (
        /* Semantic Topics Mode */
        isAnalyzingSemantic ? (
          <div className="text-center py-10 text-gray-500 flex flex-col items-center justify-center gap-2">
            <Sparkles size={24} className="text-purple-600 animate-spin" />
            <span>Analyzing open tab contents locally with ONNX...</span>
          </div>
        ) : semanticGroups.length === 0 ? (
          <div className="text-center py-10 text-gray-500">
            No redundant or overlapping topic tabs found.
          </div>
        ) : (
          <div className="max-h-[60vh] overflow-y-auto">
            <List
              itemLayout="vertical"
              dataSource={semanticGroups}
              renderItem={(group) => (
                <List.Item className="border-b border-gray-100 py-4">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="font-semibold text-gray-800 text-sm truncate max-w-[80%]" title={group.topic}>
                      {group.topic}
                    </span>
                    <Tag color="purple">
                      ~{group.avgSimilarity}% match
                    </Tag>
                  </div>
                  <div className="pl-4 space-y-2">
                    {group.tabs.map((tab: any) => (
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
                          <div className="flex flex-col min-w-0">
                            <span
                              className="truncate text-sm text-gray-800 font-medium"
                              title={tab.title}
                            >
                              {tab.title}
                            </span>
                            <span
                              className="truncate text-xs text-blue-500"
                              title={tab.url}
                            >
                              {tab.url}
                            </span>
                          </div>
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
        )
      )}
    </Modal>
  )
}
