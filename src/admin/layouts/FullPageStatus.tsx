import type { ReactNode } from 'react'
import { Spinner } from '@/admin/ui'

/** Tela cheia para estados de transição (verificando sessão, erro de permissão). */
export function FullPageStatus({ label, children }: { label?: string; children?: ReactNode }) {
  return (
    <main id="conteudo" className="grid min-h-dvh place-items-center px-4 py-12">
      {children ?? (
        <div className="flex items-center gap-3 text-admin-ink-2">
          <Spinner label={label ?? 'Carregando'} />
          <span aria-hidden="true">{label ?? 'Carregando'}</span>
        </div>
      )}
    </main>
  )
}
