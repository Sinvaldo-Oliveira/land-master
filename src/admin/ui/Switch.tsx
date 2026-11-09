import type { ComponentProps } from 'react'
import { Switch as SwitchPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'
import { focusRing } from './styles'

export type SwitchProps = ComponentProps<typeof SwitchPrimitive.Root>

export function Switch({ className, ...props }: SwitchProps) {
  return (
    <SwitchPrimitive.Root
      className={cn(
        'peer inline-flex h-5 w-9 shrink-0 items-center rounded-full border border-transparent bg-admin-rule-strong',
        'transition-colors duration-[120ms] ease-admin data-[state=checked]:bg-admin-accent',
        'disabled:cursor-not-allowed disabled:opacity-55',
        focusRing,
        className,
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb className="pointer-events-none block size-4 translate-x-0.5 rounded-full bg-admin-card transition-transform duration-[120ms] ease-admin data-[state=checked]:translate-x-4" />
    </SwitchPrimitive.Root>
  )
}
