import { useState } from 'react'
import GraphEditor from './components/GraphEditor'
import GraphView from './components/GraphView'
import QueryRunner from './components/QueryRunner'
import SchemaView from './components/SchemaView'
import SqlScript from './components/SqlScript'
import Step from './components/Step'
import TableBrowser from './components/TableBrowser'
import VerificationReport from './components/VerificationReport'
import { sampleGraphJson } from './data/sample'
import { useMigrationDemo } from './hooks/useMigrationDemo'

export default function App() {
  const { text, edit, reset, parsed, preview, sqlJs, loadError, migration, migrationError, run } =
    useMigrationDemo()
  // The graph takes the full width when enlarged; clicking it again restores the two-column layout
  const [graphExpanded, setGraphExpanded] = useState(false)

  return (
    <div className="mx-auto max-w-6xl px-[clamp(1rem,4vw,2rem)] py-10">
      <header className="mb-8">
        <p className="text-accent text-sm tracking-[0.15em] uppercase">Interactive demo</p>
        <h1 className="mt-1 text-3xl font-semibold">Graph to SQL migrator</h1>
        <p className="text-muted mt-3 max-w-3xl">
          Turns a Neo4j-style property graph into a relational SQLite database, entirely in your
          browser: infer the schema, generate the SQL, run it, check that nothing was lost and query
          the result. Edit the JSON to try your own graph.
        </p>
      </header>

      <Step
        number={1}
        title="Source graph"
        description="Nodes become rows and relationships become rows in their own tables."
      >
        <div className={`grid gap-6 ${graphExpanded ? '' : 'lg:grid-cols-2'}`}>
          {parsed.ok ? (
            <GraphView
              key={text}
              graph={parsed.graph}
              expanded={graphExpanded}
              onToggle={() => setGraphExpanded((value) => !value)}
            />
          ) : (
            <p className="bg-surface border-border text-muted grid place-items-center rounded-xl border p-6 text-center">
              Fix the JSON to see the graph.
            </p>
          )}
          <GraphEditor text={text} parsed={parsed} onChange={edit} onReset={reset} />
        </div>
      </Step>

      <Step
        number={2}
        title="Inferred relational schema"
        description="One table per label and per relationship type. Column types come from the values found in the data; foreign keys are created when both ends of a relationship belong to a single table."
      >
        {preview ? (
          <SchemaView schema={preview.schema} />
        ) : (
          <p className="text-muted">Waiting for a valid graph.</p>
        )}
      </Step>

      <Step
        number={3}
        title="Generate SQL and migrate"
        description="Values are escaped and identifiers are quoted. After the migration the database is switched to read-only."
      >
        {preview ? (
          <SqlScript script={preview.sql.script} />
        ) : (
          <p className="text-muted">Waiting for a valid graph.</p>
        )}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={run}
            disabled={!parsed.ok || !sqlJs}
            className="bg-accent text-accent-text cursor-pointer rounded-full px-6 py-2.5 font-medium disabled:cursor-not-allowed disabled:opacity-50"
          >
            Run migration
          </button>
          {!sqlJs && !loadError && <span className="text-muted text-sm">Loading SQLite...</span>}
          {loadError && (
            <span className="text-fail text-sm">Could not load SQLite: {loadError}</span>
          )}
          {migrationError && (
            <span role="alert" className="text-fail text-sm">
              {migrationError}
            </span>
          )}
        </div>
      </Step>

      {migration && (
        <>
          <Step
            number={4}
            title="Verification"
            description="Row counts, preserved property values and foreign key integrity are compared against the source graph."
          >
            <VerificationReport report={migration.verification} />
          </Step>

          <Step number={5} title="Explore the tables">
            <TableBrowser key={migration.sql.script} db={migration.db} schema={migration.schema} />
          </Step>

          <Step
            number={6}
            title="Query with SQL"
            description="Compare each SQL query with the Cypher you would write in Neo4j."
          >
            <QueryRunner
              key={migration.sql.script}
              db={migration.db}
              usesSampleGraph={text === sampleGraphJson}
            />
          </Step>
        </>
      )}

      <footer className="border-border text-muted mt-8 border-t pt-6 text-sm">
        Built with React, TypeScript, Tailwind, SQLite (sql.js / WebAssembly) and d3-force.
      </footer>
    </div>
  )
}
