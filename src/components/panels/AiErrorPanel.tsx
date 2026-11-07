import { Sparkles, X } from 'lucide-react'
import type { AiAnalysis, Execution } from '@/types/automation'
import { friendlyText } from '@/lib/format'

interface Props {
  execution: Execution
  analysis: AiAnalysis | undefined
  onClose: () => void
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
              {analysis?.title ?? 'Something stopped this run'}
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
        {execution.errorSummary && (
          <p className="text-sm text-red-600">{friendlyText(execution.errorSummary)}</p>
        )}

        {analysis ? (
          <>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-helm-300">
                Why this happened
              </p>
              <p className="mt-1 text-sm font-medium text-helm-700">{friendlyText(analysis.rootCause)}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-helm-500">
                {friendlyText(analysis.explanation)}
              </p>
            </div>

            <div>
              <p className="text-[11px] font-bold uppercase tracking-wider text-helm-300">
                What to do
              </p>
              <ol className="mt-1.5 list-decimal space-y-1.5 pl-4 text-sm text-helm-600">
                {analysis.suggestedFixes.map((fix) => (
                  <li key={fix}>{friendlyText(fix)}</li>
                ))}
              </ol>
            </div>

          </>
        ) : (
          <p className="text-sm text-helm-400">There is no extra detail for this run.</p>
        )}
      </div>
    </div>
  )
}
