/**
 * AIDrawer — Main AI panel. Slides in from the right.
 * Full-height overlay with glassmorphism header, chat thread, and command bar.
 */

import React, { useRef, useEffect, useState } from 'react'
import { Button, Tooltip } from 'antd'
import {
  RobotOutlined,
  DeleteOutlined,
  HistoryOutlined,
  PlusOutlined,
  EditOutlined,
  CloseOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '../../store/store'
import {
  closeDrawer,
  clearMessages,
  loadAISettings,
  loadChatHistory,
  createChatSession,
  switchChatSession,
  deleteChatSession,
  renameChatSession
} from '../../store/aiSlice'
import { AIChat } from './AIChat'
import { AICommandBar } from './AICommandBar'
import { AIProviderBadge } from './AIProviderBadge'

interface AIDrawerProps {
  onOpenSettings?: () => void
}

export function AIDrawer({ onOpenSettings }: AIDrawerProps) {
  const dispatch = useDispatch<AppDispatch>()
  const { drawerOpen, isLoading, settings, currentSessionId } = useSelector((s: RootState) => s.ai)
  const sessions = useSelector((s: RootState) => s.ai.sessions) ?? []
  
  console.log('AIDrawer state:', { sessions, isArray: Array.isArray(sessions) })

  const [showHistory, setShowHistory] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
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
                  <div className="mt-0.5 flex items-center gap-2">
                    <AIProviderBadge size="sm" showModel />
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <Tooltip title="New Chat">
                  <Button
                    type="text"
                    size="small"
                    icon={<PlusOutlined />}
                    onClick={() => {
                      dispatch(createChatSession())
                      setShowHistory(false)
                    }}
                    className="!text-white/70 hover:!text-white hover:!bg-white/10 !border-0"
                  />
                </Tooltip>
                <Tooltip title="Chat History">
                  <Button
                    type="text"
                    size="small"
                    icon={<HistoryOutlined />}
                    onClick={() => setShowHistory(!showHistory)}
                    className={`!text-white/70 hover:!text-white hover:!bg-white/10 !border-0 ${showHistory ? '!text-white !bg-white/20' : ''}`}
                  />
                </Tooltip>
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

        {/* Sessions Panel Overlay */}
        {showHistory && (
          <div className="absolute inset-0 top-[72px] bottom-[64px] bg-white z-[60] flex flex-col animate-in slide-in-from-left duration-200">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <span className="text-xs font-bold text-gray-500 uppercase tracking-wider">Previous Chats</span>
              <Button
                type="text"
                size="small"
                icon={<CloseOutlined />}
                onClick={() => setShowHistory(false)}
                className="!text-gray-400"
              />
            </div>
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              {Array.isArray(sessions) && sessions.map(session => (
                <div
                  key={session.id}
                  onClick={() => {
                    if (editingId) return
                    dispatch(switchChatSession(session.id))
                    setShowHistory(false)
                  }}
                  className={`
                    group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all
                    ${session.id === currentSessionId
                      ? 'bg-blue-50 border border-blue-100'
                      : 'hover:bg-gray-50 border border-transparent'
                    }
                  `}
                >
                  <div className="min-w-0 flex-1">
                    {editingId === session.id ? (
                      <input
                        autoFocus
                        className="w-full text-sm bg-white border border-blue-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-2 focus:ring-blue-100"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        onBlur={() => {
                          if (editTitle.trim()) {
                            dispatch(renameChatSession({ id: session.id, title: editTitle.trim() }))
                          }
                          setEditingId(null)
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            if (editTitle.trim()) {
                              dispatch(renameChatSession({ id: session.id, title: editTitle.trim() }))
                            }
                            setEditingId(null)
                          }
                          if (e.key === 'Escape') setEditingId(null)
                        }}
                        onClick={(e) => e.stopPropagation()}
                      />
                    ) : (
                      <div className={`text-sm truncate ${session.id === currentSessionId ? 'text-blue-700 font-semibold' : 'text-gray-700'}`}>
                        {session.title || 'Untitled Chat'}
                      </div>
                    )}
                    <div className="text-[10px] text-gray-400 mt-0.5">
                      {new Date(session.lastModified).toLocaleDateString()} · {session.messages.length} messages
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                    {!editingId && (
                      <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={(e) => {
                          e.stopPropagation()
                          setEditingId(session.id)
                          setEditTitle(session.title)
                        }}
                        className="!text-gray-400 hover:!text-blue-500 !flex items-center justify-center"
                      />
                    )}
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined />}
                      onClick={(e) => {
                        e.stopPropagation()
                        dispatch(deleteChatSession(session.id))
                      }}
                      className="!flex items-center justify-center"
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Thread */}
        <AIChat isLoading={isLoading} />

        {/* Command Bar */}
        <AICommandBar abortRef={abortRef} />
      </div>
    </>
  )
}
