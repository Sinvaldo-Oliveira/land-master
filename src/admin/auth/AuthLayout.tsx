import type { ReactNode } from 'react'
import { BrandMark } from '@/admin/layouts/BrandMark'
import { env } from '@/lib/env'

type AuthLayoutProps = {
  title: string
  description?: string
  children: ReactNode
}

/** Layout das telas de acesso: painel de tinta com pauta de livro-caixa + formulário. */
export function AuthLayout({ title, description, children }: AuthLayoutProps) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden flex-col justify-between overflow-hidden bg-admin-ink p-12 text-white lg:flex">
        {/* pauta horizontal + margem vertical, como uma folha de livro-caixa */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:repeating-linear-gradient(to_bottom,transparent_0,transparent_31px,#fff_31px,#fff_32px)]"
        />
        <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 left-24 w-px bg-admin-accent/70" />

        <div className="relative flex items-center gap-3 pl-16">
          <BrandMark className="text-white/10" />
          <span className="font-admin-display text-admin-lg font-semibold tracking-tight">{env.appName}</span>
        </div>

        <div className="relative max-w-md pl-16">
          <p className="font-admin-display text-[2.5rem] leading-[1.05] font-semibold tracking-[-0.03em] text-balance">
            Contatos, oportunidades e páginas de venda no mesmo lugar.
          </p>
          <p className="mt-6 font-admin-mono text-admin-sm text-white/55">CRM · Funil · Landing pages</p>
        </div>

        <p className="relative pl-16 text-admin-sm text-white/50">Acesso restrito à equipe autorizada.</p>
      </aside>

      <main id="conteudo" className="flex items-center justify-center px-4 py-12 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-10 flex items-center gap-3 lg:hidden">
            <BrandMark className="text-admin-ink" />
            <span className="font-admin-display text-admin-lg font-semibold tracking-tight">{env.appName}</span>
          </div>
          <h1 className="font-admin-display text-admin-2xl font-semibold tracking-tight">{title}</h1>
          {description ? <p className="mt-2 text-admin-ink-2">{description}</p> : null}
          <div className="mt-8">{children}</div>
        </div>
      </main>
    </div>
  )
}
