/**
 * ActionDefinitions — All browser actions the AI can execute.
 *
 * The AI returns a structured JSON response matching one of these action schemas.
 * TabActionExecutor then validates and runs the actual chrome.* API calls.
 */

export type ActionType =
  // Tab operations
  | 'close_tabs'
  | 'pin_tabs'
  | 'unpin_tabs'
  | 'mute_tabs'
  | 'unmute_tabs'
  | 'focus_tab'
  | 'duplicate_tab'
  | 'discard_tabs'
  | 'reload_tabs'
  | 'move_tabs_to_window'
  // Tab groups
  | 'create_tab_group'
  | 'rename_tab_group'
  | 'collapse_tab_group'
  | 'expand_tab_group'
  | 'ungroup_tabs'
  // Windows
  | 'open_new_window_with_tabs'
  // Sessions (extension-level)
  | 'save_session'
  | 'restore_session'
  | 'list_sessions'
  | 'delete_session'
  | 'rename_session'
  | 'save_to_list'
  // Bookmarks
  | 'bookmark_tabs'
  | 'list_bookmarks'
  | 'delete_bookmarks'
  | 'move_bookmarks'
  // Pure analysis (no side effects)
  | 'analyze'

export interface BaseAction {
  type: ActionType
  /** Human-readable description of what will happen — shown in confirmation UI */
  description: string
  /** Risk level for the confirmation UI */
  risk: 'low' | 'medium' | 'high'
}

export interface TabIdsAction extends BaseAction {
  tabIds: number[]
}

export interface CloseTabs extends TabIdsAction { type: 'close_tabs' }
export interface PinTabs extends TabIdsAction { type: 'pin_tabs' }
export interface UnpinTabs extends TabIdsAction { type: 'unpin_tabs' }
export interface MuteTabs extends TabIdsAction { type: 'mute_tabs' }
export interface UnmuteTabs extends TabIdsAction { type: 'unmute_tabs' }
export interface DiscardTabs extends TabIdsAction { type: 'discard_tabs' }
export interface ReloadTabs extends TabIdsAction { type: 'reload_tabs' }
export interface UngroupTabs extends TabIdsAction { type: 'ungroup_tabs' }

export interface FocusTab extends BaseAction {
  type: 'focus_tab'
  tabId: number
}

export interface DuplicateTab extends BaseAction {
  type: 'duplicate_tab'
  tabId: number
}

export interface MoveTabsToWindow extends BaseAction {
  type: 'move_tabs_to_window'
  tabIds: number[]
  windowId: number | 'new'
}

export interface CreateTabGroup extends BaseAction {
  type: 'create_tab_group'
  tabIds: number[]
  name: string
  color?: 'grey' | 'blue' | 'red' | 'yellow' | 'green' | 'pink' | 'purple' | 'cyan' | 'orange'
}

export interface RenameTabGroup extends BaseAction {
  type: 'rename_tab_group'
  groupId: number
  name: string
}

export interface CollapseTabGroup extends BaseAction {
  type: 'collapse_tab_group'
  groupId: number
}

export interface ExpandTabGroup extends BaseAction {
  type: 'expand_tab_group'
  groupId: number
}

export interface OpenNewWindowWithTabs extends BaseAction {
  type: 'open_new_window_with_tabs'
  tabIds: number[]
  incognito?: boolean
}

export interface SaveSession extends BaseAction {
  type: 'save_session'
  name: string
  tabIds?: number[]
}

export interface RestoreSession extends BaseAction {
  type: 'restore_session'
  sessionName: string
}

export interface ListSessions extends BaseAction {
  type: 'list_sessions'
}

export interface DeleteSession extends BaseAction {
  type: 'delete_session'
  sessionName: string
}

export interface RenameSession extends BaseAction {
  type: 'rename_session'
  oldName: string
  newName: string
}

export interface SaveToList extends BaseAction {
  type: 'save_to_list'
  tabIds: number[]
  listName: string
}

export interface BookmarkTabs extends BaseAction {
  type: 'bookmark_tabs'
  tabIds: number[]
  folderName?: string
}

export interface ListBookmarks extends BaseAction {
  type: 'list_bookmarks'
  query?: string
}

export interface DeleteBookmarks extends BaseAction {
  type: 'delete_bookmarks'
  bookmarkIds: string[]
}

export interface MoveBookmarks extends BaseAction {
  type: 'move_bookmarks'
  bookmarkIds: string[]
  folderId: string
}

export interface Analyze extends BaseAction {
  type: 'analyze'
  /** The AI's analysis text — no browser action needed */
  result: string
}

export type BrowserAction =
  | CloseTabs | PinTabs | UnpinTabs | MuteTabs | UnmuteTabs
  | DiscardTabs | ReloadTabs | UngroupTabs
  | FocusTab | DuplicateTab | MoveTabsToWindow
  | CreateTabGroup | RenameTabGroup | CollapseTabGroup | ExpandTabGroup
  | OpenNewWindowWithTabs | SaveSession | RestoreSession | ListSessions | DeleteSession
  | SaveToList | BookmarkTabs | ListBookmarks | DeleteBookmarks | MoveBookmarks
  | Analyze

/** System prompt that instructs the AI to always return structured JSON */
export const ACTION_SYSTEM_PROMPT = `You are an AI assistant for a browser tab manager extension called Excited Gem.
You help users manage their browser tabs using natural language.

You MUST respond with a valid JSON object in this format:
{
  "type": "<action_type>",
  "description": "<human-readable description of what you will do>",
  "risk": "<low|medium|high>",
  ...action-specific fields...
}

For analysis queries with no browser action needed, use:
{
  "type": "analyze",
  "description": "Analysis result",
  "risk": "low",
  "result": "<your full analysis text>"
}

Available action types and their fields:
- close_tabs: { tabIds: number[] }
- pin_tabs / unpin_tabs: { tabIds: number[] }
- mute_tabs / unmute_tabs: { tabIds: number[] }
- focus_tab: { tabId: number }
- duplicate_tab: { tabId: number }
- discard_tabs: { tabIds: number[] }
- reload_tabs: { tabIds: number[] }
- move_tabs_to_window: { tabIds: number[], windowId: number | "new" }
- create_tab_group: { tabIds: number[], name: string, color?: string }
- rename_tab_group: { groupId: number, name: string }
- collapse_tab_group / expand_tab_group: { groupId: number }
- ungroup_tabs: { tabIds: number[] }
- open_new_window_with_tabs: { tabIds: number[], incognito?: boolean }
- save_session: { name: string, tabIds?: number[] }
- restore_session: { sessionName: string }
- list_sessions: {}
- delete_session: { sessionName: string }
- rename_session: { oldName: string, newName: string }
- save_to_list: { tabIds: number[], listName: string }
- bookmark_tabs: { tabIds: number[], folderName?: string }
- list_bookmarks: { query?: string }
- delete_bookmarks: { bookmarkIds: string[] }
- move_bookmarks: { bookmarkIds: string[], folderId: string }
- analyze: { result: string }

IMPORTANT:
- Only reference tab IDs that exist in the provided tab list.
- For ambiguous requests, pick the most conservative interpretation.
- Mark risk as "high" for closing 10+ tabs, "medium" for 3-9 tabs, "low" otherwise.
- If the user asks something you cannot do or is unclear, use analyze with an explanation.`
