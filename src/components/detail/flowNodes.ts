import { friendlyText } from '@/lib/format'
import type { Execution, OrderSnapshot } from '@/types/automation'

export interface FlowProgress {
  current: number
  stopped?: boolean
  /** The current step waits for a button press, it is not running. */
  waiting?: boolean
}

const EMAIL_PATTERN = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/

export interface FlowField {
  label: string
  value: string
  html?: boolean
  /** `widths` are CSS widths per column; columns share the width equally without them. */
  table?: { headers: string[]; rows: string[][]; widths?: string[] }
}

export interface FlowNotice {
  tone: 'error' | 'warning'
  text: string
}

export interface FlowNodeDetail {
  /** How the step works. Shown even before anything has run. */
  about?: FlowField[]
  /** Show the practice and extra recipient lists, which can be edited. */
  editRecipients?: boolean
  settings: FlowField[]
  input: FlowField[]
  output: FlowField[]
  notice: FlowNotice | null
}

const EMPTY = 'Run this to see the result.'
const NOT_RUN = 'This step did not run.'

export function inboundFlowOutcome(execution: Pick<Execution, 'status' | 'summary'>): FlowProgress {
  if (execution.status === 'listening') return { current: 0 }
  const summary = execution.summary ?? ''
  if (summary.startsWith('Stopped.')) return { current: 2, stopped: true }
  if (summary.includes('brand email')) return { current: 3, stopped: true }
  if (execution.status === 'error') return { current: 1, stopped: true }
  if (execution.status === 'incomplete') return { current: 3, stopped: true }
  return { current: 6 }
}

/**
 * New order from email, Live and Test alike: a new row in Submitted Queue (made by Monday's
 * Gmail automation), its email read, and the row filled in only when it is a purchase order.
 */
export function inboxFlowOutcome(execution: Pick<Execution, 'status' | 'summary' | 'order'>): FlowProgress {
  const summary = execution.summary ?? ''
  const stage = execution.order?.stage
  if (execution.status === 'listening') return { current: 0 }
  const writing = stage === 'fill' || stage === 'revise'
  if (execution.status === 'running' || execution.status === 'pending') return { current: writing ? 2 : 1 }
  if (execution.status === 'error') return { current: writing ? 2 : 1, stopped: true }
  if (summary.startsWith('Stopped.')) return { current: 1, stopped: true }
  return { current: 3 }
}

export function pickupFlowOutcome(execution: Pick<Execution, 'status' | 'summary'>): FlowProgress {
  if (execution.status === 'listening') return { current: 0 }
  const summary = execution.summary ?? ''
  if (summary.startsWith('Stopped.')) return { current: 2, stopped: true }
  if (summary.includes('Outgoing or Direct')) return { current: 3, stopped: true }
  if (
    summary.includes('purchase order email') ||
    summary.includes('client sales email') ||
    summary.includes('client order email')
  ) {
    return { current: 3, stopped: true }
  }
  if (
    summary.includes('PO number') ||
    summary.includes('bill of lading') ||
    summary.includes('warehouse') ||
    summary.includes('pick up address') ||
    summary.includes('pick up instructions') ||
    summary.includes('licensee account')
  ) {
    return { current: 4, stopped: true }
  }
  if (execution.status === 'error') return { current: 1, stopped: true }
  if (execution.status === 'incomplete') return { current: 4, stopped: true }
  return { current: 6 }
}

export function poReceivedFlowOutcome(execution: Pick<Execution, 'status' | 'summary'>): FlowProgress {
  if (execution.status === 'listening') return { current: 0 }
  const summary = execution.summary ?? ''
  if (summary.startsWith('Stopped.')) return { current: 2, stopped: true }
  if (summary.includes('Outgoing or Direct')) return { current: 3, stopped: true }
  if (summary.includes('purchase order file')) return { current: 4, stopped: true }
  if (summary.includes('no email address')) return { current: 5, stopped: true }
  if (execution.status === 'error') return { current: 1, stopped: true }
  if (execution.status === 'incomplete') return { current: 4, stopped: true }
  return { current: 6 }
}

export function flowOutcome(execution: Pick<Execution, 'status' | 'summary'>): FlowProgress {
  if (execution.status === 'listening') return { current: 0 }
  const summary = execution.summary ?? ''
  if (summary.startsWith('Stopped:') || summary.startsWith('Stopped.')) return { current: 2, stopped: true }
  if (execution.status === 'incomplete' && /PO File|purchase order file/i.test(summary)) {
    return { current: 3, stopped: true }
  }
  if (execution.status === 'incomplete') return { current: 4, stopped: true }
  if (execution.status === 'error') return { current: 1, stopped: true }
  return { current: 6 }
}

function firstEmail(raw?: string) {
  const text = (raw ?? '').trim().toLowerCase()
  const match = EMAIL_PATTERN.exec(text)
  return match?.[1] ?? ''
}

function receivedRecipients(order?: OrderSnapshot) {
  if ((order?.orderType || '') === 'Outgoing') {
    // No Distributor Partner (so no Purchase Order Email): the order's Distributor Email is used.
    const email = firstEmail(order?.purchaseEmail) || firstEmail(order?.distributorEmail)
    return email ? [email] : []
  }
  if ((order?.orderType || '') === 'Direct') return recipients(order)
  return []
}

function recipients(order?: OrderSnapshot) {
  const found: string[] = []
  for (const raw of [order?.salesEmail, order?.orderEmail]) {
    const email = firstEmail(raw)
    if (email && !found.includes(email)) found.push(email)
  }
  return found
}

/** Everything read from the PO file, with the order lines as a table. */
const DOCUMENT_NAMES: Record<string, string> = {
  purchase_order: 'Purchase order',
  revised_purchase_order: 'Revised purchase order',
  order_change: 'Order change',
  invoice: 'Invoice',
  bill_of_lading: 'Bill of lading',
  shipping_notice: 'Shipping notice',
  other: 'Not an order',
}

