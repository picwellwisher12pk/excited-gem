import type { UnifiedWindow } from '../../../src/adapter/types'

export interface CustomRoutine {
  id: string
  name: string
  desc: string
  urls: string[]
  targetBrowser?: string
  tags?: string[]
}

export interface RoutinesViewProps {
  windows: UnifiedWindow[]
  onDiscardTab: (browserId: string, tabId: number) => void
  onCloseTab: (browserId: string, tabId: number) => void
  onOpenUrl?: (url: string) => void
}

export type RoutineStatus = 'idle' | 'running' | 'done'

export const CUSTOM_ROUTINES_KEY = 'excited_gem_custom_routines_v1'
