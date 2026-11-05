import { useState } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Check, FileDown, Filter, Mail, MailSearch, Square, Webhook, X } from 'lucide-react'
import type { Execution } from '@/types/automation'
import { cn } from '@/lib/format'
import { inventoryNodeDetail, nodeDetail, warehouseNodeDetail, type FlowProgress } from '@/components/detail/flowNodes'

export type { FlowProgress }

interface Step {
  icon: LucideIcon
  kicker: string
  title: string
  detail: string
  stop?: string
}

const steps: Step[] = [
  {
    icon: Webhook,
    kicker: 'Monday',
    title: 'Column webhook',
    detail: 'Outgoing Orders :: share. A Client Status change starts the run.',
  },
  {
    icon: Square,
    kicker: 'Monday',
    title: 'Get item',
    detail: 'Load the order, including the parent item and subitems.',
  },
  {
    icon: Filter,
    kicker: 'Filter',
    title: 'Brand Approval',
    detail: 'Continue only when Client Status is exactly Brand Approval.',
    stop: 'Any other status stops the run.',
  },
  {
    icon: FileDown,
    kicker: 'Monday',
    title: 'Download PO',
    detail: 'Take each file in the PO File column. One email is sent per file.',
  },
  {
    icon: MailSearch,
    kicker: 'Email',
    title: 'Find addresses',
    detail: 'Use the first address in Client Sales Email and Client Order email.',
  },
  {
    icon: Mail,
    kicker: 'Email',
    title: 'Send email',
    detail: 'Subject is Brand Approval for PO, with the purchase order attached.',
  },
]

export const FLOW_STEP_COUNT = steps.length

const inventorySteps: Step[] = [
  {
    icon: Filter,
    kicker: 'Google Drive',
    title: 'Latest inventory',
    detail: 'A free model picks the newest 7D inventory file in the 7D Daily Inventory folder.',
  },
  {
    icon: Square,
    kicker: 'Monday',
    title: 'Products',
    detail: 'Create any code from cases or with Merch that is not on the product board yet.',
  },
  {
    icon: FileDown,
    kicker: 'Google Sheets',
    title: 'Case quantities',
    detail: 'Use balance case qty when a case row exists. Otherwise use available per case.',
  },
  {
    icon: Check,
    kicker: 'Monday',
    title: 'Inventory',
    detail: 'Update the 7D warehouse rows and add codes that are not stocked there yet.',
  },
]

export const INVENTORY_FLOW_STEP_COUNT = inventorySteps.length

const warehouseSteps: Step[] = [
  {
    icon: Filter,
    kicker: 'Google Sheets',
    title: 'Warehouse list',
    detail: 'Open the warehouse row and use the inventory spreadsheet and date on that row.',
  },
  {
    icon: FileDown,
    kicker: 'Google Sheets',
    title: 'Quantities',
    detail: 'Sum Available, Allocated, and In Bond by Scribebase ID.',
  },
  {
    icon: Square,
    kicker: 'Monday',
    title: 'Inventory board',
    detail: 'Update rows whose quantities or Last Input differ. Leave every other row as it is.',
  },
  {
    icon: Check,
    kicker: 'Helmsman',
    title: 'Stock',
    detail: 'Write Tax Paid, Allocated, and Held In Bond for this warehouse.',
  },
]

function stepState(index: number, progress: FlowProgress | null, hasResult: boolean) {
  if (!progress) return 'idle' as const
  if (!hasResult) {
    return index === progress.current ? ('active' as const) : ('idle' as const)
  }
  if (progress.stopped && index === progress.current) return 'stopped' as const
  if (progress.stopped && index > progress.current) return 'idle' as const
  if (index < progress.current) return 'done' as const
  if (index === progress.current) return 'active' as const
  return 'idle' as const
}

interface Props {
  variant?: 'brand' | 'inventory' | 'warehouse'
  progress?: FlowProgress | null
  execution?: Execution | null
  mailMode?: 'log' | 'ses' | null
  boardName?: string
  boardId?: string
  selected: number | null
  onSelect: (index: number | null) => void
}

