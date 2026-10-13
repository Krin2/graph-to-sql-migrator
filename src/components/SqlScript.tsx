import { useState } from 'react'

export default function SqlScript({ script }: { script: string }) {
  const [copied, setCopied] = useState(false)

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(script)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      // Clipboard not available (insecure context or permission denied): the text is still selectable
    }
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => void copy()}
        className="border-border bg-bg hover:border-accent absolute top-2 right-5 cursor-pointer rounded-full border px-3 py-1 text-xs"
      >
        {copied ? 'Copied' : 'Copy SQL'}
      </button>
      <pre
        tabIndex={0}
        aria-label="Generated SQL script"
        className="bg-surface border-border max-h-96 overflow-auto rounded-xl border p-4 font-mono text-xs"
      >
        {script}
      </pre>
    </div>
  )
}
