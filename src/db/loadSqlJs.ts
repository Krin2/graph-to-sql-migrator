import initSqlJs, { type SqlJsStatic } from 'sql.js'
import wasmUrl from 'sql.js/dist/sql-wasm.wasm?url'

let instance: Promise<SqlJsStatic> | null = null

/** Loads the SQLite WebAssembly module once; the wasm file is bundled and served with the app. */
export function loadSqlJs(): Promise<SqlJsStatic> {
  instance ??= initSqlJs({ locateFile: () => wasmUrl })
  return instance
}
