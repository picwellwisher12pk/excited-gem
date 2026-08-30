import { useState, useEffect } from 'react'
import { Menu, Button } from 'antd'
import {
  LayoutGrid,
  Folder,
  Settings,
  Menu as MenuIcon,
  X,
  BookmarkPlus,
  BarChart3
} from 'lucide-react'
import type { MenuProps } from 'antd'

interface SidebarProps {
  currentPage: 'tabs' | 'sessions' | 'settings' | 'bookmarks' | 'lists' | 'analytics'
  collapsed?: boolean
  onToggle?: () => void
  onAIClick?: () => void
  aiEnabled?: boolean
}

export function SidebarToggleButton({ onClick }: { onClick: () => void }) {
  return (
    <Button
      type="primary"
      icon={<MenuIcon size={16} />}
      onClick={onClick}
      style={{
        backgroundColor: '#1890ff',
        borderColor: '#1890ff',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}
    />
  )
}

const browser = chrome
export default function Sidebar({
  currentPage,
  collapsed: externalCollapsed,
  onToggle,
  onAIClick,
  aiEnabled = false
}: SidebarProps) {
  const [internalCollapsed, setInternalCollapsed] = useState(true)
  const [syncHash, setSyncHash] = useState<{
    hash: string
    time: string
  } | null>(null)

  useEffect(() => {
    if ((globalThis as any).process?.env?.NODE_ENV !== 'production') {
      const checkHash = () => {
        fetch('/sync-hash.json?t=' + Date.now())
          .then((res) => res.json())
          .then((data) => {
            if (data && data.hash) {
              setSyncHash(data)
            }
          })
          .catch(() => {
            // Ignore fetch errors
          })
      }
      checkHash()
      const interval = setInterval(checkHash, 2000)
      return () => clearInterval(interval)
    }
  }, [])

  const collapsed =
    externalCollapsed !== undefined ? externalCollapsed : internalCollapsed

  const handleToggle = () => {
    if (onToggle) {
      onToggle()
    } else {
      setInternalCollapsed(!internalCollapsed)
    }
  }

  const mainItems: MenuProps['items'] = [
    {
      key: 'tabs',
      icon: <LayoutGrid size={18} />,
      label: <a href="/tabs/home.html">Tabs</a>
    },
    {
      key: 'sessions',
      icon: <Folder size={18} />,
      label: <a href="/tabs/sessions.html">Sessions</a>
    },
    {
      key: 'lists',
      icon: <BookmarkPlus size={18} />,
      label: <a href="/tabs/lists.html">Lists</a>
    },
    {
      key: 'bookmarks',
      icon: <Folder size={18} />,
      label: <a href="/tabs/bookmarks.html">Bookmarks</a>
    },
    {
      key: 'analytics',
      icon: <BarChart3 size={18} />,
      label: <a href="/tabs/analytics.html">Analytics</a>
    }
  ]

  const settingsItems: MenuProps['items'] = [
    {
      key: 'settings',
      icon: <Settings size={18} />,
      label: <a href="/tabs/settings.html">Settings</a>
    }
  ]

  return (
    <>
      {/* Overlay */}
      {!collapsed && (
        <div
          className="fixed inset-0 bg-black bg-opacity-40 backdrop-blur-sm z-40"
          onClick={handleToggle}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed left-0 top-0 h-full bg-gradient-to-b from-blue-600 to-indigo-600 shadow-lg transition-transform duration-300 z-40 ${
          collapsed ? '-translate-x-full' : 'translate-x-0'
        } flex flex-col`}
        style={{ width: '240px' }}
      >
        <div className="flex justify-between items-center p-4 border-b border-white/20">
          <h2 className="text-white font-semibold text-lg">Menu</h2>
          <Button
            type="text"
            icon={<X size={20} />}
            onClick={handleToggle}
            className="!text-white hover:!bg-white/10 flex items-center justify-center"
          />
        </div>
        <div className="flex-1 flex flex-col justify-between">
          <Menu
            mode="inline"
            selectedKeys={[currentPage]}
            items={mainItems}
            className="!bg-transparent !border-0 pt-4"
            theme="dark"
          />

          <div className="flex flex-col gap-1 pb-4">
            {/* AI Button */}
            <button
              onClick={onAIClick}
              className={`
                mx-3 flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition-all
                ${
                  aiEnabled
                    ? 'bg-gradient-to-r from-blue-500/30 to-purple-500/30 text-white border border-white/20 hover:from-blue-500/40 hover:to-purple-500/40'
                    : 'text-white/60 hover:bg-white/10 hover:text-white'
                }
              `}
              title="AI Assistant"
            >
              <span className="text-base">🤖</span>
              <span>AI Assistant</span>
              {aiEnabled && (
                <span className="ml-auto text-[9px] px-1.5 py-0.5 bg-blue-400/30 text-blue-200 rounded-full">
                  ON
                </span>
              )}
            </button>

            <Menu
              mode="inline"
              selectedKeys={[currentPage]}
              items={settingsItems}
              className="!bg-transparent !border-0"
              theme="dark"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-white/20">
          <div className="text-white font-semibold text-sm">Excited Gem</div>
          <div className="text-white/60 text-xs mt-1">
            v{browser.runtime.getManifest().version}
            {syncHash && (
              <span
                className="ml-2 px-1.5 py-0.5 bg-green-500/20 text-green-300 rounded"
                title={`Synced at ${syncHash.time}`}
              >
                {syncHash.hash}
              </span>
            )}
          </div>
        </div>
      </div>
    </>
  )
}
