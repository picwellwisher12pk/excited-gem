/**
 * TokenBudgetHelper — Interactive UI widget for estimating tab tokens and configuring token budgets.
 *
 * Shows real-time tab counts, token estimates per context strategy, coverage status,
 * quick 1-click "Fit All Tabs" button, and task presets.
 */

import {
  AppstoreOutlined,
  BulbOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  ThunderboltOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { Button, Slider, Tag, Tooltip, Typography } from 'antd'
import { useMemo } from 'react'
import { useSelector } from 'react-redux'
import {
  WORKLOAD_PRESETS,
  calculateTabTokenEstimates,
  evaluateBudgetCapacity
} from '../../ai/context/tokenBudgetCalculator'
import type { RootState } from '../../store/store'

const { Text } = Typography

interface TokenBudgetHelperProps {
  tokenBudget: number
  onChangeBudget: (newBudget: number) => void
  modelContextLength?: number
  isHighContextModel?: boolean
}

export function TokenBudgetHelper({
  tokenBudget,
  onChangeBudget,
  modelContextLength,
  isHighContextModel = false
}: TokenBudgetHelperProps) {
  const { tabs } = useSelector((s: RootState) => s.tabs) as { tabs: any[] }

  const estimates = useMemo(() => {
    return calculateTabTokenEstimates(tabs || [])
  }, [tabs])

  const capacity = useMemo(() => {
    return evaluateBudgetCapacity(tokenBudget, estimates.tabCount)
  }, [tokenBudget, estimates.tabCount])

  // Determine max slider range based on model context or default
  const maxSliderLimit = useMemo(() => {
    if (modelContextLength && modelContextLength > 200000) {
      return Math.min(modelContextLength, 1048576)
    }
    if (isHighContextModel) {
      return 1048576
    }
    return 200000
  }, [modelContextLength, isHighContextModel])

  // Adaptive slider marks
  const sliderMarks = useMemo(() => {
    if (maxSliderLimit > 300000) {
      return {
        4096: { label: '4K', style: { fontSize: '10px' } },
        32768: { label: '32K', style: { fontSize: '10px' } },
        131072: { label: '128K', style: { fontSize: '10px' } },
        524288: { label: '512K', style: { fontSize: '10px' } },
        1048576: { label: '1M', style: { fontSize: '10px' } }
      }
    }
    return {
      4096: { label: '4K', style: { fontSize: '10px' } },
      16384: { label: '16K', style: { fontSize: '10px' } },
      32768: { label: '32K', style: { fontSize: '10px' } },
      65536: { label: '64K', style: { fontSize: '10px' } },
      131072: { label: '128K', style: { fontSize: '10px' } },
      200000: { label: '200K', style: { fontSize: '10px' } }
    }
  }, [maxSliderLimit])

  return (
    <div className="space-y-3.5 bg-gradient-to-b from-gray-50/70 to-blue-50/30 p-3.5 rounded-xl border border-gray-200/80 shadow-sm">
      {/* Header with live token budget */}
      <div className="flex items-center justify-between">
        <div>
          <Text strong className="text-sm">
            Token Budget:{' '}
            <span className="font-mono text-blue-600 font-bold">
              {tokenBudget.toLocaleString()}
            </span>
          </Text>
          <Tooltip title="Maximum total tokens (tab context + model response) allocated per AI request. Tab context is automatically compressed to fit within ~70% of this budget.">
            <InfoCircleOutlined className="ml-1 text-blue-400 text-xs cursor-pointer" />
          </Tooltip>
        </div>

        {/* 1-Click Auto Fit button */}
        <Button
          type="dashed"
          size="small"
          icon={<ThunderboltOutlined className="text-amber-500" />}
          onClick={() => onChangeBudget(estimates.recommendedBudget)}
          className="text-xs !h-6 !px-2 font-medium !border-amber-300 hover:!border-amber-500 !bg-amber-50/60 hover:!bg-amber-100 text-amber-800"
          title={`Click to set budget to ${estimates.recommendedBudget.toLocaleString()} tokens, perfectly fitted for your ${estimates.tabCount} tabs`}
        >
          Auto-Fit My Tabs (~{(estimates.recommendedBudget / 1000).toFixed(0)}K)
        </Button>
      </div>

      {/* Slider */}
      <div className="px-1">
        <Slider
          min={2048}
          max={maxSliderLimit}
          step={maxSliderLimit > 300000 ? 4096 : 1024}
          value={tokenBudget}
          onChange={onChangeBudget}
          marks={sliderMarks}
        />
      </div>

      {/* Active Tab Session Context & Token Breakdown */}
      <div className="bg-white/90 rounded-lg p-2.5 border border-gray-100 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-gray-700">
            <AppstoreOutlined className="text-blue-500" />
            <span>
              Current Session:{' '}
              <strong className="text-gray-900">
                {estimates.tabCount} tabs
              </strong>{' '}
              across {estimates.windowCount} window
              {estimates.windowCount !== 1 ? 's' : ''}
            </span>
          </div>
          <Tag
            color={
              capacity.status === 'optimal' || capacity.status === 'adequate'
                ? 'green'
                : capacity.status === 'tight'
                  ? 'orange'
                  : 'red'
            }
            className="text-[10px] font-semibold m-0"
          >
            {capacity.coveragePercent}% Tab Coverage
          </Tag>
        </div>

        {/* Strategy Token Cost Breakdown Pills */}
        <div className="grid grid-cols-3 gap-1.5 pt-0.5">
          <div className="bg-blue-50/60 rounded p-1.5 text-center border border-blue-100/60">
            <div className="text-[10px] text-gray-500 font-medium">
              ⚡ Compressed
            </div>
            <div className="text-xs font-mono font-bold text-blue-700">
              ~{estimates.compressedTokens.toLocaleString()} tok
            </div>
          </div>
          <div className="bg-purple-50/60 rounded p-1.5 text-center border border-purple-100/60">
            <div className="text-[10px] text-gray-500 font-medium">
              📦 Full Detail
            </div>
            <div className="text-xs font-mono font-bold text-purple-700">
              ~{estimates.fullTokens.toLocaleString()} tok
            </div>
          </div>
          <div className="bg-emerald-50/60 rounded p-1.5 text-center border border-emerald-100/60">
            <div className="text-[10px] text-gray-500 font-medium">
              🪟 Current Win
            </div>
            <div className="text-xs font-mono font-bold text-emerald-700">
              ~{estimates.windowedTokens.toLocaleString()} tok
            </div>
          </div>
        </div>

        {/* Capacity status explanation */}
        <div className="flex items-start gap-1.5 text-[11px] text-gray-600 pt-1">
          {capacity.status === 'optimal' || capacity.status === 'adequate' ? (
            <CheckCircleOutlined className="text-emerald-500 mt-0.5 flex-shrink-0" />
          ) : (
            <WarningOutlined className="text-amber-500 mt-0.5 flex-shrink-0" />
          )}
          <span>
            {capacity.statusMessage} · Holds up to{' '}
            <strong className="text-gray-800">
              ~{capacity.maxCompressedTabs} tabs
            </strong>{' '}
            in compressed mode or{' '}
            <strong className="text-gray-800">
              ~{capacity.maxFullTabs} tabs
            </strong>{' '}
            in full detail mode.
          </span>
        </div>

        {/* Budget Allocation bar */}
        <div className="pt-1">
          <div className="flex justify-between text-[10px] text-gray-400 mb-0.5">
            <span>
              Context: ~{capacity.availableInputTokens.toLocaleString()} tokens
              (70%)
            </span>
            <span>
              Response reserve: ~
              {capacity.responseReserveTokens.toLocaleString()} tokens (30%)
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-1.5 flex overflow-hidden">
            <div
              className="bg-blue-500 h-full rounded-l-full"
              style={{ width: '70%' }}
              title="70% allocated for tab context input"
            />
            <div
              className="bg-indigo-300 h-full rounded-r-full"
              style={{ width: '30%' }}
              title="30% reserved for AI generated response"
            />
          </div>
        </div>
      </div>

      {/* Task & Workload Presets */}
      <div>
        <div className="flex items-center gap-1 mb-1.5">
          <BulbOutlined className="text-amber-500 text-xs" />
          <Text type="secondary" className="text-[11px] font-medium">
            Task & Workload Presets
          </Text>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {WORKLOAD_PRESETS.map((preset) => {
            if (preset.tokens > maxSliderLimit) return null
            const isSelected =
              Math.abs(tokenBudget - preset.tokens) < preset.tokens * 0.05
            return (
              <button
                key={preset.id}
                type="button"
                onClick={() => onChangeBudget(preset.tokens)}
                className={`
                  text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer text-left
                  ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-600 shadow-sm font-medium'
                      : 'bg-white hover:bg-blue-50 text-gray-700 border-gray-200 hover:border-blue-300'
                  }
                `}
                title={preset.desc}
              >
                <span>{preset.label}</span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
