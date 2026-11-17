import type { Execution } from '@/types/automation'
import type { RunMode } from '@/lib/api'

/** 'test' or 'production' when the run says which, otherwise null. */
export function runModeOf(row: Execution): RunMode | null {
  if (row.mode === 'test' || row.mode === 'production') return row.mode
  if (row.inventory?.mode === 'test' || row.inventory?.mode === 'production') return row.inventory.mode
  if (row.summary?.startsWith('Test mode') || row.summary?.startsWith('Practice run')) return 'test'
  return null
}

/** Practice runs show in Practice, everything else in Live. Runs saved without a mode count as live. */
export function belongsToMode(row: Execution, mode: RunMode) {
  return (runModeOf(row) ?? 'production') === mode
}
