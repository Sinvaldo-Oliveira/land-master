import type { ReactElement, ReactNode } from 'react'
import { Tooltip as TooltipPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'

export const TooltipProvider = TooltipPrimitive.Provider

export type TooltipProps = {
  content: ReactNode
  children: ReactElement
  side?: 'top' | 'right' | 'bottom' | 'left'
  className?: string
}

/** Tooltip de texto curto. O gatilho (filho único) precisa ser focável. */
export function Tooltip({ content, children, side = 'top', className }: TooltipProps) {
  return (
    // Provider local: o componente funciona mesmo fora de um <TooltipProvider> da aplicação.
    <TooltipPrimitive.Provider delayDuration={300}>
      <TooltipPrimitive.Root>
        <TooltipPrimitive.Trigger asChild>{children}</TooltipPrimitive.Trigger>
        <TooltipPrimitive.Portal>
          <TooltipPrimitive.Content
            side={side}
            sideOffset={6}
            collisionPadding={8}
            className={cn(
              'z-50 max-w-64 rounded-admin bg-admin-ink px-2.5 py-1.5 font-admin-body text-admin-sm text-admin-card shadow-admin-pop',
              'data-[state=delayed-open]:animate-admin-fade-in data-[state=instant-open]:animate-admin-fade-in',
              className,
            )}
          >
            {content}
            <TooltipPrimitive.Arrow className="fill-admin-ink" />
          </TooltipPrimitive.Content>
        </TooltipPrimitive.Portal>
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  )
}
