import {
  primaryLabel,
  type Graph,
  type GraphNode,
  type GraphRelationship,
  type PropertyValue,
} from '../domain/graph'
import { toIdentifier, uniqueName } from './sql'

export type SqlType = 'INTEGER' | 'REAL' | 'TEXT' | 'BOOLEAN'

export type ColumnSource =
  | { kind: 'id' }
  | { kind: 'from' }
  | { kind: 'to' }
  | { kind: 'extraLabels' }
  | { kind: 'property'; key: string }

export interface Column {
  name: string
  source: ColumnSource
  type: SqlType
  nullable: boolean
  primaryKey: boolean
  references?: { table: string; column: string }
}

export interface Table {
  name: string
  kind: 'node' | 'relationship'
  /** Original label (nodes) or relationship type */
  source: string
  columns: Column[]
}

export interface Schema {
  tables: Table[]
  warnings: string[]
}

type Element = GraphNode | GraphRelationship

function inferType(values: PropertyValue[]): SqlType {
  const present = values.filter((value) => value !== null)
  if (present.length === 0) return 'TEXT'
  if (present.every((value) => typeof value === 'boolean')) return 'BOOLEAN'
  if (present.every((value) => typeof value === 'number' && Number.isInteger(value))) {
    return 'INTEGER'
  }
  if (present.every((value) => typeof value === 'number')) return 'REAL'
  return 'TEXT' // strings or a mix of types: everything is stored as text
}

function propertyColumns(elements: Element[], taken: string[]): Column[] {
  const used = new Set(taken)
  const keys = [...new Set(elements.flatMap((element) => Object.keys(element.properties)))].sort()

  return keys.map((key) => {
    const values = elements.map((element) => element.properties[key] ?? null)
    return {
      name: uniqueName(toIdentifier(key), used),
      source: { kind: 'property', key },
      type: inferType(values),
      nullable: values.some((value) => value === null),
      primaryKey: false,
    }
  })
}

function groupBy<T>(items: T[], key: (item: T) => string): Map<string, T[]> {
  const groups = new Map<string, T[]>()
  for (const item of items) {
    const group = groups.get(key(item))
    if (group) group.push(item)
    else groups.set(key(item), [item])
  }
  return groups
}

const idColumn: Column = {
  name: 'id',
  source: { kind: 'id' },
  type: 'INTEGER',
  nullable: false,
  primaryKey: true,
}

/**
 * Maps a property graph to relational tables:
 * - one table per node label (the first label of each node), with an `id` primary key
 * - one table per relationship type with `from_id` / `to_id` (foreign keys when unambiguous)
 * - one column per property, typed from the values that appear in the data
 */
export function inferSchema(graph: Graph): Schema {
  const usedTables = new Set<string>()
  const warnings: string[] = []
  const tables: Table[] = []
  const tableOfNode = new Map<number, string>()

  for (const [label, nodes] of groupBy(graph.nodes, primaryLabel)) {
    const name = uniqueName(toIdentifier(label), usedTables)
    nodes.forEach((node) => tableOfNode.set(node.id, name))

    const columns: Column[] = [idColumn]
    if (nodes.some((node) => node.labels.length > 1)) {
      columns.push({
        name: 'extra_labels',
        source: { kind: 'extraLabels' },
        type: 'TEXT',
        nullable: true,
        primaryKey: false,
      })
    }
    columns.push(
      ...propertyColumns(
        nodes,
        columns.map((column) => column.name),
      ),
    )
    tables.push({ name, kind: 'node', source: label, columns })
  }

  for (const [type, relationships] of groupBy(graph.relationships, (rel) => rel.type)) {
    const name = uniqueName(toIdentifier(type), usedTables)

    const endpointTable = (side: 'from' | 'to') => {
      const targets = new Set(relationships.map((rel) => tableOfNode.get(rel[side])))
      const [only] = targets
      if (targets.size === 1 && only) return { table: only, column: 'id' }
      warnings.push(
        `${type}: "${side}_id" connects nodes from several tables, so no foreign key is created`,
      )
      return undefined
    }

    const columns: Column[] = [
      idColumn,
      {
        name: 'from_id',
        source: { kind: 'from' },
        type: 'INTEGER',
        nullable: false,
        primaryKey: false,
        references: endpointTable('from'),
      },
      {
        name: 'to_id',
        source: { kind: 'to' },
        type: 'INTEGER',
        nullable: false,
        primaryKey: false,
        references: endpointTable('to'),
      },
    ]
    columns.push(
      ...propertyColumns(
        relationships,
        columns.map((column) => column.name),
      ),
    )
    tables.push({ name, kind: 'relationship', source: type, columns })
  }

  return { tables, warnings }
}

/** Graph elements that belong to a table, in graph order. */
export function elementsOf(graph: Graph, table: Table): Element[] {
  return table.kind === 'node'
    ? graph.nodes.filter((node) => primaryLabel(node) === table.source)
    : graph.relationships.filter((rel) => rel.type === table.source)
}

function cell(column: Column, element: Element): PropertyValue {
  switch (column.source.kind) {
    case 'id':
      return element.id
    case 'from':
      return (element as GraphRelationship).from
    case 'to':
      return (element as GraphRelationship).to
    case 'extraLabels':
      return (element as GraphNode).labels.slice(1).join(',') || null
    case 'property': {
      const value = element.properties[column.source.key] ?? null
      return column.type === 'TEXT' && value !== null ? String(value) : value
    }
  }
}

/** Row values for a table, aligned with `table.columns`. */
export function tableRows(graph: Graph, table: Table): PropertyValue[][] {
  return elementsOf(graph, table).map((element) =>
    table.columns.map((column) => cell(column, element)),
  )
}