export function FlowView({
  variant = 'brand',
  progress = null,
  execution = null,
  mailMode = null,
  boardName = 'Outgoing Orders :: share',
  boardId = '3633344780',
  selected,
  onSelect,
}: Props) {
  const activeSteps = variant === 'inventory' ? inventorySteps : variant === 'warehouse' ? warehouseSteps : steps
  const hasResult = Boolean(
    execution && execution.status !== 'pending' && execution.status !== 'running',
  )
  const detail =
    selected == null
      ? null
      : hideUnrun(
          variant === 'inventory'
            ? inventoryNodeDetail(selected, execution ?? null)
            : variant === 'warehouse'
              ? warehouseNodeDetail(selected, execution ?? null)
              : nodeDetail(selected, execution ?? null, mailMode, boardName, boardId),
          stepState(selected, progress, hasResult),
        )
  const selectedTitle = selected == null ? '' : activeSteps[selected]?.title

  return (
    <div className="flex min-h-[440px] flex-col gap-3 xl:flex-row">
    <section
      aria-label={
        variant === 'inventory'
          ? 'Inventory sync flow, view only'
          : variant === 'warehouse'
            ? 'Warehouse inventory sync flow, view only'
            : 'Brand Approval flow, view only'
      }
      className="relative min-h-[440px] min-w-0 flex-1 overflow-auto rounded-2xl border border-helm-100 bg-white"
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage: 'radial-gradient(#d9ebe9 1.1px, transparent 1.1px)',
          backgroundSize: '18px 18px',
        }}
      />
      <p className="relative px-5 pt-4 text-[11px] font-semibold uppercase tracking-wide text-helm-300">
        View only
      </p>
      <div className="relative flex min-w-max items-start px-5 pb-8 pt-4">
        {activeSteps.map((step, index) => {
          const state = stepState(index, progress, hasResult)
          return (
            <div key={step.title} className="flex items-start">
              <div className={cn('flex w-56 flex-col items-center', state === 'idle' && progress && 'opacity-45')}>
                <button
                  type="button"
                  aria-pressed={selected === index}
                  onClick={() => onSelect(index)}
                  className={cn(
                    'w-full rounded-2xl border bg-white p-3 text-left shadow-node',
                    selected === index && 'ring-2 ring-helm-700',
                    state === 'active' && 'border-helm-500',
                    state === 'done' && 'border-helm-300',
                    state === 'stopped' && 'border-amber-400',
                    state === 'idle' && 'border-helm-100',
                  )}
                >
                  <div className="mb-2 flex items-center gap-2">
                    <span
                      className={cn(
                        'flex h-8 w-8 items-center justify-center rounded-lg',
                        state === 'done' ? 'bg-helm-600 text-white' : 'bg-helm-50 text-helm-600',
                        state === 'active' && 'animate-pulse',
                      )}
                    >
                      {state === 'done' ? <Check className="h-4 w-4" /> : <step.icon className="h-4 w-4" />}
                    </span>
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-helm-300">
                      {state === 'active' ? 'Running' : step.kicker}
                    </span>
                  </div>
                  <h3 className="font-display text-sm font-semibold text-helm-700">{step.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-helm-400">{step.detail}</p>
                </button>
                {step.stop && (
                  <>
                    <span className={cn('h-6 w-px', state === 'stopped' ? 'bg-amber-400' : 'bg-helm-200')} />
                    <p
                      className={cn(
                        'w-full rounded-xl border border-dashed px-3 py-2 text-center text-xs leading-relaxed',
                        state === 'stopped'
                          ? 'border-amber-400 bg-amber-50 text-amber-800'
                          : 'border-helm-200 bg-canvas text-helm-500',
                      )}
                    >
                      {step.stop}
                    </p>
                  </>
                )}
              </div>
              {index < activeSteps.length - 1 && (
                <ArrowRight
                  className={cn(
                    'mx-2 mt-12 h-4 w-4 shrink-0',
                    progress && index < progress.current ? 'text-helm-500' : 'text-helm-300',
                  )}
                />
              )}
            </div>
          )
        })}
      </div>
    </section>
    <NodeInspector title={selectedTitle} detail={detail} onClose={() => onSelect(null)} />
    </div>
  )
}

