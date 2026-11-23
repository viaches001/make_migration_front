import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { ArrowRight, Check, Clock, Sparkles, FileDown, FileText, Filter, Mail, MailSearch, Square, Webhook, X } from 'lucide-react'
import type { EmailRecipients, Execution } from '@/types/automation'
import { RecipientsEditor } from '@/components/detail/RecipientsEditor'
import { cn, friendlyText } from '@/lib/format'
import { inboundNodeDetail, inboxNodeDetail, inboxTestNodeDetail, inventoryNodeDetail, nodeDetail, pickupNodeDetail, poReceivedNodeDetail, warehouseNodeDetail, type FlowProgress } from '@/components/detail/flowNodes'

export type { FlowProgress }

interface Step {
  icon: LucideIcon
  kicker: string
  title: string
  detail: string
  stop?: string
}

const inboxSteps: Step[] = [
  {
    icon: Clock,
    kicker: 'Start',
    title: 'Check the mailbox',
    detail: 'Every 10 minutes, looks for new email sent to the orders mailbox.',
  },
  {
    icon: MailSearch,
    kicker: 'Read',
    title: 'Read the email',
    detail: 'Reads who sent it, the subject, and the attached files.',
    stop: 'No attached files stops here',
  },
  {
    icon: Square,
    kicker: 'Order',
    title: 'New order',
    detail: 'Adds an order to the board, named after the email subject.',
  },
  {
    icon: FileDown,
    kicker: 'Files',
    title: 'Save the files',
    detail: 'Puts every attached file on the order. The email is left untouched.',
    stop: 'A file that cannot be saved waits for a retry',
  },
  {
    icon: Sparkles,
    kicker: 'PO',
    title: 'Read the PO',
    detail: 'AI reads the PDFs for the PO number and fills it in. If it cannot, the order is still saved.',
  },
]

// Test mode reads a file already on the board. The mailbox is not checked and nothing is added.
const inboxTestSteps: Step[] = [
  {
    icon: FileText,
    kicker: 'Sample',
    title: 'Pick a sample file',
    detail: 'Choose a PO file from one of the 10 newest orders on the board.',
  },
  {
    icon: Sparkles,
    kicker: 'PO',
    title: 'Read the PO',
    detail: 'AI reads the file for the PO number and checks it against Monday. Nothing is added to the board.',
  },
]

const inboundSteps: Step[] = [
  {
    icon: Webhook,
    kicker: 'Start',
    title: 'Shipment status changes',
    detail: 'Runs when Shipment Status changes on NEW Domestic.',
  },
  {
    icon: MailSearch,
    kicker: 'Read',
    title: 'Read the shipment',
    detail: 'Loads the warehouse, the brand, and the inbound report.',
  },
  {
    icon: Filter,
    kicker: 'Check',
    title: 'Inbound Complete',
    detail: 'Continues only when the shipment is marked Inbound Complete.',
    stop: 'Another status stops here',
  },
  {
    icon: Mail,
    kicker: 'Brand',
    title: 'Brand owners',
    detail: 'Uses the Ops Manager address, plus the brand’s manager addresses when they are filled in.',
    stop: 'No brand email stops here',
  },
  {
    icon: FileDown,
    kicker: 'Report',
    title: 'Inbound report',
    detail: 'Attaches every inbound report and names the warehouse. With no report, the email goes without one.',
  },
  {
    icon: Check,
    kicker: 'Send',
    title: 'Send the email',
    detail: 'Sends one email to the brand owners and the Ops Manager, from the logistics mailbox with the logistics signature.',
  },
]

const pickupSteps: Step[] = [
  {
    icon: Webhook,
    kicker: 'Start',
    title: 'Order is staged',
    detail: 'Starts when an account manager marks the order staged.',
  },
  {
    icon: Square,
    kicker: 'Order',
    title: 'Read the order',
    detail: 'Opens the purchase order, the warehouse, and the email addresses.',
  },
  {
    icon: Filter,
    kicker: 'Check',
    title: 'Staged',
    detail: 'Continues only when the order is staged.',
    stop: 'Any other status stops here.',
  },
  {
    icon: MailSearch,
    kicker: 'Who',
    title: 'Outgoing or direct',
    detail: 'Outgoing uses the purchase order email. Direct uses both client emails.',
  },
  {
    icon: FileDown,
    kicker: 'Details',
    title: 'Pick up details',
    detail: 'Outgoing includes the warehouse, address, and instructions. Direct names the licensee.',
  },
  {
    icon: Mail,
    kicker: 'Send',
    title: 'Pick up email',
    detail: 'Tells them the order is ready for pick up.',
  },
]

