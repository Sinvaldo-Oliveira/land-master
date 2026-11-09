import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'

export type BadgeTone = 'neutral' | 'accent' | 'success' | 'warning' | 'danger' | 'info'

export type BadgeProps = ComponentProps<'span'> & { tone?: BadgeTone }

const toneClasses: Record<BadgeTone, string> = {
  neutral: 'border-admin-rule bg-admin-sunken text-admin-ink-2',
  accent: 'border-admin-accent/20 bg-admin-accent-soft text-admin-accent-hover',
  success: 'border-admin-success/20 bg-admin-success-soft text-admin-success',
  warning: 'border-admin-warning/20 bg-admin-warning-soft text-admin-warning',
  danger: 'border-admin-danger/20 bg-admin-danger-soft text-admin-danger',
  info: 'border-admin-info/20 bg-admin-info-soft text-admin-info',
}

/** Selo de status. Sempre com texto — a cor apenas reforça. */
export function Badge({ tone = 'neutral', className, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 whitespace-nowrap rounded-admin border px-2 py-0.5',
        'font-admin-body text-admin-xs font-medium [&_svg]:size-3 [&_svg]:shrink-0',
        toneClasses[tone],
        className,
      )}
      {...props}
    />
  )
}
