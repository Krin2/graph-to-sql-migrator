export type PropertyValue = string | number | boolean | null

export interface GraphNode {
  id: number
  labels: string[]
  properties: Record<string, PropertyValue>
}

export interface GraphRelationship {
  id: number
  type: string
  from: number
  to: number
  properties: Record<string, PropertyValue>
}

export interface Graph {
  nodes: GraphNode[]
  relationships: GraphRelationship[]
}

export type ParseResult = { ok: true; graph: Graph } | { ok: false; errors: string[] }

const MAX_ERRORS = 8

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isPropertyValue(value: unknown): value is PropertyValue {
  return (
    value === null ||
    typeof value === 'string' ||
    typeof value === 'boolean' ||
    (typeof value === 'number' && Number.isFinite(value))
  )
}

function readProperties(
  value: unknown,
  path: string,
  errors: string[],
): Record<string, PropertyValue> {
  const properties: Record<string, PropertyValue> = {}
  if (value === undefined) return properties
  if (!isRecord(value)) {
    errors.push(`${path}.properties must be an object`)
    return properties
  }
  for (const [key, item] of Object.entries(value)) {
    if (isPropertyValue(item)) properties[key] = item
    else errors.push(`${path}.properties.${key} must be a string, number, boolean or null`)
  }
  return properties
}

/** Validates untrusted JSON text and returns a typed graph, or a list of readable errors. */
export function parseGraph(text: string): ParseResult {
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch (error) {
    return { ok: false, errors: [`Invalid JSON: ${(error as Error).message}`] }
  }

  if (!isRecord(data) || !Array.isArray(data.nodes) || !Array.isArray(data.relationships)) {
    return { ok: false, errors: ['Expected an object with "nodes" and "relationships" arrays'] }
  }

  const errors: string[] = []
  const nodes: GraphNode[] = []
  const relationships: GraphRelationship[] = []
  const nodeIds = new Set<number>()
  const relationshipIds = new Set<number>()

  data.nodes.forEach((raw: unknown, index: number) => {
    const path = `nodes[${index}]`
    if (!isRecord(raw)) return void errors.push(`${path} must be an object`)
    const { id, labels } = raw
    if (typeof id !== 'number' || !Number.isInteger(id)) {
      return void errors.push(`${path}.id must be an integer`)
    }
    if (nodeIds.has(id)) return void errors.push(`${path}.id ${id} is duplicated`)
    if (
      labels !== undefined &&
      (!Array.isArray(labels) ||
        !labels.every((label) => typeof label === 'string' && label.trim() !== ''))
    ) {
      return void errors.push(`${path}.labels must be an array of non-empty strings`)
    }
    nodeIds.add(id)
    nodes.push({
      id,
      labels: (labels as string[] | undefined) ?? [],
      properties: readProperties(raw.properties, path, errors),
    })
  })

  data.relationships.forEach((raw: unknown, index: number) => {
    const path = `relationships[${index}]`
    if (!isRecord(raw)) return void errors.push(`${path} must be an object`)
    const { id, type, from, to } = raw
    if (typeof id !== 'number' || !Number.isInteger(id)) {
      return void errors.push(`${path}.id must be an integer`)
    }
    if (relationshipIds.has(id)) return void errors.push(`${path}.id ${id} is duplicated`)
    if (typeof type !== 'string' || type.trim() === '') {
      return void errors.push(`${path}.type must be a non-empty string`)
    }
    if (typeof from !== 'number' || !nodeIds.has(from)) {
      return void errors.push(`${path}.from must be the id of an existing node`)
    }
    if (typeof to !== 'number' || !nodeIds.has(to)) {
      return void errors.push(`${path}.to must be the id of an existing node`)
    }
    relationshipIds.add(id)
    relationships.push({
      id,
      type,
      from,
      to,
      properties: readProperties(raw.properties, path, errors),
    })
  })

  if (errors.length > 0) {
    const shown = errors.slice(0, MAX_ERRORS)
    if (errors.length > MAX_ERRORS) shown.push(`...and ${errors.length - MAX_ERRORS} more`)
    return { ok: false, errors: shown }
  }
  if (nodes.length === 0) return { ok: false, errors: ['The graph needs at least one node'] }
  return { ok: true, graph: { nodes, relationships } }
}

/** Table/label used for a node: the first label, or "Node" when it has none. */
export function primaryLabel(node: GraphNode): string {
  return node.labels[0] ?? 'Node'
}
