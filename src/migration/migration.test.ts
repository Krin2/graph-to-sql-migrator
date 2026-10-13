import initSqlJs, { type SqlJsStatic } from 'sql.js'
import { sampleGraph } from '../data/sample'
import { sampleQueries } from '../data/queries'
import type { Graph } from '../domain/graph'
import { migrate } from './migrate'
import { runQuery, browseTable } from './query'
import { inferSchema } from './schema'
import { generateSql } from './toSql'
import { verifyMigration } from './verify'

let SQL: SqlJsStatic
beforeAll(async () => {
  SQL = await initSqlJs()
})

const table = (graph: Graph, name: string) => inferSchema(graph).tables.find((t) => t.name === name)

describe('inferSchema', () => {
  it('creates one table per label and per relationship type', () => {
    const { tables } = inferSchema(sampleGraph)
    expect(tables.map((t) => t.name)).toEqual([
      'person',
      'movie',
      'genre',
      'acted_in',
      'directed',
      'in_genre',
    ])
  })

  it('infers column types and nullability from the data', () => {
    const movie = table(sampleGraph, 'movie')!
    const byName = Object.fromEntries(movie.columns.map((c) => [c.name, c]))
    expect(byName.id).toMatchObject({ type: 'INTEGER', primaryKey: true, nullable: false })
    expect(byName.released).toMatchObject({ type: 'INTEGER', nullable: false })
    expect(byName.rating).toMatchObject({ type: 'REAL', nullable: false })
    expect(byName.tagline).toMatchObject({ type: 'TEXT', nullable: true }) // missing on some movies
  })

  it('adds extra_labels only when nodes have more than one label', () => {
    expect(table(sampleGraph, 'person')!.columns.map((c) => c.name)).toContain('extra_labels')
    expect(table(sampleGraph, 'movie')!.columns.map((c) => c.name)).not.toContain('extra_labels')
  })

  it('creates foreign keys when every endpoint comes from a single table', () => {
    const acted = table(sampleGraph, 'acted_in')!
    expect(acted.columns.find((c) => c.name === 'from_id')?.references).toEqual({
      table: 'person',
      column: 'id',
    })
    expect(acted.columns.find((c) => c.name === 'to_id')?.references).toEqual({
      table: 'movie',
      column: 'id',
    })
  })

  it('omits the foreign key and warns when endpoints come from several tables', () => {
    const mixed: Graph = {
      nodes: [
        { id: 1, labels: ['A'], properties: {} },
        { id: 2, labels: ['B'], properties: {} },
        { id: 3, labels: ['C'], properties: {} },
      ],
      relationships: [
        { id: 1, type: 'LINKS', from: 1, to: 3, properties: {} },
        { id: 2, type: 'LINKS', from: 2, to: 3, properties: {} },
      ],
    }
    const schema = inferSchema(mixed)
    const links = schema.tables.find((t) => t.name === 'links')!
    expect(links.columns.find((c) => c.name === 'from_id')?.references).toBeUndefined()
    expect(links.columns.find((c) => c.name === 'to_id')?.references).toBeDefined()
    expect(schema.warnings).toHaveLength(1)
  })

  it('stores mixed-type properties as TEXT and resolves name collisions', () => {
    const graph: Graph = {
      nodes: [
        { id: 1, labels: ['Thing'], properties: { value: 1, id: 'x', 'Full Name': 'a' } },
        { id: 2, labels: ['Thing'], properties: { value: 'two', id: 'y' } },
      ],
      relationships: [],
    }
    const thing = inferSchema(graph).tables[0]!
    expect(thing.columns.map((c) => c.name)).toEqual(['id', 'full_name', 'id_2', 'value'])
    expect(thing.columns.find((c) => c.name === 'value')?.type).toBe('TEXT')
  })
})

