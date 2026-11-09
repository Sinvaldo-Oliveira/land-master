import type { ReactNode } from 'react'
import { cn } from '@/lib/cn'

export type PageHeaderProps = {
  title: string
  description?: string
  actions?: ReactNode
  className?: string
}

export function PageHeader({ title, description, actions, className }: PageHeaderProps) {
  return (
    <header
      className={cn(
        'flex flex-col gap-4 border-b border-admin-rule pb-5 sm:flex-row sm:items-end sm:justify-between',
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="font-admin-display text-admin-2xl font-semibold tracking-tight text-admin-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-prose text-admin-base text-admin-ink-2">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </header>
  )
}
