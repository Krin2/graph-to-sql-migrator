import { useMemo, useRef, useState, type PointerEvent } from 'react'
import { primaryLabel, type Graph, type GraphNode } from '../domain/graph'
import { clampPoint, computeLayout, type Point } from '../layout/force'

const WIDTH = 640
const HEIGHT = 420
const RADIUS = 11
const DRAG_THRESHOLD = 3 // px: smaller movements still count as a click
const PALETTE = ['#d4af37', '#60a5fa', '#34d399', '#f472b6', '#a78bfa', '#fb923c', '#22d3ee']

function displayName(node: GraphNode): string {
  const { name, title } = node.properties
  return String(name ?? title ?? `${primaryLabel(node)} #${node.id}`)
}

interface DragState {
  id: number
  /** Distance between the pointer and the node center when the drag started */
  offset: Point
  startX: number
  startY: number
  moved: boolean
}

interface GraphViewProps {
  graph: Graph
  expanded: boolean
  onToggle: () => void
}

export default function GraphView({ graph, expanded, onToggle }: GraphViewProps) {
  const layout = useMemo(() => computeLayout(graph, WIDTH, HEIGHT), [graph])
  // Positions set by dragging; they override the automatic layout until "Reset layout"
  const [dragged, setDragged] = useState<Map<number, Point>>(() => new Map())
  const positions = useMemo(() => new Map([...layout, ...dragged]), [layout, dragged])

  const svgRef = useRef<SVGSVGElement>(null)
  const drag = useRef<DragState | null>(null)
  const suppressClick = useRef(false)

  const labels = useMemo(() => [...new Set(graph.nodes.map(primaryLabel))], [graph])
  const colorOf = (node: GraphNode) => PALETTE[labels.indexOf(primaryLabel(node)) % PALETTE.length]

  const types = useMemo(() => {
    const counts = new Map<string, number>()
    graph.relationships.forEach((rel) => counts.set(rel.type, (counts.get(rel.type) ?? 0) + 1))
    return [...counts]
  }, [graph])

  // Screen coordinates -> SVG coordinates (the SVG scales with its container)
  const toSvgPoint = (event: PointerEvent): Point => {
    const rect = svgRef.current?.getBoundingClientRect()
    if (!rect || rect.width === 0 || rect.height === 0)
      return { x: event.clientX, y: event.clientY }
    return {
      x: ((event.clientX - rect.left) / rect.width) * WIDTH,
      y: ((event.clientY - rect.top) / rect.height) * HEIGHT,
    }
  }

  const startDrag = (event: PointerEvent<SVGGElement>, id: number) => {
    const node = positions.get(id)
    if (event.button !== 0 || !node) return
    event.currentTarget.setPointerCapture(event.pointerId)
    const pointer = toSvgPoint(event)
    drag.current = {
      id,
      offset: { x: node.x - pointer.x, y: node.y - pointer.y },
      startX: event.clientX,
      startY: event.clientY,
      moved: false,
    }
  }

  const moveDrag = (event: PointerEvent<SVGGElement>, id: number) => {
    const state = drag.current
    if (!state || state.id !== id) return
    if (
      !state.moved &&
      Math.hypot(event.clientX - state.startX, event.clientY - state.startY) < DRAG_THRESHOLD
    ) {
      return
    }
    state.moved = true
    const pointer = toSvgPoint(event)
    const next = clampPoint(
      { x: pointer.x + state.offset.x, y: pointer.y + state.offset.y },
      WIDTH,
      HEIGHT,
    )
    setDragged((previous) => new Map(previous).set(id, next))
  }

  const endDrag = (event: PointerEvent<SVGGElement>, id: number) => {
    const state = drag.current
    if (!state || state.id !== id) return
    // A drag ends with a click on the graph: it must not toggle the size
    if (state.moved) suppressClick.current = true
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
  }

  const handleClick = () => {
    if (suppressClick.current) {
      suppressClick.current = false
      return
    }
    onToggle()
  }

  return (
    <figure className="bg-surface border-border rounded-xl border p-3">
      <button
        type="button"
        onClick={handleClick}
        onPointerDown={() => {
          suppressClick.current = false
        }}
        aria-expanded={expanded}
        aria-label={`${expanded ? 'Shrink' : 'Enlarge'} graph: ${graph.nodes.length} nodes and ${graph.relationships.length} relationships`}
        title={expanded ? 'Click to shrink' : 'Click to enlarge'}
        className={`block w-full ${expanded ? 'cursor-zoom-out' : 'cursor-zoom-in'}`}
      >
        <svg ref={svgRef} viewBox={`0 0 ${WIDTH} ${HEIGHT}`} aria-hidden="true" className="w-full">
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
            const a = positions.get(rel.from)
            const b = positions.get(rel.to)
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
            const point = positions.get(node.id)
            if (!point) return null
            return (
              <g
                key={node.id}
                data-node-id={node.id}
                className="cursor-grab active:cursor-grabbing"
                style={{ touchAction: 'none' }}
                onPointerDown={(event) => startDrag(event, node.id)}
                onPointerMove={(event) => moveDrag(event, node.id)}
                onPointerUp={(event) => endDrag(event, node.id)}
                onPointerCancel={(event) => endDrag(event, node.id)}
              >
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
                  pointerEvents="none"
                >
                  {displayName(node)}
                </text>
              </g>
            )
          })}
        </svg>
      </button>

      <figcaption className="text-muted mt-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-sm">
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
        <span className="text-xs">Drag nodes to rearrange them</span>
        {dragged.size > 0 && (
          <button
            type="button"
            onClick={() => setDragged(new Map())}
            className="border-border hover:border-accent cursor-pointer rounded-full border px-3 py-0.5 text-xs"
          >
            Reset layout
          </button>
        )}
      </figcaption>
    </figure>
  )
}
