import { Component, useEffect, useState, type ReactNode } from 'react'
import { isSupabaseConfigured } from '@/lib/env'
import { PageRenderer } from '@/renderer/PageRenderer'
import { institucionalTemplate } from '@/renderer/templates/institucional'
import type { PageDocument } from '@/renderer/types'
import { fetchPublishedHome } from './published-home'

type State = { status: 'loading' } | { status: 'ready'; doc: PageDocument }

/**
 * Home pública: mostra a versão PUBLICADA no painel (/admin/site).
 * Sem Supabase configurado, sem Home publicada ou em caso de erro, mostra o template Institucional.
 */
export function HomePage() {
  const [state, setState] = useState<State>(() =>
    isSupabaseConfigured ? { status: 'loading' } : { status: 'ready', doc: institucionalTemplate },
  )

  useEffect(() => {
    if (!isSupabaseConfigured) return
    const controller = new AbortController()
    fetchPublishedHome(controller.signal)
      .then((doc) => setState({ status: 'ready', doc: doc ?? institucionalTemplate }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.warn('Não foi possível carregar a Home publicada; exibindo o modelo.', error)
        setState({ status: 'ready', doc: institucionalTemplate })
      })
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (state.status !== 'ready') return
    document.title = state.doc.seo.title
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = state.doc.seo.description
  }, [state])

  if (state.status === 'loading') {
    return <div className="min-h-dvh bg-white" aria-busy="true" />
  }

  return (
    <RenderGuard fallback={<PageRenderer document={institucionalTemplate} />}>
      <PageRenderer document={state.doc} />
    </RenderGuard>
  )
}

/** Se um documento publicado tiver dados inesperados, mostra o modelo em vez de uma tela em branco. */
class RenderGuard extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }

  static getDerivedStateFromError() {
    return { failed: true }
  }

  componentDidCatch(error: unknown) {
    console.error('Falha ao desenhar a Home publicada.', error)
  }

  render() {
    return this.state.failed ? this.props.fallback : this.props.children
  }
}
