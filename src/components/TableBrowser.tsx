import { useMemo, useState } from 'react'
import type { Database } from 'sql.js'
import { browseTable } from '../migration/query'
import type { Schema } from '../migration/schema'
import ResultTable from './ResultTable'

export default function TableBrowser({ db, schema }: { db: Database; schema: Schema }) {
  const [selected, setSelected] = useState(schema.tables[0]?.name ?? '')
  const outcome = useMemo(() => (selected ? browseTable(db, selected) : null), [db, selected])

  return (
    <div>
      <div role="tablist" aria-label="Tables" className="mb-3 flex flex-wrap gap-2">
        {schema.tables.map((table) => (
          <button
            key={table.name}
            type="button"
            role="tab"
            aria-selected={table.name === selected}
            onClick={() => setSelected(table.name)}
            className={`cursor-pointer rounded-full border px-3 py-1 font-mono text-xs ${
              table.name === selected
                ? 'border-accent bg-accent text-accent-text'
                : 'border-border bg-surface hover:border-accent'
            }`}
          >
            {table.name}
          </button>
        ))}
      </div>
      {outcome?.ok && <ResultTable result={outcome.result} />}
      {outcome && !outcome.ok && <p className="text-fail text-sm">{outcome.error}</p>}
    </div>
  )
}