/** What the AI says the email is: 'Invoice (invoice 4471 from Wesh Wines)'. */
function documentText(order?: OrderSnapshot) {
  const name = DOCUMENT_NAMES[order?.documentType ?? ''] ?? ''
  if (!name) return 'Not judged (the email was not read)'
  return order?.documentReason ? `${name} (${order.documentReason})` : name
}

function orderDetailFields(order?: OrderSnapshot): FlowField[] {
  const lines = order?.orderLines ?? []
  const quantity = (line: NonNullable<OrderSnapshot['orderLines']>[number]) =>
    [line.quantity, line.unit].filter(Boolean).join(' ')
  return [
    { label: 'Document', value: documentText(order) },
    { label: 'PO date', value: order?.poDate || '—' },
    { label: 'Customer', value: order?.customer || '—' },
    { label: 'Ship to', value: order?.shipTo || '—' },
    { label: 'Delivery date', value: order?.deliveryDate || '—' },
    { label: 'Order', value: order?.orderSummary || '—' },
    {
      label: `Order lines (${lines.length})`,
      value: '',
      table: {
        headers: ['Product', 'Code', 'Qty', 'Unit price', 'Amount'],
        widths: ['38%', '19%', '13%', '15%', '15%'],
        rows: lines.map((line) => [
          line.product || '—',
          line.code || '—',
          quantity(line) || '—',
          line.unitPrice || '—',
          line.amount || '—',
        ]),
      },
    },
    { label: 'Total', value: orderTotal(order) },
  ]
}

/** The columns and subitems a Test run filled in when it was added to Monday by hand. */
function mondayMatchFields(order?: OrderSnapshot): FlowField[] {
  const match = order?.mondayMatch
  if (!match) return []
  const lines = match.lines ?? []
  const forReal = (name?: string) => (name ? ` (the order is for ${name})` : '')
  return [
    match.test
      ? { label: 'Client', value: `${match.client || 'TEST client not found'}${forReal(match.readClient)}` }
      : { label: 'Client', value: match.client || 'Not found' },
    match.test
      ? { label: 'Brand', value: `${match.brand || 'No TEST brand on the Brands board'}${forReal(match.readBrand)}` }
      : { label: 'Brand', value: match.brand || 'Not found' },
    { label: 'Distributor Partner', value: match.distributor || 'Not found' },
    { label: 'Carrier', value: match.carrier || (order?.carrier ? `${order.carrier} (not on the Carriers board)` : 'Not on the PO') },
    { label: 'State', value: match.state || 'Not found' },
    { label: 'Order Date', value: prettyDate(match.orderDate) || '—' },
    { label: 'Order', value: match.orderType || '—' },
    {
      label: `Subitems (${lines.length})`,
      value: '',
      table: {
        headers: ['Product', 'Item on Monday', 'Cases', 'Case price'],
        widths: ['32%', '40%', '12%', '16%'],
        rows: lines.map((line) => [
          line.product || '—',
          line.item ? `${line.item}${line.code ? ` (${line.code})` : ''}` : 'No match',
          line.cases ? `${line.cases}${line.readAs === 'bottles' ? ' (from bottles)' : ''}` : '—',
          line.casePrice || '—',
        ]),
      },
    },
  ]
}

function orderTotal(order?: OrderSnapshot) {
  const total = order?.orderTotal ?? ''
  if (!total) return '—'
  // "10,560.00" reads better as "10,560.00 USD"; "$1,287.00" already says it.
  return order?.currency && /^[\d.,\s]+$/.test(total) ? `${total} ${order.currency}` : total
}

function escapeHtml(text: string) {
  return text.replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch] ?? ch)
}

/** The order's row on Monday: its name, and a link to open it when the address is known. */
function mondayRowFields(order?: OrderSnapshot): FlowField[] {
  if (!order?.pulseId) return [{ label: 'Monday item', value: '—' }]
  const name = order.mondayItemName || order.name || order.pulseId
  return [
    { label: 'Monday item', value: name },
    { label: 'Item ID', value: order.pulseId },
    { label: 'Status', value: 'Working on it' },
    ...(order.mondayUrl
      ? [
          {
            label: 'Open',
            value: `<a href="${escapeHtml(order.mondayUrl)}" target="_blank" rel="noreferrer" class="font-medium text-helm-600 underline">Open on Monday</a>`,
            html: true,
          },
        ]
      : []),
  ]
}

function fileNames(order?: OrderSnapshot) {
  const names = (order?.files ?? []).map((file) => file.fileName).filter(Boolean) as string[]
  return names.length > 0 ? names.join(', ') : 'No file'
}

/**
 * The "Send the email" result: where it really went, and on a practice run where it would go in Live.
 * `liveTo` is the run's own recipients, shown when nothing was sent yet.
 */
function sentEmailResult(
  execution: Execution | null,
  ran: boolean,
  mailMode: 'log' | 'ses' | null,
  liveTo: string[],
  attachmentFallback = '',
) {
  const emails = execution?.emails ?? []
  const sent = emails[0]
  const logged = sent?.delivery === 'logged' || (ran && mailMode === 'log' && !sent)
  const delivered = (sent?.to ?? []).filter(Boolean)
  const meantFor = (sent?.redirectedFrom ?? []).filter(Boolean)
  const attached = emails.map((email) => email.fileName).filter(Boolean).join(', ') || attachmentFallback
  const to = delivered.join(', ') || liveTo.join(', ')
  const result: FlowField[] = [{ label: logged ? 'Would go to' : 'Sent to', value: to || 'No address' }]
  if (meantFor.length) {
    result.push({ label: 'Practice run. In Live it goes to', value: meantFor.join(', ') })
  }
  result.push({ label: 'Subject', value: sent?.subject || '—' })
  if (emails.length > 1) result.push({ label: 'Emails', value: String(emails.length) })
  result.push(
    { label: 'Attachment', value: attached || 'None' },
    { label: 'Result', value: logged ? 'Prepared. Nothing was sent.' : friendlyText(execution?.summary ?? '') || 'Sent' },
  )
  return { result, to }
}

