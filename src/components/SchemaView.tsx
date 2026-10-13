import type { Schema } from '../migration/schema'

export default function SchemaView({ schema }: { schema: Schema }) {
  return (
    <div>
      {schema.warnings.length > 0 && (
        <ul className="text-accent mb-4 list-disc pl-5 text-sm">
          {schema.warnings.map((warning) => (
            <li key={warning}>{warning}</li>
          ))}
        </ul>
      )}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {schema.tables.map((table) => (
          <article key={table.name} className="bg-surface border-border rounded-xl border p-4">
            <h3 className="font-mono font-semibold">{table.name}</h3>
            <p className="text-muted mb-3 text-xs">
              {table.kind === 'node'
                ? `from nodes :${table.source}`
                : `from relationships ${table.source}`}
            </p>
            <ul className="space-y-1 font-mono text-xs">
              {table.columns.map((column) => (
                <li
                  key={column.name}
                  className="flex flex-wrap items-baseline justify-between gap-2"
                >
                  <span>{column.name}</span>
                  <span className="text-muted">
                    {column.type}
                    {column.primaryKey && ' · PK'}
                    {!column.primaryKey && !column.nullable && ' · NOT NULL'}
                    {column.references && ` · FK → ${column.references.table}`}
                  </span>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </div>
    </div>
  )
}
