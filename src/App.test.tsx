// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import initSqlJs from 'sql.js'
import { afterEach, beforeEach, vi } from 'vitest'
import App from './App'
import { clampPoint } from './layout/force'

// jsdom cannot fetch the .wasm file, so the test hands the binary to sql.js directly
vi.mock('./db/loadSqlJs', () => {
  const wasm = readFileSync(createRequire(import.meta.url).resolve('sql.js/dist/sql-wasm.wasm'))
  return { loadSqlJs: () => initSqlJs({ wasmBinary: wasm.buffer as ArrayBuffer }) }
})

afterEach(cleanup)

async function runMigration() {
  const button = screen.getByRole('button', { name: 'Run migration' })
  await waitFor(() => expect(button).toBeEnabled())
  await userEvent.click(button)
}

describe('App', () => {
  it('shows the source graph and the inferred schema before migrating', () => {
    render(<App />)
    expect(
      screen.getByRole('button', { name: /Enlarge graph: 22 nodes and 28 relationships/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'acted_in' })).toBeInTheDocument()
    expect(screen.queryByText(/checks passed/)).not.toBeInTheDocument()
  })

  it('enlarges the graph on click and restores it on the next click', async () => {
    render(<App />)
    const graph = screen.getByRole('button', { name: /Enlarge graph/ })
    expect(graph).toHaveAttribute('aria-expanded', 'false')

    await userEvent.click(graph)
    const enlarged = screen.getByRole('button', { name: /Shrink graph/ })
    expect(enlarged).toHaveAttribute('aria-expanded', 'true')
    expect(enlarged.closest('.grid')).not.toHaveClass('lg:grid-cols-2')

    await userEvent.click(enlarged)
    const restored = screen.getByRole('button', { name: /Enlarge graph/ })
    expect(restored).toHaveAttribute('aria-expanded', 'false')
    expect(restored.closest('.grid')).toHaveClass('lg:grid-cols-2')
  })

  describe('dragging nodes', () => {
    beforeEach(() => {
      // jsdom has no layout or pointer capture: map screen pixels 1:1 to the 640x420 viewBox
      const box = { left: 0, top: 0, right: 640, bottom: 420, width: 640, height: 420, x: 0, y: 0 }
      vi.spyOn(SVGSVGElement.prototype, 'getBoundingClientRect').mockReturnValue({
        ...box,
        toJSON: () => box,
      })
      Element.prototype.setPointerCapture = vi.fn()
      Element.prototype.hasPointerCapture = vi.fn(() => true)
      Element.prototype.releasePointerCapture = vi.fn()
    })

    afterEach(() => vi.restoreAllMocks())

    // Node 1 is Keanu Reeves in the sample graph
    const keanu = () => {
      const group = document.querySelector('g[data-node-id="1"]')!
      return { circle: group.querySelector('circle')!, group }
    }
    const position = (circle: Element) => ({
      x: Number(circle.getAttribute('cx')),
      y: Number(circle.getAttribute('cy')),
    })

    it('moves the node with the pointer and keeps the graph size', () => {
      render(<App />)
      const { circle, group } = keanu()
      const before = position(circle)

      fireEvent.pointerDown(group, { clientX: 200, clientY: 200, button: 0, pointerId: 1 })
      fireEvent.pointerMove(group, { clientX: 215, clientY: 190, pointerId: 1 })
      fireEvent.pointerUp(group, { pointerId: 1 })
      fireEvent.click(group) // browsers send a click right after a drag

      expect(position(circle)).toEqual(clampPoint({ x: before.x + 15, y: before.y - 10 }, 640, 420))
      expect(screen.getByRole('button', { name: /Enlarge graph/ })).toHaveAttribute(
        'aria-expanded',
        'false',
      )
    })

    it('treats a press without movement as a normal click', async () => {
      render(<App />)
      const { circle, group } = keanu()
      const before = position(circle)

      fireEvent.pointerDown(group, { clientX: 200, clientY: 200, button: 0, pointerId: 1 })
      fireEvent.pointerMove(group, { clientX: 201, clientY: 200, pointerId: 1 }) // under the threshold
      fireEvent.pointerUp(group, { pointerId: 1 })
      fireEvent.click(group)

      expect(position(circle)).toEqual(before)
      expect(screen.getByRole('button', { name: /Shrink graph/ })).toBeInTheDocument()
    })

    it('keeps the node inside the canvas and offers to reset the layout', async () => {
      render(<App />)
      const { circle, group } = keanu()
      const before = position(circle)

      fireEvent.pointerDown(group, { clientX: 300, clientY: 200, button: 0, pointerId: 1 })
      fireEvent.pointerMove(group, { clientX: 5000, clientY: -5000, pointerId: 1 })
      fireEvent.pointerUp(group, { pointerId: 1 })

      expect(position(circle)).toEqual({ x: 626, y: 14 })

      await userEvent.click(screen.getByRole('button', { name: 'Reset layout' }))
      expect(position(circle)).toEqual(before)
      expect(screen.queryByRole('button', { name: 'Reset layout' })).not.toBeInTheDocument()
    })
  })

  it('migrates, verifies and lets you browse and query the tables', async () => {
    render(<App />)
    await runMigration()

    expect(await screen.findByRole('status')).toHaveTextContent(/All \d+ checks passed/)

    await userEvent.click(screen.getByRole('tab', { name: 'movie' }))
    expect(screen.getByRole('cell', { name: 'The Matrix' })).toBeInTheDocument()

    await userEvent.click(screen.getByRole('button', { name: 'Movies per genre' }))
    // The query result is the last table on the page (the table browser is above it)
    const resultTable = screen.getAllByRole('table').at(-1)!
    const rows = within(resultTable).getAllByRole('row')
    expect(within(rows[1]!).getByText('Action')).toBeInTheDocument()
    expect(within(rows[1]!).getByText('4')).toBeInTheDocument()
  })

  it('rejects statements that would change the data', async () => {
    render(<App />)
    await runMigration()

    const input = await screen.findByLabelText(/SQL \(SQLite, read-only\)/)
    await userEvent.clear(input)
    await userEvent.type(input, 'DELETE FROM person')
    await userEvent.click(screen.getByRole('button', { name: 'Run query' }))

    expect(await screen.findByText('Only SELECT queries are allowed')).toBeInTheDocument()
  })

  it('shows readable errors for invalid JSON and disables the migration', async () => {
    render(<App />)
    const editor = screen.getByLabelText(/Graph as JSON/)
    await userEvent.clear(editor)
    await userEvent.type(editor, 'not json')

    expect(await screen.findByRole('alert')).toHaveTextContent(/Invalid JSON/)
    expect(screen.getByRole('button', { name: 'Run migration' })).toBeDisabled()

    await userEvent.click(screen.getByRole('button', { name: 'Reset to sample graph' }))
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('discards the previous migration when the graph is edited', async () => {
    render(<App />)
    await runMigration()
    await screen.findByRole('status')

    await userEvent.type(screen.getByLabelText(/Graph as JSON/), ' ')
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })
})