function mondayBoard(boardName: string, boardId: string): FlowField[] {
  return [
    { label: 'Monday board', value: boardName },
    { label: 'Board ID', value: boardId },
  ]
}

function reached(index: number, execution: Execution) {
  if (execution.status === 'listening') return index === 0
  const outcome = flowOutcome(execution)
  if (!outcome.stopped) return true
  return index <= outcome.current
}

export function nodeDetail(
  index: number,
  execution: Execution | null,
  mailMode: 'log' | 'ses' | null,
  boardName: string,
  boardId: string,
): FlowNodeDetail {
  const order = execution?.order
  const ran = execution ? reached(index, execution) : false
  const stoppedHere = Boolean(execution && flowOutcome(execution).stopped && flowOutcome(execution).current === index)
  const summary = execution?.summary ?? execution?.errorSummary ?? ''

  if (index === 0) {
    const waiting = execution?.status === 'listening'
    return {
      settings: [
        ...mondayBoard(boardName, boardId),
        { label: 'Webhook', value: "My Monday Board's Column Values webhook" },
        { label: 'Watched column', value: 'Client Status' },
      ],
      input: waiting
        ? [{ label: 'Source', value: 'Waiting for Monday' }]
        : execution
          ? [{ label: 'Source', value: order?.source || 'monday' }]
          : [{ label: 'Value', value: EMPTY }],
      output: waiting
        ? [{ label: 'Order', value: 'No order set to Brand Approval yet' }]
        : !execution
          ? [{ label: 'Value', value: EMPTY }]
          : ran
            ? [{ label: 'Order', value: order?.name || 'An order changed' }]
            : [{ label: 'Value', value: NOT_RUN }],
      notice: null,
    }
  }

  if (index === 1) {
    return {
      settings: [
        ...mondayBoard(boardName, boardId),
        { label: 'Item ID', value: 'Pulse ID from the webhook' },
        { label: 'Show parent item', value: 'Yes' },
        { label: 'Show subitems', value: 'Yes' },
      ],
      input: execution
        ? [{ label: 'Pulse ID', value: order?.pulseId || '—' }]
        : [{ label: 'Value', value: EMPTY }],
      output:
        !execution
          ? [{ label: 'Value', value: EMPTY }]
          : !ran
            ? [{ label: 'Value', value: NOT_RUN }]
            : [
                { label: 'Name', value: order?.name || '—' },
                { label: 'Client Status', value: order?.clientStatus || '—' },
                { label: 'PO Number', value: order?.poNumber || '—' },
                { label: 'Client Sales Email', value: order?.salesEmail || '—' },
                { label: 'Client Order email', value: order?.orderEmail || '—' },
                { label: 'PO File', value: fileNames(order) },
              ],
      notice: stoppedHere ? { tone: 'error', text: summary || 'The order could not be opened.' } : null,
    }
  }

  if (index === 2) {
    const status = order?.clientStatus || '—'
    const passed = status === 'Brand Approval'
    return {
      settings: [
        ...mondayBoard(boardName, boardId),
        { label: 'Column', value: 'Client Status' },
        { label: 'Condition', value: 'Text equals' },
        { label: 'Value', value: 'Brand Approval' },
      ],
      input: execution ? [{ label: 'Client Status', value: status }] : [{ label: 'Value', value: EMPTY }],
      output: !execution
        ? [{ label: 'Value', value: EMPTY }]
        : !ran
          ? [{ label: 'Value', value: NOT_RUN }]
          : [{ label: 'Passed', value: passed ? 'Yes' : 'No' }],
      notice: stoppedHere ? { tone: 'warning', text: summary || 'Client Status is not Brand Approval.' } : null,
    }
  }

  if (index === 3) {
    const files = order?.files ?? []
    return {
      settings: [
        ...mondayBoard(boardName, boardId),
        { label: 'Column', value: 'PO File' },
        { label: 'Bundles', value: 'One email for each file. With no file, one email without an attachment.' },
      ],
      input: execution
        ? [{ label: 'Files', value: files.length ? fileNames(order) : 'No file' }]
        : [{ label: 'Value', value: EMPTY }],
      output: !execution
        ? [{ label: 'Value', value: EMPTY }]
        : !ran
          ? [{ label: 'Value', value: NOT_RUN }]
          : files.length
            ? files.map((file) => ({ label: 'Attachment', value: file.fileName || 'po-file' }))
            : [{ label: 'Attachment', value: 'No file' }],
      notice: stoppedHere
        ? { tone: 'warning', text: summary || 'This order has no purchase order file.' }
        : ran && files.length === 0
          ? { tone: 'warning', text: 'This order has no PO file. The email is sent without an attachment.' }
          : null,
    }
  }

  if (index === 4) {
    const found = recipients(order)
    return {
      settings: [
        ...mondayBoard(boardName, boardId),
        { label: 'Client Sales Email', value: 'Column lookup, first address' },
        { label: 'Client Order email', value: 'Column mirror3, first address' },
        { label: 'Transform', value: 'Trim, lowercase, then the first email' },
      ],
      input: execution
        ? [
            { label: 'Client Sales Email', value: order?.salesEmail || '—' },
            { label: 'Client Order email', value: order?.orderEmail || '—' },
          ]
        : [{ label: 'Value', value: EMPTY }],
      output: !execution
        ? [{ label: 'Value', value: EMPTY }]
        : !ran
          ? [{ label: 'Value', value: NOT_RUN }]
          : [{ label: 'Recipients', value: found.length ? found.join(', ') : 'No address' }],
      notice:
        stoppedHere || (ran && found.length === 0)
          ? { tone: 'warning', text: summary || 'This order has no email address.' }
          : null,
    }
  }

  const email = execution?.emails?.[0]
  const logged = email?.delivery === 'logged' || (ran && mailMode === 'log' && !email)
  const { result, to } = sentEmailResult(execution, ran, mailMode, recipients(order), fileNames(order))
  return {
    about: [
      {
        label: 'Sends to',
        value:
          'The order’s Client Sales Email and Client Order email. One email per purchase order file, with that file attached. With no file, one email without an attachment.',
      },
    ],
    editRecipients: true,
    settings: [
      { label: 'To', value: 'Addresses from the previous step' },
      { label: 'Subject', value: 'Brand Approval for PO {{PO Number}}' },
      {
        label: 'Body',
        value: 'Dear Helmsman Client, Please see PO below attached for approval. Regards, Helmsman Orders',
      },
      { label: 'Attachment', value: 'PO file from the download step' },
    ],
    input: execution
      ? [
          { label: 'To', value: to || '—' },
          { label: 'Subject', value: email?.subject || `Brand Approval for PO ${order?.poNumber || ''}` },
          { label: 'Attachment', value: email?.fileName || fileNames(order) },
        ]
      : [{ label: 'Value', value: EMPTY }],
    output: !execution
      ? [{ label: 'Value', value: EMPTY }]
      : !ran
        ? [{ label: 'Value', value: NOT_RUN }]
        : [
            ...result,
            {
              label: 'Message',
              value: email?.html || 'Dear Helmsman Client,<br><br>Please see PO below attached for approval.',
              html: true,
            },
          ],
    notice:
      ran && execution?.mode === 'test' && email?.delivery === 'sent'
        ? { tone: 'warning', text: 'Practice run. Sent only to the practice address.' }
        : ran && execution?.mode === 'test'
          ? { tone: 'warning', text: 'Practice run. The email was not sent.' }
        : ran && logged
          ? { tone: 'warning', text: 'The email was prepared here and was not sent.' }
            : stoppedHere
              ? { tone: 'error', text: summary || 'The email was not sent.' }
              : null,
  }
}

