import { Fragment, useState } from 'react'
import { ChevronDown, ChevronRight, Sparkles } from 'lucide-react'
import { RunEmails } from '@/components/detail/RunEmails'
import { runModeOf } from '@/lib/runMode'
import type { Execution } from '@/types/automation'
import { cn, formatDateTime, formatDuration, friendlyText } from '@/lib/format'

interface Props {
  scenarioId: string
  rows: Execution[]
  onAnalyze: (execution: Execution) => void
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
}

const statusStyles: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700',
  error: 'bg-red-50 text-red-700',
  warning: 'bg-amber-50 text-amber-700',
  running: 'bg-sky-50 text-sky-700',
  pending: 'bg-sky-50 text-sky-700',
  listening: 'bg-sky-50 text-sky-700',
  incomplete: 'bg-orange-50 text-orange-700',
}

function statusLabel(status: string) {
  if (status === 'listening') return 'Listening'
  if (status === 'running' || status === 'pending') return 'Working'
  if (status === 'success') return 'Done'
  if (status === 'error') return 'Problem'
  if (status === 'incomplete') return 'Stopped'
  if (status === 'warning') return 'Check'
  return status
}

function isPending(status: string) {
  return status === 'running' || status === 'pending' || status === 'listening'
}


export function HistoryTable({ scenarioId, rows, onAnalyze, hasMore = false, loadingMore = false, onLoadMore }: Props) {
  const [openId, setOpenId] = useState<string | null>(null)
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-helm-200 bg-white px-6 py-14 text-center text-sm text-helm-400">
        Nothing has run yet.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-helm-100 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-canvas/80 text-[11px] uppercase tracking-wider text-helm-300">
          <tr>
            <th className="px-4 py-3 font-semibold">Result</th>
            <th className="px-4 py-3 font-semibold">Saved</th>
            <th className="px-4 py-3 font-semibold">When</th>
            <th className="px-4 py-3 font-semibold">Took</th>
            <th className="px-4 py-3 font-semibold">What happened</th>
            <th className="px-4 py-3 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const mode = runModeOf(row)
            const openable = !isPending(row.status) && !row.id.startsWith('pending-')
            const open = openable && openId === row.id
            return (
            <Fragment key={row.id}>
            <tr
              className={cn('border-t border-helm-50 hover:bg-helm-50/40', openable && 'cursor-pointer', open && 'bg-helm-50/40')}
              onClick={openable ? () => setOpenId(open ? null : row.id) : undefined}
              title={openable ? (open ? 'Hide this run' : 'Show this run and its emails') : undefined}
            >
              <td className="px-4 py-3">
                <span className="inline-flex items-center gap-1.5">
                {openable ? (
                  open ? (
                    <ChevronDown className="h-3.5 w-3.5 text-helm-400" aria-hidden="true" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 text-helm-300" aria-hidden="true" />
                  )
                ) : (
                  <span className="w-3.5" />
                )}
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize',
                    statusStyles[row.status],
                    isPending(row.status) && 'animate-pulse',
                  )}
                >
                  {statusLabel(row.status)}
                </span>
                </span>
              </td>
              <td className="px-4 py-3">
                {mode ? (
                  <span
                    className={cn(
                      'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold',
                      mode === 'production'
                        ? 'bg-helm-600 text-white'
                        : 'bg-helm-50 text-helm-600',
                    )}
                  >
                    {mode === 'production' ? 'Yes' : 'Practice only'}
                  </span>
                ) : (
                  <span className="text-helm-300">—</span>
                )}
              </td>
              <td className="px-4 py-3 text-helm-600">{formatDateTime(row.startedAt)}</td>
              <td className="px-4 py-3 text-helm-500">
                {isPending(row.status) ? '—' : formatDuration(row.durationMs)}
              </td>
              <td className="max-w-md truncate px-4 py-3 text-helm-500">
                {isPending(row.status) ? 'Working' : friendlyText(row.summary ?? row.errorSummary ?? 'Finished')}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  {(row.status === 'error' || row.status === 'warning') && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        onAnalyze(row)
                      }}
                      className="inline-flex items-center gap-1 rounded-lg bg-helm-50 px-2.5 py-1.5 text-xs font-semibold text-helm-600 hover:bg-helm-100"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-gold" />
                      Why?
                    </button>
                  )}
                </div>
              </td>
            </tr>
            {open && (
              <tr className="border-t border-helm-50 bg-canvas/40">
                <td colSpan={6} className="px-4 py-4">
                  <RunEmails scenarioId={scenarioId} executionId={row.id} />
                </td>
              </tr>
            )}
            </Fragment>
            )
          })}
        </tbody>
      </table>
      {hasMore && onLoadMore && (
        <div className="border-t border-helm-50 px-4 py-3 text-center">
          <button
            type="button"
            onClick={onLoadMore}
            disabled={loadingMore}
            className="rounded-lg px-3 py-1.5 text-xs font-semibold text-helm-500 hover:bg-helm-50 disabled:opacity-60"
          >
            {loadingMore ? 'Loading…' : 'Show older runs'}
          </button>
        </div>
      )}
    </div>
  )
}
