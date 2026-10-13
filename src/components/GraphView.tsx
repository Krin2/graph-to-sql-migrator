import { useMemo } from 'react'
import { primaryLabel, type Graph, type GraphNode } from '../domain/graph'
import { computeLayout } from '../layout/force'

const WIDTH = 640
const HEIGHT = 420
const RADIUS = 11
const PALETTE = ['#d4af37', '#60a5fa', '#34d399', '#f472b6', '#a78bfa', '#fb923c', '#22d3ee']

function displayName(node: GraphNode): string {
  const { name, title } = node.properties
  return String(name ?? title ?? `${primaryLabel(node)} #${node.id}`)
}

export default function GraphView({ graph }: { graph: Graph }) {
  const layout = useMemo(() => computeLayout(graph, WIDTH, HEIGHT), [graph])

  const labels = useMemo(() => [...new Set(graph.nodes.map(primaryLabel))], [graph])
  const colorOf = (node: GraphNode) => PALETTE[labels.indexOf(primaryLabel(node)) % PALETTE.length]

  const types = useMemo(() => {
    const counts = new Map<string, number>()
    graph.relationships.forEach((rel) => counts.set(rel.type, (counts.get(rel.type) ?? 0) + 1))
    return [...counts]
  }, [graph])

  return (
    <figure className="bg-surface border-border rounded-xl border p-3">
      <svg
        viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
        role="img"
        aria-label={`Graph with ${graph.nodes.length} nodes and ${graph.relationships.length} relationships`}
        className="w-full"
      >
        <defs>
          <marker
            id="arrow"
            viewBox="0 0 10 10"
            refX="9"
            refY="5"
            markerWidth="6"
            markerHeight="6"
            orient="auto"
          >
            <path d="M0 0L10 5L0 10z" fill="#6b6b7d" />
          </marker>
        </defs>

        {graph.relationships.map((rel) => {
          const a = layout.get(rel.from)
          const b = layout.get(rel.to)
          if (!a || !b) return null
          const distance = Math.hypot(b.x - a.x, b.y - a.y) || 1
          const shorten = (RADIUS + 2) / distance
          return (
            <line
              key={rel.id}
              x1={a.x + (b.x - a.x) * shorten}
              y1={a.y + (b.y - a.y) * shorten}
              x2={b.x - (b.x - a.x) * shorten}
              y2={b.y - (b.y - a.y) * shorten}
              stroke="#6b6b7d"
              strokeWidth={1}
              markerEnd="url(#arrow)"
            >
              <title>{rel.type}</title>
            </line>
          )
        })}

        {graph.nodes.map((node) => {
          const point = layout.get(node.id)
          if (!point) return null
          return (
            <g key={node.id}>
              <circle cx={point.x} cy={point.y} r={RADIUS} fill={colorOf(node)}>
                <title>{`${node.labels.join(':') || 'Node'} - ${displayName(node)}`}</title>
              </circle>
              <text
                x={point.x}
                y={point.y + RADIUS + 11}
                textAnchor="middle"
                fontSize={9}
                fill="#ececf1"
                paintOrder="stroke"
                stroke="#0d0d12"
                strokeWidth={3}
              >
                {displayName(node)}
              </text>
            </g>
          )
        })}
      </svg>

      <figcaption className="text-muted mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
        {labels.map((label, index) => (
          <span key={label} className="flex items-center gap-1.5">
            <span
              className="size-3 rounded-full"
              style={{ background: PALETTE[index % PALETTE.length] }}
            />
            :{label}
          </span>
        ))}
        {types.map(([type, count]) => (
          <span key={type} className="font-mono text-xs">
            -[{type}]-&gt; ×{count}
          </span>
        ))}
      </figcaption>
    </figure>
  )
}
