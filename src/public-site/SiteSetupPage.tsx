import { useEffect } from 'react'

/**
 * Página exibida enquanto a Home ainda não foi publicada (a Home editável chega na Fase 4).
 * Mensagem honesta, sem conteúdo fictício.
 */
export function SiteSetupPage() {
  useEffect(() => {
    document.title = 'Site em configuração'
  }, [])

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-16">
      <div className="max-w-md text-center">
        <p className="text-sm font-medium tracking-wide text-neutral-500 uppercase">Em breve</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl">Site em configuração</h1>
        <p className="mt-4 text-base leading-relaxed text-pretty text-neutral-600">
          Estamos preparando esta página. Volte em breve.
        </p>
      </div>
    </main>
  )
}
