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
  onClick?: () => void
  active?: boolean
  status?: ProviderStatus | null
}

import type { ProviderStatus } from '../../ai/providers/BaseProvider'

export function AIProviderBadge({ 
  size = 'sm', 
  showModel = true,
  onClick,
  active,
  status: statusProp
}: AIProviderBadgeProps) {
  const { settings, status: statusStore } = useSelector((s: RootState) => s.ai)
  const { providerType, model, enabled } = settings

  // Use prop if provided, else fallback to store
  const currentStatus = statusProp !== undefined ? statusProp : statusStore

  // If not enabled, we still show the badge if it's meant to be a trigger button,
  // but with a grayscale/disabled look.
  const isEnabled = enabled

  const icon = PROVIDER_ICONS[providerType] ?? '🤖'
  const label = PROVIDER_LABELS[providerType] ?? providerType
  const modelShort = model ? (model.length > 18 ? model.slice(0, 15) + '…' : model) : '—'
  const isConnected = currentStatus?.connected ?? null

  return (
    <div
      onClick={onClick}
      className={`
        inline-flex items-center gap-1.5 rounded-full border shadow-sm
        ${size === 'sm' ? 'px-2.5 py-1 text-[10px]' : 'px-3.5 py-1.5 text-xs'}
        ${!isEnabled
          ? 'bg-gray-50 border-gray-200 text-gray-500 grayscale'
          : isConnected === true
          ? 'bg-green-50 border-green-200 text-green-700'
          : isConnected === false
          ? 'bg-red-50 border-red-200 text-red-600'
          : 'bg-blue-50 border-blue-200 text-blue-600'
        }
        ${onClick ? 'cursor-pointer hover:shadow-md active:scale-95' : ''}
        ${active ? 'ring-2 ring-blue-400 ring-offset-2 ring-offset-white' : ''}
        font-medium transition-all duration-200
      `}
      title={isConnected === false ? `AI Error: ${currentStatus?.error}` : `AI: ${label} · ${model}`}
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
