import type { Database } from 'sql.js'
import { quoteIdent, readOnlyViolation } from './sql'

export interface QueryResult {
  columns: string[]
  rows: (string | number | null)[][]
}

const MAX_ROWS = 200

export type QueryOutcome = { ok: true; result: QueryResult } | { ok: false; error: string }

/** Runs a single read-only statement; never throws. */
export function runQuery(db: Database, sql: string): QueryOutcome {
  const violation = readOnlyViolation(sql)
  if (violation) return { ok: false, error: violation }
  try {
    const [result] = db.exec(sql)
    if (!result) return { ok: true, result: { columns: [], rows: [] } }
    return {
      ok: true,
      result: {
        columns: result.columns,
        rows: result.values
          .slice(0, MAX_ROWS)
          .map((row) => row.map((value) => (value instanceof Uint8Array ? '[binary]' : value))),
      },
    }
  } catch (error) {
    return { ok: false, error: (error as Error).message }
  }
}

export function browseTable(db: Database, table: string): QueryOutcome {
  return runQuery(db, `SELECT * FROM ${quoteIdent(table)} LIMIT 50`)
}
