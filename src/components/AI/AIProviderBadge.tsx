/**
 * AIProviderBadge — Small pill showing the active AI provider and model.
 * Shown in the AI drawer header and navigation bar.
 */

import React from 'react'
import { useSelector } from 'react-redux'
import type { RootState } from '../../store/store'
import type { ProviderType } from '../../ai/AIService'

const PROVIDER_ICONS: Record<ProviderType, string> = {
  'gemini-nano':       '⚡',
  'ollama':            '🦙',
  'lm-studio':         '🏠',
  'jan':               '🌀',
  'llamacpp':          '🔧',
  'openai-compatible': '🔌',
  'openai':            '🤖',
  'gemini-cloud':      '✨',
  'anthropic':         '🧠',
  'groq':              '⚡'
}

const PROVIDER_LABELS: Record<ProviderType, string> = {
  'gemini-nano':       'Nano',
  'ollama':            'Ollama',
  'lm-studio':         'LM Studio',
  'jan':               'Jan',
  'llamacpp':          'llama.cpp',
  'openai-compatible': 'Local',
  'openai':            'OpenAI',
  'gemini-cloud':      'Gemini',
  'anthropic':         'Claude',
  'groq':              'Groq'
}

interface AIProviderBadgeProps {
  size?: 'sm' | 'md'
  showModel?: boolean
}

export function AIProviderBadge({ size = 'sm', showModel = true }: AIProviderBadgeProps) {
  const { settings, connectionStatus } = useSelector((s: RootState) => s.ai)
  const { providerType, model, enabled } = settings

  if (!enabled) return null

  const icon = PROVIDER_ICONS[providerType] ?? '🤖'
  const label = PROVIDER_LABELS[providerType] ?? providerType
  const modelShort = model ? (model.length > 18 ? model.slice(0, 15) + '…' : model) : '—'
  const isConnected = connectionStatus?.connected ?? null

  return (
    <div
      className={`
        inline-flex items-center gap-1 rounded-full border
        ${size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'}
        ${isConnected === true
          ? 'bg-green-50 border-green-200 text-green-700'
          : isConnected === false
          ? 'bg-red-50 border-red-200 text-red-600'
          : 'bg-blue-50 border-blue-200 text-blue-600'
        }
        font-medium transition-colors
      `}
      title={`AI: ${label} · ${model}`}
    >
      <span>{icon}</span>
      <span>{label}</span>
      {showModel && model && (
        <>
          <span className="opacity-40">·</span>
          <span className="font-mono opacity-80">{modelShort}</span>
        </>
      )}
    </div>
  )
}