export function inventoryFlowOutcome(execution: Pick<Execution, 'status' | 'inventory'>): FlowProgress {
  const step = execution.inventory?.flowStep ?? 0
  if (execution.status === 'running' || execution.status === 'pending') return { current: step }
  if (execution.status === 'error' || execution.status === 'incomplete') return { current: step, stopped: true }
  return { current: 4 }
}

function shownStep(execution: Execution | null) {
  if (!execution) return -1
  if (execution.status === 'success' || execution.status === 'warning') return 4
  return execution.inventory?.flowStep ?? 0
}

function tableField(
  label: string,
  headers: string[],
  rows: string[][],
): FlowField {
  return {
    label,
    value: rows.length ? '' : 'None',
    table: { headers, rows },
  }
}

function prettyDate(value?: string) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '')
  if (!match) return value || ''
  return `${match[2]}/${match[3]}/${match[1]}`
}

function resultLine(run: Execution['inventory']): string {
  if (!run) return ''
  const updated = run.updated ?? run.updates?.length ?? 0
  const added = run.inserted ?? run.inserts?.length ?? 0
  const created = run.productsCreated ?? run.created?.length ?? 0
  const dates = run.datesUpdated ?? 0
  const removed = run.removed ?? 0
  const parts: string[] = []
  if (updated) parts.push(`${updated} quantities updated`)
  if (removed) parts.push(`${removed} missing codes set to zero`)
  if (dates) parts.push(`${dates} dates refreshed`)
  if (added) parts.push(`${added} new codes added`)
  if (created) parts.push(`${created} new products added`)
  const sentence = parts.length
    ? `${parts[0].charAt(0).toUpperCase()}${parts[0].slice(1)}${parts.length > 1 ? `, ${parts.slice(1).join(', ')}` : ''}.`
    : 'Everything already matched.'
  if (run.mode === 'test') return `Practice run. ${sentence} Nothing was saved to the live inventory.`
  return sentence
}

export function inventoryNodeDetail(index: number, execution: Execution | null): FlowNodeDetail {
  const run = execution?.inventory
  const step = shownStep(execution)
  const ran = step > index
  const failed = execution?.status === 'error' || execution?.status === 'incomplete'
  const waiting = [{ label: 'Status', value: friendlyText(execution?.summary || 'Working.') }]
  const created = (run?.created ?? []).map((row) => [row.code, row.name, String(row.pieces)])
  const updates = (run?.updates ?? []).map((row) => [row.code || '', row.name || '', String(row.available), row.date])
  const inserts = (run?.inserts ?? []).map((row) => [row.code, row.name, String(row.available), row.date])
  const stopped =
    failed && step === index
      ? { tone: execution?.status === 'error' ? 'error' as const : 'warning' as const, text: friendlyText(execution?.summary || 'The update stopped.') }
      : null
  const steps: FlowNodeDetail[] = [
    {
      settings: [],
      input: waiting,
      output: [{ label: 'File', value: run?.fileName || (ran ? '—' : EMPTY) }],
      notice: null,
    },
    {
      settings: [],
      input: waiting,
      output: created.length
        ? [tableField('New products', ['Code', 'Item', 'Pieces'], created)]
        : [{ label: 'New products', value: ran ? 'None' : EMPTY }],
      notice: null,
    },
    {
      settings: [],
      input: waiting,
      output: [{ label: 'Codes read', value: run?.stock?.length ? String(run.stock.length) : ran ? '—' : EMPTY }],
      notice: null,
    },
    {
      settings: [],
      input: waiting,
      output: [
        { label: 'Result', value: run ? resultLine(run) : ran ? friendlyText(execution?.summary || '—') : EMPTY },
        ...(updates.length ? [tableField('Changes', ['Code', 'Item', 'Available', 'Date'], updates)] : []),
        ...(inserts.length ? [tableField('New codes', ['Code', 'Item', 'Available', 'Date'], inserts)] : []),
      ],
      notice: null,
    },
  ]
  const chosen = steps[index] ?? { settings: [], input: waiting, output: waiting, notice: null }
  if (stopped) chosen.notice = stopped
  return chosen
}

