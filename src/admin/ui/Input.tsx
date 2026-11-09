import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { controlBase } from './styles'

export type InputProps = ComponentProps<'input'> & { invalid?: boolean }

export function Input({ className, invalid, type = 'text', ...props }: InputProps) {
  return (
    <input
      type={type}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, 'h-9', className)}
      {...props}
    />
  )
}
