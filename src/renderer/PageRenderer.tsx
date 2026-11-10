import { lazy, Suspense, useRef } from 'react'
import { SiteThemeContext } from './context'
import { About } from './sections/About'
import { Contact } from './sections/Contact'
import { Cta } from './sections/Cta'
import { Faq } from './sections/Faq'
import { Features } from './sections/Features'
import { Hero } from './sections/Hero'
import { SiteFooter } from './sections/SiteFooter'
import { SiteHeader } from './sections/SiteHeader'
import { Steps } from './sections/Steps'
import { themeVars } from './theme'
import type { PageDocument, Section } from './types'
import { useReveal } from './useReveal'
import './site.css'

// Seção pesada (vídeo, cursor, fontes próprias): só baixa quando a página tiver esta seção.
const InteractiveHero = lazy(() => import('./sections/InteractiveHero'))
const VideoCarousel = lazy(() => import('./sections/VideoCarousel'))
const VideoPlayer = lazy(() => import('./sections/VideoPlayer'))
const ImageCard = lazy(() => import('./sections/ImageCard').then((module) => ({ default: module.ImageCard })))

/**
 * Desenha um PageDocument. Este módulo é do site público:
 * NUNCA importe nada de src/admin ou src/modules aqui (verificado pelo check:bundle).
 */
export function PageRenderer({ document: doc, preview = false }: { document: PageDocument; preview?: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null)
  // Na pré-visualização do painel o conteúdo aparece direto (sem animação de entrada).
  useReveal(rootRef, !preview && doc.theme.motion !== 'none')

  const visible = doc.sections.filter((s) => !s.hidden)
  const header = visible.find((s) => s.type === 'site-header')
  const footer = visible.find((s) => s.type === 'site-footer')
  const body = visible.filter((s) => s.type !== 'site-header' && s.type !== 'site-footer')
  const brandName = header?.type === 'site-header' ? header.brand.name : (footer?.type === 'site-footer' ? footer.brand.name : '')

  return (
    <SiteThemeContext.Provider value={doc.theme}>
      <div ref={rootRef} className="site-root min-h-dvh overflow-x-clip" style={themeVars(doc.theme)}>
        <a
          href="#conteudo"
          className="sr-only z-50 rounded-full bg-site-primary px-4 py-2 font-semibold text-site-primary-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
        >
          Pular para o conteúdo
        </a>
        {header?.type === 'site-header' ? <SiteHeader section={header} /> : null}
        <main id="conteudo" tabIndex={-1} className="outline-none">
          {body.map((section) => (
            // data-section-id: usado pela pré-visualização do painel para rolar até a seção editada.
            <div key={section.id} data-section-id={section.id}>
              <SectionView section={section} brandName={brandName} />
            </div>
          ))}
        </main>
        {footer?.type === 'site-footer' ? <SiteFooter section={footer} /> : null}
      </div>
    </SiteThemeContext.Provider>
  )
}

function SectionView({ section, brandName }: { section: Section; brandName: string }) {
  switch (section.type) {
    case 'hero':
      return <Hero section={section} />
    case 'features':
      return <Features section={section} />
    case 'about':
      return <About section={section} brandName={brandName} />
    case 'steps':
      return <Steps section={section} />
    case 'faq':
      return <Faq section={section} />
    case 'cta':
      return <Cta section={section} />
    case 'contact':
      return <Contact section={section} />
    case 'image-card':
      return (
        <Suspense fallback={<div aria-hidden="true" className="min-h-[34rem] bg-site-background" />}>
          <ImageCard section={section} />
        </Suspense>
      )
    case 'video-carousel':
      return (
        <Suspense fallback={<div aria-hidden="true" className="min-h-[640px] bg-site-background" />}>
          <VideoCarousel section={section} />
        </Suspense>
      )
    case 'video-player':
      return (
        <Suspense fallback={<div aria-hidden="true" className="min-h-[640px] bg-site-background" />}>
          <VideoPlayer section={section} />
        </Suspense>
      )
    case 'interactive-hero':
      return (
        <Suspense fallback={<div aria-hidden="true" className="h-svh min-h-[560px] bg-[#02040d]" />}>
          <InteractiveHero section={section} />
        </Suspense>
      )
    default:
      // Tipos desconhecidos (documento de versão futura ou corrompido) não quebram a página.
      return null
  }
}
