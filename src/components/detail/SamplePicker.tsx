import { FileText } from 'lucide-react'
import type { SampleFile } from '@/lib/api'
import { cn, friendlyText } from '@/lib/format'

/** New order from email, Test mode: choose which PO file on the board the test reads. */
export function SamplePicker({
  files,
  loading,
  error,
  selected,
  onSelect,
  disabled = false,
}: {
  files: SampleFile[]
  loading: boolean
  error: string | null
  selected: string | null
  onSelect: (assetId: string) => void
  disabled?: boolean
}) {
  return (
    <fieldset disabled={disabled} className="min-w-0">
      <legend className="text-[11px] font-semibold text-helm-400">Choose a sample file, then press Test run</legend>
      {loading ? (
        <p className="mt-2 text-sm text-helm-400">Loading the files from Monday…</p>
      ) : error ? (
        <p className="mt-2 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-700">{friendlyText(error)}</p>
      ) : files.length === 0 ? (
        <p className="mt-2 text-sm text-helm-400">No order on the board has a PDF or picture yet.</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {files.map((file) => {
            const chosen = file.assetId === selected
            return (
              <li key={file.assetId}>
                <label
                  className={cn(
                    'flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2 transition',
                    chosen ? 'border-helm-500 bg-helm-50' : 'border-helm-100 hover:border-helm-300',
                    disabled && 'cursor-default opacity-70',
                  )}
                >
                  <input
                    type="radio"
                    name="sample-file"
                    value={file.assetId}
                    checked={chosen}
                    onChange={() => onSelect(file.assetId)}
                    className="mt-1 accent-helm-600"
                  />
                  <FileText className="mt-0.5 h-4 w-4 shrink-0 text-helm-400" aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block break-words text-sm font-medium text-helm-700">{file.fileName}</span>
                    <span className="block truncate text-xs text-helm-400" title={file.itemName}>
                      {file.itemName}
                    </span>
                    <span className="block text-xs text-helm-400">
                      PO on Monday: {file.poNumber || '—'}
                    </span>
                  </span>
                </label>
              </li>
            )
          })}
        </ul>
      )}
    </fieldset>
  )
}
