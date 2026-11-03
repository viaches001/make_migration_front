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
  settings: FlowField[]
  input: FlowField[]
  output: FlowField[]
  notice: FlowNotice | null
}

const EMPTY = 'Run the scenario to see this value.'
const NOT_RUN = 'This step did not run.'

export function flowOutcome(execution: Pick<Execution, 'status' | 'summary'>): FlowProgress {
  const summary = execution.summary ?? ''
  if (summary.startsWith('Stopped:')) return { current: 2, stopped: true }
  if (execution.status === 'incomplete' && summary.includes('PO File')) return { current: 3, stopped: true }
  if (execution.status === 'incomplete') return { current: 4, stopped: true }
  if (execution.status === 'error') return { current: 1, stopped: true }
  return { current: 6 }
}

function firstEmail(raw?: string) {
  const text = (raw ?? '').trim().toLowerCase()
  const match = EMAIL_PATTERN.exec(text)
  return match?.[1] ?? ''
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

function mondayBoard(boardName: string, boardId: string): FlowField[] {
  return [
    { label: 'Monday board', value: boardName },
    { label: 'Board ID', value: boardId },
  ]
}

function reached(index: number, execution: Execution) {
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
    return {
      settings: [
        ...mondayBoard(boardName, boardId),
        { label: 'Webhook', value: "My Monday Board's Column Values webhook" },
        { label: 'Watched column', value: 'Client Status' },
      ],
      input: execution
        ? [{ label: 'Source', value: order?.source || 'monday' }]
        : [{ label: 'Value', value: EMPTY }],
      output: !execution
        ? [{ label: 'Value', value: EMPTY }]
        : ran
          ? [
              { label: 'Pulse ID', value: order?.pulseId || '—' },
              { label: 'Board ID', value: boardId },
            ]
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
      notice: stoppedHere ? { tone: 'error', text: summary || 'The Monday item could not be loaded.' } : null,
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
        { label: 'Bundles', value: 'One email for each file' },
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
      notice:
        stoppedHere || (ran && files.length === 0)
          ? { tone: 'warning', text: summary || 'PO File column has no file.' }
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
          ? { tone: 'warning', text: summary || 'No email address in Client Sales Email or Client Order email.' }
          : null,
    }
  }

  const email = execution?.emails?.[0]
  const logged = email?.delivery === 'logged' || (ran && mailMode === 'log' && !email)
  return {
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
          { label: 'To', value: email?.to?.join(', ') || recipients(order).join(', ') || '—' },
          { label: 'Subject', value: email?.subject || `Brand Approval for PO ${order?.poNumber || ''}` },
          { label: 'Attachment', value: email?.fileName || fileNames(order) },
        ]
      : [{ label: 'Value', value: EMPTY }],
    output: !execution
      ? [{ label: 'Value', value: EMPTY }]
      : !ran
        ? [{ label: 'Value', value: NOT_RUN }]
        : [
            { label: 'Delivery', value: email?.delivery === 'sent' ? 'Sent' : 'Shown here' },
            {
              label: 'Message',
              value: email?.html || 'Dear Helmsman Client,<br><br>Please see PO below attached for approval.',
              html: true,
            },
          ],
    notice:
      ran && execution?.mode === 'test'
        ? {
            tone: 'warning',
            text: 'Test mode. The Helmsman staging database was updated. Monday was not changed. The email was not sent.',
          }
        : ran && execution?.mode === 'production'
          ? { tone: 'warning', text: 'Production mode. The Helmsman production database and Monday were updated.' }
          : ran && logged
            ? { tone: 'warning', text: 'Email is not configured, so this email was not sent.' }
            : stoppedHere
              ? { tone: 'error', text: summary || 'The email was not sent.' }
              : null,
  }
}

