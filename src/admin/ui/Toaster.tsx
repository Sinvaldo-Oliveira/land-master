import type { CSSProperties } from 'react'
import { Toaster as SonnerToaster, type ToasterProps } from 'sonner'

// O sonner injeta CSS sem @layer; cores/raio via variáveis dele, demais ajustes com `!`.
const adminToastVars = {
  '--normal-bg': 'var(--color-admin-card)',
  '--normal-text': 'var(--color-admin-ink)',
  '--normal-border': 'var(--color-admin-rule)',
  '--border-radius': 'var(--radius-admin)',
} as CSSProperties

export function Toaster({ toastOptions, style, ...props }: ToasterProps) {
  return (
    <SonnerToaster
      position="bottom-right"
      richColors={false}
      closeButton
      style={{ ...adminToastVars, ...style }}
      {...props}
      toastOptions={{
        ...toastOptions,
        classNames: {
          toast: 'font-admin-body! text-admin-base! shadow-admin-pop! gap-2!',
          title: 'font-semibold! text-admin-ink!',
          description: 'text-admin-sm! text-admin-ink-2!',
          actionButton: 'bg-admin-accent! text-admin-card! rounded-admin! font-medium!',
          cancelButton: 'bg-admin-sunken! text-admin-ink! rounded-admin!',
          closeButton: 'bg-admin-card! border-admin-rule! text-admin-ink-2! hover:text-admin-ink!',
          success: '[&_[data-icon]]:text-admin-success',
          error: 'border-l-4! border-l-admin-danger! [&_[data-icon]]:text-admin-danger',
          warning: '[&_[data-icon]]:text-admin-warning',
          info: '[&_[data-icon]]:text-admin-info',
          ...toastOptions?.classNames,
        },
      }}
    />
  )
}
