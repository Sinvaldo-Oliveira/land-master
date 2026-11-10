import { useContext } from 'react'
import { SiteThemeContext } from '../context'
import { safeHref, isExternal } from '../safe-href'
import { ActionLink, Container } from '../primitives'
import { surfaceStyle } from '../surface'
import type { CtaSection } from '../types'

/** Faixa de chamada para ação com gradiente da cor primária. O fundo personalizado vale para a faixa em volta do cartão. */
export function Cta({ section }: { section: CtaSection }) {
  const theme = useContext(SiteThemeContext)
  const titleId = `${section.id}-title`
  const secondaryHref = section.secondary ? safeHref(section.secondary.href) : null
  return (
    <section
      aria-labelledby={titleId}
      style={theme ? surfaceStyle(theme, section.background) : undefined}
      className="bg-site-background py-6 sm:py-10"
    >
      <Container>
        <div
          data-reveal
          className="relative isolate overflow-hidden rounded-[calc(var(--site-radius)*2)] bg-gradient-to-br from-site-primary via-[color-mix(in_srgb,var(--site-primary)_70%,#0b1324)] to-[#0b1324] px-6 py-14 text-white sm:px-12 sm:py-16"
        >
          <div
            aria-hidden="true"
            className="absolute -top-24 -right-16 -z-10 size-80 rounded-full bg-site-accent/40 blur-3xl"
          />
          <div aria-hidden="true" className="absolute inset-0 -z-10 opacity-20 [background-image:radial-gradient(rgb(255_255_255/0.5)_1px,transparent_1px)] [background-size:22px_22px]" />
          <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
            <div className="max-w-2xl">
              <h2 id={titleId} className="text-3xl leading-tight font-semibold sm:text-4xl">
                {section.title}
              </h2>
              {section.subtitle ? <p className="mt-4 text-lg text-white/90">{section.subtitle}</p> : null}
            </div>
            <div className="flex shrink-0 flex-wrap gap-3">
              <ActionLink link={section.primary} variant="inverse" arrow />
              {section.secondary && secondaryHref ? (
                <a
                  href={secondaryHref}
                  {...(isExternal(secondaryHref) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                  className="inline-flex min-h-11 items-center justify-center rounded-full border border-white/40 px-6 text-[0.95rem] font-semibold text-white transition hover:bg-white/10"
                >
                  {section.secondary.label}
                </a>
              ) : null}
            </div>
          </div>
        </div>
      </Container>
    </section>
  )
}