export function warehouseNodeDetail(index: number, execution: Execution | null): FlowNodeDetail {
  const run = execution?.inventory
  const step = shownStep(execution)
  const ran = step > index
  const failed = execution?.status === 'error' || execution?.status === 'incomplete'
  const waiting = [{ label: 'Status', value: friendlyText(execution?.summary || 'Working.') }]
  const updates = (run?.updates ?? []).map((row) => [
    row.code || '',
    String(row.available),
    String(row.allocated ?? 0),
    String(row.inBond ?? 0),
    row.date,
  ])
  const stopped =
    failed && step === index
      ? { tone: execution?.status === 'error' ? 'error' as const : 'warning' as const, text: friendlyText(execution?.summary || 'The update stopped.') }
      : null
  const steps: FlowNodeDetail[] = [
    {
      settings: [],
      input: waiting,
      output: [
        { label: 'File', value: run?.fileName || (ran ? '—' : EMPTY) },
        { label: 'Date', value: prettyDate(run?.chosenBy) || (ran ? '—' : EMPTY) },
      ],
      notice: null,
    },
    {
      settings: [],
      input: waiting,
      output: [{ label: 'Codes read', value: run?.stock?.length ? String(run.stock.length) : ran ? '—' : EMPTY }],
      notice: null,
    },
    {
      settings: [],
      input: waiting,
      output: updates.length
        ? [tableField('Changes', ['Code', 'Available', 'Allocated', 'In bond', 'Date'], updates)]
        : [{ label: 'Changes', value: ran ? 'No quantities needed a change' : EMPTY }],
      notice: null,
    },
    {
      settings: [],
      input: waiting,
      output: [{ label: 'Result', value: run ? resultLine(run) : ran ? friendlyText(execution?.summary || '—') : EMPTY }],
      notice: null,
    },
  ]
  const chosen = steps[index] ?? { settings: [], input: waiting, output: waiting, notice: null }
  if (stopped) chosen.notice = stopped
  return chosen
}

function amountText(value: unknown) {
  const number = Number(value)
  if (value === '' || value == null || Number.isNaN(number)) return String(value ?? '')
  return Number.isInteger(number) ? String(number) : String(Math.round(number * 100) / 100)
}

export function popNodeDetail(index: number, execution: Execution | null): FlowNodeDetail {
  const run = execution?.inventory
  const step = shownStep(execution)
  const ran = step > index
  const failed = execution?.status === 'error' || execution?.status === 'incomplete'
  const waiting = [{ label: 'Status', value: friendlyText(execution?.summary || 'Working.') }]
  const files = (run?.files ?? []).map((file) => [
    file.warehouse || '',
    file.name || '',
    file.problem ? `Not read: ${file.problem}` : file.codes != null ? `${file.codes} codes` : 'Waiting',
  ])
  const updates = (run?.updates ?? []).map((row) => [
    row.code || '',
    row.name || '',
    row.warehouse || '',
    row.before || '—',
    `${amountText(row.available)}${row.unit ? ` ${row.unit}` : ''}`,
  ])
  const stopped =
    failed && step === index
      ? { tone: execution?.status === 'error' ? 'error' as const : 'warning' as const, text: friendlyText(execution?.summary || 'The update stopped.') }
      : null
  const steps: FlowNodeDetail[] = [
    {
      settings: [],
      input: waiting,
      output: files.length ? [tableField('Files', ['Warehouse', 'File', 'Read'], files)] : [{ label: 'Files', value: ran ? '—' : EMPTY }],
      notice: null,
    },
    {
      settings: [],
      input: waiting,
      output: [{ label: 'Codes read', value: run?.codesRead != null ? String(run.codesRead) : ran ? '—' : EMPTY }],
      notice: null,
    },
    {
      settings: [],
      input: waiting,
      output: [
        { label: 'POP items found in the files', value: run?.matched != null ? String(run.matched) : ran ? '—' : EMPTY },
        ...(updates.length
          ? [tableField('Changes', ['Code', 'Item', 'Warehouse', 'Was', 'Now'], updates)]
          : [{ label: 'Changes', value: ran ? 'No quantities needed a change' : EMPTY }]),
      ],
      notice: null,
    },
    {
      settings: [],
      input: waiting,
      output: [{ label: 'Result', value: ran || execution?.status === 'success' || execution?.status === 'warning' ? friendlyText(execution?.summary || '—') : EMPTY }],
      notice: null,
    },
  ]
  const chosen = steps[index] ?? { settings: [], input: waiting, output: waiting, notice: null }
  if (stopped) chosen.notice = stopped
  return chosen
}

