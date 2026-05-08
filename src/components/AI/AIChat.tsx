/**
 * AIChat — Chat message thread.
 * - No user avatar (max horizontal space)
 * - Small AI robot indicator on left margin only
 * - Action cards show real tab titles + URLs, not raw JSON
 * - Streaming shows "thinking" dots until response is formatted
 */

import React, { useState, useEffect, useRef } from 'react'
import { Button, Tag, Spin, Tooltip } from 'antd'
import ReactMarkdown from 'react-markdown'
import {
  RobotOutlined,
  CheckOutlined,
  CloseOutlined,
  LoadingOutlined,
  CopyOutlined,
  WarningOutlined,
  LinkOutlined,
  SearchOutlined,
  AppstoreOutlined,
  PieChartOutlined,
  AudioMutedOutlined,
  SaveOutlined,
  EditOutlined,
  ArrowRightOutlined
} from '@ant-design/icons'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '../../store/store'
import { setExecutionResult } from '../../store/aiSlice'
import { TabActionExecutor } from '../../ai/actions/TabActionExecutor'
import type { ChatMessage } from '../../store/aiSlice'
import type { BrowserAction } from '../../ai/actions/ActionDefinitions'
import Tab from '../Tab/Tab'

const RISK_COLORS = { low: 'green', medium: 'orange', high: 'red' } as const
const RISK_LABELS = { low: 'Safe', medium: 'Moderate', high: 'Irreversible' }

// ─── Tab list preview inside action cards ──────────────────────────────────

function TabListPreview({ tabIds, limit = 8 }: { tabIds: number[]; limit?: number }) {
  const { tabs } = useSelector((s: RootState) => s.tabs) as { tabs: any[] }
  const tabMap = new Map(tabs.map((t: any) => [t.id, t]))

  const matched = tabIds
    .map((id) => tabMap.get(id))
    .filter(Boolean)

  const shown = matched.slice(0, limit)
  const remaining = matched.length - shown.length
  const tabOperations = {
    remove: (id: number) => chrome.tabs.remove(id),
    toggleMuteTab: (id: number, muted: boolean) => chrome.tabs.update(id, { muted: !muted }),
    togglePinTab: (id: number, pinned: boolean) => chrome.tabs.update(id, { pinned: !pinned }),
    discardTab: (id: number) => chrome.tabs.discard(id)
  }

  if (!shown.length) {
    return (
      <div className="text-xs text-gray-400 mt-2 italic">
        {tabIds.length} tab{tabIds.length !== 1 ? 's' : ''} selected
      </div>
    )
  }

  return (
    <div className="mt-2 space-y-1 bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
      {shown.map((tab: any, idx) => (
        <Tab
          key={tab.id}
          {...tab}
          index={idx}
          activeTab={tab.active}
          selected={false}
          isCompact={true}
          tabActionButtons="hover"
          hideUrl={true}
          {...tabOperations}
        />
      ))}
      {remaining > 0 && (
        <div className="text-[10px] text-gray-400 p-2 border-t border-gray-50 bg-gray-50/50">
          +{remaining} more tab{remaining !== 1 ? 's' : ''}
        </div>
      )}
    </div>
  )
}

// ─── Action confirmation card ───────────────────────────────────────────────

