/// <reference types="chrome"/>
import type {
  Routine,
  RoutineStep,
  RoutineExecutionResult,
  StepExecutionResult,
  RoutineScope
} from '../types/routine'
import { updateRoutineLastRun } from './routineStorage'
import { saveSession, saveList } from '../components/getsetSessions'

const browser =
  typeof window !== 'undefined'
    ? (window as any).browser || window.chrome
    : (globalThis as any).chrome

export interface ExecutionContext {
  targetScope?: RoutineScope
  selectedTabIds?: number[]
  workingTabIds?: number[]
  windowId?: number
  onStepProgress?: (
    stepResult: StepExecutionResult,
    current: number,
    total: number
  ) => void
}

export async function executeRoutine(
  routine: Routine,
  context: ExecutionContext = {}
): Promise<RoutineExecutionResult> {
  const startTime = Date.now()
  const stepResults: StepExecutionResult[] = []

  const summary = {
    closedTabs: 0,
    groupedTabs: 0,
    mutedTabs: 0,
    discardedTabs: 0,
    pinnedTabs: 0,
    savedSessions: 0,
    openedTabs: 0
  }

  const scope = context.targetScope || routine.targetScope || 'active-window'
  const enabledSteps = routine.steps.filter((s) => s.enabled)

  let overallSuccess = true
  let overallError: string | undefined

  for (let i = 0; i < enabledSteps.length; i++) {
    const step = enabledSteps[i]
    const stepStart = Date.now()
    try {
      const result = await executeStep(step, scope, context)
      const stepDuration = Date.now() - stepStart

      const stepExecutionResult: StepExecutionResult = {
        stepId: step.id,
        stepName: step.name,
        stepType: step.type,
        success: result.success,
        message: result.message,
        affectedCount: result.affectedCount,
        error: result.error,
        durationMs: stepDuration
      }

      stepResults.push(stepExecutionResult)

      // Aggregate summary
      if (step.type === 'close-duplicates' || step.type === 'close-tabs') {
        summary.closedTabs += result.affectedCount || 0
      } else if (
        step.type === 'group-by-domain' ||
        step.type === 'group-by-rule'
      ) {
        summary.groupedTabs += result.affectedCount || 0
      } else if (step.type === 'mute-tabs') {
        summary.mutedTabs += result.affectedCount || 0
      } else if (step.type === 'discard-tabs') {
        summary.discardedTabs += result.affectedCount || 0
      } else if (step.type === 'pin-tabs') {
        summary.pinnedTabs += result.affectedCount || 0
      } else if (step.type === 'save-session') {
        summary.savedSessions += result.affectedCount || 1
      } else if (
        step.type === 'open-urls' ||
        step.type === 'open-session' ||
        step.type === 'open-list'
      ) {
        summary.openedTabs += result.affectedCount || 0
      }

      // Notify progress callback if present
      if (context.onStepProgress) {
        context.onStepProgress(stepExecutionResult, i + 1, enabledSteps.length)
      }

      if (!result.success && !result.tolerated) {
        overallSuccess = false
        overallError = result.error || result.message
        break
      }
    } catch (err: any) {
      const stepDuration = Date.now() - stepStart
      const failedResult: StepExecutionResult = {
        stepId: step.id,
        stepName: step.name,
        stepType: step.type,
        success: false,
        message: err.message || 'Unknown step execution error',
        error: err.message || 'Unknown step execution error',
        durationMs: stepDuration
      }
      stepResults.push(failedResult)
      overallSuccess = false
      overallError = err.message
      break
    }
  }

  const endTime = Date.now()
  const durationMs = endTime - startTime

  const summaryParts: string[] = []
  if (summary.closedTabs > 0)
    summaryParts.push(`Closed ${summary.closedTabs} tabs`)
  if (summary.groupedTabs > 0)
    summaryParts.push(`Grouped ${summary.groupedTabs} tabs`)
  if (summary.discardedTabs > 0)
    summaryParts.push(`Suspended ${summary.discardedTabs} tabs`)
  if (summary.mutedTabs > 0)
    summaryParts.push(`Muted ${summary.mutedTabs} tabs`)
  if (summary.pinnedTabs > 0)
    summaryParts.push(`Pinned ${summary.pinnedTabs} tabs`)
  if (summary.savedSessions > 0)
    summaryParts.push(`Saved ${summary.savedSessions} sessions`)
  if (summary.openedTabs > 0)
    summaryParts.push(`Opened ${summary.openedTabs} tabs`)

  const finalSummaryText =
    summaryParts.length > 0
      ? summaryParts.join(', ')
      : 'Routine completed with no changes.'

  // Update routine last run in storage
  await updateRoutineLastRun(routine.id, overallSuccess, finalSummaryText)

  return {
    routineId: routine.id,
    routineName: routine.name,
    success: overallSuccess,
    startTime,
    endTime,
    durationMs,
    stepResults,
    summary,
    error: overallError
  }
}