export function poReceivedNodeDetail(
  index: number,
  execution: Execution | null,
  mailMode: 'log' | 'ses' | null,
  boardName: string,
  boardId: string,
): FlowNodeDetail {
  const order = execution?.order
  const outcome = execution ? poReceivedFlowOutcome(execution) : null
  const waiting = execution?.status === 'listening'
  const ran = waiting ? index === 0 : Boolean(outcome && (!outcome.stopped || index <= outcome.current))
  const stoppedHere = Boolean(outcome?.stopped && outcome.current === index)
  const summary = execution?.summary ?? ''
  const found = receivedRecipients(order)

  if (index === 0) {
    return {
      settings: [...mondayBoard(boardName, boardId), { label: 'Watched column', value: 'Client Status' }],
      input: waiting
        ? [{ label: 'Source', value: 'Waiting for Monday' }]
        : execution
          ? [{ label: 'Source', value: order?.source || 'monday' }]
          : [{ label: 'Value', value: EMPTY }],
      output: waiting
        ? [{ label: 'Order', value: 'No order set to Received yet' }]
        : execution
          ? [{ label: 'Order', value: order?.name || 'An order changed' }]
          : [{ label: 'Value', value: EMPTY }],
      notice: null,
    }
  }
  if (index === 1) {
    return {
      settings: [...mondayBoard(boardName, boardId)],
      input: execution ? [{ label: 'Pulse ID', value: order?.pulseId || '—' }] : [{ label: 'Value', value: EMPTY }],
      output: !ran
        ? [{ label: 'Value', value: execution ? NOT_RUN : EMPTY }]
        : [
            { label: 'Name', value: order?.name || '—' },
            { label: 'Client Status', value: order?.clientStatus || '—' },
            { label: 'Order', value: order?.orderType || '—' },
            { label: 'PO Number', value: order?.poNumber || '—' },
          ],
      notice: stoppedHere ? { tone: 'error', text: friendlyText(summary || 'The order could not be opened.') } : null,
    }
  }
  if (index === 2) {
    return {
      settings: [{ label: 'Continues when', value: 'Client Status is Received' }],
      input: execution ? [{ label: 'Client Status', value: order?.clientStatus || '—' }] : [{ label: 'Value', value: EMPTY }],
      output: !ran
        ? [{ label: 'Value', value: execution ? NOT_RUN : EMPTY }]
        : [{ label: 'Passed', value: order?.clientStatus === 'Received' ? 'Yes' : 'No' }],
      notice: stoppedHere ? { tone: 'warning', text: friendlyText(summary) } : null,
    }
  }
  if (index === 3) {
    return {
      settings: [
        { label: 'Outgoing', value: 'Purchase Order Email' },
        { label: 'Direct', value: 'Client email addresses' },
      ],
      input: execution ? [{ label: 'Order', value: order?.orderType || '—' }] : [{ label: 'Value', value: EMPTY }],
      output: !ran
        ? [{ label: 'Value', value: execution ? NOT_RUN : EMPTY }]
        : [{ label: 'Recipients', value: found.length ? found.join(', ') : 'No address' }],
      notice: stoppedHere ? { tone: 'warning', text: friendlyText(summary) } : null,
    }
  }
  if (index === 4) {
    return {
      settings: [{ label: 'Attachment', value: 'Purchase order file. With no file, the email goes out without one.' }],
      input: execution ? [{ label: 'Files', value: fileNames(order) }] : [{ label: 'Value', value: EMPTY }],
      output: !ran
        ? [{ label: 'Value', value: execution ? NOT_RUN : EMPTY }]
        : [{ label: 'Attachment', value: fileNames(order) }],
      notice: stoppedHere
        ? { tone: 'warning', text: friendlyText(summary) }
        : ran && !(order?.files ?? []).length
          ? { tone: 'warning', text: 'This order has no PO file. The email is sent without an attachment.' }
          : null,
    }
  }
  const { result, to } = sentEmailResult(execution, ran, mailMode, found)
  return {
    about: [
      {
        label: 'Sends to',
        value:
          'Outgoing orders: the Purchase Order Email. Direct orders: the client’s sales and order emails. One email per purchase order file, with that file attached. With no file, one email without an attachment.',
      },
      { label: 'From', value: 'orders@helmsmanimports.com' },
    ],
    editRecipients: true,
    settings: [{ label: 'From', value: 'orders@helmsmanimports.com' }],
    input: execution ? [{ label: 'To', value: to || '—' }] : [{ label: 'Value', value: EMPTY }],
    output: !ran ? [{ label: 'Value', value: execution ? NOT_RUN : EMPTY }] : result,
    notice: stoppedHere ? { tone: 'warning', text: friendlyText(summary || 'This order has no email address.') } : null,
  }
}

