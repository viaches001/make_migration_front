import { useEffect, useState } from 'react'
import { Mail, Paperclip } from 'lucide-react'
import { emailAssetUrl, fetchExecution } from '@/lib/api'
import { friendlyText } from '@/lib/format'
import type { Execution, LoggedEmail } from '@/types/automation'

/** The emails one run sent, shown the way the recipient sees them. Loaded when the row is opened. */
export function RunEmails({ scenarioId, executionId }: { scenarioId: string; executionId: string }) {
  const [run, setRun] = useState<Execution | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setRun(null)
    setError(null)
    fetchExecution(scenarioId, executionId)
      .then((body) => {
        if (!cancelled) setRun(body.execution)
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not load this run')
      })
    return () => {
      cancelled = true
    }
  }, [scenarioId, executionId])

  if (error) return <p className="text-sm text-red-700">{friendlyText(error)}</p>
  if (!run) return <p className="text-sm text-helm-400">Loading…</p>

  const emails = run.emails ?? []
  return (
    <div className="space-y-3">
      <p className="text-sm text-helm-600">{friendlyText(run.summary ?? run.errorSummary ?? 'Finished')}</p>
      {run.order?.name && <p className="text-xs text-helm-400">Order: {run.order.name}</p>}
      {emails.length === 0 ? (
        <p className="text-sm text-helm-400">No email was sent in this run.</p>
      ) : (
        emails.map((email, index) => <SentEmail key={index} email={email} />)
      )}
    </div>
  )
}

function SentEmail({ email }: { email: LoggedEmail }) {
  const practice = Boolean(email.redirectedFrom?.length)
  const status =
    email.delivery === 'sent' ? (practice ? 'Sent to the practice list' : 'Sent') : 'Prepared, not sent'
  return (
    <div className="overflow-hidden rounded-xl border border-helm-100 bg-white">
      <div className="space-y-1 border-b border-helm-50 bg-canvas/60 px-4 py-3 text-sm">
        <div className="flex flex-wrap items-center gap-2">
          <Mail className="h-4 w-4 text-helm-400" aria-hidden="true" />
          <span className="font-semibold text-helm-700">{email.subject || '(no subject)'}</span>
          <span
            className={
              email.delivery === 'sent'
                ? 'rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700'
                : 'rounded-full bg-amber-50 px-2 py-0.5 text-[11px] font-semibold text-amber-700'
            }
          >
            {status}
          </span>
        </div>
        <p className="text-helm-500">
          <span className="text-helm-400">To </span>
          {(email.to ?? []).join(', ') || '—'}
        </p>
        {practice && (
          <p className="text-helm-500">
            <span className="text-helm-400">Live would go to </span>
            {email.redirectedFrom?.join(', ')}
          </p>
        )}
        {email.fileName && (
          <p className="flex items-center gap-1 text-helm-500">
            <Paperclip className="h-3.5 w-3.5 text-helm-400" aria-hidden="true" />
            {email.fileName}
          </p>
        )}
      </div>
      {email.html ? (
        <iframe
          title={email.subject || 'Email'}
          sandbox=""
          srcDoc={withPictures(email.html)}
          className="h-[480px] w-full bg-white"
        />
      ) : (
        <p className="px-4 py-3 text-sm text-helm-400">
          The message itself was not saved for this run. Runs from now on keep it.
        </p>
      )}
    </div>
  )
}

/** Inline signature pictures are attached to the email (cid:NAME); here they load from the API. */
function withPictures(html: string) {
  const body = html.replace(/cid:([a-z0-9-]+)/gi, (_, name: string) => emailAssetUrl(name))
  return `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:16px;font-family:Helvetica,Arial,sans-serif;font-size:14px;color:#000;}</style></head><body>${body}</body></html>`
}
