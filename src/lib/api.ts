import type { EmailRecipients, Execution, Scenario, ScenarioStatus } from '@/types/automation'

const apiBase = (import.meta.env.VITE_API_URL ?? '').replace(/\/$/, '')

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  const body = await response.json().catch(() => null)
  if (!response.ok) {
    const message =
      body && typeof body === 'object' && typeof (body as { error?: unknown }).error === 'string'
        ? (body as { error: string }).error
        : `Request failed (${response.status})`
    throw new Error(message)
  }
  if (!body || typeof body !== 'object') {
    throw new Error(
      apiBase
        ? 'The API did not return JSON.'
        : 'This site has no API URL. Set VITE_API_URL on Vercel to the Python API and redeploy.',
    )
  }
  return body as T
}

export function fetchScenarios() {
  return request<{ scenarios: Scenario[] }>('/api/scenarios')
}

export function fetchScenario(id: string) {
  return request<{ scenario: Scenario }>(`/api/scenarios/${id}`)
}

export function setScenarioStatus(id: string, status: ScenarioStatus) {
  return request<{ scenario: Scenario }>(`/api/scenarios/${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}

/** Light rows, newest first. Pass the oldest shown startedAt as `before` for the next page. */
export function saveRecipients(id: string, recipients: EmailRecipients) {
  return request<{ scenario: Scenario }>(`/api/scenarios/${id}/recipients`, {
    method: 'PUT',
    body: JSON.stringify(recipients),
  })
}

/** Light rows of one mode, newest first. Pass the oldest shown startedAt as `before` for the next page. */
export function fetchHistory(id: string, mode: RunMode, before?: string) {
  const params = new URLSearchParams({ mode })
  if (before) params.set('before', before)
  return request<{ executions: Execution[]; limit: number }>(`/api/scenarios/${id}/history?${params.toString()}`)
}

/** One run with everything the flow view needs. Lists only carry light rows. */
export function fetchExecution(scenarioId: string, executionId: string) {
  return request<{ execution: Execution }>(`/api/scenarios/${scenarioId}/executions/${executionId}`)
}

export function fetchIncomplete(id: string, mode: RunMode) {
  return request<{ executions: Execution[] }>(`/api/scenarios/${id}/incomplete?mode=${mode}`)
}

export interface CompareSource {
  spreadsheetId: string
  name: string
  label?: string
  date: string
  url: string
}

export interface CompareRow {
  code: string
  name: string
  available: string
  allocated?: string
  inBond?: string
  date?: string
  itemId?: string
  tab?: string
  copies?: number
  status?: string
  url?: string
}

export interface InventoryCompare {
  variant?: 'warehouse'
  source: CompareSource
  mondayDuplicates: CompareRow[]
  sheetDuplicates: CompareRow[]
  mondayDifferences: CompareRow[]
  sheetDifferences: CompareRow[]
  savedAt?: string
  stale?: boolean
}

export function fetchInventoryCompare(scenarioId?: string, refresh = false) {
  const params = new URLSearchParams()
  if (scenarioId && scenarioId !== 'sc-inventory-sync-7d') params.set('scenario', scenarioId)
  if (refresh) params.set('refresh', '1')
  const query = params.toString()
  return request<InventoryCompare>(`/api/inventory/compare${query ? `?${query}` : ''}`)
}

export function runScenario(id: string, mode: RunMode, body: Record<string, unknown> = {}) {
  return request<{ execution: Execution }>(`/api/scenarios/${id}/run`, {
    method: 'POST',
    body: JSON.stringify({ ...body, mode }),
  })
}

export function continueExecution(scenarioId: string, executionId: string) {
  return request<{ execution: Execution }>(
    `/api/scenarios/${scenarioId}/executions/${executionId}/continue`,
    { method: 'POST' },
  )
}

export function retryExecution(scenarioId: string, executionId: string, mode: RunMode) {
  return request<{ execution: Execution }>(
    `/api/scenarios/${scenarioId}/executions/${executionId}/retry`,
    { method: 'POST', body: JSON.stringify({ mode }) },
  )
}

export function ignoreExecution(scenarioId: string, executionId: string) {
  return request<{ execution: Execution }>(
    `/api/scenarios/${scenarioId}/executions/${executionId}/ignore`,
    { method: 'POST' },
  )
}

// Practice mode belongs to this page only. Schedules and Monday events always run live.
export type RunMode = 'test' | 'production'

export function fetchHealth() {
  return request<{ ok: boolean; mailMode: 'log' | 'ses'; monday: boolean; database: boolean }>('/api/health')
}
