/**
 * AISettingsPanel — AI configuration section for Settings > AI.
 * Full provider setup with auto-discovery, free-form model names, and connection testing.
 */

import { useState, useEffect } from 'react'
import {
  Radio, Space, Typography, Input, Button, Slider, Select,
  Divider, Tag, Alert, Tooltip, Switch
} from 'antd'
import {
  ThunderboltOutlined,
  ApiOutlined,
  ScanOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  LoadingOutlined,
  InfoCircleOutlined,
  RobotOutlined,
  KeyOutlined,
  GlobalOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useDispatch, useSelector } from 'react-redux'
import type { AppDispatch, RootState } from '../../store/store'
import {
  saveAISettings, discoverModels as discoverModelsThunk,
  testConnection as testConnectionThunk,
} from '../../store/aiSlice'
import type { AISettings, ProviderType } from '../../ai/AIService'

const { Text, Title } = Typography
const { Option } = Select

// ─── Provider Configuration ─────────────────────────────────────────────────

interface ProviderOption {
  value: ProviderType
  label: string
  isLocal: boolean
  isBuiltin: boolean
  defaultUrl?: string
  defaultModel?: string
  requiresKey: boolean
}

const PROVIDERS: ProviderOption[] = [
  { value: 'gemini-nano', label: '⚡ Gemini Nano (Built-in)', isLocal: false, isBuiltin: true, requiresKey: false, defaultModel: 'gemini-nano' },
  { value: 'ollama',       label: '🦙 Ollama (Local)',          isLocal: true,  isBuiltin: false, requiresKey: false, defaultUrl: 'http://localhost:11434', defaultModel: '' },
  { value: 'lm-studio',   label: '🏠 LM Studio (Local)',       isLocal: true,  isBuiltin: false, requiresKey: false, defaultUrl: 'http://localhost:1234',  defaultModel: '' },
  { value: 'jan',          label: '🌀 Jan (Local)',              isLocal: true,  isBuiltin: false, requiresKey: false, defaultUrl: 'http://localhost:1337',  defaultModel: '' },
  { value: 'llamacpp',    label: '🔧 llama.cpp (Local)',        isLocal: true,  isBuiltin: false, requiresKey: false, defaultUrl: 'http://localhost:8080',  defaultModel: '' },
  { value: 'openai-compatible', label: '🔌 OpenAI-Compatible (Local/Other)', isLocal: true, isBuiltin: false, requiresKey: false, defaultUrl: '', defaultModel: '' },
  { value: 'openai',       label: '🤖 OpenAI',                  isLocal: false, isBuiltin: false, requiresKey: true,  defaultUrl: '', defaultModel: 'gpt-4o-mini' },
  { value: 'gemini-cloud', label: '✨ Google Gemini (Cloud)',   isLocal: false, isBuiltin: false, requiresKey: true,  defaultUrl: '', defaultModel: 'gemini-2.0-flash' },
  { value: 'anthropic',   label: '🧠 Anthropic Claude',         isLocal: false, isBuiltin: false, requiresKey: true,  defaultUrl: '', defaultModel: 'claude-3-5-haiku-20241022' },
  { value: 'groq',         label: '⚡ Groq (Fast Cloud)',        isLocal: false, isBuiltin: false, requiresKey: true,  defaultUrl: '', defaultModel: 'llama-3.3-70b-versatile' }
]

const CONTEXT_STRATEGIES = [
  { value: 'auto',       label: 'Auto (recommended)', desc: 'Picks the best strategy based on your query and model' },
  { value: 'semantic',   label: 'Semantic (keyword filter)', desc: '~8K tokens — best for small models. Filters tabs by query keywords.' },
  { value: 'windowed',   label: 'Windowed (current window)', desc: '~3K tokens — only current window tabs. Works on any model.' },
  { value: 'compressed', label: 'Compressed (title + URL)', desc: '~42K tokens for 600 tabs. Needs a 64K+ context model.' },
  { value: 'full',       label: 'Full (all fields)', desc: '~60K tokens for 600 tabs. Needs a large context model.' },
  { value: 'summary',    label: 'Summary (domain counts)', desc: '~3K tokens. Great for stats queries on any model.' }
]

// ─── Component ────────────────────────────────────────────────────────────────

