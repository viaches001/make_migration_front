import { useState } from 'react'
import { Plus, X } from 'lucide-react'
import type { EmailRecipients } from '@/types/automation'

interface Props {
  recipients: EmailRecipients
  onSave: (next: EmailRecipients) => Promise<void>
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

/** Edit who practice runs go to. Live emails go to the real recipients from Monday. Saves on each change. */
export function RecipientsEditor({ recipients, onSave }: Props) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function save(next: EmailRecipients) {
    setSaving(true)
    setError(null)
    try {
      await onSave(next)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Could not save the addresses')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-4">
      <EmailList
        label="Practice runs go to"
        hint="In Practice, the email goes only to these addresses, not to the real clients. Keep at least one."
        emails={recipients.practice}
        disabled={saving}
        minimum={1}
        onChange={(emails) => void save({ ...recipients, practice: emails })}
      />
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  )
}

function EmailList({
  label,
  hint,
  emails,
  disabled,
  minimum,
  onChange,
}: {
  label: string
  hint: string
  emails: string[]
  disabled: boolean
  minimum: number
  onChange: (emails: string[]) => void
}) {
  const [draft, setDraft] = useState('')
  const [problem, setProblem] = useState<string | null>(null)

  function add() {
    const email = draft.trim().toLowerCase()
    if (!email) return
    if (!EMAIL.test(email)) {
      setProblem('That is not an email address.')
      return
    }
    if (emails.includes(email)) {
      setProblem('That address is already in the list.')
      return
    }
    setProblem(null)
    setDraft('')
    onChange([...emails, email])
  }

  return (
    <div>
      <p className="text-[11px] font-semibold text-helm-400">{label}</p>
      <p className="mt-0.5 text-xs text-helm-300">{hint}</p>
      <ul className="mt-2 flex flex-wrap gap-1.5">
        {emails.length === 0 && <li className="text-sm text-helm-400">Nobody yet</li>}
        {emails.map((email) => (
          <li
            key={email}
            className="inline-flex items-center gap-1 rounded-full bg-helm-50 py-1 pl-3 pr-1 text-sm text-helm-700"
          >
            {email}
            <button
              type="button"
              disabled={disabled || emails.length <= minimum}
              onClick={() => onChange(emails.filter((item) => item !== email))}
              className="rounded-full p-0.5 text-helm-400 hover:bg-helm-100 hover:text-helm-700 disabled:opacity-40"
              aria-label={`Remove ${email}`}
              title={emails.length <= minimum ? 'Keep at least one address' : `Remove ${email}`}
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="mt-2 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault()
          add()
        }}
      >
        <input
          type="email"
          value={draft}
          onChange={(event) => {
            setDraft(event.target.value)
            setProblem(null)
          }}
          placeholder="name@example.com"
          disabled={disabled}
          className="min-w-0 flex-1 rounded-lg border border-helm-100 px-3 py-1.5 text-sm text-helm-700 outline-none focus:border-helm-400"
        />
        <button
          type="submit"
          disabled={disabled || !draft.trim()}
          className="inline-flex items-center gap-1 rounded-lg bg-helm-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-helm-500 disabled:opacity-50"
        >
          <Plus className="h-3.5 w-3.5" />
          Add
        </button>
      </form>
      {problem && <p className="mt-1 text-xs text-red-600">{problem}</p>}
    </div>
  )
}
