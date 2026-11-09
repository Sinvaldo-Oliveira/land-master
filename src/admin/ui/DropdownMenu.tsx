import type { ComponentProps } from 'react'
import { DropdownMenu as MenuPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'

export const DropdownMenu = MenuPrimitive.Root
export const DropdownMenuTrigger = MenuPrimitive.Trigger

export function DropdownMenuContent({
  className,
  sideOffset = 4,
  align = 'end',
  ...props
}: ComponentProps<typeof MenuPrimitive.Content>) {
  return (
    <MenuPrimitive.Portal>
      <MenuPrimitive.Content
        sideOffset={sideOffset}
        align={align}
        className={cn(
          'z-50 min-w-44 overflow-hidden rounded-admin border border-admin-rule bg-admin-card p-1',
          'font-admin-body text-admin-base text-admin-ink shadow-admin-pop',
          'data-[state=open]:animate-admin-scale-in',
          className,
        )}
        {...props}
      />
    </MenuPrimitive.Portal>
  )
}

export type DropdownMenuItemProps = ComponentProps<typeof MenuPrimitive.Item> & {
  variant?: 'default' | 'danger'
}

export function DropdownMenuItem({ className, variant = 'default', ...props }: DropdownMenuItemProps) {
  return (
    <MenuPrimitive.Item
      className={cn(
        'relative flex cursor-default select-none items-center gap-2 rounded-[4px] px-2 py-1.5 outline-none',
        'transition-colors duration-[120ms] ease-admin',
        'data-[disabled]:pointer-events-none data-[disabled]:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
        variant === 'danger'
          ? 'text-admin-danger data-[highlighted]:bg-admin-danger-soft'
          : 'data-[highlighted]:bg-admin-sunken',
        className,
      )}
      {...props}
    />
  )
}

export function DropdownMenuLabel({ className, ...props }: ComponentProps<typeof MenuPrimitive.Label>) {
  return (
    <MenuPrimitive.Label
      className={cn('px-2 py-1.5 text-admin-xs font-semibold text-admin-ink-3', className)}
      {...props}
    />
  )
}

export function DropdownMenuSeparator({ className, ...props }: ComponentProps<typeof MenuPrimitive.Separator>) {
  return <MenuPrimitive.Separator className={cn('-mx-1 my-1 h-px bg-admin-rule', className)} {...props} />
}