export function AISettingsPanel() {
  const dispatch = useDispatch<AppDispatch>()
  const { settings, connectionStatus, discoveredModels, isDiscovering, isTesting } =
    useSelector((s: RootState) => s.ai)

  const [localSettings, setLocalSettings] = useState<AISettings>(settings)
  const [hasChanges, setHasChanges] = useState(false)

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const update = <K extends keyof AISettings>(key: K, value: AISettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }))
    setHasChanges(true)
  }

  const updateProvider = (providerType: ProviderType) => {
    const meta = PROVIDERS.find((p) => p.value === providerType)!
    setLocalSettings((prev) => ({
      ...prev,
      providerType,
      model: meta.defaultModel ?? prev.model,
      baseUrl: meta.defaultUrl ?? prev.baseUrl,
      apiKey: prev.apiKey
    }))
    setHasChanges(true)
  }

  const handleSave = () => {
    dispatch(saveAISettings(localSettings))
    setHasChanges(false)
  }

  const handleDiscover = () => {
    dispatch(discoverModelsThunk(localSettings))
  }

  const handleTest = () => {
    dispatch(testConnectionThunk(localSettings))
  }

  const currentProvider = PROVIDERS.find((p) => p.value === localSettings.providerType) ?? PROVIDERS[0]

  return (
    <Space direction="vertical" size="large" className="w-full">

      {/* Enable / Disable */}
      <div className="flex items-center justify-between p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
        <div>
          <div className="flex items-center gap-2">
            <RobotOutlined className="text-blue-500 text-lg" />
            <Text strong className="text-base">AI Assistant</Text>
            <Tag color="blue" className="text-[10px] font-bold uppercase">Beta</Tag>
          </div>
          <Text type="secondary" className="text-xs block mt-1">
            Use natural language to manage your tabs. Works with local & cloud AI.
          </Text>
        </div>
        <Switch
          checked={localSettings.enabled}
          onChange={(v) => update('enabled', v)}
          className={localSettings.enabled ? '!bg-blue-500' : ''}
        />
      </div>

      {/* Provider Selection */}
      <div>
        <Text strong className="block mb-3">AI Provider</Text>
        <Radio.Group
          value={localSettings.providerType}
          onChange={(e) => updateProvider(e.target.value)}
          className="w-full"
        >
          <div className="grid grid-cols-1 gap-2">
            {PROVIDERS.map((p) => (
              <Radio key={p.value} value={p.value}>
                <span className="text-sm">{p.label}</span>
                {p.isBuiltin && (
                  <Tag color="green" className="ml-2 text-[10px]">No setup</Tag>
                )}
                {p.isLocal && (
                  <Tag color="purple" className="ml-2 text-[10px]">Private</Tag>
                )}
              </Radio>
            ))}
          </div>
        </Radio.Group>
      </div>

      <Divider className="my-1" />

      {/* Local backend configuration */}
      {currentProvider.isLocal && (
        <div className="space-y-4">
          <div>
            <Text strong className="block mb-1">
              <GlobalOutlined className="mr-1" />
              Endpoint URL
            </Text>
            <Input
              value={localSettings.baseUrl}
              onChange={(e) => update('baseUrl', e.target.value)}
              placeholder={currentProvider.defaultUrl || 'http://localhost:11434'}
              className="font-mono text-sm"
            />
            <Text type="secondary" className="text-xs mt-1 block">
              Default: {currentProvider.defaultUrl || 'varies by backend'}
            </Text>
          </div>

          <div>
            <Text strong className="block mb-1">
              <SettingOutlined className="mr-1" />
              Model Name
              <Tooltip title="Type any model name freely. Click Discover to see what's installed. Autocomplete is just a suggestion — you can always type a custom name.">
                <InfoCircleOutlined className="ml-1 text-blue-400 text-xs" />
              </Tooltip>
            </Text>
            <div className="flex gap-2">
              <Select
                value={localSettings.model || undefined}
                onChange={(v) => update('model', v)}
                onSearch={(v) => update('model', v)}
                showSearch
                allowClear
                placeholder="Type or select a model (e.g. llama3.2:3b)"
                className="flex-1"
                options={discoveredModels.map((m) => ({
                  value: m.id,
                  label: (
                    <div className="flex justify-between items-center">
                      <span className="font-mono text-sm">{m.id}</span>
                      {m.contextLength && (
                        <Tag color="blue" className="text-[10px]">
                          {(m.contextLength / 1000).toFixed(0)}K ctx
                        </Tag>
                      )}
                    </div>
                  )
                }))}
                notFoundContent={
                  discoveredModels.length === 0 ? (
                    <div className="text-xs text-gray-400 p-2 text-center">
                      Click Discover to load available models,<br />or type any model name freely
                    </div>
                  ) : null
                }
              />
              <Button
                icon={isDiscovering ? <LoadingOutlined /> : <ScanOutlined />}
                onClick={handleDiscover}
                loading={isDiscovering}
                title="Discover available models from your local server"
              >
                {isDiscovering ? 'Scanning...' : 'Discover'}
              </Button>
            </div>
            {discoveredModels.length > 0 && (
              <Text type="secondary" className="text-xs mt-1 block">
                {discoveredModels.length} model{discoveredModels.length !== 1 ? 's' : ''} found.
                You can also type any model name not in this list.
              </Text>
            )}
          </div>

          {/* Context window override */}
          <div>
            <Text strong className="block mb-1">
              Context Window Override
              <Tooltip title="Set this if your model's context window wasn't detected automatically. Leave blank for auto-detect.">
                <InfoCircleOutlined className="ml-1 text-blue-400 text-xs" />
              </Tooltip>
            </Text>
            <Input
              type="number"
              value={localSettings.contextWindowOverride ?? ''}
              onChange={(e) => update('contextWindowOverride', e.target.value ? Number(e.target.value) : undefined)}
              placeholder="Auto-detect (e.g. 8192, 32768, 131072)"
              className="font-mono text-sm"
            />
            <div className="flex flex-wrap gap-1 mt-2">
              {[4096, 8192, 16384, 32768, 65536, 131072].map((v) => (
                <button
                  key={v}
                  onClick={() => update('contextWindowOverride', v)}
                  className="text-[10px] px-2 py-0.5 bg-gray-100 hover:bg-blue-100 rounded border border-gray-200 hover:border-blue-300 cursor-pointer transition-colors"
                >
                  {v >= 1024 ? `${v / 1024}K` : v}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Cloud API key */}
      {currentProvider.requiresKey && (
        <div>
          <Text strong className="block mb-1">
            <KeyOutlined className="mr-1" />
            API Key
          </Text>
          <Input.Password
            value={localSettings.apiKey}
            onChange={(e) => update('apiKey', e.target.value)}
            placeholder="Paste your API key here..."
          />
          <Text type="secondary" className="text-xs mt-1 block">
            Stored locally in your browser. Never synced to any server.
          </Text>
        </div>
      )}

      {/* Cloud model selector (curated list) */}
      {!currentProvider.isLocal && !currentProvider.isBuiltin && (
        <div>
          <Text strong className="block mb-1">Model</Text>
          <div className="flex gap-2">
            <Select
              value={localSettings.model || undefined}
              onChange={(v) => update('model', v)}
              showSearch
              placeholder="Select a model"
              className="flex-1"
              options={discoveredModels.map((m) => ({
                value: m.id,
                label: (
                  <div className="flex justify-between items-center">
                    <span>{m.name || m.id}</span>
                    {m.contextLength && (
                      <Tag color="blue" className="text-[10px]">
                        {(m.contextLength / 1000).toFixed(0)}K ctx
                      </Tag>
                    )}
                  </div>
                )
              }))}
            />
            <Button icon={<ScanOutlined />} onClick={handleDiscover} loading={isDiscovering}>
              Refresh
            </Button>
          </div>
        </div>
      )}

      <Divider className="my-1" />

      {/* Context Strategy */}
      <div>
        <Text strong className="block mb-1">
          Context Strategy
          <Tooltip title="Controls how much tab data is sent to the AI. Auto is recommended — it adapts based on your query and model context window.">
            <InfoCircleOutlined className="ml-1 text-blue-400 text-xs" />
          </Tooltip>
        </Text>
        <Select
          value={localSettings.contextStrategy}
          onChange={(v) => update('contextStrategy', v as any)}
          className="w-full"
        >
          {CONTEXT_STRATEGIES.map((s) => (
            <Option key={s.value} value={s.value}>
              <div>
                <div className="font-medium text-sm">{s.label}</div>
                <div className="text-xs text-gray-400">{s.desc}</div>
              </div>
            </Option>
          ))}
        </Select>
      </div>

      {/* Token Budget */}
      {!currentProvider.isBuiltin && (
        <div>
          <Text strong className="block mb-1">
            Token Budget: <span className="font-mono text-blue-600">{localSettings.tokenBudget.toLocaleString()}</span>
            <Tooltip title="Maximum tokens sent to the AI per request. The context builder will compress tab data to fit within this limit.">
              <InfoCircleOutlined className="ml-1 text-blue-400 text-xs" />
            </Tooltip>
          </Text>
          <Slider
            min={2048}
            max={200000}
            step={1024}
            value={localSettings.tokenBudget}
            onChange={(v) => update('tokenBudget', v)}
            marks={{
              4096:  { label: '4K', style: { fontSize: '10px' } },
              8192:  { label: '8K', style: { fontSize: '10px' } },
              32768: { label: '32K', style: { fontSize: '10px' } },
              65536: { label: '64K', style: { fontSize: '10px' } },
              131072:{ label: '128K', style: { fontSize: '10px' } }
            }}
          />
        </div>
      )}

      {/* Streaming toggle */}
      <div className="flex items-center justify-between">
        <div>
          <Text strong className="block">Streaming Responses</Text>
          <Text type="secondary" className="text-xs">
            Show AI response token-by-token as it's generated
          </Text>
        </div>
        <Switch
          checked={localSettings.streaming}
          onChange={(v) => update('streaming', v)}
          className={localSettings.streaming ? '!bg-blue-500' : ''}
        />
      </div>

      {/* System Prompt */}
      <div>
        <Text strong className="block mb-1">
          Custom System Prompt (optional)
          <Tooltip title="Advanced: Override the default system prompt. Leave blank to use the built-in tab management prompt.">
            <InfoCircleOutlined className="ml-1 text-blue-400 text-xs" />
          </Tooltip>
        </Text>
        <Input.TextArea
          value={localSettings.systemPrompt}
          onChange={(e) => update('systemPrompt', e.target.value)}
          placeholder="Leave blank to use default. You can add context like: 'I am a developer. Prefer technical groupings.'"
          rows={3}
          className="text-sm font-mono"
        />
      </div>

      <Divider className="my-1" />

      {/* Connection test */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2">
          <Button
            icon={isTesting ? <LoadingOutlined /> : <ApiOutlined />}
            onClick={handleTest}
            loading={isTesting}
          >
            Test Connection
          </Button>
          {connectionStatus && (
            <div className="flex items-center gap-1">
              {connectionStatus.connected ? (
                <>
                  <CheckCircleOutlined className="text-green-500" />
                  <Text className="text-green-600 text-sm">Connected</Text>
                  {connectionStatus.modelCount != null && (
                    <Text type="secondary" className="text-xs">· {connectionStatus.modelCount} model{connectionStatus.modelCount !== 1 ? 's' : ''}</Text>
                  )}
                  {connectionStatus.latencyMs != null && (
                    <Text type="secondary" className="text-xs">· {connectionStatus.latencyMs}ms</Text>
                  )}
                </>
              ) : (
                <>
                  <CloseCircleOutlined className="text-red-500" />
                  <Text className="text-red-500 text-sm">{connectionStatus.error ?? 'Failed'}</Text>
                </>
              )}
            </div>
          )}
        </div>

        <Button
          type="primary"
          icon={<ThunderboltOutlined />}
          onClick={handleSave}
          disabled={!hasChanges}
        >
          Save AI Settings
        </Button>
      </div>

      {currentProvider.isBuiltin && (
        <Alert
          type="info"
          showIcon
          message="Gemini Nano Requirements"
          description={
            <ul className="text-xs list-disc ml-4 mt-1 space-y-0.5">
              <li>Chrome 127+ (Dev or Canary recommended)</li>
              <li>Enable <code className="bg-gray-100 px-1 rounded">Prompt API for Gemini Nano</code> in <code className="bg-gray-100 px-1 rounded">chrome://flags</code></li>
              <li>Set <code className="bg-gray-100 px-1 rounded">Optimization Guide On Device Model</code> to <code className="bg-gray-100 px-1 rounded">Enabled BypassPerfRequirement</code></li>
            </ul>
          }
        />
      )}
    </Space>
  )
}
