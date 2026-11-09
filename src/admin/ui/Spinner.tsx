import { Loader2 } from 'lucide-react'
import { VisuallyHidden } from 'radix-ui'
import { cn } from '@/lib/cn'

export type SpinnerProps = { className?: string; label?: string }

export function Spinner({ className, label = 'Carregando' }: SpinnerProps) {
  return (
    <span role="status" className={cn('inline-flex items-center text-admin-accent', className)}>
      <Loader2 aria-hidden="true" className="size-4 animate-spin" />
      <VisuallyHidden.Root>{label}</VisuallyHidden.Root>
    </span>
  )
}
