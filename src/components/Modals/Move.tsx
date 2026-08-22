import { Segmented, Button, Modal, Radio, Alert, Progress } from 'antd'
import React, { useState, useEffect } from 'react'
import { batchMoveTabs } from '~/utils/bulkOperations'

export interface MoveModalProps {
  selectedTabs: (number | string)[]
  windows: chrome.windows.Window[]
  currentWindow: chrome.windows.Window & { id?: number }
  setMoveModalVisible: (visible: boolean) => void
}

export const MoveModal: React.FC<MoveModalProps> = ({
  selectedTabs,
  windows,
  currentWindow,
  setMoveModalVisible
}) => {
  const options = ['Current Windows', 'New Window', 'To End', 'To Start']
  const [type, setType] = useState<string>(options[0])
  const [windowId, setWindowId] = useState<number | undefined>(currentWindow?.id)
  const [isMoving, setIsMoving] = useState(false)
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 })

  useEffect(() => {
    if (currentWindow?.id) {
      setWindowId(currentWindow.id)
    }
  }, [currentWindow])

  function resetComponent() {
    setType(options[0])
    setWindowId(currentWindow?.id)
    setIsMoving(false)
    setProgress({ current: 0, total: 0 })
  }

  function makeMoveTypeUI(selectedType: string) {
    switch (selectedType) {
      case 'Current Windows':
        return (
          <Radio.Group
            onChange={({ target }) => setWindowId(Number(target.value))}
            value={windowId}
            disabled={isMoving}
          >
            <div className="flex flex-col max-h-[200px] overflow-auto">
              {windows?.map((window, i) => (
                <Radio
                  key={window.id}
                  value={window.id}
                  disabled={window.id === currentWindow?.id || isMoving}
                >
                  {window.id === currentWindow?.id && 'Current'} Window {i + 1}{' '}
                  <small className="text-orange-500">
                    ({window.tabs?.length || 0} tabs)
                  </small>
                  <small className="text-gray-300 ml-3">ID:{window.id}</small>
                </Radio>
              ))}
            </div>
          </Radio.Group>
        )
      case 'New Window':
        return (
          <Alert
            message="New Window"
            description="This will move your selected tabs to a new window in smooth batches."
            type="info"
            showIcon
          />
        )
      case 'To End':
        return (
          <Alert
            message="To End"
            description="This will move your selected tabs to the end of the current window."
            type="info"
            showIcon
          />
        )
      case 'To Start':
        return (
          <Alert
            message="To Start"
            description="This will move your selected tabs to the start of the current window."
            type="info"
            showIcon
          />
        )
      default:
        return null
    }
  }

  const handleOk = async () => {
    if (isMoving) return
    const tabIds = selectedTabs.map(Number)
    if (tabIds.length === 0) return

    try {
      setIsMoving(true)
      setProgress({ current: 0, total: tabIds.length })

      switch (type) {
        case 'Current Windows':
          if (!windowId || windowId === currentWindow?.id) {
            alert('Select a different window to move to')
            setIsMoving(false)
            return
          }
          await batchMoveTabs(
            tabIds,
            { windowId: Number(windowId), index: -1 },
            (current, total) => setProgress({ current, total })
          )
          break

        case 'New Window': {
          const firstTab = tabIds[0]
          const otherTabs = tabIds.slice(1)
          setProgress({ current: 1, total: tabIds.length })

          const newWin = await chrome.windows.create({ tabId: firstTab, focused: true })

          if (otherTabs.length > 0 && newWin?.id) {
            await batchMoveTabs(
              otherTabs,
              { windowId: newWin.id, index: -1 },
              (current) => setProgress({ current: current + 1, total: tabIds.length })
            )
          }
          break
        }

        case 'To End':
          if (currentWindow?.id) {
            await batchMoveTabs(
              tabIds,
              { windowId: currentWindow.id, index: -1 },
              (current, total) => setProgress({ current, total })
            )
          }
          break

        case 'To Start':
          if (currentWindow?.id) {
            await batchMoveTabs(
              tabIds,
              { windowId: currentWindow.id, index: 0 },
              (current, total) => setProgress({ current, total })
            )
          }
          break
      }

      resetComponent()
      setMoveModalVisible(false)
    } catch (error) {
      console.error("Move failed:", error)
      alert("Failed to move tabs. See console for details.")
    } finally {
      setIsMoving(false)
    }
  }

  const progressPercent = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0

  return (
    <Modal
      title={`Move (${selectedTabs.length}) Tabs`}
      open={true}
      onOk={handleOk}
      onCancel={() => {
        if (!isMoving) setMoveModalVisible(false)
      }}
      footer={
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="w-full sm:w-auto text-left">
            {isMoving && (
              <span className="text-xs text-blue-600 font-medium">
                Moving {progress.current} of {progress.total} tabs...
              </span>
            )}
          </div>
          <div className="flex justify-end gap-2 w-full sm:w-auto">
            <Button
              key="back"
              disabled={isMoving}
              onClick={() => setMoveModalVisible(false)}
            >
              Cancel
            </Button>
            <Button
              key="submit"
              type="primary"
              loading={isMoving}
              disabled={selectedTabs.length === 0}
              onClick={handleOk}
            >
              OK
            </Button>
          </div>
        </div>
      }
    >
      <Segmented
        options={options}
        onChange={(val) => setType(val as string)}
        value={type}
        disabled={isMoving}
        className="mb-4"
      />
      {isMoving && (
        <div className="mb-4">
          <Progress percent={progressPercent} status="active" />
        </div>
      )}
      <div className="py-3">{makeMoveTypeUI(type)}</div>
    </Modal>
  )
}
