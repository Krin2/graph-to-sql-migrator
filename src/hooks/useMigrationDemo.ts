import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Database, SqlJsStatic } from 'sql.js'
import { sampleGraphJson } from '../data/sample'
import { loadSqlJs } from '../db/loadSqlJs'
import { parseGraph } from '../domain/graph'
import { migrate, type MigrationResult } from '../migration/migrate'
import { inferSchema } from '../migration/schema'
import { generateSql } from '../migration/toSql'

export function useMigrationDemo() {
  const [text, setText] = useState(sampleGraphJson)
  const [sqlJs, setSqlJs] = useState<SqlJsStatic | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [migration, setMigration] = useState<MigrationResult | null>(null)
  const [migrationError, setMigrationError] = useState<string | null>(null)
  const dbRef = useRef<Database | null>(null)

  const parsed = useMemo(() => parseGraph(text), [text])
  const preview = useMemo(() => {
    if (!parsed.ok) return null
    const schema = inferSchema(parsed.graph)
    return { schema, sql: generateSql(parsed.graph, schema) }
  }, [parsed])

  useEffect(() => {
    loadSqlJs().then(setSqlJs, (error: Error) => setLoadError(error.message))
  }, [])

  const discard = useCallback(() => {
    dbRef.current?.close()
    dbRef.current = null
    setMigration(null)
    setMigrationError(null)
  }, [])

  useEffect(() => discard, [discard])

  // Editing the graph invalidates the previous migration
  const edit = useCallback(
    (value: string) => {
      discard()
      setText(value)
    },
    [discard],
  )

  const reset = useCallback(() => edit(sampleGraphJson), [edit])

  const run = useCallback(() => {
    if (!parsed.ok || !sqlJs) return
    discard()
    try {
      const result = migrate(sqlJs, parsed.graph)
      dbRef.current = result.db
      setMigration(result)
    } catch (error) {
      setMigrationError((error as Error).message)
    }
  }, [parsed, sqlJs, discard])

  return { text, edit, reset, parsed, preview, sqlJs, loadError, migration, migrationError, run }
}