const receivedSteps: Step[] = [
  {
    icon: Webhook,
    kicker: 'Start',
    title: 'Order is received',
    detail: 'Starts when an account manager marks the order received.',
  },
  {
    icon: Square,
    kicker: 'Order',
    title: 'Read the order',
    detail: 'Opens the order, the purchase order number, and the distributor email.',
  },
  {
    icon: Filter,
    kicker: 'Check',
    title: 'Received',
    detail: 'Continues only when the order is marked received.',
    stop: 'Any other status stops here.',
  },
  {
    icon: MailSearch,
    kicker: 'Who',
    title: 'Outgoing or direct',
    detail: 'Outgoing uses the purchase order email. Direct uses the client emails.',
  },
  {
    icon: FileDown,
    kicker: 'File',
    title: 'Purchase order',
    detail: 'Attaches the purchase order from the order.',
  },
  {
    icon: Mail,
    kicker: 'Send',
    title: 'Receipt email',
    detail: 'Tells the distributor the purchase order was received.',
  },
]

const steps: Step[] = [
  {
    icon: Webhook,
    kicker: 'Start',
    title: 'Order is ready',
    detail: 'Starts when an order is marked for brand approval.',
  },
  {
    icon: Square,
    kicker: 'Order',
    title: 'Read the order',
    detail: 'Opens the order, the purchase order, and the email addresses.',
  },
  {
    icon: Filter,
    kicker: 'Check',
    title: 'Brand approval',
    detail: 'Continues only when the order is ready for brand approval.',
    stop: 'Any other status stops here.',
  },
  {
    icon: FileDown,
    kicker: 'File',
    title: 'Purchase order',
    detail: 'Collects each purchase order file. One email is sent for each file.',
  },
  {
    icon: MailSearch,
    kicker: 'Email',
    title: 'Who receives it',
    detail: 'Uses the client email addresses on the order.',
  },
  {
    icon: Mail,
    kicker: 'Send',
    title: 'Send the email',
    detail: 'Emails the purchase order and asks the client to approve it.',
  },
]

export const FLOW_STEP_COUNT = steps.length

const inventorySteps: Step[] = [
  {
    icon: Filter,
    kicker: 'File',
    title: 'Newest file',
    detail: 'Opens the latest 7D inventory file.',
  },
  {
    icon: Square,
    kicker: 'Catalog',
    title: 'New products',
    detail: 'Adds any product that is not in the catalog yet.',
  },
  {
    icon: FileDown,
    kicker: 'Quantities',
    title: 'Read quantities',
    detail: 'Reads how many cases are available.',
  },
  {
    icon: Check,
    kicker: 'Save',
    title: 'Update inventory',
    detail: 'Saves the new quantities and dates.',
  },
]

export const INVENTORY_FLOW_STEP_COUNT = inventorySteps.length

const warehouseSteps: Step[] = [
  {
    icon: Filter,
    kicker: 'File',
    title: 'Newest file',
    detail: 'Opens the latest inventory file for this warehouse.',
  },
  {
    icon: FileDown,
    kicker: 'Quantities',
    title: 'Read quantities',
    detail: 'Adds up available, allocated, and in bond for each code.',
  },
  {
    icon: Square,
    kicker: 'Changes',
    title: 'What changed',
    detail: 'Keeps only the codes whose quantity or date is different.',
  },
  {
    icon: Check,
    kicker: 'Save',
    title: 'Update inventory',
    detail: 'Saves those quantities for this warehouse.',
  },
]

function stepState(index: number, progress: FlowProgress | null) {
  if (!progress) return 'idle' as const
  if (progress.stopped && index === progress.current) return 'stopped' as const
  if (progress.stopped && index > progress.current) return 'idle' as const
  if (index < progress.current) return 'done' as const
  if (index === progress.current) return 'active' as const
  return 'idle' as const
}

