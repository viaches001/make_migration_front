import { useCallback, useEffect, useState } from 'react'
import { Link, useOutletContext, useParams } from 'react-router-dom'
import { ArrowLeft, Play } from 'lucide-react'
import {
  continueExecution,
  fetchHealth,
  fetchHistory,
  fetchIncomplete,
  fetchScenario,
  ignoreExecution,
  retryExecution,
  runScenario,
  setScenarioStatus,
  type RunMode,
} from '@/lib/api'
import type { Execution, Scenario, ScenarioStatus } from '@/types/automation'
import { CompareView } from '@/components/detail/CompareView'
import { DetailTabs, type DetailTab } from '@/components/detail/DetailTabs'
import { FlowView } from '@/components/detail/FlowView'
import { flowOutcome, inventoryFlowOutcome } from '@/components/detail/flowNodes'
import { HistoryTable } from '@/components/detail/HistoryTable'
import { IncompleteTable } from '@/components/detail/IncompleteTable'
import { AiErrorPanel } from '@/components/panels/AiErrorPanel'
import { cn, formatDateTime, friendlyText } from '@/lib/format'

export function ScenarioDetailPage() {
  const { id = '' } = useParams()
  const { mode } = useOutletContext<{ mode: RunMode }>()
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [missing, setMissing] = useState(false)
  const [tab, setTab] = useState<DetailTab>('history')
  const [history, setHistory] = useState<Execution[]>([])
  const [incomplete, setIncomplete] = useState<Execution[]>([])
  const [activeExecution, setActiveExecution] = useState<Execution | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [progressNote, setProgressNote] = useState<string | null>(null)
  const [running, setRunning] = useState(false)
  const [mailMode, setMailMode] = useState<'log' | 'ses' | null>(null)
  const [pendingRun, setPendingRun] = useState<Execution | null>(null)
  const [flowProgress, setFlowProgress] = useState<ReturnType<typeof flowOutcome> | null>(null)
  const [flowExecution, setFlowExecution] = useState<Execution | null>(null)
  const [selectedNode, setSelectedNode] = useState<number | null>(null)

  const load = useCallback(async () => {
    const [scenarioBody, historyBody, incompleteBody] = await Promise.all([
      fetchScenario(id),
      fetchHistory(id),
      fetchIncomplete(id),
    ])
    setScenario(scenarioBody.scenario)
    setHistory(historyBody.executions)
    setIncomplete(incompleteBody.executions)
  }, [id])

  useEffect(() => {
    let cancelled = false
    load()
      .catch((err: unknown) => {
        if (cancelled) return
        const message = err instanceof Error ? err.message : 'Could not load scenario'
        if (message.includes('not found') || message.includes('404')) setMissing(true)
        else setError(message)
      })
    fetchHealth()
      .then((health) => {
        if (!cancelled) setMailMode(health.mailMode)
      })
      .catch(() => {
        if (!cancelled) setMailMode(null)
      })
    return () => {
      cancelled = true
    }
  }, [load])

  function showToast(message: string) {
    setToast(message)
    window.setTimeout(() => setToast(null), 30000)
  }

  async function handleToggle() {
    if (!scenario) return
    const next: ScenarioStatus = scenario.status === 'on' ? 'off' : 'on'
    const body = await setScenarioStatus(scenario.id, next)
    setScenario(body.scenario)
  }

  function beginPending() {
    setPendingRun({
      id: `pending-${id}`,
      scenarioId: id,
      status: 'pending',
      startedAt: new Date().toISOString(),
      finishedAt: null,
      durationMs: null,
      operations: 0,
      summary: 'Running',
    })
  }

  const inventoryScenario = id === 'sc-inventory-sync-7d'
  const warehouseScenario =
    id === 'sc-inventory-sync-fdl' || id === 'sc-inventory-sync-hanover' || id === 'sc-inventory-sync-nl'
  const showCompare = (inventoryScenario || warehouseScenario) && mode === 'production'
  const activeTab = showCompare || tab !== 'compare' ? tab : 'history'
  const outcomeFor = inventoryScenario || warehouseScenario ? inventoryFlowOutcome : flowOutcome

  async function followRun(first: { execution: Execution }) {
    let body = first
    let guard = 0
    while (body.execution.status === 'running' && guard < 400) {
      guard += 1
      setFlowExecution(body.execution)
      setFlowProgress({ current: 0 })
      setProgressNote(friendlyText(body.execution.summary ?? 'Saving the inventory.'))
      body = await continueExecution(id, body.execution.id)
    }
    const outcome = outcomeFor(body.execution)
    setFlowExecution(body.execution)
    setFlowProgress(outcome)
    setProgressNote(null)
    await load()
    showToast(friendlyText(body.execution.summary ?? 'Finished'))
  }

  async function handleRunSample() {
    setRunning(true)
    setError(null)
    setProgressNote(null)
    setTab('flow')
    beginPending()
    setFlowExecution(null)
    setFlowProgress({ current: 0 })
    try {
      await followRun(await runScenario(id))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sample run failed')
      setProgressNote(null)
      setFlowProgress(null)
      setFlowExecution(null)
      await load().catch(() => undefined)
    } finally {
      setPendingRun(null)
      setRunning(false)
    }
  }

  async function handleRetry(execId: string) {
    beginPending()
    setError(null)
    try {
      await followRun(await retryExecution(id, execId))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Retry failed')
      setProgressNote(null)
      await load().catch(() => undefined)
    } finally {
      setPendingRun(null)
    }
  }

  async function handleIgnore(execId: string) {
    await ignoreExecution(id, execId)
    await load()
    showToast('Cleared')
  }

  if (missing) {
    return (
      <div className="px-4 py-6 sm:px-6">
        <div className="rounded-2xl border border-dashed border-helm-200 bg-white px-6 py-16 text-center">
          <p className="font-display text-lg font-semibold text-helm-600">Scenario not found</p>
          <Link to="/" className="mt-3 inline-block text-sm font-semibold text-coral">
            Back to scenarios
          </Link>
        </div>
      </div>
    )
  }

  if (!scenario) {
    return <p className="px-6 py-8 text-sm text-helm-400">{error ? friendlyText(error) : 'Loading…'}</p>
  }

  const status = scenario.status
  const shownExecution = flowExecution ?? history.find((row) => row.status !== 'pending') ?? null
  const historyRows = pendingRun
    ? [pendingRun, ...history.filter((row) => row.status !== 'running')]
    : history

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="shrink-0 border-b border-helm-100 bg-white px-4 pt-3 sm:px-6">
        <Link
          to="/"
          className="mb-2 inline-flex items-center gap-1.5 text-sm font-medium text-helm-400 hover:text-helm-600"
        >
          <ArrowLeft className="h-4 w-4" />
          Home
        </Link>

        <div className="flex flex-col gap-3 pb-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-canvas px-2 py-0.5 text-[11px] font-medium text-helm-400">
                {scenario.folder}
              </span>
              <span className="text-xs text-helm-300">
                Last run {formatDateTime(scenario.lastRunAt)}
              </span>
            </div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-helm-700 sm:text-2xl">
              {scenario.name}
            </h1>
            {tab !== 'flow' && (
              <>
                <p className="mt-0.5 max-w-4xl text-sm text-helm-400">
                  {scenario.description}
                </p>
              </>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={status === 'on'}
              onClick={() => {
                handleToggle().catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : 'Could not update status')
                })
              }}
              className="flex items-center gap-2 rounded-xl border border-helm-100 px-3 py-2 text-sm font-semibold text-helm-600"
            >
              <span
                className={cn(
                  'relative h-6 w-11 rounded-full transition',
                  status === 'on' ? 'bg-helm-500' : 'bg-slate-300',
                )}
              >
                <span
                  className={cn(
                    'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition',
                    status === 'on' ? 'left-[22px]' : 'left-0.5',
                  )}
                />
              </span>
              {status === 'on' ? 'On' : 'Off'}
            </button>
            <button
              type="button"
              onClick={handleRunSample}
              disabled={running}
              className="inline-flex items-center gap-1.5 rounded-xl bg-helm-600 px-4 py-2 text-sm font-semibold text-white hover:bg-helm-500 disabled:opacity-60"
            >
              <Play className="h-4 w-4" />
              {running ? 'Running…' : 'Run'}
            </button>
          </div>
        </div>

        {progressNote && <p className="pb-2 text-sm text-helm-500">{progressNote}</p>}
        {error && <p className="pb-2 text-sm text-red-600">{friendlyText(error)}</p>}

        <DetailTabs
          active={activeTab}
          incompleteCount={incomplete.length}
          showCompare={showCompare}
          onChange={setTab}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-auto px-4 py-4 sm:px-6">
        {activeTab === 'history' && (
          <HistoryTable rows={historyRows} onAnalyze={setActiveExecution} />
        )}

        {activeTab === 'flow' && (
          <FlowView
            variant={inventoryScenario ? 'inventory' : warehouseScenario ? 'warehouse' : 'brand'}
            progress={
              running || flowProgress
                ? flowProgress
                : shownExecution
                  ? outcomeFor(shownExecution)
                  : null
            }
            execution={running ? flowExecution : shownExecution}
            mailMode={mailMode}
            boardName={scenario.boardName}
            boardId={scenario.boardId}
            selected={selectedNode}
            onSelect={setSelectedNode}
          />
        )}

        {activeTab === 'incomplete' && (
          <IncompleteTable
            rows={incomplete}
            onAnalyze={setActiveExecution}
            onRetry={handleRetry}
            onIgnore={(execId) => {
              handleIgnore(execId).catch((err: unknown) => {
                setError(err instanceof Error ? err.message : 'Could not ignore the execution')
              })
            }}
          />
        )}

        {activeTab === 'compare' && <CompareView scenarioId={id} />}
      </div>

      {activeExecution && (
        <AiErrorPanel
          execution={activeExecution}
          analysis={activeExecution.analysis}
          onClose={() => setActiveExecution(null)}
        />
      )}

      {toast && (
        <div className="animate-toast fixed bottom-4 left-1/2 z-50 w-[min(36rem,calc(100%-2rem))] -translate-x-1/2 rounded-xl bg-helm-700 px-4 py-3 text-sm font-medium leading-relaxed text-white shadow-lg">
          <div className="flex items-start gap-3">
            <p className="min-w-0 flex-1">{toast}</p>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="shrink-0 text-white/80 hover:text-white"
              aria-label="Dismiss result"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
