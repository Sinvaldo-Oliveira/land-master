import type { ComponentProps, ReactNode } from 'react'
import { X } from 'lucide-react'
import { Dialog as DialogPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'
import { Button } from './Button'

export const Dialog = DialogPrimitive.Root
export const DialogTrigger = DialogPrimitive.Trigger
export const DialogClose = DialogPrimitive.Close

export type DialogContentProps = Omit<ComponentProps<typeof DialogPrimitive.Content>, 'title' | 'children'> & {
  title: string
  description?: string
  children?: ReactNode
  className?: string
}

export function DialogContent({ title, description, children, className, ...props }: DialogContentProps) {
  return (
    <DialogPrimitive.Portal>
      <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-admin-ink/40 data-[state=open]:animate-admin-fade-in" />
      <DialogPrimitive.Content
        // Sem descrição: remove o aria-describedby padrão (evita aviso do Radix e referência vazia).
        {...(description ? {} : { 'aria-describedby': undefined })}
        className={cn(
          'fixed top-1/2 left-1/2 z-50 max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto',
          'rounded-admin-lg border border-admin-rule bg-admin-card p-6 font-admin-body text-admin-base text-admin-ink shadow-admin-pop',
          'outline-none data-[state=open]:animate-admin-scale-in',
          className,
        )}
        {...props}
      >
        <div className="pr-8">
          <DialogPrimitive.Title className="font-admin-display text-admin-xl font-semibold text-admin-ink">
            {title}
          </DialogPrimitive.Title>
          {description ? (
            <DialogPrimitive.Description className="mt-1 text-admin-base text-admin-ink-2">
              {description}
            </DialogPrimitive.Description>
          ) : null}
        </div>
        <div className="mt-5">{children}</div>
        <DialogPrimitive.Close asChild>
          <Button variant="ghost" size="icon" aria-label="Fechar" className="absolute top-3 right-3 size-8">
            <X aria-hidden="true" />
          </Button>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPrimitive.Portal>
  )
}

export function DialogFooter({ className, ...props }: ComponentProps<'div'>) {
  return (
    <div
      className={cn('mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end', className)}
      {...props}
    />
  )
}
