import type { ComponentProps } from 'react'
import { Check, Minus } from 'lucide-react'
import { Checkbox as CheckboxPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'
import { focusRing } from './styles'

export type CheckboxProps = ComponentProps<typeof CheckboxPrimitive.Root>

export function Checkbox({ className, checked, ...props }: CheckboxProps) {
  return (
    <CheckboxPrimitive.Root
      checked={checked}
      className={cn(
        'peer inline-flex size-4 shrink-0 items-center justify-center rounded-[4px] border border-admin-rule-strong bg-admin-card',
        'transition-colors duration-[120ms] ease-admin hover:border-admin-ink-3',
        'data-[state=checked]:border-admin-accent data-[state=checked]:bg-admin-accent',
        'data-[state=indeterminate]:border-admin-accent data-[state=indeterminate]:bg-admin-accent',
        'disabled:cursor-not-allowed disabled:opacity-55 aria-invalid:border-admin-danger',
        focusRing,
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="text-admin-card">
        {checked === 'indeterminate' ? (
          <Minus aria-hidden="true" className="size-3" strokeWidth={3} />
        ) : (
          <Check aria-hidden="true" className="size-3" strokeWidth={3} />
        )}
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  )
}
