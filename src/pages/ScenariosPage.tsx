import { useEffect, useMemo, useState } from 'react'
import { fetchScenarios, setScenarioStatus } from '@/lib/api'
import type { Scenario, ScenarioStatus } from '@/types/automation'
import { ScenarioCard } from '@/components/scenarios/ScenarioCard'
import { ScenarioFilters } from '@/components/scenarios/ScenarioFilters'

export function ScenariosPage() {
  const [items, setItems] = useState<Scenario[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<'all' | ScenarioStatus>('all')
  const [folder, setFolder] = useState('all')

  useEffect(() => {
    let cancelled = false
    fetchScenarios()
      .then((body) => {
        if (cancelled) return
        if (!Array.isArray(body.scenarios)) {
          setItems([])
          setError('The API response did not include scenarios.')
          return
        }
        setItems(body.scenarios)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load scenarios')
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [])

  const list = Array.isArray(items) ? items : []

  const folders = useMemo(
    () => [...new Set(list.map((s) => s.folder))].sort(),
    [list],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return list
      .filter((s) => {
        if (status !== 'all' && s.status !== status) return false
        if (folder !== 'all' && s.folder !== folder) return false
        if (!q) return true
        return (
          s.name.toLowerCase().includes(q) ||
          s.description.toLowerCase().includes(q) ||
          s.tags.some((t) => t.includes(q))
        )
      })
      .sort((a, b) => a.name.localeCompare(b.name))
  }, [list, query, status, folder])

  async function handleToggle(id: string) {
    const current = items.find((scenario) => scenario.id === id)
    if (!current) return
    const next = current.status === 'on' ? 'off' : 'on'
    const body = await setScenarioStatus(id, next)
    setItems((prev) => prev.map((scenario) => (scenario.id === id ? body.scenario : scenario)))
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-tight text-helm-700">
            Scenarios
          </h1>
        </div>
        <div className="text-sm text-helm-400">
          <span className="font-semibold text-helm-600">{filtered.length}</span> shown
          {' · '}
          <span className="font-semibold text-helm-600">
            {list.filter((s) => s.status === 'on').length}
          </span>{' '}
          on
        </div>
      </div>

      <ScenarioFilters
        query={query}
        status={status}
        folder={folder}
        folders={folders}
        onQueryChange={setQuery}
        onStatusChange={setStatus}
        onFolderChange={setFolder}
      />

      {error && (
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {loading && !error && (
        <p className="text-sm text-helm-400">Loading scenarios…</p>
      )}

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {filtered.map((scenario) => (
          <ScenarioCard
            key={scenario.id}
            scenario={scenario}
            onToggle={(id) => {
              handleToggle(id).catch((err: unknown) => {
                setError(err instanceof Error ? err.message : 'Could not update the scenario')
              })
            }}
          />
        ))}
      </div>

      {!loading && filtered.length === 0 && !error && (
        <div className="rounded-2xl border border-dashed border-helm-200 bg-white px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold text-helm-600">
            No scenarios match
          </p>
          <p className="mt-1 text-sm text-helm-400">
            Try clearing search or switching status / folder filters.
          </p>
        </div>
      )}
    </div>
  )
}