interface Props {
  variant?: 'brand' | 'received' | 'pickup' | 'inbound' | 'inbox' | 'inventory' | 'warehouse'
  progress?: FlowProgress | null
  execution?: Execution | null
  mailMode?: 'log' | 'ses' | null
  boardName?: string
  boardId?: string
  selected: number | null
  onSelect: (index: number | null) => void
  recipients?: EmailRecipients
  onSaveRecipients?: (next: EmailRecipients) => Promise<void>
  /** The page's mode. The practice list only matters, and only shows, in practice. */
  mode?: 'test' | 'production'
  /** New order from email in Test mode: the sample file chooser, shown on the first step. */
  samplePicker?: ReactNode
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
  recipients,
  onSaveRecipients,
  mode = 'production',
  samplePicker,
}: Props) {
  const inboxTest = variant === 'inbox' && mode === 'test'
  const activeSteps =
    variant === 'inventory'
      ? inventorySteps
      : variant === 'warehouse'
        ? warehouseSteps
        : variant === 'received'
          ? receivedSteps
          : variant === 'pickup'
            ? pickupSteps
            : variant === 'inbound'
              ? inboundSteps
              : variant === 'inbox'
                ? inboxTest
                  ? inboxTestSteps
                  : inboxSteps
                : steps
  const live = variant === 'inventory' || variant === 'warehouse'
  const detail =
    selected == null
      ? null
      : hideUnrun(
          variant === 'inventory'
            ? inventoryNodeDetail(selected, execution ?? null)
            : variant === 'warehouse'
              ? warehouseNodeDetail(selected, execution ?? null)
              : variant === 'received'
                ? poReceivedNodeDetail(selected, execution ?? null, mailMode, boardName, boardId)
                : variant === 'pickup'
                  ? pickupNodeDetail(selected, execution ?? null, mailMode, boardName, boardId)
                  : variant === 'inbound'
                    ? inboundNodeDetail(selected, execution ?? null, mailMode, boardName, boardId)
                  : inboxTest
                    ? inboxTestNodeDetail(selected, execution ?? null, boardName, boardId)
                  : variant === 'inbox'
                    ? inboxNodeDetail(selected, execution ?? null, boardName, boardId)
                  : nodeDetail(selected, execution ?? null, mailMode, boardName, boardId),
          stepState(selected, progress),
          live,
        )
  const selectedTitle = selected == null ? '' : activeSteps[selected]?.title

  return (
    <div className="flex min-h-[440px] flex-col gap-3 xl:flex-row">
    <section
      aria-label={
        variant === 'inventory'
          ? '7D inventory steps'
          : variant === 'warehouse'
            ? 'Warehouse inventory steps'
            : variant === 'received'
              ? 'PO received steps'
              : variant === 'pickup'
                ? 'Ready for pick up steps'
                : variant === 'inbound'
                  ? 'Inbound complete steps'
                  : variant === 'inbox'
                    ? 'New order from email steps'
                    : 'Brand approval steps'
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
      <div className="relative flex min-w-max items-start px-5 pb-8 pt-6">
        {activeSteps.map((step, index) => {
          const state = stepState(index, progress)
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
                      {state === 'active'
                        ? execution?.status === 'listening'
                          ? 'Listening'
                          : 'Running'
                        : step.kicker}
                    </span>
                  </div>
                  <h3 className="font-display text-sm font-semibold text-helm-700">{step.title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-helm-400">{step.detail}</p>
                  {live && progress && (
                    <p
                      className={cn(
                        'mt-2 text-xs font-medium',
                        state === 'stopped' ? 'text-red-700' : 'text-helm-600',
                      )}
                    >
                      {state === 'done'
                        ? 'Done'
                        : state === 'stopped'
                          ? friendlyText(execution?.summary || 'Stopped')
                          : state === 'active'
                            ? friendlyText(execution?.summary || 'Working.')
                            : 'Waiting'}
                    </p>
                  )}
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
    <NodeInspector
      title={selectedTitle}
      blurb={selected == null ? '' : activeSteps[selected]?.detail || ''}
      detail={detail}
      onClose={() => onSelect(null)}
      recipients={mode === 'test' ? recipients : undefined}
      onSaveRecipients={onSaveRecipients}
      picker={inboxTest && selected === 0 ? samplePicker : undefined}
    />
    </div>
  )
}

function hideUnrun(
  detail: ReturnType<typeof nodeDetail>,
  state: ReturnType<typeof stepState>,
  live = false,
) {
  if (state === 'done' || state === 'stopped' || (live && state === 'active')) return detail
  const waiting = [{ label: 'Value', value: 'This step has not finished yet.' }]
  return { ...detail, input: waiting, output: waiting, notice: null }
}

function NodeInspector({
  title,
  blurb,
  detail,
  onClose,
  recipients,
  onSaveRecipients,
  picker,
}: {
  title: string
  blurb: string
  detail: ReturnType<typeof nodeDetail> | null
  onClose: () => void
  recipients?: EmailRecipients
  onSaveRecipients?: (next: EmailRecipients) => Promise<void>
  picker?: ReactNode
}) {
  return (
    <aside className="flex w-full shrink-0 flex-col overflow-hidden rounded-2xl border border-helm-100 bg-white xl:w-[520px]">
      {detail == null ? (
        <p className="px-5 py-8 text-sm leading-relaxed text-helm-400">Choose a step to see what it does.</p>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-start justify-between gap-3 px-5 py-4">
            <div>
              <h3 className="font-display text-base font-semibold text-helm-700">{title}</h3>
              {blurb && <p className="mt-1 text-sm leading-relaxed text-helm-400">{blurb}</p>}
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
          <div className="overflow-auto px-5 pb-5">
            {detail.notice && (
              <p
                className={cn(
                  'mb-4 rounded-xl px-3 py-2 text-sm leading-relaxed',
                  detail.notice.tone === 'error' ? 'bg-red-50 text-red-700' : 'bg-amber-50 text-amber-800',
                )}
              >
                {friendlyText(detail.notice.text)}
              </p>
            )}
            {detail.about && detail.about.length > 0 && (
              <div className="mb-4 border-b border-helm-50 pb-4">
                <FieldList fields={detail.about} />
              </div>
            )}
            {picker && <div className="mb-4 border-b border-helm-50 pb-4">{picker}</div>}
            {detail.editRecipients && recipients && onSaveRecipients && (
              <div className="mb-4 border-b border-helm-50 pb-4">
                <RecipientsEditor recipients={recipients} onSave={onSaveRecipients} />
              </div>
            )}
            <FieldList fields={detail.output} />
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