async function getTargetTabs(
  scope: RoutineScope,
  context: ExecutionContext
): Promise<chrome.tabs.Tab[]> {
  // If workingTabIds is set from a preceding 'filter-tabs' step, respect that working set
  if (context.workingTabIds !== undefined) {
    if (context.workingTabIds.length === 0) return []
    const allTabs = await browser.tabs.query({})
    const idSet = new Set(context.workingTabIds)
    return allTabs.filter((t: any) => t.id && idSet.has(t.id))
  }

  if (
    scope === 'selected-tabs' &&
    context.selectedTabIds &&
    context.selectedTabIds.length > 0
  ) {
    const allTabs = await browser.tabs.query({})
    const idSet = new Set(context.selectedTabIds)
    return allTabs.filter((t: any) => t.id && idSet.has(t.id))
  }

  if (scope === 'active-window') {
    if (context.windowId) {
      return browser.tabs.query({ windowId: context.windowId })
    }
    const currentWin = await browser.windows.getCurrent()
    return browser.tabs.query({ windowId: currentWin.id })
  }

  // 'all-windows' or fallback
  return browser.tabs.query({})
}

async function executeStep(
  step: RoutineStep,
  scope: RoutineScope,
  context: ExecutionContext
): Promise<{
  success: boolean
  message: string
  affectedCount?: number
  error?: string
  tolerated?: boolean
}> {
  const params = step.params || {}

  switch (step.type) {
    case 'filter-tabs': {
      const pattern = (params.filterPattern || '').trim()
      const field = params.filterField || 'url'
      const isRegex = !!params.isRegex
      const invert = !!params.invertMatch

      // Query from full scope (temporarily clear workingTabIds to filter afresh from the scope)
      const baseTabs = await getTargetTabs(scope, {
        ...context,
        workingTabIds: undefined
      })

      let regex: RegExp | null = null
      if (isRegex && pattern) {
        try {
          regex = new RegExp(pattern, 'i')
        } catch {
          return {
            success: false,
            message: 'Invalid regex in filter-tabs step.'
          }
        }
      }

      const matchedTabs = baseTabs.filter((tab) => {
        if (!tab.id) return false
        if (!pattern) return true

        let val = ''
        if (field === 'url') val = tab.url || ''
        else if (field === 'title') val = tab.title || ''
        else if (field === 'domain') {
          try {
            val = new URL(tab.url || '').hostname
          } catch {
            val = ''
          }
        }

        let isMatch = false
        if (regex) {
          isMatch = regex.test(val)
        } else {
          isMatch = val.toLowerCase().includes(pattern.toLowerCase())
        }

        return invert ? !isMatch : isMatch
      })

      const matchedIds = matchedTabs.map((t) => t.id!).filter(Boolean)
      context.workingTabIds = matchedIds

      return {
        success: true,
        message: pattern
          ? `Found ${matchedIds.length} tabs matching "${pattern}". Next steps will run on these tabs.`
          : `Targeting ${matchedIds.length} tabs for upcoming steps.`,
        affectedCount: matchedIds.length
      }
    }

    case 'reset-filter': {
      context.workingTabIds = undefined
      return {
        success: true,
        message:
          'Reset tab filter. Upcoming steps will target the full window scope.'
      }
    }

    case 'close-duplicates': {
      const tabs = await getTargetTabs(
        params.acrossAllWindows ? 'all-windows' : scope,
        context
      )
      const urlMap = new Map<string, chrome.tabs.Tab[]>()

      for (const tab of tabs) {
        if (
          !tab.url ||
          tab.url.startsWith('chrome://') ||
          tab.url.startsWith('edge://')
        )
          continue
        const normUrl = tab.url.split('#')[0] // normalize hash
        if (!urlMap.has(normUrl)) {
          urlMap.set(normUrl, [])
        }
        urlMap.get(normUrl)!.push(tab)
      }

      const tabsToClose: number[] = []
      for (const [_, duplicateGroup] of urlMap.entries()) {
        if (duplicateGroup.length <= 1) continue

        let keptTab = duplicateGroup[0]
        if (params.preferPinned) {
          const pinnedTab = duplicateGroup.find((t) => t.pinned)
          if (pinnedTab) keptTab = pinnedTab
        }

        for (const tab of duplicateGroup) {
          if (tab.id && tab.id !== keptTab.id) {
            tabsToClose.push(tab.id)
          }
        }
      }

      if (tabsToClose.length > 0) {
        await browser.tabs.remove(tabsToClose)
        return {
          success: true,
          message: `Closed ${tabsToClose.length} duplicate tabs.`,
          affectedCount: tabsToClose.length
        }
      }
      return {
        success: true,
        message: 'No duplicate tabs found.',
        affectedCount: 0
      }
    }

    case 'group-by-domain': {
      if (!browser.tabs?.group) {
        return {
          success: false,
          message: 'Tab grouping API not available in this browser.',
          tolerated: true
        }
      }

      const tabs = await getTargetTabs(scope, context)
      const minTabs = params.minTabsPerGroup || 2
      const windowsGroup: Record<number, Record<string, number[]>> = {}

      for (const tab of tabs) {
        if (!tab.url || !tab.id) continue
        try {
          const urlObj = new URL(tab.url)
          const domain = urlObj.hostname.replace(/^www\./, '')
          if (
            !domain ||
            domain.startsWith('chrome') ||
            domain.startsWith('edge')
          )
            continue

          const winId = tab.windowId || 0
          if (!windowsGroup[winId]) windowsGroup[winId] = {}
          if (!windowsGroup[winId][domain]) windowsGroup[winId][domain] = []
          windowsGroup[winId][domain].push(tab.id)
        } catch {
          // ignore invalid URLs
        }
      }

      const colors: Array<
        | 'blue'
        | 'red'
        | 'yellow'
        | 'green'
        | 'pink'
        | 'purple'
        | 'cyan'
        | 'orange'
      > = ['blue', 'green', 'purple', 'orange', 'cyan', 'pink', 'yellow', 'red']
      let colorIdx = 0
      let totalGrouped = 0

      for (const winId of Object.keys(windowsGroup)) {
        const domainMap = windowsGroup[Number(winId)]
        for (const [domain, tabIds] of Object.entries(domainMap)) {
          if (tabIds.length >= minTabs) {
            try {
              const groupId = await browser.tabs.group({ tabIds })
              if (groupId && browser.tabGroups?.update) {
                await browser.tabGroups.update(groupId, {
                  title: domain,
                  color: params.groupColor || colors[colorIdx % colors.length]
                })
                colorIdx++
                totalGrouped += tabIds.length
              }
            } catch (err) {
              console.warn('Grouping error for domain', domain, err)
            }
          }
        }
      }

      return {
        success: true,
        message:
          totalGrouped > 0
            ? `Grouped ${totalGrouped} tabs by domain.`
            : 'No matching domain groups found.',
        affectedCount: totalGrouped
      }
    }

    case 'group-by-rule': {
      if (!browser.tabs?.group) {
        return {
          success: false,
          message: 'Tab grouping API not available.',
          tolerated: true
        }
      }

      const tabs = await getTargetTabs(scope, context)
      const pattern = params.rulePattern || ''
      const field = params.ruleField || 'url'
      const title = params.groupTitle || 'Group'
      const isRegex = !!params.isRegex

      let regex: RegExp | null = null
      if (isRegex) {
        try {
          regex = new RegExp(pattern, 'i')
        } catch {
          return { success: false, message: 'Invalid regex pattern provided.' }
        }
      }

      const matchedTabIds: number[] = []
      for (const tab of tabs) {
        if (!tab.id) continue
        let val = ''
        if (field === 'url') val = tab.url || ''
        else if (field === 'title') val = tab.title || ''
        else if (field === 'domain') {
          try {
            val = new URL(tab.url || '').hostname
          } catch {
            val = ''
          }
        }

        const isMatch = regex
          ? regex.test(val)
          : val.toLowerCase().includes(pattern.toLowerCase())
        if (isMatch) matchedTabIds.push(tab.id)
      }

      if (matchedTabIds.length > 0) {
        const groupId = await browser.tabs.group({ tabIds: matchedTabIds })
        if (groupId && browser.tabGroups?.update) {
          await browser.tabGroups.update(groupId, {
            title,
            color: (params.groupColor as any) || 'blue'
          })
        }
        return {
          success: true,
          message: `Grouped ${matchedTabIds.length} tabs into "${title}".`,
          affectedCount: matchedTabIds.length
        }
      }

      return {
        success: true,
        message: `No tabs matched pattern "${pattern}".`,
        affectedCount: 0
      }
    }

    case 'sort-tabs': {
      const tabs = await getTargetTabs(scope, context)
      const sortBy = params.sortBy || 'domain'
      const dir = params.sortDirection === 'desc' ? -1 : 1

      // Group tabs by windowId
      const winMap: Record<number, chrome.tabs.Tab[]> = {}
      for (const t of tabs) {
        const wId = t.windowId || 0
        if (!winMap[wId]) winMap[wId] = []
        winMap[wId].push(t)
      }

      let totalMoved = 0
      for (const winId of Object.keys(winMap)) {
        const windowTabs = winMap[Number(winId)]
        const sorted = [...windowTabs].sort((a, b) => {
          // Pinned tabs always first
          if (a.pinned !== b.pinned) return a.pinned ? -1 : 1

          if (sortBy === 'audible-first') {
            if (a.audible !== b.audible) return a.audible ? -1 : 1
          }

          let valA = ''
          let valB = ''

          if (sortBy === 'domain') {
            try {
              valA = new URL(a.url || '').hostname.replace(/^www\./, '')
            } catch {
              valA = a.url || ''
            }
            try {
              valB = new URL(b.url || '').hostname.replace(/^www\./, '')
            } catch {
              valB = b.url || ''
            }
          } else if (sortBy === 'title') {
            valA = (a.title || '').toLowerCase()
            valB = (b.title || '').toLowerCase()
          } else {
            valA = (a.url || '').toLowerCase()
            valB = (b.url || '').toLowerCase()
          }

          return valA.localeCompare(valB) * dir
        })

        for (let idx = 0; idx < sorted.length; idx++) {
          const tab = sorted[idx]
          if (tab.id && tab.index !== idx) {
            try {
              await browser.tabs.move(tab.id, { index: idx })
              totalMoved++
            } catch (err) {
              console.warn('Sort move error:', err)
            }
          }
        }
      }

      return {
        success: true,
        message: `Sorted tabs by ${sortBy}.`,
        affectedCount: totalMoved
      }
    }

    case 'discard-tabs': {
      if (!browser.tabs?.discard) {
        return {
          success: false,
          message: 'Tab discard API is not supported.',
          tolerated: true
        }
      }

      const tabs = await getTargetTabs(scope, context)
      const discardScope = params.discardScope || 'all-background'
      let discardedCount = 0

      for (const tab of tabs) {
        if (!tab.id || tab.active || tab.discarded) continue

        let shouldDiscard = false
        if (discardScope === 'all-background') {
          shouldDiscard = true
        }

        if (shouldDiscard) {
          try {
            await browser.tabs.discard(tab.id)
            discardedCount++
          } catch (err) {
            console.warn('Discard failed for tab', tab.id, err)
          }
        }
      }

      return {
        success: true,
        message: `Suspended ${discardedCount} background tabs to free RAM.`,
        affectedCount: discardedCount
      }
    }

    case 'mute-tabs': {
      const tabs = await getTargetTabs(scope, context)
      const muteScope = params.muteScope || 'all-except-active'
      let count = 0

      for (const tab of tabs) {
        if (!tab.id) continue
        let shouldMute = false

        if (muteScope === 'all') shouldMute = true
        else if (muteScope === 'all-except-active') shouldMute = !tab.active
        else if (muteScope === 'audible-only') shouldMute = !!tab.audible

        if (shouldMute && !tab.mutedInfo?.muted) {
          try {
            await browser.tabs.update(tab.id, { muted: true })
            count++
          } catch (err) {
            console.warn('Mute failed for tab', tab.id, err)
          }
        }
      }

      return {
        success: true,
        message: `Muted ${count} tabs.`,
        affectedCount: count
      }
    }

    case 'unmute-tabs': {
      const tabs = await getTargetTabs(scope, context)
      let count = 0

      for (const tab of tabs) {
        if (tab.id && tab.mutedInfo?.muted) {
          try {
            await browser.tabs.update(tab.id, { muted: false })
            count++
          } catch (err) {
            console.warn('Unmute error:', err)
          }
        }
      }

      return {
        success: true,
        message: `Unmuted ${count} tabs.`,
        affectedCount: count
      }
    }

    case 'pin-tabs': {
      const tabs = await getTargetTabs(scope, context)
      const pinScope = params.pinScope || 'all'
      const pattern = (params.matchPattern || '').toLowerCase()
      let count = 0

      for (const tab of tabs) {
        if (!tab.id || tab.pinned) continue
        let shouldPin = false

        if (pinScope === 'all') shouldPin = true
        else if (pinScope === 'domain-matches') {
          try {
            const domain = new URL(tab.url || '').hostname.toLowerCase()
            shouldPin = domain.includes(pattern)
          } catch {
            shouldPin = false
          }
        } else if (pinScope === 'url-contains') {
          shouldPin = (tab.url || '').toLowerCase().includes(pattern)
        }

        if (shouldPin) {
          try {
            await browser.tabs.update(tab.id, { pinned: true })
            count++
          } catch (err) {
            console.warn('Pin error:', err)
          }
        }
      }

      return {
        success: true,
        message: `Pinned ${count} tabs.`,
        affectedCount: count
      }
    }

    case 'unpin-tabs': {
      const tabs = await getTargetTabs(scope, context)
      let count = 0

      for (const tab of tabs) {
        if (tab.id && tab.pinned) {
          try {
            await browser.tabs.update(tab.id, { pinned: false })
            count++
          } catch (err) {
            console.warn('Unpin error:', err)
          }
        }
      }

      return {
        success: true,
        message: `Unpinned ${count} tabs.`,
        affectedCount: count
      }
    }

    case 'close-tabs': {
      const tabs = await getTargetTabs(scope, context)
      const condition = params.closeCondition || 'pattern-match'
      const pattern = (params.closePattern || '').toLowerCase()
      const domainList = (params.domainList || []).map((d) => d.toLowerCase())
      const tabsToClose: number[] = []

      for (const tab of tabs) {
        if (!tab.id || tab.pinned) continue
        let shouldClose = false

        if (condition === 'domain-list' && domainList.length > 0) {
          try {
            const domain = new URL(tab.url || '').hostname.toLowerCase()
            shouldClose = domainList.some(
              (d) => domain === d || domain.endsWith(`.${d}`)
            )
          } catch {
            shouldClose = false
          }
        } else if (condition === 'pattern-match' && pattern) {
          const titleMatch = (tab.title || '').toLowerCase().includes(pattern)
          const urlMatch = (tab.url || '').toLowerCase().includes(pattern)
          shouldClose = titleMatch || urlMatch
        }

        if (shouldClose) {
          tabsToClose.push(tab.id)
        }
      }

      if (tabsToClose.length > 0) {
        await browser.tabs.remove(tabsToClose)
        return {
          success: true,
          message: `Closed ${tabsToClose.length} matching tabs.`,
          affectedCount: tabsToClose.length
        }
      }

      return {
        success: true,
        message: 'No matching tabs to close.',
        affectedCount: 0
      }
    }

    case 'save-session': {
      const tabs = await getTargetTabs(scope, context)
      if (tabs.length === 0) {
        return {
          success: true,
          message: 'No tabs to save as session.',
          affectedCount: 0
        }
      }

      const now = new Date()
      const dateStr = now.toLocaleDateString()
      const timeStr = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
      const template =
        params.sessionNameTemplate || 'Routine Session - {date} {time}'
      const sessionName = template
        .replace('{date}', dateStr)
        .replace('{time}', timeStr)

      const tabData = tabs
        .filter(
          (t) =>
            t.url &&
            !t.url.startsWith('chrome://') &&
            !t.url.startsWith('edge://')
        )
        .map((t) => ({
          url: t.url || '',
          title: t.title || 'Untitled',
          windowId: t.windowId || 0
        }))

      if (tabData.length === 0) {
        return {
          success: true,
          message: 'No valid URLs to save.',
          affectedCount: 0
        }
      }

      await saveSession(tabData, sessionName)

      if (params.closeAfterSave) {
        const tabIds = tabs.map((t) => t.id!).filter(Boolean)
        if (tabIds.length > 0) {
          await browser.tabs.remove(tabIds)
        }
      }

      return {
        success: true,
        message: `Saved session "${sessionName}" with ${tabData.length} tabs.`,
        affectedCount: 1
      }
    }

    case 'save-list': {
      const tabs = await getTargetTabs(scope, context)
      const pattern = (params.filterPattern || '').toLowerCase()
      const field = params.filterField || 'url'

      const matchedTabs = tabs.filter((t) => {
        if (
          !t.url ||
          t.url.startsWith('chrome://') ||
          t.url.startsWith('edge://')
        )
          return false
        if (!pattern) return true
        let val = field === 'title' ? t.title || '' : t.url || ''
        return val.toLowerCase().includes(pattern)
      })

      if (matchedTabs.length === 0) {
        return {
          success: true,
          message: 'No valid tabs to save to list.',
          affectedCount: 0
        }
      }

      const now = new Date()
      const dateStr = now.toLocaleDateString()
      const timeStr = now.toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      })
      const template =
        params.sessionNameTemplate || 'Routine List - {date} {time}'
      const listName = template
        .replace('{date}', dateStr)
        .replace('{time}', timeStr)

      const tabData = matchedTabs.map((t) => ({
        url: t.url || '',
        title: t.title || 'Untitled'
      }))

      await saveList(
        tabData,
        listName,
        params.targetId || null,
        params.targetName || 'Routines Library',
        null
      )

      if (params.closeAfterSave) {
        const tabIds = matchedTabs.map((t) => t.id!).filter(Boolean)
        if (tabIds.length > 0) {
          await browser.tabs.remove(tabIds)
        }
      }

      return {
        success: true,
        message: `Saved ${matchedTabs.length} tabs to List "${listName}".`,
        affectedCount: matchedTabs.length
      }
    }

    case 'move-to-window': {
      const tabs = await getTargetTabs(scope, context)
      const pattern = (params.filterPattern || '').toLowerCase()
      const field = params.filterField || 'url'
      const isRegex = !!params.isRegex

      let regex: RegExp | null = null
      if (isRegex && pattern) {
        try {
          regex = new RegExp(pattern, 'i')
        } catch {
          return {
            success: false,
            message: 'Invalid regex for move-to-window.'
          }
        }
      }

      const tabsToMove: chrome.tabs.Tab[] = []
      for (const tab of tabs) {
        if (!tab.id) continue
        if (!pattern) {
          tabsToMove.push(tab)
          continue
        }

        let val = ''
        if (field === 'url') val = tab.url || ''
        else if (field === 'title') val = tab.title || ''
        else if (field === 'domain') {
          try {
            val = new URL(tab.url || '').hostname
          } catch {
            val = ''
          }
        }

        const isMatch = regex
          ? regex.test(val)
          : val.toLowerCase().includes(pattern)
        if (isMatch) tabsToMove.push(tab)
      }

      if (tabsToMove.length === 0) {
        return {
          success: true,
          message: pattern
            ? `No tabs matched "${pattern}" to move.`
            : 'No tabs to move.',
          affectedCount: 0
        }
      }

      const firstTab = tabsToMove[0]
      const newWin = await browser.windows.create({
        tabId: firstTab.id,
        incognito: !!params.newWindowIncognito
      })

      if (newWin.id && tabsToMove.length > 1) {
        const remainingTabIds = tabsToMove
          .slice(1)
          .map((t) => t.id!)
          .filter(Boolean)
        await browser.tabs.move(remainingTabIds, {
          windowId: newWin.id,
          index: -1
        })
      }

      return {
        success: true,
        message: `Moved ${tabsToMove.length} tabs to a new window.`,
        affectedCount: tabsToMove.length
      }
    }

    case 'open-urls': {
      const urls = (params.urls || []).filter((u) => u && u.trim().length > 0)
      if (urls.length === 0) {
        return {
          success: true,
          message: 'No URLs specified to open.',
          affectedCount: 0
        }
      }

      if (params.openInNewWindow) {
        await browser.windows.create({ url: urls })
      } else {
        for (const url of urls) {
          await browser.tabs.create({
            url,
            pinned: !!params.pinOpenedTabs
          })
        }
      }

      return {
        success: true,
        message: `Opened ${urls.length} tabs.`,
        affectedCount: urls.length
      }
    }

    case 'wait': {
      const delay = params.delayMs || 1000
      await new Promise((resolve) => setTimeout(resolve, delay))
      return { success: true, message: `Waited ${delay}ms.` }
    }

    case 'show-notification': {
      const msg = params.messageText || 'Routine step completed.'
      return { success: true, message: msg }
    }

    default:
      return { success: true, message: `Step type "${step.type}" executed.` }
  }
}
