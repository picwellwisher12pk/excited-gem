/**
 * AIDrawer — Main AI panel. Slides in from the right.
 * Full-height overlay with glassmorphism header, chat thread, and command bar.
 */

import React, { useRef, useEffect } from 'react'
import { Button, Tooltip } from 'antd'
import {
  CloseOutlined,
  SettingOutlined,
  RobotOutlined,
  DeleteOutlined
} from '@ant-design/icons'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '../../store/store'
import { closeDrawer, clearMessages, loadAISettings, loadChatHistory } from '../../store/aiSlice'
import { AIChat } from './AIChat'
import { AICommandBar } from './AICommandBar'
import { AIProviderBadge } from './AIProviderBadge'

interface AIDrawerProps {
  onOpenSettings?: () => void
}

export function AIDrawer({ onOpenSettings }: AIDrawerProps) {
  const dispatch = useDispatch<AppDispatch>()
  const { drawerOpen, isLoading, settings } = useSelector((s: RootState) => s.ai)
  const abortRef = useRef<AbortController | null>(null)

  // Load settings on mount
  useEffect(() => {
    dispatch(loadAISettings())
    dispatch(loadChatHistory())
  }, [])

  // Abort any in-flight request when drawer closes
  useEffect(() => {
    if (!drawerOpen && abortRef.current) {
      abortRef.current.abort()
    }
  }, [drawerOpen])

  return (
    <>
      {/* Backdrop */}
      {drawerOpen && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-[2px] z-40 transition-opacity duration-300"
          onClick={() => dispatch(closeDrawer())}
        />
      )}

      {/* Drawer */}
      <div
        className={`
          fixed right-0 top-0 h-full z-50 flex flex-col
          bg-white shadow-2xl
          transition-transform duration-300 ease-out
          ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}
        `}
        style={{ width: '380px', maxWidth: '100vw' }}
      >
        {/* Header */}
        <div className="relative overflow-hidden flex-shrink-0">
          {/* Gradient background */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-700" />
          {/* Glow orbs */}
          <div className="absolute -top-4 -right-4 w-24 h-24 bg-white/10 rounded-full blur-xl" />
          <div className="absolute -bottom-2 left-8 w-16 h-16 bg-blue-300/20 rounded-full blur-lg" />

          <div className="relative px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30">
                  <RobotOutlined className="text-white text-base" />
                </div>
                <div>
                  <div className="text-white font-bold text-base leading-tight">AI Assistant</div>
                  <div className="mt-0.5">
                    <AIProviderBadge size="sm" showModel />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Tooltip title="AI Settings">
                  <Button
                    type="text"
                    size="small"
                    icon={<SettingOutlined />}
                    onClick={onOpenSettings}
                    className="!text-white/70 hover:!text-white hover:!bg-white/10 !border-0"
                  />
                </Tooltip>
                <Tooltip title="Close">
                  <Button
                    type="text"
                    size="small"
                    icon={<CloseOutlined />}
                    onClick={() => dispatch(closeDrawer())}
                    className="!text-white/70 hover:!text-white hover:!bg-white/10 !border-0"
                  />
                </Tooltip>
              </div>
            </div>

            {/* Status bar */}
            {!settings.enabled && (
              <div className="mt-3 px-3 py-2 rounded-lg bg-orange-400/20 border border-orange-300/30">
                <span className="text-orange-100 text-xs">
                  AI is not enabled. Click ⚙️ to configure a provider.
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Chat Thread */}
        <AIChat isLoading={isLoading} />

        {/* Command Bar */}
        <AICommandBar abortRef={abortRef} />
      </div>
    </>
  )
}
