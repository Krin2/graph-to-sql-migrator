import type { QueryResult } from '../migration/query'

export default function ResultTable({ result }: { result: QueryResult }) {
  if (result.columns.length === 0)
    return <p className="text-muted text-sm">The query returned no rows.</p>

  return (
    <div className="border-border max-h-96 overflow-auto rounded-xl border">
      <table className="w-full text-left font-mono text-xs">
        <thead className="bg-surface sticky top-0">
          <tr>
            {result.columns.map((column) => (
              <th key={column} scope="col" className="px-3 py-2 font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.rows.map((row, index) => (
            <tr key={index} className="border-border border-t">
              {row.map((value, column) => (
                <td key={column} className="px-3 py-1.5 whitespace-nowrap">
                  {value === null ? <span className="text-muted italic">NULL</span> : String(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="text-muted border-border border-t px-3 py-1.5 text-xs">
        {result.rows.length} row{result.rows.length === 1 ? '' : 's'}
      </p>
    </div>
  )
}
