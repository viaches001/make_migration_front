import { Link } from 'react-router-dom'
import { Clock3, Zap } from 'lucide-react'
import type { Scenario } from '@/types/automation'
import { cn, formatDateTime } from '@/lib/format'

interface Props {
  scenario: Scenario
  onToggle: (id: string) => void
}

export function ScenarioCard({ scenario, onToggle }: Props) {
  const isOn = scenario.status === 'on'

  return (
    <article
      className={cn(
        'group rounded-2xl border bg-white p-5 shadow-sm transition',
        isOn
          ? 'border-helm-200 hover:border-helm-400 hover:shadow-md'
          : 'border-helm-100 opacity-80 hover:opacity-100',
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <span
              className={cn(
                'inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold uppercase tracking-wide',
                isOn ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-500',
              )}
            >
              {isOn ? 'Active' : 'Inactive'}
            </span>
            <span className="rounded-full bg-helm-50 px-2 py-0.5 text-[11px] font-medium text-helm-400">
              {scenario.folder}
            </span>
          </div>
          <Link
            to={`/scenarios/${scenario.id}`}
            className="font-display text-base font-semibold leading-snug text-helm-700 transition group-hover:text-helm-500"
          >
            {scenario.name}
          </Link>
          <p className="mt-1 line-clamp-2 text-sm text-helm-400">{scenario.description}</p>
        </div>

        <button
          type="button"
          role="switch"
          aria-checked={isOn}
          onClick={() => onToggle(scenario.id)}
          className={cn(
            'relative h-7 w-12 shrink-0 rounded-full transition',
            isOn ? 'bg-helm-500' : 'bg-slate-300',
          )}
        >
          <span
            className={cn(
              'absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition',
              isOn ? 'left-5' : 'left-0.5',
            )}
          />
        </button>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-4 border-t border-helm-50 pt-4 text-xs text-helm-400">
        <span className="inline-flex items-center gap-1.5">
          <Zap className="h-3.5 w-3.5 text-coral" />
          {scenario.triggerLabel}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Clock3 className="h-3.5 w-3.5" />
          {formatDateTime(scenario.lastRunAt)}
        </span>
        {scenario.lastRunAt && (
          <span className="ml-auto font-semibold text-helm-600">
            {scenario.successRate.toFixed(1)}% success
          </span>
        )}
      </div>
    </article>
  )
}
