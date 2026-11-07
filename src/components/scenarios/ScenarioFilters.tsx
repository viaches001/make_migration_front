import { Search } from 'lucide-react'
import type { ScenarioStatus } from '@/types/automation'
import { cn } from '@/lib/format'

const statuses: Array<{ id: 'all' | ScenarioStatus; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'on', label: 'On' },
  { id: 'off', label: 'Off' },
  { id: 'error', label: 'Needs a look' },
]

interface Props {
  query: string
  status: 'all' | ScenarioStatus
  folder: string
  folders: string[]
  onQueryChange: (value: string) => void
  onStatusChange: (value: 'all' | ScenarioStatus) => void
  onFolderChange: (value: string) => void
}

export function ScenarioFilters({
  query,
  status,
  folder,
  folders,
  onQueryChange,
  onStatusChange,
  onFolderChange,
}: Props) {
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
      <div className="relative max-w-md flex-1">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-helm-300" />
        <input
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search"
          className="w-full rounded-xl border border-helm-100 bg-white py-2.5 pl-10 pr-3 text-sm outline-none ring-helm-500/20 focus:ring-4"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="flex rounded-xl border border-helm-100 bg-white p-1">
          {statuses.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => onStatusChange(item.id)}
              className={cn(
                'rounded-lg px-3 py-1.5 text-xs font-semibold transition',
                status === item.id
                  ? 'bg-helm-600 text-white'
                  : 'text-helm-400 hover:text-helm-600',
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <select
          value={folder}
          onChange={(e) => onFolderChange(e.target.value)}
          className="rounded-xl border border-helm-100 bg-white px-3 py-2 text-xs font-semibold text-helm-600 outline-none"
        >
          <option value="all">All</option>
          {folders.map((f) => (
            <option key={f} value={f}>
              {f}
            </option>
          ))}
        </select>
      </div>
    </div>
  )
}
