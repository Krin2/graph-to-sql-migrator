import type { ReactNode } from 'react'

interface StepProps {
  number: number
  title: string
  description?: string
  children: ReactNode
}

export default function Step({ number, title, description, children }: StepProps) {
  return (
    <section aria-labelledby={`step-${number}`} className="border-border border-t py-8">
      <h2 id={`step-${number}`} className="mb-1 flex items-center gap-3 text-xl font-semibold">
        <span className="bg-accent text-accent-text grid size-7 place-items-center rounded-full text-sm">
          {number}
        </span>
        {title}
      </h2>
      {description && <p className="text-muted mb-5 max-w-3xl">{description}</p>}
      {children}
    </section>
  )
}
