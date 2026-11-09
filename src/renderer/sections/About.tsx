import { SiteThemeContext, revealDelay } from '../context'
import { Check, Quote } from 'lucide-react'
import { useContext } from 'react'
import { ActionLink, BrandMark, Container, SectionHeading, SectionShell } from '../primitives'
import { colorVars } from '../theme'
import type { AboutSection } from '../types'

export function About({ section, brandName }: { section: AboutSection; brandName: string }) {
  const theme = useContext(SiteThemeContext)
  const titleId = `${section.id}-title`

  return (
    <SectionShell tone={section.tone} anchor={section.anchor} labelledBy={titleId}>
      <Container className="grid items-center gap-14 lg:grid-cols-2 lg:gap-20">
        {/* Painel visual em tom escuro (decorativo + citação opcional) */}
        <div data-reveal className="relative order-last lg:order-first">
          <div
            style={theme ? colorVars(theme.darkColors) : undefined}
            className="relative isolate overflow-hidden rounded-site-lg bg-site-background p-8 text-site-foreground shadow-[0_40px_80px_-40px_rgb(11_19_36/0.6)] sm:p-10"
          >
            <div aria-hidden="true" className="site-grid-bg absolute inset-0 -z-10 opacity-70" />
            <div aria-hidden="true" className="site-glow absolute inset-0 -z-10" />
            <BrandMark name={brandName} className="size-14! text-lg!" />
            <p className="mt-10 font-site-heading text-2xl leading-snug font-semibold sm:text-3xl">{brandName}</p>
            {section.quote ? (
              <figure className="mt-6 border-l-2 border-site-accent pl-5">
                <Quote aria-hidden="true" className="size-5 text-site-accent" />
                <blockquote className="mt-2 text-lg text-site-muted-foreground">{section.quote}</blockquote>
              </figure>
            ) : null}
            <div aria-hidden="true" className="mt-10 grid grid-cols-4 gap-2">
              {Array.from({ length: 8 }, (_, i) => (
                <span
                  key={i}
                  className="h-10 rounded-md bg-gradient-to-br from-site-primary/30 to-site-accent/10"
                  style={{ opacity: 0.35 + (i % 4) * 0.18 }}
                />
              ))}
            </div>
          </div>
        </div>

        <div>
          <SectionHeading id={titleId} eyebrow={section.eyebrow} title={section.title} align="left" />
          <div data-reveal style={revealDelay(1)} className="mt-6 grid gap-4 text-lg text-site-muted-foreground">
            {section.paragraphs.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </div>
          <ul data-reveal style={revealDelay(2)} className="mt-8 grid gap-3.5">
            {section.bullets.map((bullet) => (
              <li key={bullet} className="flex items-start gap-3 font-medium">
                <span className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-full bg-site-primary text-site-primary-foreground">
                  <Check aria-hidden="true" className="size-3.5" strokeWidth={3} />
                </span>
                {bullet}
              </li>
            ))}
          </ul>
          {section.cta ? (
            <div data-reveal style={revealDelay(3)} className="mt-10">
              <ActionLink link={section.cta} arrow />
            </div>
          ) : null}
        </div>
      </Container>
    </SectionShell>
  )
}
