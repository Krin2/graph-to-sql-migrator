import type { ParseResult } from '../domain/graph'

interface GraphEditorProps {
  text: string
  parsed: ParseResult
  onChange: (value: string) => void
  onReset: () => void
}

export default function GraphEditor({ text, parsed, onChange, onReset }: GraphEditorProps) {
  return (
    <div className="flex flex-col gap-3">
      <label htmlFor="graph-json" className="text-muted text-sm">
        Graph as JSON (nodes with labels and properties, relationships with type, from and to)
      </label>
      <textarea
        id="graph-json"
        value={text}
        onChange={(event) => onChange(event.target.value)}
        spellCheck={false}
        aria-invalid={!parsed.ok}
        aria-describedby={parsed.ok ? undefined : 'graph-errors'}
        className="bg-surface border-border h-72 w-full resize-y rounded-xl border p-3 font-mono text-xs"
      />
      {!parsed.ok && (
        <ul id="graph-errors" role="alert" className="text-fail space-y-1 text-sm">
          {parsed.errors.map((error) => (
            <li key={error}>{error}</li>
          ))}
        </ul>
      )}
      <div>
        <button
          type="button"
          onClick={onReset}
          className="border-border bg-surface hover:border-accent cursor-pointer rounded-full border px-4 py-1.5 text-sm"
        >
          Reset to sample graph
        </button>
      </div>
    </div>
  )
}
