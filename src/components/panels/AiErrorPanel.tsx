import { Sparkles, X } from 'lucide-react'
import type { AiAnalysis, Execution } from '@/types/automation'
import { cn } from '@/lib/format'

interface Props {
  execution: Execution
  analysis: AiAnalysis | undefined
  onClose: () => void
}

const confidenceStyles = {
  high: 'bg-emerald-50 text-emerald-700',
  medium: 'bg-amber-50 text-amber-700',
  low: 'bg-slate-100 text-slate-600',
}

export function AiErrorPanel({ execution, analysis, onClose }: Props) {
  return (
    <div className="animate-panel fixed bottom-4 right-4 z-50 w-[min(420px,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-helm-100 bg-white shadow-panel">
      <div className="flex items-start justify-between gap-3 bg-gradient-to-r from-helm-600 to-helm-500 px-4 py-3 text-white">
        <div className="flex items-start gap-2">
          <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-gold-muted" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-white/70">
              What happened
            </p>
            <h3 className="font-display text-sm font-semibold leading-snug">
              {analysis?.title ?? 'Analysis unavailable'}
            </h3>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1 text-white/70 hover:bg-white/10 hover:text-white"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="space-y-3 px-4 py-3">
        <p className="text-xs text-helm-400">
          Execution <span className="font-mono text-helm-600">{execution.id}</span>
          {execution.errorSummary && (
            <>
              {' · '}
              <span className="text-red-600">{execution.errorSummary}</span>
            </>
          )}
        </p>

        {analysis ? (
          <>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-helm-300">
                Why this happened
              </p>
              <p className="mt-1 text-sm font-medium text-helm-700">{analysis.rootCause}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-helm-500">
                {analysis.explanation}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-helm-300">
                Suggested fixes
              </p>
              <ol className="mt-1.5 list-decimal space-y-1.5 pl-4 text-sm text-helm-600">
                {analysis.suggestedFixes.map((fix) => (
                  <li key={fix}>{fix}</li>
                ))}
              </ol>
            </div>

            <div className="border-t border-helm-50 pt-3">
              <span
                className={cn(
                  'rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize',
                  confidenceStyles[analysis.confidence],
                )}
              >
                {analysis.confidence} confidence
              </span>
            </div>
          </>
        ) : (
          <p className="text-sm text-helm-400">
            No AI analysis is available for this execution in the mock data.
          </p>
        )}
      </div>
    </div>
  )
}
