import { ExternalLink, FilePlus2 } from 'lucide-react'
import type { Execution } from '@/types/automation'
import { friendlyText } from '@/lib/format'

/** New order from email, Test mode: adds the shown Test run to Monday by hand, then links to the row. */
export function AddToMonday({
  execution,
  boardName,
  busy,
  error,
  onAdd,
}: {
  execution: Execution | null
  boardName: string
  busy: boolean
  error: string | null
  onAdd: (executionId: string) => void
}) {
  const order = execution?.order
  const ready =
    execution?.mode === 'test' && execution.status === 'success' && order?.source === 'sample'

  if (!execution || !ready) {
    return (
      <p className="text-sm leading-relaxed text-helm-400">
        Run a test first. This button then adds that result to {boardName}.
      </p>
    )
  }

  if (order?.pulseId) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] font-semibold text-helm-400">Added to Monday</p>
        <a
          href={order.mondayUrl || '#'}
          target="_blank"
          rel="noreferrer"
          className="inline-flex max-w-full items-center gap-1.5 rounded-xl bg-helm-600 px-4 py-2 text-sm font-semibold text-white hover:bg-helm-500"
        >
          <ExternalLink className="h-4 w-4 shrink-0" />
          <span className="truncate">Open {order.mondayItemName || 'the row'} on Monday</span>
        </a>
        {order.mondayUrl && <p className="break-all text-xs text-helm-400">{order.mondayUrl}</p>}
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold text-helm-400">Add this result to Monday</p>
      <p className="text-sm leading-relaxed text-helm-500">
        Adds a new row to {boardName} the way the team enters an order: State, Distributor Partner, Order Date and
        PO number filled in, the file attached, and one subitem per order line in cases, linked to the Items board
        row it matched. Client and Brand are always TEST instead of the real client and brand. Its name starts with [Test], so it is easy to find and delete.
      </p>
      <button
        type="button"
        onClick={() => onAdd(execution.id)}
        disabled={busy}
        className="inline-flex items-center gap-1.5 rounded-xl bg-helm-600 px-4 py-2 text-sm font-semibold text-white hover:bg-helm-500 disabled:opacity-60"
      >
        <FilePlus2 className="h-4 w-4" />
        {busy ? 'Adding to Monday…' : 'Add to Monday'}
      </button>
      {error && <p className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{friendlyText(error)}</p>}
    </div>
  )
}
