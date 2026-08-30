import type { Routine, RoutinePreset } from '../types/routine'
import { DEFAULT_ROUTINE_PRESETS } from './defaultRoutines'

const STORAGE_KEY = 'excited_gem_routines'
const INITIALIZED_KEY = 'excited_gem_routines_initialized'

const browser =
  typeof window !== 'undefined'
    ? (window as any).browser || window.chrome
    : (globalThis as any).chrome

export async function getRoutines(): Promise<Routine[]> {
  return new Promise((resolve) => {
    browser.storage.local.get([STORAGE_KEY, INITIALIZED_KEY], (res: any) => {
      const isInitialized = res[INITIALIZED_KEY]
      const savedRoutines = res[STORAGE_KEY]

      if (
        !isInitialized ||
        !Array.isArray(savedRoutines) ||
        savedRoutines.length === 0
      ) {
        // Seed initial default routines
        const initialRoutines: Routine[] = DEFAULT_ROUTINE_PRESETS.map(
          (preset, idx) => ({
            ...preset.routine,
            id: `routine_preset_${idx + 1}_${Date.now()}`,
            createdAt: Date.now(),
            updatedAt: Date.now()
          })
        )

        browser.storage.local.set(
          {
            [STORAGE_KEY]: initialRoutines,
            [INITIALIZED_KEY]: true
          },
          () => {
            syncRoutineAlarms(initialRoutines)
            resolve(initialRoutines)
          }
        )
      } else {
        resolve(savedRoutines)
      }
    })
  })
}

export async function saveRoutine(routine: Routine): Promise<Routine[]> {
  const routines = await getRoutines()
  const now = Date.now()

  let updatedList: Routine[]
  const existingIdx = routines.findIndex((r) => r.id === routine.id)

  if (existingIdx >= 0) {
    const updated = { ...routine, updatedAt: now }
    updatedList = [...routines]
    updatedList[existingIdx] = updated
  } else {
    const newRoutine = {
      ...routine,
      id:
        routine.id ||
        `routine_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      createdAt: routine.createdAt || now,
      updatedAt: now
    }
    updatedList = [newRoutine, ...routines]
  }

  await new Promise<void>((resolve) => {
    browser.storage.local.set({ [STORAGE_KEY]: updatedList }, () => resolve())
  })

  await syncRoutineAlarms(updatedList)
  return updatedList
}

export async function deleteRoutine(id: string): Promise<Routine[]> {
  const routines = await getRoutines()
  const updatedList = routines.filter((r) => r.id !== id)

  await new Promise<void>((resolve) => {
    browser.storage.local.set({ [STORAGE_KEY]: updatedList }, () => resolve())
  })

  // Clear specific alarm if existed
  if (browser.alarms) {
    await browser.alarms.clear(`routine_alarm_${id}`)
  }

  await syncRoutineAlarms(updatedList)
  return updatedList
}

export async function toggleRoutineEnabled(
  id: string,
  enabled: boolean
): Promise<Routine[]> {
  const routines = await getRoutines()
  const updatedList = routines.map((r) =>
    r.id === id ? { ...r, enabled, updatedAt: Date.now() } : r
  )

  await new Promise<void>((resolve) => {
    browser.storage.local.set({ [STORAGE_KEY]: updatedList }, () => resolve())
  })

  await syncRoutineAlarms(updatedList)
  return updatedList
}

export async function updateRoutineLastRun(
  id: string,
  success: boolean,
  summary: string
): Promise<void> {
  const routines = await getRoutines()
  const updatedList = routines.map((r) =>
    r.id === id
      ? {
          ...r,
          lastRunAt: Date.now(),
          lastRunSuccess: success,
          lastRunSummary: summary
        }
      : r
  )

  await new Promise<void>((resolve) => {
    browser.storage.local.set({ [STORAGE_KEY]: updatedList }, () => resolve())
  })
}

export async function addRoutineFromPreset(
  preset: RoutinePreset
): Promise<Routine> {
  const newRoutine: Routine = {
    ...preset.routine,
    id: `routine_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
    name: preset.routine.name,
    createdAt: Date.now(),
    updatedAt: Date.now()
  }

  await saveRoutine(newRoutine)
  return newRoutine
}

export async function syncRoutineAlarms(routines?: Routine[]): Promise<void> {
  if (!browser.alarms) return

  const list = routines || (await getRoutines())

  // Find all current routine alarms
  const allAlarms = await browser.alarms.getAll()
  const routineAlarms = allAlarms.filter(
    (a: any) => a.name && a.name.startsWith('routine_alarm_')
  )

  // Map of alarms that should exist
  const expectedAlarmNames = new Set<string>()

  for (const r of list) {
    if (
      r.enabled &&
      r.triggers.intervalMinutes &&
      r.triggers.intervalMinutes > 0
    ) {
      const alarmName = `routine_alarm_${r.id}`
      expectedAlarmNames.add(alarmName)

      const existing = routineAlarms.find((a: any) => a.name === alarmName)
      if (
        !existing ||
        existing.periodInMinutes !== r.triggers.intervalMinutes
      ) {
        browser.alarms.create(alarmName, {
          delayInMinutes: r.triggers.intervalMinutes,
          periodInMinutes: r.triggers.intervalMinutes
        })
      }
    }
  }

  // Clear obsolete alarms
  for (const alarm of routineAlarms) {
    if (!expectedAlarmNames.has(alarm.name)) {
      browser.alarms.clear(alarm.name)
    }
  }
}

export function exportRoutinesJson(routines: Routine[]): string {
  return JSON.stringify(routines, null, 2)
}

export async function importRoutinesJson(
  jsonStr: string
): Promise<{ success: boolean; count: number; error?: string }> {
  try {
    const parsed = JSON.parse(jsonStr)
    if (!Array.isArray(parsed)) {
      return {
        success: false,
        count: 0,
        error: 'JSON content must be an array of routines.'
      }
    }

    const current = await getRoutines()
    const validRoutines: Routine[] = []

    for (const item of parsed) {
      if (item && item.name && Array.isArray(item.steps)) {
        validRoutines.push({
          ...item,
          id: `routine_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
          createdAt: Date.now(),
          updatedAt: Date.now()
        })
      }
    }

    if (validRoutines.length === 0) {
      return {
        success: false,
        count: 0,
        error: 'No valid routines found in JSON.'
      }
    }

    const merged = [...validRoutines, ...current]
    await new Promise<void>((resolve) => {
      browser.storage.local.set({ [STORAGE_KEY]: merged }, () => resolve())
    })

    await syncRoutineAlarms(merged)
    return { success: true, count: validRoutines.length }
  } catch (err: any) {
    return {
      success: false,
      count: 0,
      error: err.message || 'Failed to parse JSON.'
    }
  }
}
