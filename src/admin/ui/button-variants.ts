import { cva, type VariantProps } from 'class-variance-authority'
import { focusRing } from './styles'

export const buttonVariants = cva(
  [
    'relative inline-flex shrink-0 select-none items-center justify-center gap-2 whitespace-nowrap rounded-admin',
    'font-admin-body font-medium transition-colors duration-[120ms] ease-admin',
    'disabled:pointer-events-none disabled:opacity-55 aria-disabled:pointer-events-none aria-disabled:opacity-55',
    '[&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0',
    focusRing,
  ],
  {
    variants: {
      variant: {
        primary: 'bg-admin-accent text-admin-card hover:bg-admin-accent-hover',
        secondary:
          'border border-admin-rule-strong bg-admin-card text-admin-ink hover:border-admin-ink-3 hover:bg-admin-sunken',
        ghost: 'text-admin-ink hover:bg-admin-sunken',
        danger: 'bg-admin-danger text-admin-card hover:bg-admin-danger/90',
      },
      size: {
        sm: 'h-8 px-3 text-admin-sm',
        md: 'h-9 px-4 text-admin-base',
        icon: 'size-9 text-admin-base',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
)

export type ButtonVariantProps = VariantProps<typeof buttonVariants>