export function pickupNodeDetail(
  index: number,
  execution: Execution | null,
  mailMode: 'log' | 'ses' | null,
  boardName: string,
  boardId: string,
): FlowNodeDetail {
  const order = execution?.order
  const outcome = execution ? pickupFlowOutcome(execution) : null
  const waiting = execution?.status === 'listening'
  const ran = waiting ? index === 0 : Boolean(outcome && (!outcome.stopped || index <= outcome.current))
  const stoppedHere = Boolean(outcome?.stopped && outcome.current === index)
  const summary = execution?.summary ?? ''
  const outgoing = (order?.orderType || '') === 'Outgoing'
  const direct = (order?.orderType || '') === 'Direct'
  const purchase = firstEmail(order?.purchaseEmail)
  const sales = firstEmail(order?.salesEmail)
  const client = firstEmail(order?.orderEmail)
  const recipients = outgoing ? (purchase ? [purchase] : []) : direct ? [client, sales].filter(Boolean) : []

  if (index === 0) {
    return {
      settings: [...mondayBoard(boardName, boardId), { label: 'Watched column', value: 'Client Status' }],
      input: waiting
        ? [{ label: 'Source', value: 'Waiting for Monday' }]
        : execution
          ? [{ label: 'Source', value: order?.source || 'monday' }]
          : [{ label: 'Value', value: EMPTY }],
      output: waiting
        ? [{ label: 'Order', value: 'No order set to Staged yet' }]
        : execution
          ? [{ label: 'Order', value: order?.name || 'An order changed' }]
          : [{ label: 'Value', value: EMPTY }],
      notice: null,
    }
  }
  if (index === 1) {
    return {
      settings: [...mondayBoard(boardName, boardId)],
      input: execution ? [{ label: 'Pulse ID', value: order?.pulseId || '—' }] : [{ label: 'Value', value: EMPTY }],
      output: !ran
        ? [{ label: 'Value', value: execution ? NOT_RUN : EMPTY }]
        : [
            { label: 'Name', value: order?.name || '—' },
            { label: 'Client Status', value: order?.clientStatus || '—' },
            { label: 'Order', value: order?.orderType || '—' },
            { label: 'PO Number', value: order?.poNumber || '—' },
          ],
      notice: stoppedHere ? { tone: 'error', text: friendlyText(summary || 'The order could not be opened.') } : null,
    }
  }
  if (index === 2) {
    return {
      settings: [{ label: 'Continues when', value: 'Client Status is Staged' }],
      input: execution ? [{ label: 'Client Status', value: order?.clientStatus || '—' }] : [{ label: 'Value', value: EMPTY }],
      output: !ran
        ? [{ label: 'Value', value: execution ? NOT_RUN : EMPTY }]
        : [{ label: 'Passed', value: order?.clientStatus === 'Staged' ? 'Yes' : 'No' }],
      notice: stoppedHere ? { tone: 'warning', text: friendlyText(summary) } : null,
    }
  }
  if (index === 3) {
    return {
      settings: [
        { label: 'Outgoing', value: 'Purchase Order Email' },
        { label: 'Direct', value: 'Client email addresses' },
      ],
      input: execution ? [{ label: 'Order', value: order?.orderType || '—' }] : [{ label: 'Value', value: EMPTY }],
      output: !ran
        ? [{ label: 'Value', value: execution ? NOT_RUN : EMPTY }]
        : [{ label: 'Recipients', value: recipients.length ? recipients.join(', ') : 'No address' }],
      notice: stoppedHere ? { tone: 'warning', text: friendlyText(summary) } : null,
    }
  }
  if (index === 4) {
    return {
      settings: [
        { label: 'Outgoing', value: 'Warehouse, address, and instructions' },
        { label: 'Direct', value: 'Licensee account' },
      ],
      input: execution ? [{ label: 'PO Number', value: order?.poNumber || '—' }] : [{ label: 'Value', value: EMPTY }],
      output: !ran
        ? [{ label: 'Value', value: execution ? NOT_RUN : EMPTY }]
        : outgoing
          ? [
              { label: 'Warehouse', value: order?.warehouseName || '—' },
              { label: 'Pick up address', value: order?.pickupAddress || '—' },
              { label: 'Pick up instructions', value: order?.pickupInstructions || '—' },
            ]
          : [{ label: 'Licensee', value: order?.licenseeName || '—' }],
      notice: stoppedHere ? { tone: 'warning', text: friendlyText(summary) } : null,
    }
  }
  const { result, to } = sentEmailResult(execution, ran, mailMode, recipients)
  return {
    about: [
      {
        label: 'Sends to',
        value:
          'Outgoing orders: the Purchase Order Email, with the pick up address and instructions. Direct orders: the client’s order and sales emails.',
      },
      { label: 'From', value: 'orders@helmsmanimports.com' },
    ],
    editRecipients: true,
    settings: [{ label: 'From', value: 'orders@helmsmanimports.com' }],
    input: execution ? [{ label: 'To', value: to || '—' }] : [{ label: 'Value', value: EMPTY }],
    output: !ran ? [{ label: 'Value', value: execution ? NOT_RUN : EMPTY }] : result,
    notice: stoppedHere ? { tone: 'warning', text: friendlyText(summary || 'This order has no email address.') } : null,
  }
}

export function inboundNodeDetail(
  index: number,
  execution: Execution | null,
  mailMode: 'log' | 'ses' | null,
  boardName: string,
  boardId: string,
): FlowNodeDetail {
  const order = execution?.order
  const outcome = execution ? inboundFlowOutcome(execution) : null
  const ran = Boolean(outcome && (!outcome.stopped || index <= outcome.current))
  const stoppedHere = Boolean(outcome?.stopped && outcome.current === index)
  const summary = execution?.summary ?? ''
  const owners = (order?.brandEmails ?? []).filter(Boolean)
  const report = (order?.files ?? []).map((file) => file.fileName).filter(Boolean).join(', ')

  if (index === 0) {
    const waiting = execution?.status === 'listening'
    return {
      settings: [...mondayBoard(boardName, boardId), { label: 'Watched column', value: 'Shipment Status' }],
      input: waiting
        ? [{ label: 'Source', value: 'Waiting for Monday' }]
        : execution
          ? [{ label: 'Source', value: order?.source || 'monday' }]
          : [{ label: 'Value', value: EMPTY }],
      output: waiting
        ? [{ label: 'Shipment', value: 'No event yet' }]
        : execution
          ? [{ label: 'Shipment', value: order?.name || 'A shipment changed' }]
          : [{ label: 'Value', value: EMPTY }],
      notice: null,
    }
  }
  if (index === 1) {
    return {
      settings: [...mondayBoard(boardName, boardId)],
      input: execution ? [{ label: 'Pulse ID', value: order?.pulseId || '—' }] : [{ label: 'Value', value: EMPTY }],
      output: !ran
        ? [{ label: 'Value', value: execution ? NOT_RUN : EMPTY }]
        : [
            { label: 'PO Number', value: order?.poNumber || '—' },
            { label: 'Shipment Status', value: order?.shipmentStatus || '—' },
            { label: 'Warehouse', value: order?.warehouseName || order?.warehouseLabel || '—' },
            { label: 'Brand emails', value: owners.length ? String(owners.length) : 'None' },
          ],
      notice: stoppedHere ? { tone: 'error', text: friendlyText(summary || 'The shipment could not be opened.') } : null,
    }
  }
  if (index === 2) {
    return {
      settings: [{ label: 'Continues when', value: 'Shipment Status is Inbound Complete' }],
      input: execution ? [{ label: 'Shipment Status', value: order?.shipmentStatus || '—' }] : [{ label: 'Value', value: EMPTY }],
      output: !ran
        ? [{ label: 'Value', value: execution ? NOT_RUN : EMPTY }]
        : [{ label: 'Passed', value: order?.shipmentStatus === 'Inbound Complete' ? 'Yes' : 'No' }],
      notice: stoppedHere ? { tone: 'warning', text: friendlyText(summary) } : null,
    }
  }
  if (index === 3) {
    return {
      settings: [
        { label: 'Ops Manager', value: 'Included' },
        { label: 'Brand Manager', value: 'Included when filled in' },
        { label: 'Brand Operations Manager', value: 'Included when filled in' },
      ],
      input: execution ? [{ label: 'Addresses', value: owners.join(', ') || '—' }] : [{ label: 'Value', value: EMPTY }],
      output: !ran
        ? [{ label: 'Value', value: execution ? NOT_RUN : EMPTY }]
        : [{ label: 'Recipients', value: owners.join(', ') || 'No address' }],
      notice: stoppedHere ? { tone: 'warning', text: friendlyText(summary) } : null,
    }
  }
  if (index === 4) {
    return {
      settings: [{ label: 'Attachment', value: 'Inbound Report when present' }],
      input: execution
        ? [
            { label: 'PO Number', value: order?.poNumber || '—' },
            { label: 'Warehouse', value: order?.warehouseName || order?.warehouseLabel || '—' },
          ]
        : [{ label: 'Value', value: EMPTY }],
      output: !ran
        ? [{ label: 'Value', value: execution ? NOT_RUN : EMPTY }]
        : [{ label: 'Report', value: report || 'No file' }],
      notice: stoppedHere ? { tone: 'warning', text: friendlyText(summary) } : null,
    }
  }
  const { result, to } = sentEmailResult(execution, ran, mailMode, owners, report)
  return {
    about: [
      {
        label: 'Sends to',
        value:
          'The shipment’s Ops Manager, plus the Brand Manager and Brand Operations Manager of each linked brand when those are filled in. Duplicates are removed.',
      },
      { label: 'From', value: 'logistics@helmsmanimports.com' },
    ],
    editRecipients: true,
    settings: [{ label: 'From', value: 'logistics@helmsmanimports.com' }],
    input: execution ? [{ label: 'To', value: to || '—' }] : [{ label: 'Value', value: EMPTY }],
    output: !ran ? [{ label: 'Value', value: execution ? NOT_RUN : EMPTY }] : result,
    notice: stoppedHere ? { tone: 'warning', text: friendlyText(summary) } : null,
  }
}

