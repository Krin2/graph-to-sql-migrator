import {
  forceCollide,
  forceLink,
  forceManyBody,
  forceSimulation,
  forceX,
  forceY,
  type SimulationLinkDatum,
  type SimulationNodeDatum,
} from 'd3-force'
import type { Graph } from '../domain/graph'

export interface Point {
  x: number
  y: number
}

interface LayoutNode extends SimulationNodeDatum {
  id: number
}

// Fixed pseudo-random generator: the same graph is always drawn the same way
function seededRandom(seed = 42) {
  let state = seed
  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296
    return state / 4294967296
  }
}

/** Keeps a point inside the canvas, `margin` away from every edge. */
export function clampPoint(point: Point, width: number, height: number, margin = 14): Point {
  return {
    x: Math.min(width - margin, Math.max(margin, point.x)),
    y: Math.min(height - margin, Math.max(margin, point.y)),
  }
}

/** Static force-directed layout: runs the simulation to rest and returns node positions. */
export function computeLayout(graph: Graph, width: number, height: number): Map<number, Point> {
  const nodes: LayoutNode[] = graph.nodes.map((node) => ({ id: node.id }))
  const links: SimulationLinkDatum<LayoutNode>[] = graph.relationships.map((rel) => ({
    source: rel.from,
    target: rel.to,
  }))

  const simulation = forceSimulation(nodes)
    .randomSource(seededRandom())
    .force(
      'link',
      forceLink<LayoutNode, SimulationLinkDatum<LayoutNode>>(links)
        .id((d) => d.id)
        .distance(70),
    )
    .force('charge', forceManyBody().strength(-200))
    .force('collide', forceCollide(24))
    // Gravity toward the middle keeps disconnected components on screen
    .force('x', forceX(width / 2).strength(0.09))
    .force('y', forceY(height / 2).strength(0.16))
    .stop()

  simulation.tick(300)

  const margin = 24
  const clamp = (value: number | undefined, max: number) =>
    Math.min(max - margin, Math.max(margin, value ?? max / 2))

  return new Map(
    nodes.map((node) => [node.id, { x: clamp(node.x, width), y: clamp(node.y, height) }]),
  )
}
