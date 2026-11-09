import { useEffect } from 'react'
import { PageRenderer } from '@/renderer/PageRenderer'
import { institucionalTemplate } from '@/renderer/templates/institucional'

/**
 * Home pública.
 * Hoje desenha o template "Institucional" embutido no código.
 * Próximo passo (Fase 4): ler a Home publicada via RPC get_public_site() e usar este
 * template apenas como ponto de partida no editor e como fallback.
 */
export function HomePage() {
  const doc = institucionalTemplate

  useEffect(() => {
    document.title = doc.seo.title
    let meta = document.querySelector<HTMLMetaElement>('meta[name="description"]')
    if (!meta) {
      meta = document.createElement('meta')
      meta.name = 'description'
      document.head.appendChild(meta)
    }
    meta.content = doc.seo.description
  }, [doc])

  return <PageRenderer document={doc} />
}
