import { ExternalLink } from 'lucide-react'

/** The chosen sample file, shown under the steps so it can be compared with what was read. */
export function SamplePreview({ url, fileName }: { url: string; fileName: string }) {
  const picture = /\.(png|jpe?g|webp)$/i.test(fileName)
  return (
    <section aria-label="Sample file preview" className="rounded-2xl border border-helm-100 bg-white shadow-node">
      <div className="flex items-center justify-between gap-3 border-b border-helm-50 px-4 py-2.5">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold text-helm-400">Sample file preview</p>
          <p className="truncate text-sm font-medium text-helm-700" title={fileName}>
            {fileName}
          </p>
        </div>
        <a
          href={url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold text-helm-500 hover:bg-helm-50 hover:text-helm-700"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open
        </a>
      </div>
      {picture ? (
        <img src={url} alt={fileName} className="block max-h-[75vh] w-full object-contain" />
      ) : (
        <iframe key={url} src={url} title={`Preview of ${fileName}`} className="block h-[75vh] min-h-[520px] w-full rounded-b-2xl" />
      )}
    </section>
  )
}
