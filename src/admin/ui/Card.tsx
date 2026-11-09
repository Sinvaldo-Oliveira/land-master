import type { ComponentProps, ReactNode } from 'react'
import { cn } from '@/lib/cn'

export function Card({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('rounded-admin-lg border border-admin-rule bg-admin-card shadow-admin-card', className)}
      {...props}
    />
  )
}

export type CardHeaderProps = Omit<ComponentProps<'div'>, 'title' | 'children'> & {
  title: string
  description?: string
  action?: ReactNode
}

export function CardHeader({ title, description, action, className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn('flex items-start justify-between gap-4 border-b border-admin-rule px-5 py-4', className)}
      {...props}
    >
      <div className="min-w-0">
        <h2 className="font-admin-display text-admin-lg font-semibold text-admin-ink">{title}</h2>
        {description ? <p className="mt-0.5 text-admin-sm text-admin-ink-2">{description}</p> : null}
      </div>
      {action ? <div className="flex shrink-0 items-center gap-2">{action}</div> : null}
    </div>
  )
}

export function CardBody({ className, ...props }: ComponentProps<'div'>) {
  return <div className={cn('px-5 py-4', className)} {...props} />
}
