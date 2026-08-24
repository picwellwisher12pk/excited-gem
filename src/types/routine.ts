export type RoutineScope = 'active-window' | 'all-windows' | 'selected-tabs' | 'session' | 'list'

export type StepActionType =
  // Tab Filtering & Working Set Scope
  | 'filter-tabs'
  | 'reset-filter'
  // Tab Cleanup & Organization
  | 'close-duplicates'
  | 'group-by-domain'
  | 'group-by-rule'
  | 'sort-tabs'
  | 'move-to-window'
  // Tab State & RAM Optimization
  | 'discard-tabs'
  | 'mute-tabs'
  | 'unmute-tabs'
  | 'pin-tabs'
  | 'unpin-tabs'
  | 'close-tabs'
  // Session & List
  | 'save-session'
  | 'save-list'
  | 'open-session'
  | 'open-list'
  // Navigation & Utilities
  | 'open-urls'
  | 'wait'
  | 'show-notification'

export interface StepParams {
  // close-duplicates
  preferPinned?: boolean
  acrossAllWindows?: boolean

  // group-by-domain
  minTabsPerGroup?: number
  groupColor?: string

  // group-by-rule
  groupTitle?: string
  rulePattern?: string
  ruleField?: 'url' | 'title' | 'domain'
  isRegex?: boolean

  // sort-tabs
  sortBy?: 'domain' | 'title' | 'url' | 'pinned-first' | 'audible-first'
  sortDirection?: 'asc' | 'desc'

  // move-to-window & filter-tabs
  filterPattern?: string
  filterField?: 'url' | 'title' | 'domain'
  newWindowIncognito?: boolean
  invertMatch?: boolean

  // discard-tabs (free memory)
  discardScope?: 'all-background' | 'inactive-only' | 'domain-matches'
  inactiveMinutes?: number

  // mute/unmute
  muteScope?: 'all' | 'all-except-active' | 'audible-only'

  // pin/unpin
  pinScope?: 'all' | 'domain-matches' | 'url-contains'
  matchPattern?: string

  // close-tabs
  closeCondition?: 'pattern-match' | 'inactive-duration' | 'domain-list'
  closePattern?: string
  closeInactiveMinutes?: number
  domainList?: string[]

  // save-session
  sessionNameTemplate?: string // e.g. "Work Snapshot - {date}"
  closeAfterSave?: boolean

  // open-session / open-list
  targetId?: string
  targetName?: string

  // open-urls
  urls?: string[]
  openInNewWindow?: boolean
  pinOpenedTabs?: boolean

  // wait
  delayMs?: number

  // show-notification
  messageText?: string
  notificationType?: 'info' | 'success' | 'warning'
}

export interface RoutineStep {
  id: string
  type: StepActionType
  name: string
  enabled: boolean
  params: StepParams
}

export interface RoutineTrigger {
  manual: boolean
  onStartup: boolean
  intervalMinutes?: number | null // e.g., 15, 30, 60, 120, 240, 1440
}

export interface Routine {
  id: string
  name: string
  description: string
  icon: string
  color: string
  enabled: boolean
  targetScope: RoutineScope
  triggers: RoutineTrigger
  steps: RoutineStep[]
  createdAt: number
  updatedAt: number
  lastRunAt?: number
  lastRunSuccess?: boolean
  lastRunSummary?: string
}

export interface StepExecutionResult {
  stepId: string
  stepName: string
  stepType: StepActionType
  success: boolean
  message: string
  affectedCount?: number
  error?: string
  durationMs: number
}

export interface RoutineExecutionResult {
  routineId: string
  routineName: string
  success: boolean
  startTime: number
  endTime: number
  durationMs: number
  stepResults: StepExecutionResult[]
  summary: {
    closedTabs: number
    groupedTabs: number
    mutedTabs: number
    discardedTabs: number
    pinnedTabs: number
    savedSessions: number
    openedTabs: number
  }
  error?: string
}

export interface RoutinePreset {
  id: string
  name: string
  description: string
  icon: string
  color: string
  category: 'cleanup' | 'focus' | 'workspace' | 'performance' | 'daily'
  routine: Omit<Routine, 'id' | 'createdAt' | 'updatedAt'>
}
