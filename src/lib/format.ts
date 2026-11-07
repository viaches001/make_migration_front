export function formatDateTime(iso: string | null): string {
  if (!iso) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(iso))
}

export function formatDuration(ms: number | null): string {
  if (ms == null) return '—'
  if (ms < 1000) return 'Under a second'
  const seconds = Math.round(ms / 1000)
  if (seconds < 60) return seconds === 1 ? '1 second' : `${seconds} seconds`
  const minutes = Math.floor(seconds / 60)
  const rem = seconds % 60
  if (!rem) return minutes === 1 ? '1 minute' : `${minutes} minutes`
  return `${minutes} min ${rem} sec`
}

export function friendlyText(value: string): string {
  return value
    .replace(/google-drive-account@\S+/gi, 'the inventory reader')
    .replace(/The .+ is not shared with the inventory reader\.?/gi, "We can't open that file.")
    .replace(/not shared with .+/gi, "We can't open that file.")
    .replace(/Google Drive returned \d+/gi, "The inventory file could not be opened.")
    .replace(/Google service account/gi, 'inventory reader')
    .replace(/service account/gi, 'inventory reader')
    .replace(/MONDAY_TOKEN/g, 'the connection')
    .replace(/Test mode\./g, 'Practice run.')
    .replace(/Production mode\./g, '')
    .replace(/Helmsman staging database/g, 'practice copy')
    .replace(/Helmsman production database and Monday/g, 'live inventory')
    .replace(/Helmsman production database/g, 'live inventory')
    .replace(/Monday was not changed\./g, 'The live inventory was left as it is.')
    .replace(/Monday rows/g, 'quantities')
    .replace(/and set the inventory date on (\d+)/g, '. $1 dates were refreshed')
    .replace(/Helmsman production stock: \d+ updated, \d+ added\.?/g, '')
    .replace(/Helmsman staging stock: \d+ updated, \d+ added\.?/g, '')
    .replace(/is not readable by the Google account that reads the 7D inventory files\.?/gi, "can't be opened.")
    .replace(/the Google account that reads the 7D inventory files/gi, 'the inventory reader')
    .replace(/Writing Monday\./g, 'Saving.')
    .replace(/Would update/g, 'Ready to update')
    .replace(/with no Monday product/g, 'with no product yet')
    .replace(/Make\.com scenario[^.]*\./g, '')
    .replace(/Retry this execution/g, 'Try again')
    .replace(/ \./g, '.')
    .replace(/\s{2,}/g, ' ')
    .trim()
}

export function cn(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(' ')
}
