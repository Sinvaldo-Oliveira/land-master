import { Info } from 'lucide-react'
import { cn } from '@/lib/cn'
import { focusRing } from './styles'
import { Tooltip } from './Tooltip'

export type StatCardProps = {
  label: string
  /** `null` = sem dados (exibe "—"). Nunca passe números de exemplo. */
  value: string | null
  hint?: string
  definition?: string
  className?: string
}

export function StatCard({ label, value, hint, definition, className }: StatCardProps) {
  return (
    <div
      className={cn('rounded-admin-lg border border-admin-rule bg-admin-card p-5 shadow-admin-card', className)}
    >
      <div className="flex items-center gap-1.5">
        <p className="text-admin-sm font-medium text-admin-ink-2">{label}</p>
        {definition ? (
          <Tooltip content={definition}>
            <button
              type="button"
              aria-label="Como é calculado"
              className={cn(
                'inline-flex size-5 items-center justify-center rounded-full text-admin-ink-3',
                'transition-colors duration-[120ms] ease-admin hover:text-admin-ink',
                focusRing,
              )}
            >
              <Info aria-hidden="true" className="size-3.5" />
            </button>
          </Tooltip>
        ) : null}
      </div>
      <p className="mt-2 font-admin-mono text-admin-kpi font-medium tabular text-admin-ink">
        {value ?? (
          <>
            <span aria-hidden="true">—</span>
            <span className="sr-only">Sem dados</span>
          </>
        )}
      </p>
      {hint ? <p className="mt-1 text-admin-xs text-admin-ink-3">{hint}</p> : null}
    </div>
  )
}
