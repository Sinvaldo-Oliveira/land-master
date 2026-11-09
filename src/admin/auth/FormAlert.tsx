import { CircleCheck, TriangleAlert } from 'lucide-react'
import { cn } from '@/lib/cn'

type FormAlertProps = {
  tone: 'danger' | 'success'
  children: string
  className?: string
}

/** Mensagem de resultado de um formulário (anunciada por leitores de tela). */
export function FormAlert({ tone, children, className }: FormAlertProps) {
  const Icon = tone === 'danger' ? TriangleAlert : CircleCheck
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cn(
        'mb-6 flex gap-3 rounded-admin border p-3 text-admin-sm',
        tone === 'danger'
          ? 'border-admin-danger/30 bg-admin-danger-soft text-admin-danger'
          : 'border-admin-success/30 bg-admin-success-soft text-admin-success',
        className,
      )}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <p>{children}</p>
    </div>
  )
}
