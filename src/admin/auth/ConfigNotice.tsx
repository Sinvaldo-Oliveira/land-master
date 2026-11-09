import { Info } from 'lucide-react'

/** Exibido quando VITE_SUPABASE_URL / VITE_SUPABASE_PUBLISHABLE_KEY não foram configurados. */
export function ConfigNotice() {
  return (
    <div role="status" className="mb-6 flex gap-3 rounded-admin border border-admin-info/30 bg-admin-info-soft p-4 text-admin-sm">
      <Info aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-admin-info" />
      {import.meta.env.DEV ? (
        <div className="grid gap-1">
          <p className="font-semibold">Supabase não configurado</p>
          <p className="text-admin-ink-2">
            Copie <code className="font-admin-mono">.env.example</code> para{' '}
            <code className="font-admin-mono">.env.local</code>, preencha a URL e a chave publicável do projeto e reinicie o
            servidor. Veja <code className="font-admin-mono">docs/DESENVOLVIMENTO_LOCAL.md</code>.
          </p>
        </div>
      ) : (
        <p>O acesso está temporariamente indisponível. Tente novamente mais tarde.</p>
      )}
    </div>
  )
}
