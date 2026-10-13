import { sampleGraph } from '../data/sample'
import { computeLayout } from './force'

describe('computeLayout', () => {
  it('positions every node inside the canvas', () => {
    const layout = computeLayout(sampleGraph, 640, 420)
    expect(layout.size).toBe(sampleGraph.nodes.length)
    for (const { x, y } of layout.values()) {
      expect(x).toBeGreaterThanOrEqual(24)
      expect(x).toBeLessThanOrEqual(616)
      expect(y).toBeGreaterThanOrEqual(24)
      expect(y).toBeLessThanOrEqual(396)
    }
  })

  it('keeps disconnected components in view instead of pushing nodes to the edges', () => {
    const layout = [...computeLayout(sampleGraph, 640, 420).values()]
    const onEdge = layout.filter(({ x, y }) => x <= 24 || x >= 616 || y <= 24 || y >= 396)
    expect(onEdge.length).toBeLessThanOrEqual(2)
  })

  it('is deterministic', () => {
    expect([...computeLayout(sampleGraph, 640, 420)]).toEqual([
      ...computeLayout(sampleGraph, 640, 420),
    ])
  })
})