export function inventoryFlowOutcome(execution: Pick<Execution, 'status'>): FlowProgress {
  if (execution.status === 'running' || execution.status === 'pending') return { current: 0 }
  if (execution.status === 'error' || execution.status === 'incomplete') return { current: 0, stopped: true }
  return { current: 4 }
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

export function inventoryNodeDetail(index: number, execution: Execution | null): FlowNodeDetail {
  const run = execution?.inventory
  const ran = Boolean(execution && execution.status !== 'pending' && execution.status !== 'running')
  const failed = execution?.status === 'error' || execution?.status === 'incomplete'
  const empty = [{ label: 'Value', value: ran ? execution?.summary || '—' : EMPTY }]
  const files = (run?.files ?? []).map((file) => [file.name, file.modifiedTime || ''])
  const catalog = (run?.catalog ?? []).map((row) => [row.code, row.name, String(row.pieces)])
  const created = (run?.created ?? []).map((row) => [row.code, row.name, String(row.pieces)])
  const stock = (run?.stock ?? []).map((row) => [row.code, row.name, String(row.pieces ?? ''), String(row.available)])
  const updates = (run?.updates ?? []).map((row) => [
    row.code || '',
    row.name || '',
    String(row.available),
    row.date,
    row.item_id,
  ])
  const inserts = (run?.inserts ?? []).map((row) => [
    row.code,
    row.name,
    String(row.available),
    row.date,
    row.product_id || '',
  ])
  const hasRows = Boolean(run && (run.files || run.catalog || run.stock || run.updates || run.inserts || run.created))
  const steps: FlowNodeDetail[] = [
    {
      settings: [
        { label: 'Folder', value: '7D Daily Inventory' },
        { label: 'Choice', value: 'A free model picks the latest inventory file. The date in the file name is the inventory date.' },
      ],
      input: hasRows ? [tableField('Files', ['Name', 'Modified'], files)] : empty,
      output: hasRows
        ? [
            { label: 'File', value: run?.fileName || '—' },
            { label: 'Chosen by', value: run?.chosenBy || '—' },
          ]
        : [{ label: 'File', value: run?.fileName || EMPTY }],
      notice: failed ? { tone: execution?.status === 'error' ? 'error' : 'warning', text: execution?.summary || 'The run stopped.' } : null,
    },
    {
      settings: [
        { label: 'Tabs', value: 'cases and with Merch' },
        { label: 'Board', value: '3649701177' },
        { label: 'Code', value: 'text3' },
        { label: 'Pieces', value: 'numbers15' },
      ],
      input: hasRows ? [tableField('Sheet rows', ['Code', 'Item', 'Pieces'], catalog)] : empty,
      output: hasRows ? [tableField('Products to create', ['Code', 'Item', 'Pieces'], created)] : empty,
      notice: null,
    },
    {
      settings: [
        { label: 'Cases column', value: 'balance case qty' },
        { label: 'Merch tab', value: 'with merch, or Sheet2 when that tab exists' },
        { label: 'Merch column', value: 'available per case' },
      ],
      input: hasRows ? [tableField('Sheet rows', ['Code', 'Item', 'Pieces', 'Available'], stock)] : empty,
      output: hasRows ? [tableField('Quantity used', ['Code', 'Item', 'Pieces', 'Available'], stock)] : empty,
      notice: null,
    },
    {
      settings: [
        { label: 'Board', value: '9222203783' },
        { label: 'Available', value: 'numeric_mkxw3n3f' },
        { label: 'Date', value: 'date_mkxwddre' },
        { label: '7D warehouse', value: '6285816206' },
      ],
      input: hasRows ? [tableField('Quantities', ['Code', 'Item', 'Pieces', 'Available'], stock)] : empty,
      output: hasRows
        ? [
            tableField('Updates', ['Code', 'Item', 'Available', 'Date', 'Monday item'], updates),
            tableField('Adds', ['Code', 'Item', 'Available', 'Date', 'Product'], inserts),
          ]
        : empty,
      notice:
        run?.mode === 'test'
          ? { tone: 'warning', text: 'Test mode. The Helmsman staging database was updated. Monday was not changed.' }
          : run?.mode === 'production'
            ? { tone: 'warning', text: 'Production mode. The Helmsman production database and Monday were updated.' }
            : null,
    },
  ]
  return steps[index] ?? { settings: [], input: empty, output: empty, notice: null }
}


