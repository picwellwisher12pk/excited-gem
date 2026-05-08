/**
 * TabContextBuilder — Smart context compression for AI queries.
 *
 * Given a user query and all open tabs, produces the smallest useful context
 * that fits within the model's token budget. Strategies:
 *
 *  AUTO      → picks the best strategy based on query analysis + token budget
 *  FULL      → all tab data (all fields) — needs 64K+ model
 *  COMPRESSED → title + URL + domain only — fits ~42K tokens for 600 tabs
 *  WINDOWED  → current window only — fits any model
 *  SEMANTIC  → keyword-filtered subset — fits small models
 *  SUMMARY   → domain aggregation only — 2–5K tokens, any model
 */

export interface TabData {
  id?: number
  title?: string
  url?: string
  windowId?: number
  pinned?: boolean
  active?: boolean
  audible?: boolean
  muted?: boolean
  discarded?: boolean
  groupId?: number
  index?: number
}

export type ContextStrategy = 'auto' | 'full' | 'compressed' | 'windowed' | 'semantic' | 'summary'

export interface BuildContextOptions {
  strategy: ContextStrategy
  tokenBudget: number
  query?: string
  currentWindowId?: number
}

export interface BuiltContext {
  text: string
  tabCount: number
  estimatedTokens: number
  strategyUsed: ContextStrategy
}

// ~4 chars per token estimate
const CHARS_PER_TOKEN = 4

function estimateTokens(text: string): number {
  return Math.ceil(text.length / CHARS_PER_TOKEN)
}

/** Extract keywords from the user's query for semantic filtering */
function extractKeywords(query: string): string[] {
  const stopWords = new Set(['a', 'an', 'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'all', 'my', 'me', 'i', 'is', 'are', 'can', 'you'])
  return query
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !stopWords.has(w))
}

/** Score a tab's relevance to a query */
function scoreTabRelevance(tab: TabData, keywords: string[]): number {
  const text = `${tab.title ?? ''} ${tab.url ?? ''}`.toLowerCase()
  return keywords.reduce((score, kw) => score + (text.includes(kw) ? 1 : 0), 0)
}

/** Extract domain from URL */
function getDomain(url?: string): string {
  if (!url) return 'unknown'
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return 'unknown'
  }
}

export class TabContextBuilder {
  private tabs: TabData[]

  constructor(tabs: TabData[]) {
    this.tabs = tabs
  }

  build(options: BuildContextOptions): BuiltContext {
    const { strategy, tokenBudget, query, currentWindowId } = options
    const effectiveStrategy = strategy === 'auto'
      ? this.autoSelectStrategy(query ?? '', tokenBudget, currentWindowId)
      : strategy

    switch (effectiveStrategy) {
      case 'full':      return this.buildFull(tokenBudget, effectiveStrategy)
      case 'compressed': return this.buildCompressed(tokenBudget, effectiveStrategy)
      case 'windowed':  return this.buildWindowed(tokenBudget, currentWindowId, effectiveStrategy)
      case 'semantic':  return this.buildSemantic(tokenBudget, query ?? '', effectiveStrategy)
      case 'summary':   return this.buildSummary(effectiveStrategy)
      default:          return this.buildCompressed(tokenBudget, effectiveStrategy)
    }
  }

  private autoSelectStrategy(query: string, tokenBudget: number, currentWindowId?: number): ContextStrategy {
    const lq = query.toLowerCase()

    // Windowed queries
    if (/this window|current window/.test(lq)) return 'windowed'

    // Domain-level aggregation queries
    if (/how many|count|most|domain|site|total/.test(lq) && !/specific|tab|close|move/.test(lq)) {
      return 'summary'
    }

    // Keyword-targeted queries — use semantic if budget is small
    const keywords = extractKeywords(query)
    if (keywords.length > 0 && tokenBudget < 32000) {
      const semanticTabs = this.filterSemantic(keywords)
      const semanticTokens = estimateTokens(this.tabsToCompressed(semanticTabs))
      if (semanticTokens <= tokenBudget) return 'semantic'
    }

    // Budget-based fallback
    const fullTokens = estimateTokens(this.tabsToFull(this.tabs))
    if (fullTokens <= tokenBudget) return 'full'

    const compressedTokens = estimateTokens(this.tabsToCompressed(this.tabs))
    if (compressedTokens <= tokenBudget) return 'compressed'

    return 'summary'
  }

  private buildFull(tokenBudget: number, strategy: ContextStrategy): BuiltContext {
    let tabs = this.tabs
    const text = this.tabsToFull(tabs)
    if (estimateTokens(text) > tokenBudget) {
      // Truncate to fit budget
      return this.buildCompressed(tokenBudget, strategy)
    }
    return { text, tabCount: tabs.length, estimatedTokens: estimateTokens(text), strategyUsed: strategy }
  }

