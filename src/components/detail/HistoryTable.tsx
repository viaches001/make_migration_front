import { Sparkles } from 'lucide-react'
import type { Execution } from '@/types/automation'
import { cn, formatDateTime, formatDuration } from '@/lib/format'

interface Props {
  rows: Execution[]
  onAnalyze: (execution: Execution) => void
}

const statusStyles: Record<string, string> = {
  success: 'bg-emerald-50 text-emerald-700',
  error: 'bg-red-50 text-red-700',
  warning: 'bg-amber-50 text-amber-700',
  running: 'bg-sky-50 text-sky-700',
  pending: 'bg-sky-50 text-sky-700',
  incomplete: 'bg-orange-50 text-orange-700',
}

function statusLabel(status: string) {
  if (status === 'running' || status === 'pending') return 'Pending'
  return status
}

function isPending(status: string) {
  return status === 'running' || status === 'pending'
}

export function HistoryTable({ rows, onAnalyze }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-helm-200 bg-white px-6 py-14 text-center text-sm text-helm-400">
        No executions yet for this scenario.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-2xl border border-helm-100 bg-white">
      <table className="w-full text-left text-sm">
        <thead className="bg-canvas/80 text-[11px] uppercase tracking-wider text-helm-300">
          <tr>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Started</th>
            <th className="px-4 py-3 font-semibold">Duration</th>
            <th className="px-4 py-3 font-semibold">Operations</th>
            <th className="px-4 py-3 font-semibold">Summary</th>
            <th className="px-4 py-3 font-semibold" />
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id} className="border-t border-helm-50 hover:bg-helm-50/40">
              <td className="px-4 py-3">
                <span
                  className={cn(
                    'inline-flex rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize',
                    statusStyles[row.status],
                    isPending(row.status) && 'animate-pulse',
                  )}
                >
                  {statusLabel(row.status)}
                </span>
              </td>
              <td className="px-4 py-3 text-helm-600">{formatDateTime(row.startedAt)}</td>
              <td className="px-4 py-3 text-helm-500">
                {isPending(row.status) ? '—' : formatDuration(row.durationMs)}
              </td>
              <td className="px-4 py-3 text-helm-500">{isPending(row.status) ? '—' : row.operations}</td>
              <td className="max-w-xs truncate px-4 py-3 text-helm-400">
                {isPending(row.status) ? 'Running' : (row.summary ?? row.errorSummary ?? 'Completed successfully')}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex justify-end gap-2">
                  {(row.status === 'error' || row.status === 'warning') && (
                    <button
                      type="button"
                      onClick={() => onAnalyze(row)}
                      className="inline-flex items-center gap-1 rounded-lg bg-helm-50 px-2.5 py-1.5 text-xs font-semibold text-helm-600 hover:bg-helm-100"
                    >
                      <Sparkles className="h-3.5 w-3.5 text-gold" />
                      Why?
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
