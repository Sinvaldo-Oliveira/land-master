import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/cn'

export type EmptyStateProps = {
  icon?: LucideIcon
  title: string
  description: string
  action?: ReactNode
  className?: string
}

export function EmptyState({ icon: Icon, title, description, action, className }: EmptyStateProps) {
  return (
    <div className={cn('flex flex-col items-center px-6 py-12 text-center', className)}>
      {Icon ? (
        <span className="mb-4 inline-flex size-10 items-center justify-center rounded-full border border-admin-rule bg-admin-sunken text-admin-ink-2">
          <Icon aria-hidden="true" className="size-5" />
        </span>
      ) : null}
      <h3 className="font-admin-display text-admin-lg font-semibold text-admin-ink">{title}</h3>
      <p className="mt-1 max-w-sm text-admin-base text-admin-ink-2">{description}</p>
      {action ? <div className="mt-5 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  )
}
