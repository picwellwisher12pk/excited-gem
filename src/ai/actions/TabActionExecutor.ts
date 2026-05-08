/**
 * TabActionExecutor — Takes a parsed BrowserAction from the AI and runs it.
 * All destructive operations are previewed before execution.
 */

import type { BrowserAction } from './ActionDefinitions'

export interface ExecutionResult {
  success: boolean
  message: string
  affectedCount?: number
}

const browser = chrome

export class TabActionExecutor {
  /**
   * Parse the AI's raw JSON response into a BrowserAction.
   * Strips markdown code fences if the model wrapped its output.
   */
  static parseAIResponse(raw: string): BrowserAction | null {
    // Strip markdown code fences (some models add ```json ... ```)
    const cleaned = raw
      .replace(/^```(?:json)?\s*/i, '')
      .replace(/\s*```\s*$/, '')
      .trim()

    // Find the first { ... } JSON object in the response
    const start = cleaned.indexOf('{')
    const end = cleaned.lastIndexOf('}')
    if (start === -1 || end === -1) return null

    try {
      return JSON.parse(cleaned.slice(start, end + 1)) as BrowserAction
    } catch {
      return null
    }
  }

  /** Execute a parsed action. Returns result info. */
  static async execute(action: BrowserAction): Promise<ExecutionResult> {
    try {
      switch (action.type) {
        case 'close_tabs':
          await browser.tabs.remove(action.tabIds)
          return { success: true, message: `Closed ${action.tabIds.length} tab(s).`, affectedCount: action.tabIds.length }

        case 'pin_tabs':
          await Promise.all(action.tabIds.map((id) => browser.tabs.update(id, { pinned: true })))
          return { success: true, message: `Pinned ${action.tabIds.length} tab(s).` }

        case 'unpin_tabs':
          await Promise.all(action.tabIds.map((id) => browser.tabs.update(id, { pinned: false })))
          return { success: true, message: `Unpinned ${action.tabIds.length} tab(s).` }

        case 'mute_tabs':
          await Promise.all(action.tabIds.map((id) => browser.tabs.update(id, { muted: true })))
          return { success: true, message: `Muted ${action.tabIds.length} tab(s).` }

        case 'unmute_tabs':
          await Promise.all(action.tabIds.map((id) => browser.tabs.update(id, { muted: false })))
          return { success: true, message: `Unmuted ${action.tabIds.length} tab(s).` }

        case 'focus_tab': {
          const tab = await browser.tabs.get(action.tabId)
          await browser.tabs.update(action.tabId, { active: true })
          if (tab.windowId) await browser.windows.update(tab.windowId, { focused: true })
          return { success: true, message: `Focused tab: "${tab.title}".` }
        }

        case 'duplicate_tab':
          await browser.tabs.duplicate(action.tabId)
          return { success: true, message: `Duplicated tab.` }

        case 'discard_tabs':
          await Promise.all(action.tabIds.map((id) => browser.tabs.discard(id)))
          return { success: true, message: `Discarded ${action.tabIds.length} tab(s) to save memory.` }

        case 'reload_tabs':
          await Promise.all(action.tabIds.map((id) => browser.tabs.reload(id)))
          return { success: true, message: `Reloaded ${action.tabIds.length} tab(s).` }

        case 'move_tabs_to_window': {
          let targetWindowId: number
          if (action.windowId === 'new') {
            const win = await browser.windows.create({})
            targetWindowId = win.id!
            // Move all tabs except the first (which goes to the newly created window default tab)
            const [firstTabId, ...restTabIds] = action.tabIds
            await browser.tabs.move(firstTabId, { windowId: targetWindowId, index: 0 })
            if (restTabIds.length) await browser.tabs.move(restTabIds, { windowId: targetWindowId, index: -1 })
          } else {
            targetWindowId = action.windowId
            await browser.tabs.move(action.tabIds, { windowId: targetWindowId, index: -1 })
          }
          return { success: true, message: `Moved ${action.tabIds.length} tab(s) to window.` }
        }

        case 'create_tab_group': {
          const groupId = await browser.tabs.group({ tabIds: action.tabIds })
          await browser.tabGroups.update(groupId, {
            title: action.name,
            color: (action.color as any) ?? 'blue'
          })
          return { success: true, message: `Created group "${action.name}" with ${action.tabIds.length} tab(s).` }
        }

        case 'rename_tab_group':
          await browser.tabGroups.update(action.groupId, { title: action.name })
          return { success: true, message: `Renamed group to "${action.name}".` }

        case 'collapse_tab_group':
          await browser.tabGroups.update(action.groupId, { collapsed: true })
          return { success: true, message: `Collapsed group.` }

        case 'expand_tab_group':
          await browser.tabGroups.update(action.groupId, { collapsed: false })
          return { success: true, message: `Expanded group.` }

        case 'ungroup_tabs':
          await browser.tabs.ungroup(action.tabIds)
          return { success: true, message: `Ungrouped ${action.tabIds.length} tab(s).` }

        case 'open_new_window_with_tabs': {
          const [first, ...rest] = action.tabIds
          const win = await browser.windows.create({
            tabId: first,
            incognito: action.incognito ?? false
          })
          if (rest.length) await browser.tabs.move(rest, { windowId: win.id!, index: -1 })
          return { success: true, message: `Opened ${action.tabIds.length} tab(s) in a new window.` }
        }

        case 'save_session':
          // Delegate to extension's session system via message
          await browser.runtime.sendMessage({ type: 'AI_SAVE_SESSION', name: action.name })
          return { success: true, message: `Saved session "${action.name}".` }

        case 'restore_session':
          await browser.runtime.sendMessage({ type: 'AI_RESTORE_SESSION', sessionName: action.sessionName })
          return { success: true, message: `Restoring session "${action.sessionName}".` }

        case 'save_to_list':
          await browser.runtime.sendMessage({ type: 'AI_SAVE_TO_LIST', tabIds: action.tabIds, listName: action.listName })
          return { success: true, message: `Saved ${action.tabIds.length} tab(s) to list "${action.listName}".` }

        case 'bookmark_tabs': {
          const tabs = await Promise.all(action.tabIds.map((id) => browser.tabs.get(id)))
          let parentId: string | undefined
          if (action.folderName) {
            const folder = await browser.bookmarks.create({ title: action.folderName })
            parentId = folder.id
          }
          await Promise.all(
            tabs.map((t) => browser.bookmarks.create({ title: t.title, url: t.url, parentId }))
          )
          return { success: true, message: `Bookmarked ${tabs.length} tab(s)${action.folderName ? ` in "${action.folderName}"` : ''}.` }
        }

        case 'analyze':
          return { success: true, message: action.result }

        default:
          return { success: false, message: `Unknown action type.` }
      }
    } catch (e: any) {
      return { success: false, message: `Error: ${e.message}` }
    }
  }
}