function hideUnrun(
  detail: ReturnType<typeof nodeDetail>,
  state: ReturnType<typeof stepState>,
) {
  if (state === 'done' || state === 'stopped') return detail
  const waiting = [{ label: 'Value', value: 'This step has not finished yet.' }]
  return { ...detail, input: waiting, output: waiting, notice: null }
}

type InspectorTab = 'input' | 'output' | 'settings' | 'notice'

function NodeInspector({
  title,
  detail,
  onClose,
}: {
  title: string
  detail: ReturnType<typeof nodeDetail> | null
  onClose: () => void
}) {
  const [tab, setTab] = useState<InspectorTab>('input')
  const noticeLabel = detail?.notice?.tone === 'error' ? 'Error' : 'Warning'

  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-helm-100 bg-white xl:w-[520px]">
      {detail == null ? (
        <p className="px-4 py-6 text-sm leading-relaxed text-helm-400">
          Click a step to see its input, output, settings, and any error or warning.
        </p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wide text-helm-300">Step</p>
              <h3 className="font-display text-base font-semibold text-helm-700">{title}</h3>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg p-1 text-helm-400 hover:bg-helm-50 hover:text-helm-600"
              aria-label="Close step details"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          <div className="flex gap-1 border-b border-helm-100 px-2" role="tablist" aria-label="Step details">
            {(
              [
                ['input', 'Input'],
                ['output', 'Output'],
                ['settings', 'Settings'],
                ['notice', noticeLabel],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                onClick={() => setTab(id)}
                className={cn(
                  'relative px-2.5 py-2 text-xs font-semibold',
                  tab === id ? 'text-helm-600' : 'text-helm-300 hover:text-helm-500',
                )}
              >
                {label}
                {id === 'notice' && detail.notice && (
                  <span
                    className={cn(
                      'ml-1 inline-block h-1.5 w-1.5 rounded-full align-middle',
                      detail.notice.tone === 'error' ? 'bg-red-500' : 'bg-amber-500',
                    )}
                  />
                )}
                {tab === id && <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-helm-500" />}
              </button>
            ))}
          </div>
          <div className="overflow-auto px-4 py-4" role="tabpanel">
            {tab === 'input' && <FieldList fields={detail.input} />}
            {tab === 'output' && <FieldList fields={detail.output} />}
            {tab === 'settings' && <FieldList fields={detail.settings} />}
            {tab === 'notice' &&
              (detail.notice ? (
                <p
                  className={cn(
                    'rounded-xl px-3 py-2 text-sm leading-relaxed',
                    detail.notice.tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800',
                  )}
                >
                  {detail.notice.text}
                </p>
              ) : (
                <p className="text-sm text-helm-400">None</p>
              ))}
          </div>
        </div>
      )}
    </aside>
  )
}

function FieldList({ fields }: { fields: Array<{ label: string; value: string; html?: boolean; table?: { headers: string[]; rows: string[][] } }> }) {
  return (
    <dl className="space-y-3">
      {fields.map((field, index) => (
        <div key={`${field.label}-${index}`}>
          <dt className="text-[11px] font-semibold text-helm-400">{field.label}</dt>
          {field.table ? (
            field.table.rows.length ? (
              <dd className="mt-1 max-h-80 overflow-auto rounded-xl border border-helm-100">
                <table className="w-full table-fixed border-collapse text-left text-xs">
                  <thead className="sticky top-0 bg-white">
                    <tr>
                      {field.table.headers.map((header) => (
                        <th key={header} className="border-b border-helm-100 px-2 py-1.5 font-semibold text-helm-400">
                          {header}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {field.table.rows.map((row, rowIndex) => (
                      <tr key={rowIndex} className="odd:bg-canvas/50">
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="break-words px-2 py-1 align-top text-helm-700">
                            {cell}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </dd>
            ) : (
              <dd className="mt-0.5 text-sm text-helm-400">None</dd>
            )
          ) : field.html ? (
            <dd
              className="mt-1 rounded-xl border border-helm-100 bg-canvas/60 px-3 py-2 text-sm leading-relaxed text-helm-700"
              dangerouslySetInnerHTML={{ __html: field.value }}
            />
          ) : (
            <dd className="mt-0.5 text-sm leading-relaxed text-helm-700">{field.value}</dd>
          )}
        </div>
      ))}
    </dl>
  )
}
