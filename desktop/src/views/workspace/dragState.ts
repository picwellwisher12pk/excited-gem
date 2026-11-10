export interface DraggedTabData {
  browserId: string
  windowId: number
  tabId: number
  url: string
  title: string
}

export interface ActiveTabDragPayload {
  type: 'tab-drag'
  browserId: string
  windowId: number
  tabId: number
  url: string
  title: string
  tabs: DraggedTabData[]
}

let activePayload: ActiveTabDragPayload | null = null

export function setTabDragPayload(payload: ActiveTabDragPayload | null) {
  activePayload = payload
  if (typeof window !== 'undefined') {
    ;(window as any).__activeTabDragPayload = payload
  }
}

export function getTabDragPayload(): ActiveTabDragPayload | null {
  if (activePayload) return activePayload
  if (typeof window !== 'undefined' && (window as any).__activeTabDragPayload) {
    return (window as any).__activeTabDragPayload
  }
  return null
}

export function clearTabDragPayload() {
  activePayload = null
  if (typeof window !== 'undefined') {
    delete (window as any).__activeTabDragPayload
  }
}

