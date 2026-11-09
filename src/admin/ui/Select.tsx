import { Check, ChevronDown } from 'lucide-react'
import { Select as SelectPrimitive } from 'radix-ui'
import { cn } from '@/lib/cn'
import { controlBase } from './styles'

export type SelectOption = { value: string; label: string }

export type SelectProps = {
  value?: string
  onValueChange?: (value: string) => void
  placeholder?: string
  /** Valores não podem ser string vazia (restrição do Radix Select). */
  options: SelectOption[]
  id?: string
  invalid?: boolean
  disabled?: boolean
  'aria-label'?: string
  'aria-describedby'?: string
  className?: string
}

export function Select({
  value,
  onValueChange,
  placeholder = 'Selecione',
  options,
  id,
  invalid,
  disabled,
  'aria-label': ariaLabel,
  'aria-describedby': ariaDescribedBy,
  className,
}: SelectProps) {
  return (
    <SelectPrimitive.Root value={value} onValueChange={onValueChange} disabled={disabled}>
      <SelectPrimitive.Trigger
        id={id}
        aria-label={ariaLabel}
        aria-describedby={ariaDescribedBy}
        aria-invalid={invalid || undefined}
        className={cn(
          controlBase,
          'flex h-9 items-center justify-between gap-2 text-left data-[placeholder]:text-admin-ink-3',
          className,
        )}
      >
        <span className="truncate">
          <SelectPrimitive.Value placeholder={placeholder} />
        </span>
        <SelectPrimitive.Icon asChild>
          <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-admin-ink-3" />
        </SelectPrimitive.Icon>
      </SelectPrimitive.Trigger>
      <SelectPrimitive.Portal>
        <SelectPrimitive.Content
          position="popper"
          sideOffset={4}
          className={cn(
            'z-50 max-h-[var(--radix-select-content-available-height)] min-w-[var(--radix-select-trigger-width)] overflow-hidden',
            'rounded-admin border border-admin-rule bg-admin-card font-admin-body text-admin-base text-admin-ink shadow-admin-pop',
            'data-[state=open]:animate-admin-scale-in',
          )}
        >
          <SelectPrimitive.Viewport className="p-1">
            {options.map((option) => (
              <SelectPrimitive.Item
                key={option.value}
                value={option.value}
                className={cn(
                  'relative flex cursor-default select-none items-center rounded-[4px] py-1.5 pr-2 pl-7 outline-none',
                  'data-[highlighted]:bg-admin-sunken data-[state=checked]:font-medium',
                  'data-[disabled]:pointer-events-none data-[disabled]:opacity-50',
                )}
              >
                <SelectPrimitive.ItemIndicator className="absolute left-2 inline-flex text-admin-accent">
                  <Check aria-hidden="true" className="size-3.5" />
                </SelectPrimitive.ItemIndicator>
                <SelectPrimitive.ItemText>{option.label}</SelectPrimitive.ItemText>
              </SelectPrimitive.Item>
            ))}
          </SelectPrimitive.Viewport>
        </SelectPrimitive.Content>
      </SelectPrimitive.Portal>
    </SelectPrimitive.Root>
  )
}