function ActionCard({
  action,
  messageId,
  executed
}: {
  action: BrowserAction
  messageId: string
  executed?: string
}) {
  const dispatch = useDispatch<AppDispatch>()

  const handleExecute = async () => {
    const result = await TabActionExecutor.execute(action)
    dispatch(setExecutionResult({ messageId, result: result.message }))
  }

  const handleDismiss = () => {
    dispatch(setExecutionResult({ messageId, result: '✗ Cancelled.' }))
  }

  if (action.type === 'analyze') {
    if (!action.tabIds || action.tabIds.length === 0) return null
    return (
      <div className="mt-2">
        <TabListPreview tabIds={action.tabIds} />
      </div>
    )
  }

  // Get tab IDs if the action has them
  const tabIds: number[] = (action as any).tabIds ?? ((action as any).tabId ? [(action as any).tabId] : [])

  return (
    <div className={`
      mt-2 rounded-xl border
      ${executed ? 'bg-gray-50/80 border-gray-200' : 'bg-white border-blue-200 shadow-sm'}
    `}>
      {/* Header row */}
      <div className="px-3 pt-3 pb-2">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <div className="text-xs font-semibold text-gray-800 leading-snug">{action.description}</div>
          </div>
          <Tag
            color={RISK_COLORS[action.risk]}
            className="text-[9px] flex-shrink-0 mt-0.5"
          >
            {RISK_LABELS[action.risk]}
          </Tag>
        </div>
        <div className="text-[10px] text-gray-400 mt-0.5 font-mono">
          {action.type.replace(/_/g, ' ')}
        </div>
      </div>

      {/* Tab list */}
      {tabIds.length > 0 && (
        <div className="px-3 pb-2">
          <TabListPreview tabIds={tabIds} />
        </div>
      )}

      {/* Action bar */}
      <div className="px-3 pb-3">
        {executed ? (
          <div className={`text-xs flex items-center gap-1.5 mt-1 ${executed.startsWith('✗') ? 'text-red-500' : 'text-green-600'}`}>
            {executed.startsWith('✗')
              ? <CloseOutlined style={{ fontSize: 10 }} />
              : <CheckOutlined style={{ fontSize: 10 }} />
            }
            {executed}
          </div>
        ) : (
          <div className="flex items-center gap-2 mt-1">
            <Button
              size="small"
              type="primary"
              icon={<CheckOutlined />}
              onClick={handleExecute}
              className="!bg-blue-500 !border-blue-500 !text-xs !h-7"
            >
              Confirm
            </Button>
            <Button
              size="small"
              icon={<CloseOutlined />}
              onClick={handleDismiss}
              danger
              className="!text-xs !h-7"
            >
              Cancel
            </Button>
            {action.risk === 'high' && (
              <Tooltip title="This action is irreversible — please confirm carefully.">
                <WarningOutlined className="text-orange-400" style={{ fontSize: 12 }} />
              </Tooltip>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Message bubble ─────────────────────────────────────────────────────────

function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user'

  const copyToClipboard = () => navigator.clipboard.writeText(message.content)

  if (isUser) {
    // User: right-aligned, full width, no avatar
    return (
      <div className="flex justify-end group">
        <div className="max-w-[88%]">
          <div className="bg-gradient-to-br from-blue-500 to-indigo-600 text-white rounded-2xl rounded-tr-sm px-3 py-2.5 text-sm leading-relaxed">
            {message.content}
          </div>
          <div className="flex justify-end mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="text-[10px] text-gray-400">
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        </div>
      </div>
    )
  }

  // AI: small indicator on left, full width content
  return (
    <div className="flex gap-2 group">
      {/* Tiny AI indicator */}
      <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-1">
        <RobotOutlined style={{ fontSize: 10, color: 'white' }} />
      </div>

      {/* Content — uses nearly all remaining space */}
      <div className="flex-1 min-w-0">
        {/* Text bubble */}
        {message.content && (
          <div className={`
            rounded-2xl rounded-tl-sm px-3 py-2.5 text-sm leading-relaxed
            ${message.streaming
              ? 'bg-gray-50 border border-gray-100 text-gray-700'
              : 'bg-white border border-gray-100 text-gray-800 shadow-sm'
            }
          `}>
            {message.streaming ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown>{message.content}</ReactMarkdown>
                <span className="inline-block w-0.5 h-3.5 bg-gray-400 ml-0.5 animate-pulse rounded align-middle" />
              </div>
            ) : (
              <div className="prose prose-sm max-w-none prose-p:leading-relaxed prose-li:my-0 prose-ul:my-1">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}
          </div>
        )}

        {/* Streaming thinking state (no content yet) */}
        {message.streaming && !message.content && (
          <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-3 py-2.5 inline-flex items-center gap-2">
            <span className="flex gap-1">
              {[0, 150, 300].map((delay) => (
                <span
                  key={delay}
                  className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                  style={{ animationDelay: `${delay}ms` }}
                />
              ))}
            </span>
            <span className="text-xs text-gray-400">Thinking…</span>
          </div>
        )}

        {/* Action card */}
        {!message.streaming && message.action && message.action.type !== 'analyze' && (
          <ActionCard
            action={message.action}
            messageId={message.id}
            executed={message.executionResult}
          />
        )}

        {/* Timestamp + copy */}
        <div className="flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <span className="text-[10px] text-gray-400">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={copyToClipboard}
            className="text-[10px] text-gray-400 hover:text-gray-600 transition-colors"
            title="Copy"
          >
            <CopyOutlined style={{ fontSize: 10 }} />
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Main chat container ────────────────────────────────────────────────────

interface AIChatProps {
  isLoading: boolean
}

export function AIChat({ isLoading }: AIChatProps) {
  const { sessions = [], currentSessionId } = useSelector((s: RootState) => s.ai)
  const messages = Array.isArray(sessions)
    ? sessions.find((s) => s.id === currentSessionId)?.messages ?? []
    : []
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center px-4 pb-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center mb-3 shadow-lg">
          <RobotOutlined className="text-white text-xl" />
        </div>
        <div className="text-gray-800 font-semibold text-sm mb-1">AI Tab Assistant</div>
        <div className="text-gray-500 text-xs leading-relaxed mb-5">
          Ask me anything about your tabs. I can close, group, move, bookmark, or analyze them.
        </div>
        <div className="grid grid-cols-1 gap-2 w-full">
          {[
            { text: 'What can you do?', icon: <RobotOutlined />, prompt: 'List all your actions, features and capabilities.' },
            { text: 'List all Facebook tabs', icon: <SearchOutlined /> },
            { text: 'Close all YouTube tabs', icon: <CloseOutlined /> },
            { text: 'Group tabs by domain', icon: <AppstoreOutlined /> },
            { text: 'Which domain has the most tabs?', icon: <PieChartOutlined /> },
            { text: 'Mute all audio tabs', icon: <AudioMutedOutlined /> },
            { text: 'Save this window as session "Work"', icon: <SaveOutlined /> }
          ].map((cap) => (
            <div
              key={cap.text}
              className="group flex items-center gap-2 text-xs text-left bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-xl cursor-pointer transition-all overflow-hidden"
            >
              <div
                className="flex-1 flex items-center gap-2.5 px-3 py-2.5 text-gray-600 hover:text-blue-700"
                onClick={() => document.dispatchEvent(new CustomEvent('ai:suggestion', {
                  detail: { text: cap.prompt || cap.text, autoSend: true }
                }))}
              >
                <span className="text-gray-400 group-hover:text-blue-500 transition-colors">{cap.icon}</span>
                <span className="font-medium">{cap.text}</span>
              </div>

              <Tooltip title="Edit before sending">
                <button
                  className="px-3 py-2.5 border-l border-gray-200 hover:bg-blue-100 text-gray-400 hover:text-blue-600 transition-colors"
                  onClick={(e) => {
                    e.stopPropagation()
                    document.dispatchEvent(new CustomEvent('ai:suggestion', {
                      detail: { text: cap.prompt || cap.text, autoSend: false }
                    }))
                  }}
                >
                  <EditOutlined />
                </button>
              </Tooltip>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3">
      {messages.map((msg) => (
        <MessageBubble key={msg.id} message={msg} />
      ))}
      {isLoading && messages[messages.length - 1]?.role !== 'assistant' && (
        <div className="flex gap-2">
          <div className="w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center flex-shrink-0 mt-1">
            <RobotOutlined style={{ fontSize: 10, color: 'white' }} />
          </div>
          <div className="bg-gray-50 border border-gray-100 rounded-2xl rounded-tl-sm px-3 py-2.5 inline-flex items-center gap-2">
            <span className="flex gap-1">
              {[0, 150, 300].map((delay) => (
                <span key={delay} className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: `${delay}ms` }} />
              ))}
            </span>
            <span className="text-xs text-gray-400">Thinking…</span>
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  )
}
