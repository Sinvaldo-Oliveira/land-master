import { cn } from '@/lib/cn'

/** Marca do produto (provisória — decisão D4). Na Fase 4 o logo da empresa pode substituí-la. */
export function BrandMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn('size-8 shrink-0', className)}>
      <rect width="32" height="32" rx="7" fill="currentColor" />
      <path d="M9 22V10m7 12V14m7 8v-5" stroke="var(--color-admin-accent)" strokeWidth="3" strokeLinecap="round" />
    </svg>
  )
}
