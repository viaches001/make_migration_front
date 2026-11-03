import { useCallback, useEffect, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Play } from 'lucide-react'
import {
  fetchHealth,
  fetchHistory,
  fetchIncomplete,
  fetchScenario,
  ignoreExecution,
  retryExecution,
  runScenario,
  setScenarioStatus,
} from '@/lib/api'
import type { Execution, Scenario, ScenarioStatus } from '@/types/automation'
import { DetailTabs, type DetailTab } from '@/components/detail/DetailTabs'
import { FlowView } from '@/components/detail/FlowView'
import { flowOutcome, inventoryFlowOutcome } from '@/components/detail/flowNodes'
import { HistoryTable } from '@/components/detail/HistoryTable'
import { IncompleteTable } from '@/components/detail/IncompleteTable'
import { AiErrorPanel } from '@/components/panels/AiErrorPanel'
import { cn, formatDateTime } from '@/lib/format'

export function ScenarioDetailPage() {
  const { id = '' } = useParams()
  const [scenario, setScenario] = useState<Scenario | null>(null)
  const [missing, setMissing] = useState(false)
  const [tab, setTab] = useState<DetailTab>('history')
  const [history, setHistory] = useState<Execution[]>([])
  const [incomplete, setIncomplete] = useState<Execution[]>([])
  const [activeExecution, setActiveExecution] = useState<Execution | null>(null)
  const [toast, setToast] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
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
  const outcomeFor = inventoryScenario ? inventoryFlowOutcome : flowOutcome

  async function handleRunSample() {
    setRunning(true)
    setError(null)
    setTab('flow')
    beginPending()
    setFlowExecution(null)
    setFlowProgress({ current: 0 })
    try {
      const body = await runScenario(id)
      const outcome = outcomeFor(body.execution)
      setFlowExecution(body.execution)
      setFlowProgress(outcome)
      await load()
      showToast(body.execution.summary ?? 'Sample run finished')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Sample run failed')
      setFlowProgress(null)
      setFlowExecution(null)
    } finally {
      setPendingRun(null)
      setRunning(false)
    }
  }

  async function handleRetry(execId: string) {
    beginPending()
    try {
      const body = await retryExecution(id, execId)
      setFlowExecution(body.execution)
      setFlowProgress(outcomeFor(body.execution))
      await load()
      showToast(body.execution.summary ?? 'Retry finished')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Retry failed')
    } finally {
      setPendingRun(null)
    }
  }

  async function handleIgnore(execId: string) {
    await ignoreExecution(id, execId)
    await load()
    showToast('Incomplete execution ignored')
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
    return <p className="px-6 py-8 text-sm text-helm-400">{error ?? 'Loading scenario…'}</p>
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
          Scenarios
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
              {mailMode && (
                <span className="text-xs text-helm-300">
                  {mailMode === 'ses' ? 'Mail sends through AWS SES' : 'Email is not configured'}
                </span>
              )}
            </div>
            <h1 className="font-display text-xl font-semibold tracking-tight text-helm-700 sm:text-2xl">
              {scenario.name}
            </h1>
            {tab !== 'flow' && (
              <>
                <p className="mt-0.5 max-w-4xl text-sm text-helm-400">
                  {scenario.description}
                </p>
                <p className="mt-1 font-mono text-[11px] text-helm-300">
                  POST /api/webhooks/monday/brand-approval
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

        {error && <p className="pb-2 text-sm text-red-600">{error}</p>}

        <DetailTabs
          active={tab}
          incompleteCount={incomplete.length}
          onChange={setTab}
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-auto px-4 py-4 sm:px-6">
        {tab === 'history' && (
          <HistoryTable rows={historyRows} onAnalyze={setActiveExecution} />
        )}

        {tab === 'flow' && (
          <FlowView
            variant={inventoryScenario ? 'inventory' : 'brand'}
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

        {tab === 'incomplete' && (
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
