import type { Graph } from '../domain/graph'
import { tableRows, type Column, type Schema, type Table } from './schema'
import { quoteIdent, sqlLiteral } from './sql'

export interface GeneratedSql {
  ddl: string
  inserts: string
  /** ddl + inserts, ready to execute */
  script: string
}

function columnDefinition(column: Column): string {
  const parts = [quoteIdent(column.name), column.type]
  if (column.primaryKey) parts.push('PRIMARY KEY')
  else if (!column.nullable) parts.push('NOT NULL')
  if (column.references) {
    parts.push(
      `REFERENCES ${quoteIdent(column.references.table)}(${quoteIdent(column.references.column)})`,
    )
  }
  return `  ${parts.join(' ')}`
}

function createTable(table: Table): string {
  const lines = table.columns.map(columnDefinition).join(',\n')
  return `CREATE TABLE ${quoteIdent(table.name)} (\n${lines}\n);`
}

function insertRows(graph: Graph, table: Table): string {
  const rows = tableRows(graph, table)
  if (rows.length === 0) return ''
  const columns = table.columns.map((column) => quoteIdent(column.name)).join(', ')
  const values = rows.map((row) => `  (${row.map(sqlLiteral).join(', ')})`).join(',\n')
  return `INSERT INTO ${quoteIdent(table.name)} (${columns}) VALUES\n${values};`
}

/** Node tables come first so foreign keys always point to rows that already exist. */
export function generateSql(graph: Graph, schema: Schema): GeneratedSql {
  const ordered = [...schema.tables].sort(
    (a, b) => Number(a.kind === 'relationship') - Number(b.kind === 'relationship'),
  )
  const ddl = ordered.map(createTable).join('\n\n')
  const inserts = ordered
    .map((table) => insertRows(graph, table))
    .filter((statement) => statement !== '')
    .join('\n\n')
  return { ddl, inserts, script: `${ddl}\n\n${inserts}\n` }
}
