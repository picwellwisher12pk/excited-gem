/**
 * AICommandBar — Input bar at the bottom of the AI drawer.
 * Enter to send. Shift+Enter for newline. No send button.
 * Raw JSON from model is NEVER displayed — only the parsed description or analysis text.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react'
import { Button, Tooltip } from 'antd'
import { DeleteOutlined, StopOutlined } from '@ant-design/icons'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '../../store/store'
import {
  addMessage,
  updateStreamingMessage,
  finalizeStreamingMessage,
  setStreamingMessageId,
  setLoading,
  clearMessages
} from '../../store/aiSlice'
import { TabActionExecutor } from '../../ai/actions/TabActionExecutor'
import { getAIService, resetAIService } from '../../ai/AIService'
import type { ChatMessage } from '../../store/aiSlice'

function uid(): string {
  return `msg_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
}

/**
 * Given the raw AI JSON output and the parsed action,
 * returns a clean human-readable string for the chat bubble.
 * Never shows raw JSON.
 */
function toDisplayText(rawText: string, action: any): string {
  if (!action) {
    // Couldn't parse — show a clean message, not the raw JSON
    return '⚠️ Couldn\'t parse a response. Please try rephrasing your request.'
  }
  if (action.type === 'analyze') {
    // Pure analysis — show the result text
    return action.result ?? rawText
  }
  // For any browser action — the bubble shows the description.
  // Tab details are shown in the ActionCard below the bubble.
  return action.description ?? 'Done.'
}

interface AICommandBarProps {
  abortRef: React.MutableRefObject<AbortController | null>
}

export function AICommandBar({ abortRef }: AICommandBarProps) {
  const dispatch = useDispatch<AppDispatch>()
  const { isLoading, settings, streamingMessageId } = useSelector((s: RootState) => s.ai)
  const { tabs } = useSelector((s: RootState) => s.tabs)
  const [input, setInput] = useState('')
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // Auto-grow textarea
  useEffect(() => {
    const ta = textareaRef.current
    if (!ta) return
    ta.style.height = 'auto'
    ta.style.height = `${Math.min(ta.scrollHeight, 120)}px`
  }, [input])

  // Listen for suggestion clicks from AIChat
  useEffect(() => {
    const handler = (e: Event) => {
      const suggestion = (e as CustomEvent<string>).detail
      setInput(suggestion)
      setTimeout(() => textareaRef.current?.focus(), 50)
    }
    document.addEventListener('ai:suggestion', handler)
    return () => document.removeEventListener('ai:suggestion', handler)
  }, [])

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || isLoading) return
    setInput('')

    // Add user message
    const userMsgId = uid()
    dispatch(addMessage({
      id: userMsgId,
      role: 'user',
      content: text,
      timestamp: Date.now()
    } as ChatMessage))
    dispatch(setLoading(true))

    // Create AI message placeholder (empty — shows bouncing dots)
    const aiMsgId = uid()
    dispatch(addMessage({
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
      streaming: true
    } as ChatMessage))
    dispatch(setStreamingMessageId(aiMsgId))

    const abort = new AbortController()
    abortRef.current = abort

    try {
      resetAIService()
      const service = await getAIService()
      const currentWindow = await chrome.windows.getCurrent()

      // Always accumulate full raw text first, then display clean version
      let fullText = ''

      if (settings.streaming) {
        const stream = service.streamQuery(text, tabs as any[], currentWindow.id, abort.signal)
        for await (const chunk of stream) {
          if (abort.signal.aborted) break
          fullText += chunk.text
          // During streaming: keep content empty — show bouncing dots
          // (We only reveal content after parsing so no raw JSON flashes on screen)
          if (chunk.done) break
        }
      } else {
        const { rawResponse } = await service.query(text, tabs as any[], currentWindow.id)
        fullText = rawResponse
      }

      // Parse action and set clean display text
      const action = TabActionExecutor.parseAIResponse(fullText)
      const displayText = toDisplayText(fullText, action)

      dispatch(updateStreamingMessage({ id: aiMsgId, content: displayText }))
      dispatch(finalizeStreamingMessage({ id: aiMsgId, action }))

    } catch (e: any) {
      if (!abort.signal.aborted) {
        const msg = e.message?.includes('fetch') || e.message?.includes('network')
          ? '⚠️ Cannot reach the AI provider. Check your endpoint and connection.'
          : `⚠️ ${e.message}`
        dispatch(updateStreamingMessage({ id: aiMsgId, content: msg }))
        dispatch(finalizeStreamingMessage({ id: aiMsgId, action: null }))
      }
    } finally {
      abortRef.current = null
    }
  }, [input, isLoading, dispatch, settings, tabs, abortRef])

  const handleStop = () => {
    abortRef.current?.abort()
    dispatch(setLoading(false))
    if (streamingMessageId) {
      dispatch(finalizeStreamingMessage({ id: streamingMessageId, action: null }))
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="border-t border-gray-100 bg-white px-3 pt-2.5 pb-3">
      {/* Textarea — full width, no send button */}
      <div className="relative">
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={isLoading ? 'Waiting for response…' : 'Ask about your tabs…  ↵ to send'}
          rows={1}
          disabled={isLoading}
          autoFocus
          className={`
            w-full resize-none rounded-xl border text-sm leading-relaxed
            px-3 py-2.5 pr-9
            focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400
            transition-all duration-150
            ${isLoading
              ? 'bg-gray-50 text-gray-400 border-gray-100 cursor-not-allowed'
              : 'bg-white text-gray-800 border-gray-200 hover:border-gray-300'
            }
          `}
          style={{ minHeight: '40px', maxHeight: '120px', overflow: 'auto' }}
        />

        {/* Stop button — only shown when loading, floats inside textarea */}
        {isLoading && (
          <button
            onClick={handleStop}
            className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-orange-100 hover:bg-orange-200 text-orange-500 flex items-center justify-center transition-colors"
            title="Stop generation"
          >
            <StopOutlined style={{ fontSize: 11 }} />
          </button>
        )}
      </div>

      {/* Bottom bar: model info + clear */}
      <div className="flex items-center justify-between mt-1.5">
        <div className="text-[10px] text-gray-400 truncate flex-1 mr-2">
          {settings.enabled
            ? `${settings.providerType}${settings.model ? ' · ' + settings.model : ''} · ${(settings.contextWindowOverride ?? settings.tokenBudget).toLocaleString()} tokens · ↵ send · ⇧↵ newline`
            : '⚠️ AI not configured — open Settings › AI'
          }
        </div>
        <Tooltip title="Clear chat">
          <Button
            type="text"
            size="small"
            icon={<DeleteOutlined />}
            onClick={() => dispatch(clearMessages())}
            className="!text-gray-300 hover:!text-red-400 !p-1 flex-shrink-0"
          />
        </Tooltip>
      </div>
    </div>
  )
}