describe('migrate', () => {
  it('migrates the sample graph and passes every verification check', () => {
    const { verification, db } = migrate(SQL, sampleGraph)
    expect(verification.checks.length).toBeGreaterThan(6)
    expect(verification.checks.filter((c) => !c.ok)).toEqual([])
    expect(verification.ok).toBe(true)
    db.close()
  })

  it('preserves row counts', () => {
    const { db } = migrate(SQL, sampleGraph)
    const count = (name: string) => db.exec(`SELECT COUNT(*) FROM ${name}`)[0]?.values[0]?.[0]
    expect(count('person')).toBe(12)
    expect(count('movie')).toBe(6)
    expect(count('acted_in')).toBe(12)
    db.close()
  })

  it('detects a database that does not match the source graph', () => {
    // Migrate a graph with one relationship missing, then verify it against the full graph
    const incomplete: Graph = {
      ...sampleGraph,
      relationships: sampleGraph.relationships.filter((rel) => rel.id !== 1),
    }
    const { db } = migrate(SQL, incomplete)
    const report = verifyMigration(db, sampleGraph, inferSchema(sampleGraph))

    expect(report.ok).toBe(false)
    const failed = report.checks.filter((c) => !c.ok)
    expect(failed.map((c) => c.name)).toContain('Relationships ACTED_IN -> rows in "acted_in"')
    expect(failed[0]).toMatchObject({ expected: 12, actual: 11 })
    db.close()
  })

  it('makes the database read-only after the migration', () => {
    const { db } = migrate(SQL, sampleGraph)
    expect(() => db.run('DELETE FROM person')).toThrow()
    db.close()
  })

  it('escapes quotes so hostile values cannot break out of the script', () => {
    const hostile: Graph = {
      nodes: [
        {
          id: 1,
          labels: ['Evil"; DROP TABLE x; --'],
          properties: { "na'me": "Robert'); DROP TABLE person;--", 'a"b': 1 },
        },
      ],
      relationships: [],
    }
    const { db, verification } = migrate(SQL, hostile)
    expect(verification.ok).toBe(true)
    const value = db.exec('SELECT * FROM evil_drop_table_x')[0]?.values[0]
    expect(value).toContain("Robert'); DROP TABLE person;--")
    db.close()
  })
})

describe('generateSql', () => {
  it('creates node tables before relationship tables', () => {
    const { ddl } = generateSql(sampleGraph, inferSchema(sampleGraph))
    expect(ddl.indexOf('CREATE TABLE "person"')).toBeLessThan(
      ddl.indexOf('CREATE TABLE "acted_in"'),
    )
  })
})

describe('sample queries', () => {
  it.each(sampleQueries.map((q) => [q.title, q.sql] as const))('%s returns rows', (_title, sql) => {
    const { db } = migrate(SQL, sampleGraph)
    const outcome = runQuery(db, sql)
    expect(outcome.ok).toBe(true)
    if (outcome.ok) expect(outcome.result.rows.length).toBeGreaterThan(0)
    db.close()
  })

  it('returns the expected co-actors of Keanu Reeves', () => {
    const { db } = migrate(SQL, sampleGraph)
    const outcome = runQuery(db, sampleQueries[1]!.sql)
    expect(outcome.ok && outcome.result.rows.map((row) => row[0])).toEqual([
      'Carrie-Anne Moss',
      'Laurence Fishburne',
      'Sandra Bullock',
    ])
    db.close()
  })
})

describe('runQuery', () => {
  it.each([
    ['DELETE FROM person', 'Only SELECT queries are allowed'],
    ['DROP TABLE person', 'Only SELECT queries are allowed'],
    ['SELECT 1; DROP TABLE person', 'Run one statement at a time'],
    ["SELECT '--'; DROP TABLE person", 'Run one statement at a time'],
    ['-- just a comment', 'Write a query first'],
    ['', 'Write a query first'],
  ])('rejects %j', (sql, message) => {
    const { db } = migrate(SQL, sampleGraph)
    expect(runQuery(db, sql)).toEqual({ ok: false, error: message })
    db.close()
  })

  it('refuses writes hidden inside a WITH statement (blocked by SQLite itself)', () => {
    const { db } = migrate(SQL, sampleGraph)
    const outcome = runQuery(db, 'WITH x AS (SELECT 1) DELETE FROM person')
    expect(outcome.ok).toBe(false)
    expect(db.exec('SELECT COUNT(*) FROM person')[0]?.values[0]?.[0]).toBe(12)
    db.close()
  })

  it('allows a trailing semicolon, comments and reports SQL errors without throwing', () => {
    const { db } = migrate(SQL, sampleGraph)
    expect(runQuery(db, '-- count\nSELECT COUNT(*) AS n FROM person;').ok).toBe(true)
    const broken = runQuery(db, 'SELECT * FROM nope')
    expect(broken.ok).toBe(false)
    db.close()
  })

  it('browses a table quoting its name', () => {
    const { db } = migrate(SQL, sampleGraph)
    const outcome = browseTable(db, 'movie')
    expect(outcome.ok && outcome.result.rows.length).toBe(6)
    db.close()
  })
})
