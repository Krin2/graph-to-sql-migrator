import type { Database } from 'sql.js'
import type { Graph } from '../domain/graph'
import { elementsOf, type Schema } from './schema'
import { quoteIdent } from './sql'

export interface Check {
  name: string
  expected: number
  actual: number
  ok: boolean
}

export interface VerificationReport {
  checks: Check[]
  ok: boolean
}

function scalar(db: Database, sql: string): number {
  const value = db.exec(sql)[0]?.values[0]?.[0]
  return typeof value === 'number' ? value : 0
}

function check(name: string, expected: number, actual: number): Check {
  return { name, expected, actual, ok: expected === actual }
}

/**
 * Compares the migrated database against the source graph:
 * row counts per table, non-null property values per table, and foreign key violations.
 */
export function verifyMigration(db: Database, graph: Graph, schema: Schema): VerificationReport {
  const checks: Check[] = []

  for (const table of schema.tables) {
    const elements = elementsOf(graph, table)
    const label = table.kind === 'node' ? `Nodes :${table.source}` : `Relationships ${table.source}`
    checks.push(
      check(
        `${label} -> rows in "${table.name}"`,
        elements.length,
        scalar(db, `SELECT COUNT(*) FROM ${quoteIdent(table.name)}`),
      ),
    )

    const properties = table.columns.filter((column) => column.source.kind === 'property')
    if (properties.length > 0) {
      const expected = elements.reduce(
        (total, element) =>
          total +
          properties.filter(
            (column) =>
              column.source.kind === 'property' &&
              (element.properties[column.source.key] ?? null) !== null,
          ).length,
        0,
      )
      const actual = properties.reduce(
        (total, column) =>
          total +
          scalar(db, `SELECT COUNT(${quoteIdent(column.name)}) FROM ${quoteIdent(table.name)}`),
        0,
      )
      checks.push(check(`Property values preserved in "${table.name}"`, expected, actual))
    }
  }

  const violations = db.exec('PRAGMA foreign_key_check')[0]?.values.length ?? 0
  checks.push(check('Foreign key violations', 0, violations))

  return { checks, ok: checks.every((item) => item.ok) }
}
