import type { ComponentProps } from 'react'
import { cn } from '@/lib/cn'
import { controlBase } from './styles'

export type TextareaProps = ComponentProps<'textarea'> & { invalid?: boolean }

export function Textarea({ className, invalid, rows = 4, ...props }: TextareaProps) {
  return (
    <textarea
      rows={rows}
      aria-invalid={invalid || undefined}
      className={cn(controlBase, 'min-h-20 resize-y py-2', className)}
      {...props}
    />
  )
}
