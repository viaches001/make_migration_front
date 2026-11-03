import { cn } from '@/lib/format'

export type DetailTab = 'history' | 'flow' | 'incomplete'

interface Props {
  active: DetailTab
  incompleteCount: number
  onChange: (tab: DetailTab) => void
}

const tabs: Array<{ id: DetailTab; label: string }> = [
  { id: 'history', label: 'History' },
  { id: 'flow', label: 'Flow' },
  { id: 'incomplete', label: 'Incomplete executions' },
]

export function DetailTabs({ active, incompleteCount, onChange }: Props) {
  return (
    <div className="flex gap-1 border-b border-helm-100">
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          onClick={() => onChange(tab.id)}
          className={cn(
            'relative px-4 py-2.5 text-sm font-semibold transition',
            active === tab.id
              ? 'text-helm-600'
              : 'text-helm-300 hover:text-helm-500',
          )}
        >
          {tab.label}
          {tab.id === 'incomplete' && incompleteCount > 0 && (
            <span className="ml-1.5 rounded-full bg-coral/15 px-1.5 py-0.5 text-[10px] font-bold text-coral-dark">
              {incompleteCount}
            </span>
          )}
          {active === tab.id && (
            <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-helm-500" />
          )}
        </button>
      ))}
    </div>
  )
}
