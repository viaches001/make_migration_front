export type ScenarioStatus = 'on' | 'off' | 'error'

export type ExecutionStatus = 'success' | 'error' | 'warning' | 'running' | 'pending' | 'incomplete'

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
  errorSummary?: string
  incompleteReason?: string
  analysis?: AiAnalysis
  ignored?: boolean
  emails?: LoggedEmail[]
  order?: OrderSnapshot
  inventory?: InventoryRun
}

export interface OrderSnapshot {
  pulseId?: string
  name?: string
  clientStatus?: string
  poNumber?: string
  salesEmail?: string
  orderEmail?: string
  source?: string
  spreadsheetId?: string
  files?: Array<{ assetId?: string; fileName?: string; publicUrl?: string | null }>
}

export interface InventoryRun {
  spreadsheetIds?: string[]
  fileName?: string
  chosenBy?: string
  productsCreated?: number
  updated?: number
  inserted?: number
  skipped?: string[]
  mode?: string
  files?: Array<{ name: string; modifiedTime?: string }>
  catalog?: Array<{ code: string; name: string; pieces: number }>
  created?: Array<{ code: string; name: string; pieces: number }>
  stock?: Array<{ code: string; name: string; available: number; pieces?: string | number }>
  updates?: Array<{ item_id: string; code?: string; name?: string; available: number; date: string }>
  inserts?: Array<{ code: string; name: string; available: number; product_id?: string; date: string }>
}

export interface LoggedEmail {
  delivery: 'logged' | 'sent'
  to: string[]
  subject: string
  fileName: string
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
