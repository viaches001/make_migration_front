import { useEffect, useState } from 'react'
import { Loader2 } from 'lucide-react'
import { fetchInventoryCompare, type CompareRow, type InventoryCompare } from '@/lib/api'
import { cn, formatDateTime, friendlyText } from '@/lib/format'

type CompareSection = 'duplicates' | 'compare'

function fileDate(value: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return value
  return `${match[2]}/${match[3]}/${match[1]}`
}

function SourceLine({ report }: { report: InventoryCompare }) {
  const { source } = report
  return (
    <div className="rounded-2xl border border-helm-100 bg-white px-4 py-3 text-sm text-helm-600">
      <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-helm-300">
          Inventory file
        </span>
        <a
          href={source.url}
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-helm-600 underline decoration-helm-200 underline-offset-2 hover:text-helm-500"
        >
          {source.name || 'Open spreadsheet'}
        </a>
        {source.date && <span className="text-helm-400">{fileDate(source.date)}</span>}
        {report.savedAt && <span className="text-helm-400">Checked {formatDateTime(report.savedAt)}</span>}
      </div>
    </div>
  )
}

function Reloading({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-helm-100 bg-white px-4 py-3 text-sm font-semibold text-helm-600" role="status">
      <Loader2 className="h-4 w-4 shrink-0 animate-spin text-helm-500" />
      {label}
    </div>
  )
}

function SectionTabs({
  active,
  onChange,
}: {
  active: CompareSection
  onChange: (section: CompareSection) => void
}) {
  const sections: Array<{ id: CompareSection; label: string }> = [
    { id: 'duplicates', label: 'Duplicated rows' },
    { id: 'compare', label: 'Compare' },
  ]
  return (
    <div className="flex gap-1">
      {sections.map((section) => (
        <button
          key={section.id}
          type="button"
          onClick={() => onChange(section.id)}
          className={cn(
            'rounded-full px-3 py-1.5 text-sm font-semibold transition',
            active === section.id
              ? 'bg-helm-600 text-white'
              : 'bg-white text-helm-400 hover:text-helm-600',
          )}
        >
          {section.label}
        </button>
      ))}
    </div>
  )
}

function DataTable({
  title,
  rows,
  columns,
  empty,
}: {
  title: string
  rows: CompareRow[]
  columns: Array<{ key: keyof CompareRow | 'item'; label: string }>
  empty: string
}) {
  return (
    <section className="min-w-0 overflow-hidden rounded-2xl border border-helm-100 bg-white">
      <div className="flex items-center justify-between border-b border-helm-100 px-4 py-3">
        <h2 className="text-sm font-semibold text-helm-700">{title}</h2>
        <span className="text-xs text-helm-300">{rows.length}</span>
      </div>
      {rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-helm-400">{empty}</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-canvas/80 text-[10px] uppercase tracking-wider text-helm-300">
              <tr>
                {columns.map((column) => (
                  <th key={column.label} className="px-3 py-2 font-semibold">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, index) => (
                <tr key={`${row.itemId || row.code}-${row.tab || ''}-${index}`} className="border-t border-helm-100">
                  {columns.map((column) => (
                    <td key={column.label} className="px-3 py-1.5 text-helm-600">
                      {column.key === 'item' && row.url ? (
                        <a href={row.url} target="_blank" rel="noreferrer" className="font-medium hover:text-helm-500">
                          {row.name || row.itemId}
                        </a>
                      ) : column.key === 'date' ? (
                        fileDate(String(row.date ?? ''))
                      ) : (
                        String(row[column.key as keyof CompareRow] ?? '')
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

function quantityColumns(warehouse: boolean): Array<{ key: keyof CompareRow | 'item'; label: string }> {
  if (!warehouse) return [{ key: 'available', label: 'Available' }]
  return [
    { key: 'available', label: 'Available' },
    { key: 'allocated', label: 'Allocated' },
    { key: 'inBond', label: 'In Bond' },
  ]
}

export function CompareView({ scenarioId = 'sc-inventory-sync-7d' }: { scenarioId?: string }) {
  const [section, setSection] = useState<CompareSection>('duplicates')
  const [report, setReport] = useState<InventoryCompare | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [reloading, setReloading] = useState(true)
  useEffect(() => {
    let cancelled = false
    setReloading(true)
    setReport(null)
    setError(null)
    fetchInventoryCompare(scenarioId)
      .then((body) => {
        if (cancelled) return null
        setReport(body)
        setError(null)
        if (!body.stale) return null
        return fetchInventoryCompare(scenarioId, true)
      })
      .then((fresh) => {
        if (cancelled || !fresh) return
        setReport(fresh)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load the comparison')
      })
      .finally(() => {
        if (!cancelled) setReloading(false)
      })
    return () => {
      cancelled = true
    }
  }, [scenarioId])

  if (reloading && !report) {
    return <Reloading label="Loading the comparison." />
  }
  if (!report) {
    return <p className="text-sm text-red-600">{friendlyText(error || 'The comparison could not be loaded.')}</p>
  }

  const quantities = quantityColumns(report.variant === 'warehouse')

  return (
    <div className="flex flex-col gap-4">
      {reloading && <Reloading label="Reloading the comparison." />}
      <SourceLine report={report} />
      <SectionTabs active={section} onChange={setSection} />
      {section === 'duplicates' ? (
        <div className="flex flex-col gap-4">
          <DataTable
            title="Listed more than once"
            rows={report.mondayDuplicates}
            empty="No code is listed more than once."
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'item', label: 'Item' },
              ...quantities,
              { key: 'date', label: 'Date' },
              { key: 'copies', label: 'Copies' },
            ]}
          />
          <DataTable
            title="Repeated in the file"
            rows={report.sheetDuplicates}
            empty="No code is repeated in the file."
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Item' },
              ...quantities,
              { key: 'tab', label: 'Tab' },
              { key: 'copies', label: 'Copies' },
            ]}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
          <DataTable
            title="Different in the current inventory"
            rows={report.mondayDifferences}
            empty="The current inventory matches the file."
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'item', label: 'Item' },
              ...quantities,
              { key: 'date', label: 'Date' },
              { key: 'status', label: 'Difference' },
            ]}
          />
          <DataTable
            title="Different in the new file"
            rows={report.sheetDifferences}
            empty="The file matches the current inventory."
            columns={[
              { key: 'code', label: 'Code' },
              { key: 'name', label: 'Item' },
              ...quantities,
              { key: 'status', label: 'Difference' },
            ]}
          />
        </div>
      )}
    </div>
  )
}
