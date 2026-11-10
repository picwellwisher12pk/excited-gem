import React, { useState, useEffect } from 'react'
import { Dropdown, message } from 'antd'
import type { MenuProps } from 'antd'
import { useSelector } from 'react-redux'
import {
  Copy,
  FileText,
  Pin,
  Volume2,
  VolumeX,
  CircleDashed,
  MoveRight,
  Plus,
  Trash2,
  Layers
} from 'lucide-react'
import type { RootState } from '../../store/store'
import type { UnifiedTab } from '../../adapter/types'

// Extended tab type that may include browser-native muted info
type TabWithMuteInfo = UnifiedTab & {
  mutedInfo?: { muted: boolean }
  windowId: number
}

interface TabContextMenuProps {
  children: React.ReactNode
  tab: TabWithMuteInfo
}

export const TabContextMenu: React.FC<TabContextMenuProps> = ({
  children,
  tab
}) => {
  const [open, setOpen] = useState(false)
  const [windows, setWindows] = useState<chrome.windows.Window[]>([])

  const selectedTabs = useSelector(
    (state: RootState) => state.tabs?.selectedTabs || []
  )

  const isBulk = selectedTabs.includes(tab.id) && selectedTabs.length > 1
  const targetTabIds: number[] = isBulk ? selectedTabs : [tab.id]

  useEffect(() => {
    if (open && typeof chrome !== 'undefined' && chrome.windows) {
      chrome.windows.getAll({ populate: true }, (wins) => {
        if (wins) {
          setWindows(wins)
        }
      })
    }
  }, [open])

  const otherWindows = windows.filter((w) => w.id !== tab.windowId)

  const handleMoveToWindow = async (targetWindowId: number) => {
    try {
      for (const tid of targetTabIds) {
        try {
          await chrome.tabs.move(tid, { windowId: targetWindowId, index: -1 })
        } catch {
          try {
            await chrome.tabs.update(tid, { pinned: false })
            await chrome.tabs.move(tid, { windowId: targetWindowId, index: -1 })
          } catch (e) {
            console.warn('[ContextMenu] Failed to move tab to window:', tid, e)
          }
        }
      }
      message.success(
        `Moved ${targetTabIds.length} ${targetTabIds.length === 1 ? 'tab' : 'tabs'} to Window #${targetWindowId}`
      )
    } catch (err) {
      console.error('Failed to move tabs:', err)
      message.error('Failed to move tabs')
    }
  }

  const handleMoveToNewWindow = async () => {
    try {
      const firstId = targetTabIds[0]
      const win = await chrome.windows.create({ tabId: firstId, focused: true })
      if (win && win.id && targetTabIds.length > 1) {
        const remaining = targetTabIds.slice(1)
        for (const tid of remaining) {
          try {
            await chrome.tabs.move(tid, { windowId: win.id, index: -1 })
          } catch {
            try {
              await chrome.tabs.update(tid, { pinned: false })
              await chrome.tabs.move(tid, { windowId: win.id, index: -1 })
            } catch {}
          }
        }
      }
      message.success(
        `Moved ${targetTabIds.length} ${targetTabIds.length === 1 ? 'tab' : 'tabs'} to New Window`
      )
    } catch (err) {
      console.error('Failed to create new window:', err)
      message.error('Failed to create new window')
    }
  }

  const items: MenuProps['items'] = [
    {
      key: 'copyTitle',
      label: 'Copy Title',
      icon: <Copy size={14} />,
      onClick: async () => {
        await navigator.clipboard.writeText(tab.title || '')
        message.success('Title copied')
      }
    },
    {
      key: 'copyUrl',
      label: 'Copy URL',
      icon: <FileText size={14} />,
      onClick: async () => {
        await navigator.clipboard.writeText(tab.url || '')
        message.success('URL copied')
      }
    },
    { type: 'divider' },
    {
      key: 'moveToWindow',
      label: isBulk ? `Move ${targetTabIds.length} Tabs to Window` : 'Move to Window',
      icon: <MoveRight size={14} />,
      popupOffset: [4, -4] as [number, number],
      children: [
        ...otherWindows.map((w) => ({
          key: `win-${w.id}`,
          label: `Window #${w.id} (${w.tabs?.length || 0} tabs)${w.focused ? ' (Current)' : ''}`,
          icon: <Layers size={14} />,
          onClick: () => handleMoveToWindow(w.id!)
        })),
        ...(otherWindows.length > 0 ? [{ type: 'divider' as const }] : []),
        {
          key: 'newWindow',
          label: 'New Window',
          icon: <Plus size={14} />,
          onClick: handleMoveToNewWindow
        }
      ]
    },
    { type: 'divider' },
    {
      key: 'pin',
      label: isBulk
        ? `${tab.pinned ? 'Unpin' : 'Pin'} ${targetTabIds.length} Tabs`
        : tab.pinned
        ? 'Unpin Tab'
        : 'Pin Tab',
      icon: <Pin size={14} />,
      onClick: async () => {
        const nextPinned = !tab.pinned
        for (const tid of targetTabIds) {
          try {
            await chrome.tabs.update(tid, { pinned: nextPinned })
          } catch {}
        }
      }
    },
    {
      key: 'mute',
      label: isBulk
        ? `${tab.mutedInfo?.muted ? 'Unmute' : 'Mute'} ${targetTabIds.length} Tabs`
        : tab.mutedInfo?.muted
        ? 'Unmute Tab'
        : 'Mute Tab',
      icon: tab.mutedInfo?.muted ? <VolumeX size={14} /> : <Volume2 size={14} />,
      onClick: async () => {
        const nextMuted = !tab.mutedInfo?.muted
        for (const tid of targetTabIds) {
          try {
            await chrome.tabs.update(tid, { muted: nextMuted })
          } catch {}
        }
      }
    },
    {
      key: 'discard',
      label: isBulk
        ? `Discard ${targetTabIds.length} Tabs`
        : 'Discard Tab',
      icon: <CircleDashed size={14} strokeWidth={1.75} />,
      disabled: tab.discarded,
      onClick: async () => {
        for (const tid of targetTabIds) {
          try {
            await chrome.tabs.discard(tid)
          } catch {}
        }
      }
    },
    { type: 'divider' },
    {
      key: 'close',
      label: isBulk ? `Close ${targetTabIds.length} Tabs` : 'Close Tab',
      icon: <Trash2 size={14} />,
      danger: true,
      onClick: async () => {
        try {
          await chrome.tabs.remove(targetTabIds)
        } catch (e) {
          console.warn('Failed to close tabs:', e)
        }
      }
    }
  ]

  return (
    <Dropdown
      menu={{ items }}
      trigger={['contextMenu']}
      open={open}
      onOpenChange={setOpen}
      destroyPopupOnHide
      overlayClassName="compact-context-menu"
    >
      <div
        className={`transition-all duration-200 ${
          open
            ? 'ring-2 ring-inset ring-blue-400 bg-blue-50/80 dark:bg-blue-950/60 rounded-lg'
            : ''
        }`}
      >
        {children}
      </div>
    </Dropdown>
  )
}
