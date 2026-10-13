import type { PropertyValue } from '../domain/graph'

/** snake_case identifier that is always safe to use as a table or column name. */
export function toIdentifier(name: string): string {
  const snake = name
    .trim()
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase()
  if (snake === '') return 'unnamed'
  return /^[0-9]/.test(snake) ? `_${snake}` : snake
}

/** Returns base, or base_2, base_3... when the name is already taken. Registers the result. */
export function uniqueName(base: string, used: Set<string>): string {
  let candidate = base
  for (let n = 2; used.has(candidate); n++) candidate = `${base}_${n}`
  used.add(candidate)
  return candidate
}

/** Double-quotes an identifier, doubling any embedded quote (defense in depth after toIdentifier). */
export function quoteIdent(name: string): string {
  return `"${name.replace(/"/g, '""')}"`
}

/** SQL literal for a value; strings are single-quoted with embedded quotes doubled. */
export function sqlLiteral(value: PropertyValue): string {
  if (value === null) return 'NULL'
  if (typeof value === 'boolean') return value ? '1' : '0'
  if (typeof value === 'number') return Number.isFinite(value) ? String(value) : 'NULL'
  return `'${value.replace(/'/g, "''")}'`
}

/**
 * One pass over the SQL text that understands quoted strings/identifiers and comments.
 * Returns the code without comments and the number of non-empty statements.
 */
export function scanSql(sql: string): { code: string; statements: number } {
  let code = ''
  let statements = 0
  let hasContent = false
  let quote: string | null = null

  for (let i = 0; i < sql.length; i++) {
    const char = sql.charAt(i)

    if (quote) {
      code += char
      if (char === quote) {
        if (sql.charAt(i + 1) === quote) code += sql.charAt(++i)
        else quote = null
      }
    } else if (char === '-' && sql.charAt(i + 1) === '-') {
      while (i < sql.length && sql.charAt(i) !== '\n') i++
      code += '\n'
    } else if (char === '/' && sql.charAt(i + 1) === '*') {
      const end = sql.indexOf('*/', i + 2)
      i = end === -1 ? sql.length : end + 1
      code += ' '
    } else {
      code += char
      if (char === "'" || char === '"' || char === '`') {
        quote = char
        hasContent = true
      } else if (char === ';') {
        if (hasContent) statements++
        hasContent = false
      } else if (!/\s/.test(char)) {
        hasContent = true
      }
    }
  }
  return { code, statements: hasContent ? statements + 1 : statements }
}

/** Only a single SELECT/WITH statement may run in the query box. Returns an error message or null. */
export function readOnlyViolation(sql: string): string | null {
  const { code, statements } = scanSql(sql)
  if (code.trim() === '') return 'Write a query first'
  if (!/^\s*(select|with)\b/i.test(code)) return 'Only SELECT queries are allowed'
  if (statements > 1) return 'Run one statement at a time'
  return null
}
