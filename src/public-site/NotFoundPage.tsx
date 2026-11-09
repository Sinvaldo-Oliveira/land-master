import { useEffect } from 'react'
import { Link } from 'react-router'

export function NotFoundPage() {
  useEffect(() => {
    document.title = 'Página não encontrada'
  }, [])

  return (
    <main className="grid min-h-dvh place-items-center px-4 py-16">
      <div className="max-w-md text-center">
        <p className="font-mono text-sm text-neutral-500">404</p>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight sm:text-4xl">Página não encontrada</h1>
        <p className="mt-4 text-base leading-relaxed text-neutral-600">
          O endereço pode ter mudado ou a página não está mais publicada.
        </p>
        <Link
          to="/"
          className="mt-8 inline-flex min-h-11 items-center rounded-md bg-neutral-900 px-5 text-sm font-medium text-white hover:bg-neutral-700"
        >
          Ir para o início
        </Link>
      </div>
    </main>
  )
}