  private buildCompressed(tokenBudget: number, strategy: ContextStrategy): BuiltContext {
    const lines: string[] = []
    let tokens = 0
    const header = `You have access to ${this.tabs.length} browser tabs.\n\n`
    tokens += estimateTokens(header)

    for (const tab of this.tabs) {
      const line = `[${tab.id}] "${tab.title ?? 'Untitled'}" — ${tab.url ?? 'no url'} (window:${tab.windowId}${tab.pinned ? ',pinned' : ''}${tab.audible ? ',🔊' : ''}${tab.discarded ? ',discarded' : ''})\n`
      const lineTokens = estimateTokens(line)
      if (tokens + lineTokens > tokenBudget) break
      lines.push(line)
      tokens += lineTokens
    }

    const text = header + lines.join('')
    return {
      text,
      tabCount: lines.length,
      estimatedTokens: tokens,
      strategyUsed: strategy
    }
  }

  private buildWindowed(tokenBudget: number, windowId: number | undefined, strategy: ContextStrategy): BuiltContext {
    const windowTabs = windowId
      ? this.tabs.filter((t) => t.windowId === windowId)
      : this.tabs.slice(0, 50)
    const text = `Current window tabs (${windowTabs.length} total):\n\n` + this.tabsToCompressed(windowTabs)
    return {
      text,
      tabCount: windowTabs.length,
      estimatedTokens: estimateTokens(text),
      strategyUsed: strategy
    }
  }

  private buildSemantic(tokenBudget: number, query: string, strategy: ContextStrategy): BuiltContext {
    const keywords = extractKeywords(query)
    const filtered = this.filterSemantic(keywords)
    const relevant = filtered.slice(0, 200) // cap at 200 even if budget allows more

    const header = `Found ${filtered.length} tabs related to your query (showing top ${relevant.length}):\n\n`
    const body = this.tabsToCompressed(relevant)
    const text = header + body

    return {
      text,
      tabCount: relevant.length,
      estimatedTokens: estimateTokens(text),
      strategyUsed: strategy
    }
  }

  private buildSummary(strategy: ContextStrategy): BuiltContext {
    const domainCounts: Record<string, number> = {}
    const windowCounts: Record<number, number> = {}
    let pinned = 0, audible = 0, discarded = 0

    for (const tab of this.tabs) {
      const domain = getDomain(tab.url)
      domainCounts[domain] = (domainCounts[domain] ?? 0) + 1
      if (tab.windowId) windowCounts[tab.windowId] = (windowCounts[tab.windowId] ?? 0) + 1
      if (tab.pinned) pinned++
      if (tab.audible) audible++
      if (tab.discarded) discarded++
    }

    const topDomains = Object.entries(domainCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 30)
      .map(([domain, count]) => `  ${domain}: ${count} tab${count > 1 ? 's' : ''}`)
      .join('\n')

    const windowSummary = Object.entries(windowCounts)
      .map(([wid, count]) => `  Window ${wid}: ${count} tabs`)
      .join('\n')

    const text = [
      `BROWSER TAB SUMMARY`,
      `Total tabs: ${this.tabs.length}`,
      `Windows: ${Object.keys(windowCounts).length}`,
      `Pinned: ${pinned} | Playing audio: ${audible} | Discarded: ${discarded}`,
      ``,
      `Top domains:`,
      topDomains,
      ``,
      `By window:`,
      windowSummary
    ].join('\n')

    return {
      text,
      tabCount: this.tabs.length,
      estimatedTokens: estimateTokens(text),
      strategyUsed: strategy
    }
  }

  private filterSemantic(keywords: string[]): TabData[] {
    if (!keywords.length) return this.tabs
    return this.tabs
      .map((tab) => ({ tab, score: scoreTabRelevance(tab, keywords) }))
      .filter(({ score }) => score > 0)
      .sort((a, b) => b.score - a.score)
      .map(({ tab }) => tab)
  }

  private tabsToFull(tabs: TabData[]): string {
    return tabs.map((t) => JSON.stringify({
      id: t.id,
      title: t.title,
      url: t.url,
      windowId: t.windowId,
      pinned: t.pinned,
      active: t.active,
      audible: t.audible,
      muted: t.muted,
      discarded: t.discarded,
      groupId: t.groupId,
      index: t.index
    })).join('\n')
  }

  private tabsToCompressed(tabs: TabData[]): string {
    return tabs.map((t) =>
      `[${t.id}] "${t.title ?? 'Untitled'}" — ${t.url ?? ''}${t.pinned ? ' [pinned]' : ''}${t.audible ? ' [🔊]' : ''}${t.discarded ? ' [disc]' : ''}`
    ).join('\n')
  }
}
