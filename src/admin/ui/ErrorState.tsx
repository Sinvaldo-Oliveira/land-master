import { RotateCw, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export type ErrorStateProps = {
  title?: string
  description?: string
  onRetry?: () => void
  reference?: string
  className?: string
}

export function ErrorState({
  title = 'Algo deu errado',
  description,
  onRetry,
  reference,
  className,
}: ErrorStateProps) {
  return (
    <div role="alert" className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      <span className="mb-4 inline-flex size-10 items-center justify-center rounded-full bg-admin-danger-soft text-admin-danger">
        <TriangleAlert aria-hidden="true" className="size-5" />
      </span>
      <h3 className="font-admin-display text-admin-lg font-semibold text-admin-ink">{title}</h3>
      {description ? <p className="mt-1 max-w-sm text-admin-base text-admin-ink-2">{description}</p> : null}
      {onRetry ? (
        <Button variant="secondary" className="mt-5" onClick={onRetry}>
          <RotateCw aria-hidden="true" />
          Tentar novamente
        </Button>
      ) : null}
      {reference ? (
        <p className="mt-4 text-admin-xs text-admin-ink-3">
          Código de referência: <span className="font-admin-mono select-all text-admin-ink-2">{reference}</span>
        </p>
      ) : null}
    </div>
  )
}
