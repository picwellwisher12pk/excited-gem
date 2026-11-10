import type { IBrowserAdapter } from './types'
import { ExtensionAdapter } from './ExtensionAdapter'
import { DesktopAdapter } from './DesktopAdapter'

let adapterInstance: IBrowserAdapter | null = null

export function isTauriEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    ('__TAURI__' in window || '__TAURI_INTERNALS__' in window)
  )
}

export function getBrowserAdapter(): IBrowserAdapter {
  if (!adapterInstance) {
    if (isTauriEnvironment()) {
      adapterInstance = new DesktopAdapter()
    } else {
      adapterInstance = new ExtensionAdapter()
    }
  }
  return adapterInstance
}

export * from './types'
export { ExtensionAdapter } from './ExtensionAdapter'
export { DesktopAdapter } from './DesktopAdapter'
export { AdapterProvider, useAdapter } from './AdapterContext'
