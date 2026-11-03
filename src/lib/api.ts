import type { Execution, Scenario, ScenarioStatus } from '@/types/automation'

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

export function fetchHistory(id: string) {
  return request<{ executions: Execution[] }>(`/api/scenarios/${id}/history`)
}

export function fetchIncomplete(id: string) {
  return request<{ executions: Execution[] }>(`/api/scenarios/${id}/incomplete`)
}

export function runScenario(id: string, body: unknown = {}) {
  return request<{ execution: Execution }>(`/api/scenarios/${id}/run`, {
    method: 'POST',
    body: JSON.stringify(body),
  })
}

export function continueExecution(scenarioId: string, executionId: string) {
  return request<{ execution: Execution }>(
    `/api/scenarios/${scenarioId}/executions/${executionId}/continue`,
    { method: 'POST' },
  )
}

export function retryExecution(scenarioId: string, executionId: string) {
  return request<{ execution: Execution }>(
    `/api/scenarios/${scenarioId}/executions/${executionId}/retry`,
    { method: 'POST' },
  )
}

export function ignoreExecution(scenarioId: string, executionId: string) {
  return request<{ execution: Execution }>(
    `/api/scenarios/${scenarioId}/executions/${executionId}/ignore`,
    { method: 'POST' },
  )
}

export type RunMode = 'test' | 'production'

export function fetchRuntime() {
  return request<{ mode: RunMode }>('/api/runtime')
}

export function setRuntimeMode(mode: RunMode) {
  return request<{ mode: RunMode }>('/api/runtime', {
    method: 'PATCH',
    body: JSON.stringify({ mode }),
  })
}

export function fetchHealth() {
  return request<{ ok: boolean; mailMode: 'log' | 'ses'; monday: boolean; database: boolean }>('/api/health')
}
