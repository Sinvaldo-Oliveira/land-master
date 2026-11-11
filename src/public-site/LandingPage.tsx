import { Component, useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'react-router'
import { LandingRenderer } from '@/renderer/LandingRenderer'
import type { LandingDocument } from '@/renderer/document-v2'
import { NotFoundPage } from './NotFoundPage'
import { fetchPublishedLanding } from './published-landing'

type Result = { slug: string } & ({ status: 'ready'; document: LandingDocument } | { status: 'missing' })
type State = { status: 'loading' } | Result

/** Landing pública: carrega exclusivamente a cópia imutável publicada pela pessoa administradora. */
export default function LandingPage() {
  const { slug = '' } = useParams()
  // O resultado guarda o slug a que pertence: trocar de página volta a "carregando" sem setState no efeito.
  const [result, setResult] = useState<Result | null>(null)
  const state: State = result && result.slug === slug ? result : { status: 'loading' }

  useEffect(() => {
    const controller = new AbortController()
    fetchPublishedLanding(slug, controller.signal)
      .then((landing) => setResult(landing ? { slug, status: 'ready', document: landing.document } : { slug, status: 'missing' }))
      .catch((error: unknown) => {
        if (controller.signal.aborted) return
        console.warn('Não foi possível carregar a landing publicada.', error)
        setResult({ slug, status: 'missing' })
      })
    return () => controller.abort()
  }, [slug])

  const seo = state.status === 'ready' ? state.document.seo : null
  useEffect(() => {
    if (!seo) return
    document.title = seo.title
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = seo.description
  }, [seo])

  if (state.status === 'loading') return <div className="min-h-dvh bg-white" aria-busy="true" />
  if (state.status === 'missing') return <NotFoundPage />
  return <RenderGuard fallback={<NotFoundPage />}><LandingRenderer document={state.document} /></RenderGuard>
}

class RenderGuard extends Component<{ children: ReactNode; fallback: ReactNode }, { failed: boolean }> {
  state = { failed: false }
  static getDerivedStateFromError() { return { failed: true } }
  componentDidCatch(error: unknown) { console.error('Falha ao desenhar a landing publicada.', error) }
  render() { return this.state.failed ? this.props.fallback : this.props.children }
}
