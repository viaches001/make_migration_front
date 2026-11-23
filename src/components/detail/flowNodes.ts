import { friendlyText } from '@/lib/format'
import type { Execution, OrderSnapshot } from '@/types/automation'

export interface FlowProgress {
  current: number
  stopped?: boolean
}

const EMAIL_PATTERN = /([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/

export interface FlowField {
  label: string
  value: string
  html?: boolean
  table?: { headers: string[]; rows: string[][] }
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

export function inboxFlowOutcome(execution: Pick<Execution, 'status' | 'summary'>): FlowProgress {
  const summary = execution.summary ?? ''
  if (summary.startsWith('Stopped.')) return { current: 1, stopped: true }
  if (execution.status === 'incomplete') return { current: 3, stopped: true }
  if (execution.status === 'error') {
    return { current: /mailbox|gmail|google/i.test(summary) ? 0 : 2, stopped: true }
  }
  return { current: 5 }
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
    const email = firstEmail(order?.purchaseEmail)
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
): FlowNodeDetail {
  const order = execution?.order
  const outcome = execution ? inboxFlowOutcome(execution) : null
  const ran = Boolean(outcome && (!outcome.stopped || index <= outcome.current))
  const stoppedHere = Boolean(outcome?.stopped && outcome.current === index)
  const summary = friendlyText(execution?.summary ?? '')
  const practice = execution?.mode === 'test'
  const waiting: FlowField[] = [{ label: 'Value', value: execution ? NOT_RUN : EMPTY }]
  const tone = execution?.status === 'error' ? 'error' : 'warning'
  const notice: FlowNotice | null = stoppedHere ? { tone, text: summary } : null

  if (index === 0) {
    return {
      about: [
        { label: 'Mailbox', value: 'orders@helmsmanimports.com' },
        { label: 'Checks', value: 'Every 10 minutes, for incoming email with attached files' },
        { label: 'Skips', value: 'Sent mail, drafts, and email already saved' },
      ],
      settings: [],
      input: waiting,
      output: ran ? [{ label: 'Email', value: order?.name || 'No new email' }] : waiting,
      notice,
    }
  }
  if (index === 1) {
    return {
      about: [{ label: 'Leaves out', value: 'Logos and pictures shown inside the email' }],
      settings: [],
      input: waiting,
      output: ran
        ? [
            { label: 'From', value: order?.sender || '—' },
            { label: 'Subject', value: order?.name || '—' },
            { label: 'Received', value: order?.receivedAt || '—' },
            { label: 'Files', value: fileNames(order) },
          ]
        : waiting,
      notice,
    }
  }
  if (index === 2) {
    return {
      about: [...mondayBoard(boardName, boardId), { label: 'Order name', value: 'The email subject' }],
      settings: [],
      input: waiting,
      output: ran
        ? [
            practice
              ? { label: 'Order', value: 'Practice run. Nothing was added to Monday.' }
              : { label: 'Monday item', value: order?.pulseId || '—' },
          ]
        : waiting,
      notice,
    }
  }
  if (index === 3) {
    return {
      about: [
        { label: 'Saved to', value: 'The Files column of the new order' },
        { label: 'Also', value: 'Adds a note with the sender and the message. The mailbox itself is never changed.' },
      ],
      settings: [],
      input: waiting,
      output: ran ? [{ label: 'Result', value: summary || '—' }] : waiting,
      notice,
    }
  }
  return {
    about: [
      { label: 'Reads', value: 'PDFs and pictures, with AI' },
      { label: 'Fills in', value: 'The PO Number column' },
      { label: 'If it cannot', value: 'The order and its files are still saved' },
    ],
    settings: [],
    input: waiting,
    output: ran
      ? [
          { label: 'PO number', value: order?.poNumber || 'Not found' },
          { label: 'Customer', value: order?.customer || '—' },
          { label: 'Order', value: order?.orderSummary || '—' },
          ...(order?.readNote ? [{ label: 'Note', value: friendlyText(order.readNote) }] : []),
        ]
      : waiting,
    notice,
  }
}
