import { sampleGraphJson } from '../data/sample'
import { parseGraph } from './graph'

const errorsOf = (text: string) => {
  const result = parseGraph(text)
  return result.ok ? [] : result.errors
}

describe('parseGraph', () => {
  it('accepts the sample graph', () => {
    const result = parseGraph(sampleGraphJson)
    expect(result.ok && result.graph.nodes.length).toBe(22)
    expect(result.ok && result.graph.relationships.length).toBe(28)
  })

  it('reports invalid JSON', () => {
    expect(errorsOf('{ nope')[0]).toMatch(/^Invalid JSON/)
  })

  it('requires nodes and relationships arrays', () => {
    expect(errorsOf('{}')).toEqual(['Expected an object with "nodes" and "relationships" arrays'])
    expect(errorsOf('[]')).toHaveLength(1)
  })

  it('rejects duplicated ids and dangling relationships', () => {
    const errors = errorsOf(
      JSON.stringify({
        nodes: [{ id: 1 }, { id: 1 }],
        relationships: [{ id: 1, type: 'X', from: 1, to: 99 }],
      }),
    )
    expect(errors).toContain('nodes[1].id 1 is duplicated')
    expect(errors).toContain('relationships[0].to must be the id of an existing node')
  })

  it('rejects non-scalar property values', () => {
    const errors = errorsOf(
      JSON.stringify({
        nodes: [{ id: 1, properties: { tags: ['a'], nested: { a: 1 } } }],
        relationships: [],
      }),
    )
    expect(errors).toHaveLength(2)
  })

  it('needs at least one node', () => {
    expect(errorsOf('{"nodes":[],"relationships":[]}')).toEqual([
      'The graph needs at least one node',
    ])
  })

  it('limits how many errors are listed', () => {
    const nodes = Array.from({ length: 20 }, () => ({ id: 'bad' }))
    const errors = errorsOf(JSON.stringify({ nodes, relationships: [] }))
    expect(errors).toHaveLength(9)
    expect(errors[8]).toBe('...and 12 more')
  })
})
