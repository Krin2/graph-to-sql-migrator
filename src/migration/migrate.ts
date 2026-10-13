import type { Database, SqlJsStatic } from 'sql.js'
import type { Graph } from '../domain/graph'
import { inferSchema, type Schema } from './schema'
import { generateSql, type GeneratedSql } from './toSql'
import { verifyMigration, type VerificationReport } from './verify'

export interface MigrationResult {
  db: Database
  schema: Schema
  sql: GeneratedSql
  verification: VerificationReport
}

export class MigrationError extends Error {}

/** Creates an in-memory SQLite database from the graph and verifies the result. */
export function migrate(SQL: SqlJsStatic, graph: Graph): MigrationResult {
  const schema = inferSchema(graph)
  const sql = generateSql(graph, schema)
  const db = new SQL.Database()
  try {
    db.run('PRAGMA foreign_keys = ON')
    db.run(sql.script)
  } catch (error) {
    db.close()
    throw new MigrationError(`SQLite rejected the generated script: ${(error as Error).message}`)
  }
  // After loading, the database is read-only: any write fails inside SQLite itself
  db.run('PRAGMA query_only = ON')
  return { db, schema, sql, verification: verifyMigration(db, graph, schema) }
}
