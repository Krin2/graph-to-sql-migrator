// @vitest-environment jsdom
import '@testing-library/jest-dom/vitest'
import { readFileSync } from 'node:fs'
import { createRequire } from 'node:module'
import { cleanup, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import initSqlJs from 'sql.js'
import { afterEach, vi } from 'vitest'
import App from './App'

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
      screen.getByRole('img', { name: /Graph with 22 nodes and 28 relationships/ }),
    ).toBeInTheDocument()
    expect(screen.getByRole('heading', { level: 3, name: 'acted_in' })).toBeInTheDocument()
    expect(screen.queryByText(/checks passed/)).not.toBeInTheDocument()
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
