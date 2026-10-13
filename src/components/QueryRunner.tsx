import { useState } from 'react'
import type { Database } from 'sql.js'
import { sampleQueries, type SampleQuery } from '../data/queries'
import { runQuery, type QueryOutcome } from '../migration/query'
import ResultTable from './ResultTable'

export default function QueryRunner({
  db,
  usesSampleGraph,
}: {
  db: Database
  usesSampleGraph: boolean
}) {
  const [sql, setSql] = useState(sampleQueries[0]?.sql ?? '')
  const [sample, setSample] = useState<SampleQuery | null>(
    usesSampleGraph ? (sampleQueries[0] ?? null) : null,
  )
  const [outcome, setOutcome] = useState<QueryOutcome | null>(null)

  const pick = (query: SampleQuery) => {
    setSample(query)
    setSql(query.sql)
    setOutcome(runQuery(db, query.sql))
  }

  return (
    <div className="flex flex-col gap-4">
      {usesSampleGraph && (
        <div className="flex flex-wrap gap-2">
          {sampleQueries.map((query) => (
            <button
              key={query.title}
              type="button"
              onClick={() => pick(query)}
              className={`cursor-pointer rounded-full border px-3 py-1 text-sm ${
                sample === query ? 'border-accent' : 'border-border hover:border-accent'
              } bg-surface`}
            >
              {query.title}
            </button>
          ))}
        </div>
      )}

      <div className={`grid gap-4 ${sample ? 'lg:grid-cols-2' : ''}`}>
        <div className="flex flex-col gap-2">
          <label htmlFor="sql-input" className="text-muted text-sm">
            SQL (SQLite, read-only)
          </label>
          <textarea
            id="sql-input"
            value={sql}
            onChange={(event) => setSql(event.target.value)}
            spellCheck={false}
            className="bg-surface border-border h-40 w-full resize-y rounded-xl border p-3 font-mono text-xs"
          />
        </div>
        {sample && (
          <div className="flex flex-col gap-2">
            <span className="text-muted text-sm">Equivalent Cypher (Neo4j)</span>
            <pre
              tabIndex={0}
              className="bg-surface border-border h-40 overflow-auto rounded-xl border p-3 font-mono text-xs"
            >
              {sample.cypher}
            </pre>
          </div>
        )}
      </div>

      <div>
        <button
          type="button"
          onClick={() => setOutcome(runQuery(db, sql))}
          className="bg-accent text-accent-text cursor-pointer rounded-full px-5 py-2 text-sm font-medium"
        >
          Run query
        </button>
      </div>

      {outcome?.ok && <ResultTable result={outcome.result} />}
      {outcome && !outcome.ok && (
        <p role="alert" className="text-fail text-sm">
          {outcome.error}
        </p>
      )}
    </div>
  )
}
