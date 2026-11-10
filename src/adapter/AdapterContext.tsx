/**
 * AdapterContext — Provides a stable singleton IBrowserAdapter instance
 * via React context, eliminating repeated getBrowserAdapter() calls per render.
 */
import React, { createContext, useContext, useMemo } from 'react'
import { getBrowserAdapter } from './index'
import type { IBrowserAdapter } from './types'

const AdapterContext = createContext<IBrowserAdapter | null>(null)

export function AdapterProvider({ children }: { children: React.ReactNode }) {
  // Memoized so the same adapter singleton is returned across all re-renders
  const adapter = useMemo(() => getBrowserAdapter(), [])
  return (
    <AdapterContext.Provider value={adapter}>
      {children}
    </AdapterContext.Provider>
  )
}

/**
 * useAdapter() — Consume the singleton IBrowserAdapter.
 * Must be wrapped in <AdapterProvider>.
 */
export function useAdapter(): IBrowserAdapter {
  const adapter = useContext(AdapterContext)
  if (!adapter) {
    throw new Error('useAdapter() must be used within <AdapterProvider>. Wrap your root with <AdapterProvider>.')
  }
  return adapter
}

