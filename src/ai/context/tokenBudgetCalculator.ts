/**
 * tokenBudgetCalculator — Smart token estimations & budget recommendations for tabs.
 *
 * Helps users configure their token budget appropriately based on their active tabs
 * and intended workloads (search, grouping, deep analysis).
 */

export interface TabTokenEstimate {
  tabCount: number
  windowCount: number
  compressedTokens: number
  fullTokens: number
  windowedTokens: number
  summaryTokens: number
  recommendedBudget: number
}

export interface BudgetCapacity {
  tokenBudget: number
  availableInputTokens: number
  responseReserveTokens: number
  maxCompressedTabs: number
  maxFullTabs: number
  coveragePercent: number
  status: 'optimal' | 'adequate' | 'tight' | 'insufficient'
  statusMessage: string
}

export interface WorkloadPreset {
  id: string
  label: string
  tokens: number
  desc: string
  icon?: string
}

// Token estimation constants (~4 characters per token average)
const CHARS_PER_TOKEN = 4
const COMPRESSED_TAB_CHARS = 75 // ID, Title, truncated URL, flags
const FULL_TAB_CHARS = 220 // JSON format with full metadata
const CONTEXT_OVERHEAD_TOKENS = 60 // System header & instructions overhead
const INPUT_BUDGET_RATIO = 0.7 // 70% input context, 30% response reservation

/**
 * Calculates estimated tokens for a list of tabs across different context strategies.
 */
export function calculateTabTokenEstimates(
  tabs: Array<{
    id?: number
    title?: string
    url?: string
    windowId?: number
    pinned?: boolean
    audible?: boolean
    discarded?: boolean
  }>,
  currentWindowId?: number
): TabTokenEstimate {
  const tabCount = tabs.length
  const windowIds = new Set(tabs.map((t) => t.windowId).filter(Boolean))
  const windowCount = Math.max(1, windowIds.size)

  const currentWindowTabs = currentWindowId
    ? tabs.filter((t) => t.windowId === currentWindowId)
    : tabs.slice(0, Math.min(tabCount, 50))

  const compressedTokens = Math.ceil(
    CONTEXT_OVERHEAD_TOKENS +
      (tabCount * COMPRESSED_TAB_CHARS) / CHARS_PER_TOKEN
  )
  const fullTokens = Math.ceil(
    CONTEXT_OVERHEAD_TOKENS + (tabCount * FULL_TAB_CHARS) / CHARS_PER_TOKEN
  )
  const windowedTokens = Math.ceil(
    CONTEXT_OVERHEAD_TOKENS +
      (currentWindowTabs.length * COMPRESSED_TAB_CHARS) / CHARS_PER_TOKEN
  )
  const summaryTokens = Math.min(
    2500,
    Math.ceil(400 + windowCount * 80 + Math.min(tabCount, 60) * 20)
  )

  // Recommended budget: comfortably fits all tabs in compressed mode with 40% headroom and 30% response reserve
  // total = inputNeeded / 0.7
  const neededInput = compressedTokens * 1.35
  const rawRecommended = neededInput / INPUT_BUDGET_RATIO

  // Round up to nearest standard power/bracket (e.g. 4K, 8K, 16K, 32K, 64K, 128K...)
  let recommendedBudget = 8192
  const brackets = [
    4096, 8192, 16384, 24576, 32768, 49152, 65536, 98304, 131072, 262144, 524288
  ]
  for (const b of brackets) {
    if (b >= rawRecommended) {
      recommendedBudget = b
      break
    }
    recommendedBudget = b
  }

  return {
    tabCount,
    windowCount,
    compressedTokens,
    fullTokens,
    windowedTokens,
    summaryTokens,
    recommendedBudget
  }
}

/**
 * Analyzes how well a given tokenBudget can accommodate the current tab collection.
 */
export function evaluateBudgetCapacity(
  tokenBudget: number,
  tabCount: number
): BudgetCapacity {
  const availableInputTokens = Math.max(
    500,
    Math.floor(tokenBudget * INPUT_BUDGET_RATIO)
  )
  const responseReserveTokens = tokenBudget - availableInputTokens

  const usableForTabs = Math.max(
    0,
    availableInputTokens - CONTEXT_OVERHEAD_TOKENS
  )
  const maxCompressedTabs = Math.floor(
    usableForTabs / (COMPRESSED_TAB_CHARS / CHARS_PER_TOKEN)
  )
  const maxFullTabs = Math.floor(
    usableForTabs / (FULL_TAB_CHARS / CHARS_PER_TOKEN)
  )

  const coverageRatio = tabCount > 0 ? maxCompressedTabs / tabCount : 1
  const coveragePercent = Math.min(100, Math.round(coverageRatio * 100))

  let status: BudgetCapacity['status'] = 'optimal'
  let statusMessage = ''

  if (coverageRatio >= 1.5) {
    status = 'optimal'
    statusMessage = `Covers all ${tabCount} tabs easily with plenty of buffer (${coverageRatio.toFixed(1)}x headroom)`
  } else if (coverageRatio >= 1.0) {
    status = 'adequate'
    statusMessage = `Comfortably fits all ${tabCount} current tabs`
  } else if (coverageRatio >= 0.6) {
    status = 'tight'
    statusMessage = `Fits ~${maxCompressedTabs} of ${tabCount} tabs (${coveragePercent}%). Older/less relevant tabs may be summarized.`
  } else {
    status = 'insufficient'
    statusMessage = `Fits only ~${maxCompressedTabs} of ${tabCount} tabs (${coveragePercent}%). Increase budget for complete tab analysis.`
  }

  return {
    tokenBudget,
    availableInputTokens,
    responseReserveTokens,
    maxCompressedTabs,
    maxFullTabs,
    coveragePercent,
    status,
    statusMessage
  }
}

/**
 * Standard recommended presets for various user tasks and session sizes.
 */
export const WORKLOAD_PRESETS: WorkloadPreset[] = [
  {
    id: 'quick',
    label: '⚡ Quick / 50 Tabs',
    tokens: 8192,
    desc: 'Great for simple queries, searching active tabs, or fast responses'
  },
  {
    id: 'normal',
    label: '💻 Standard / 200 Tabs',
    tokens: 32768,
    desc: 'Ideal for tab reorganization, grouping, and multi-window management'
  },
  {
    id: 'heavy',
    label: '🚀 Heavy / 500 Tabs',
    tokens: 65536,
    desc: 'For large browser sessions with hundreds of tabs across many windows'
  },
  {
    id: 'mega',
    label: '🌌 Power User / 1,000+ Tabs',
    tokens: 131072,
    desc: 'Comprehensive deep analysis and deduplication across massive sessions'
  },
  {
    id: 'gemini-max',
    label: '🪐 Ultra / Max Context',
    tokens: 524288,
    desc: 'Unleashes Gemini 1M–2M context window for unlimited full-history processing'
  }
]
