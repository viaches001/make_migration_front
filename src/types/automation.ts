export type ScenarioStatus = 'on' | 'off' | 'error'

export type ExecutionStatus = 'success' | 'error' | 'warning' | 'running' | 'pending' | 'incomplete' | 'listening'

/** Practice runs go to `practice`. Live emails also go to `extra`. */
export interface EmailRecipients {
  practice: string[]
  extra: string[]
}

export interface Scenario {
  id: string
  name: string
  description: string
  status: ScenarioStatus
  folder: string
  tags: string[]
  triggerLabel: string
  boardId?: string
  boardName?: string
  recipients?: EmailRecipients
  lastRunAt: string | null
  successRate: number
  operationsUsed: number
}

export interface Execution {
  id: string
  scenarioId: string
  status: ExecutionStatus
  startedAt: string
  finishedAt: string | null
  durationMs: number | null
  operations: number
  summary?: string
  mode?: 'test' | 'production'
  errorSummary?: string
  incompleteReason?: string
  analysis?: AiAnalysis
  ignored?: boolean
  emails?: LoggedEmail[]
  order?: OrderSnapshot
  inventory?: InventoryRun
}

export interface OrderLine {
  product?: string
  code?: string
  quantity?: string
  unit?: string
  unitPrice?: string
  amount?: string
  vintage?: string
  name?: string
}

/** What a New order from email Test run filled in on Monday when added by hand. */
export interface MondayMatch {
  client?: string
  brand?: string
  distributor?: string
  state?: string
  orderDate?: string
  orderType?: string
  /** Test rows: filed under the TEST client, with what the order was really for. */
  test?: boolean
  readClient?: string
  readBrand?: string
  lines?: Array<{ product?: string; item?: string; code?: string; cases?: string; casePrice?: string; readAs?: string }>
}

export interface OrderSnapshot {
  pulseId?: string
  name?: string
  clientStatus?: string
  orderType?: string
  poNumber?: string
  bolNumber?: string
  salesEmail?: string
  orderEmail?: string
  purchaseEmail?: string
  distributorEmail?: string
  pickupAddress?: string
  pickupInstructions?: string
  warehouseName?: string
  warehouseLabel?: string
  licenseeName?: string
  shipmentStatus?: string
  brandEmails?: string[]
  source?: string
  spreadsheetId?: string
  messageId?: string
  customer?: string
  orderSummary?: string
  readNote?: string
  /** Read from the PO file by AI (New order from email). */
  poDate?: string
  shipTo?: string
  deliveryDate?: string
  currency?: string
  orderTotal?: string
  orderLines?: OrderLine[]
  /** Test runs of New order from email read a file already on the board. */
  sampleAssetId?: string
  sampleItemId?: string
  mondayPoNumber?: string
  poMatches?: boolean | null
  /** Set when a Test run was added to Monday by hand. */
  mondayUrl?: string
  mondayItemName?: string
  /** Live email run: the PO number was already on the board, so that order was used. */
  existingOrder?: boolean | null
  /** Test run: the order already on the board with the PO number read, if any. */
  onBoard?: { id: string; name: string } | null
  /** What the AI says the email is: purchase_order, order_change, invoice, bill_of_lading, shipping_notice or other. */
  documentType?: string | null
  documentReason?: string | null
  /** Test run: the mailbox the email came from. */
  mailbox?: string | null
  /** Test run: read, and being added to Monday. */
  addPending?: boolean | null
  mondayProblems?: string[]
  mondayMatch?: MondayMatch
  sender?: string
  receivedAt?: string
  files?: Array<{ assetId?: string; fileName?: string; publicUrl?: string | null }>
}

export interface InventoryRun {
  spreadsheetIds?: string[]
  fileName?: string
  chosenBy?: string
  productsCreated?: number
  updated?: number
  datesUpdated?: number
  removed?: number
  inserted?: number
  databaseUpdated?: number
  databaseInserted?: number
  skipped?: string[]
  mode?: string
  flowStep?: number
  /** POP runs list the warehouse file each code came from. */
  files?: Array<{ name: string; modifiedTime?: string; warehouse?: string; codes?: number | null; problem?: string }>
  codesRead?: number
  matched?: number
  catalog?: Array<{ code: string; name: string; pieces: number }>
  created?: Array<{ code: string; name: string; pieces: number }>
  stock?: Array<{
    code: string
    name: string
    available: number
    pieces?: string | number
    allocated?: number
    inBond?: number
  }>
  updates?: Array<{
    item_id: string
    code?: string
    name?: string
    available: number
    allocated?: number
    inBond?: number
    date: string
    warehouse?: string
    before?: string
    unit?: string
  }>
  inserts?: Array<{ code: string; name: string; available: number; product_id?: string; date: string }>
}

export interface LoggedEmail {
  delivery: 'logged' | 'sent'
  to: string[]
  redirectedFrom?: string[]
  subject: string
  fileName?: string
  html?: string
}

export interface AiAnalysis {
  executionId: string
  title: string
  rootCause: string
  explanation: string
  suggestedFixes: string[]
  confidence: 'high' | 'medium' | 'low'
}
