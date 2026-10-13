import type { VerificationReport as Report } from '../migration/verify'

export default function VerificationReport({ report }: { report: Report }) {
  const failed = report.checks.filter((check) => !check.ok).length

  return (
    <div>
      <p role="status" className={`mb-3 font-semibold ${report.ok ? 'text-ok' : 'text-fail'}`}>
        {report.ok
          ? `All ${report.checks.length} checks passed`
          : `${failed} of ${report.checks.length} checks failed`}
      </p>
      <ul className="bg-surface border-border divide-border divide-y rounded-xl border text-sm">
        {report.checks.map((check) => (
          <li
            key={check.name}
            className="flex flex-wrap items-center justify-between gap-2 px-4 py-2"
          >
            <span>
              <span aria-hidden="true" className={check.ok ? 'text-ok' : 'text-fail'}>
                {check.ok ? '✓' : '✗'}
              </span>{' '}
              <span className="sr-only">{check.ok ? 'Passed: ' : 'Failed: '}</span>
              {check.name}
            </span>
            <span className="text-muted font-mono text-xs">
              expected {check.expected} · actual {check.actual}
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
