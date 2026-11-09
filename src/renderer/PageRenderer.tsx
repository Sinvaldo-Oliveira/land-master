import { SiteThemeContext } from './context'
import { useRef } from 'react'

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

/**
 * Desenha um PageDocument. Este módulo é do site público:
 * NUNCA importe nada de src/admin ou src/modules aqui (verificado pelo check:bundle).
 */
export function PageRenderer({ document: doc }: { document: PageDocument }) {
  const rootRef = useRef<HTMLDivElement>(null)
  useReveal(rootRef, doc.theme.motion !== 'none')

  const header = doc.sections.find((s) => s.type === 'site-header')
  const footer = doc.sections.find((s) => s.type === 'site-footer')
  const body = doc.sections.filter((s) => s.type !== 'site-header' && s.type !== 'site-footer')
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
            <SectionView key={section.id} section={section} brandName={brandName} />
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
    case 'site-header':
    case 'site-footer':
      return null
  }
}