export function inboxNodeDetail(
  index: number,
  execution: Execution | null,
  boardName: string,
  boardId: string,
  test = false,
): FlowNodeDetail {
  const order = execution?.order
  const outcome = execution ? inboxFlowOutcome(execution) : null
  const ran = Boolean(outcome && (index < outcome.current || (outcome.stopped && index === outcome.current)))
  const stoppedHere = Boolean(outcome?.stopped && outcome.current === index)
  const waiting: FlowField[] = [{ label: 'Value', value: execution ? NOT_RUN : EMPTY }]
  const notice: FlowNotice | null = stoppedHere
    ? { tone: execution?.status === 'error' ? 'error' : 'warning', text: friendlyText(execution?.summary ?? '') }
    : null

  if (index === 0) {
    const listening = execution?.status === 'listening'
    const sender = order?.senderName ? `${order.senderName} <${order.sender ?? ''}>` : order?.sender
    return {
      about: [
        ...mondayBoard(boardName, boardId),
        { label: 'Group', value: 'Submitted Queue' },
        { label: 'Rows from', value: 'Monday’s Gmail automation, one per email to orders@helmsmanimports.com' },
        test
          ? { label: 'Waits for', value: 'The next new row after you press Test run' }
          : { label: 'Starts', value: 'As soon as Monday adds the email to the row' },
      ],
      settings: [],
      input: waiting,
      output: listening
        ? [{ label: 'Value', value: 'Listening for a new row in Submitted Queue…' }]
        : order?.pulseId
          ? [
              { label: 'Row', value: order.name || order.pulseId },
              { label: 'From', value: sender || '—' },
              { label: 'Received', value: order.receivedAt || '—' },
              { label: 'Files', value: fileNames(order) },
            ]
          : waiting,
      notice: index === 0 ? null : notice,
    }
  }
  if (index === 1) {
    return {
      about: [
        { label: 'Reads', value: 'The email on the row and its files (PDFs, pictures, Word, Excel, CSV, text), with AI' },
        { label: 'Decides', value: 'Whether it is a purchase order. Only purchase orders go on to be filled in.' },
        { label: 'Otherwise', value: 'The row is left exactly as Monday made it' },
      ],
      settings: [],
      input: waiting,
      output: ran || outcome?.current === 2
        ? [
            { label: 'PO number', value: order?.poNumber || 'Not found' },
            ...orderDetailFields(order),
            ...(order?.readNote ? [{ label: 'Note', value: friendlyText(order.readNote) }] : []),
          ]
        : waiting,
      notice,
    }
  }
  const filled = outcome?.current === 3
  return {
    about: [
      ...mondayBoard(boardName, boardId),
      {
        label: 'Fills in',
        value:
          'That same row: PO File, the name the team uses, Status Working on it, Client, Brand, State, Distributor Partner, Order Date, order type and PO number, one subitem per order line linked to the Items board in cases, and a note',
      },
      { label: 'Revised PO', value: 'When its PO number is already on the board, that order gets the new PO file and subitems instead, and this row is left with a note' },
      { label: 'Also', value: 'Ticks PO detected, and links the Carrier when the PO names one' },
      { label: 'Leaves', value: 'Rows the team already filled in, and anything that is not a purchase order' },
    ],
    settings: [],
    input: waiting,
    output: filled
      ? [
          ...(order?.original
            ? [{ label: 'Revised PO for', value: `${order.original.name}: its PO File and subitems were replaced; this row was left as it is` }]
            : []),
          ...mondayRowFields(order),
          ...mondayMatchFields(order),
          ...(order?.mondayProblems?.length
            ? [{ label: 'Not filled in', value: order.mondayProblems.map(friendlyText).join(' ') }]
            : []),
        ]
      : execution?.status === 'running' && outcome?.current === 2
        ? [{ label: 'Value', value: order?.stage === 'revise' ? 'Updating the original order…' : 'Filling in the row…' }]
        : waiting,
    notice: notice ?? (filled && order?.mondayProblems?.length ? { tone: 'warning', text: order.mondayProblems.join(' ') } : null),
  }
}
