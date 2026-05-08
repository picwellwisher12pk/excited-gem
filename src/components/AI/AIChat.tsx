/**
 * AIChat — Chat message thread.
 * - No user avatar (max horizontal space)
 * - Small AI robot indicator on left margin only
 * - Action cards show real tab titles + URLs, not raw JSON
 * - Streaming shows "thinking" dots until response is formatted
 */

import React, { useRef, useEffect } from 'react'
import { Button, Tag, Spin, Tooltip } from 'antd'
import {
  RobotOutlined,
  CheckOutlined,
  CloseOutlined,
  LoadingOutlined,
  CopyOutlined,
  WarningOutlined,
  LinkOutlined
} from '@ant-design/icons'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '../../store/store'
import { setExecutionResult } from '../../store/aiSlice'
import { TabActionExecutor } from '../../ai/actions/TabActionExecutor'
import type { ChatMessage } from '../../store/aiSlice'
import type { BrowserAction } from '../../ai/actions/ActionDefinitions'

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

  if (!shown.length) {
    return (
      <div className="text-xs text-gray-400 mt-2 italic">
        {tabIds.length} tab{tabIds.length !== 1 ? 's' : ''} selected
      </div>
    )
  }

  const getDomain = (url?: string) => {
    try { return new URL(url ?? '').hostname.replace(/^www\./, '') } catch { return '' }
  }
  const getFavicon = (url?: string) => {
    try { return `https://www.google.com/s2/favicons?domain=${new URL(url ?? '').hostname}&sz=16` } catch { return null }
  }

  return (
    <div className="mt-2 space-y-1">
      {shown.map((tab: any) => (
        <div key={tab.id} className="flex items-start gap-1.5 text-xs text-gray-700 bg-gray-50 rounded-lg px-2 py-1.5">
          {getFavicon(tab.url) ? (
            <img src={getFavicon(tab.url)!} alt="" className="w-3.5 h-3.5 mt-0.5 flex-shrink-0 rounded-sm" />
          ) : (
            <LinkOutlined className="text-gray-400 mt-0.5 flex-shrink-0" style={{ fontSize: 11 }} />
          )}
          <div className="min-w-0 flex-1">
            <div className="font-medium truncate leading-tight">{tab.title || 'Untitled'}</div>
            <div className="text-[10px] text-gray-400 truncate mt-0.5 font-mono">{getDomain(tab.url)}</div>
          </div>
        </div>
      ))}
      {remaining > 0 && (
        <div className="text-[10px] text-gray-400 pl-2">
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

  if (action.type === 'analyze') return null

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
              <span>
                {message.content}
                <span className="inline-block w-0.5 h-3.5 bg-gray-400 ml-0.5 animate-pulse rounded" />
              </span>
            ) : (
              <span className="whitespace-pre-wrap">{message.content}</span>
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
  const { messages } = useSelector((s: RootState) => s.ai)
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
        <div className="grid grid-cols-1 gap-1.5 w-full">
          {[
            'List all Facebook tabs',
            'Close all YouTube tabs',
            'Group tabs by domain',
            'Which domain has the most tabs?',
            'Mute all audio tabs',
            'Save this window as session "Work"'
          ].map((suggestion) => (
            <div
              key={suggestion}
              className="text-xs text-left px-3 py-2 bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 rounded-lg cursor-pointer transition-all text-gray-600 hover:text-blue-700"
              onClick={() => document.dispatchEvent(new CustomEvent('ai:suggestion', { detail: suggestion }))}
            >
              {suggestion}
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
