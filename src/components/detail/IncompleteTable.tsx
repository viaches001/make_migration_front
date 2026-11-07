import { RotateCcw, Sparkles, Trash2 } from 'lucide-react'
import type { Execution } from '@/types/automation'
import { formatDateTime, friendlyText } from '@/lib/format'

interface Props {
  rows: Execution[]
  onAnalyze: (execution: Execution) => void
  onRetry: (id: string) => void
  onIgnore: (id: string) => void
}

export function IncompleteTable({ rows, onAnalyze, onRetry, onIgnore }: Props) {
  if (rows.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-helm-200 bg-white px-6 py-14 text-center text-sm text-helm-400">
        Everything finished. Nothing needs attention.
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {rows.map((row) => (
        <article
          key={row.id}
          className="rounded-2xl border border-coral/20 bg-white p-4 shadow-sm"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-700">
                  Stopped
                </span>
                <span className="text-xs text-helm-400">
                  {formatDateTime(row.startedAt)}
                </span>
              </div>
              <p className="mt-2 text-sm font-semibold text-helm-700">
                {friendlyText(row.incompleteReason || 'This run stopped before it finished.')}
              </p>
              {row.errorSummary && (
                <p className="mt-1 text-sm text-helm-400">{friendlyText(row.errorSummary)}</p>
              )}
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => onAnalyze(row)}
                className="inline-flex items-center gap-1 rounded-lg bg-helm-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-helm-500"
              >
                <Sparkles className="h-3.5 w-3.5" />
                Why?
              </button>
              <button
                type="button"
                onClick={() => onRetry(row.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-helm-100 px-3 py-1.5 text-xs font-semibold text-helm-600 hover:bg-helm-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Try again
              </button>
              <button
                type="button"
                onClick={() => onIgnore(row.id)}
                className="inline-flex items-center gap-1 rounded-lg border border-helm-100 px-3 py-1.5 text-xs font-semibold text-helm-400 hover:bg-helm-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Clear
              </button>
            </div>
          </div>
        </article>
      ))}
    </div>
  )
}
