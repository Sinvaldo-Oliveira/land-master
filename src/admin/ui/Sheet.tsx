import type { ComponentProps, ReactNode } from 'react'
import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export const Sheet = DialogPrimitive.Root
export const SheetTrigger = DialogPrimitive.Trigger
export const SheetClose = DialogPrimitive.Close

export type SheetContentProps = Omit<ComponentProps<typeof DialogPrimitive.Content>, 'title' | 'children'> & {
  title: string
  description?: string
  side?: 'right' | 'left'
  children?: ReactNode
  className?: string
}

const sideClasses = {
  right: 'right-0 border-l data-[state=open]:animate-admin-slide-in-right',
  left: 'left-0 border-r transition-[translate] duration-[280ms] ease-admin starting:-translate-x-full',
} as const

export function SheetContent({
  title,
  description,
  side = 'right',
  children,
  className,
  ...props
}: SheetContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-admin-ink/40 data-[state=open]:animate-admin-fade-in" />
      <DialogPrimitive.Content
        {...(description ? {} : { 'aria-describedby': undefined })}
        className={cn(
          'fixed inset-y-0 z-50 flex w-full flex-col border-admin-rule bg-admin-card sm:w-[420px]',
          'font-admin-body text-admin-base text-admin-ink shadow-admin-pop outline-none',
          sideClasses[side],
          className,
        )}
        {...props}
      >
        <div className="flex items-start justify-between gap-4 border-b border-admin-rule px-5 py-4">
          <div className="min-w-0">
            <DialogPrimitive.Title className="font-admin-display text-admin-lg font-semibold text-admin-ink">
              {title}
            </DialogPrimitive.Title>
            {description ? (
              <DialogPrimitive.Description className="mt-0.5 text-admin-sm text-admin-ink-2">
                {description}
              </DialogPrimitive.Description>
            ) : null}
          </div>
          <DialogPrimitive.Close asChild>
            <Button variant="ghost" size="icon" aria-label="Fechar" className="-mr-2 size-8">
              <X aria-hidden="true" />
            </Button>
          </DialogPrimitive.Close>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">{children}</div>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}
