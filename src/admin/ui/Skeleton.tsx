import { cn } from '@/lib/cn'

export type SkeletonProps = { className?: string }

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      aria-hidden="true"
      className={cn('h-4 animate-pulse rounded-admin bg-admin-sunken motion-reduce:animate-none', className)}
    />
  )
}
