import { sampleGraph } from '../data/sample'
import { clampPoint, computeLayout } from './force'

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

  it('clamps dragged points inside the canvas', () => {
    expect(clampPoint({ x: -50, y: 9999 }, 640, 420)).toEqual({ x: 14, y: 406 })
    expect(clampPoint({ x: 300, y: 200 }, 640, 420)).toEqual({ x: 300, y: 200 })
    expect(clampPoint({ x: 700, y: -1 }, 640, 420, 20)).toEqual({ x: 620, y: 20 })
  })

  it('is deterministic', () => {
    expect([...computeLayout(sampleGraph, 640, 420)]).toEqual([
      ...computeLayout(sampleGraph, 640, 420),
    ])
  })
})
