import { revealDelay, useSiteTheme } from '../context'
import { useTilt } from '../tilt'
import { CircleCheck } from 'lucide-react'
import { ActionLink, Container, IconTile, SectionShell } from '../primitives'
import { splitHighlight } from '../safe-href'
import type { HeroSection } from '../types'

export function Hero({ section }: { section: HeroSection }) {
  const [before, highlight, after] = splitHighlight(section.title, section.highlight)
  const titleId = `${section.id}-title`

  return (
    <SectionShell tone={section.tone} anchor={section.anchor} labelledBy={titleId} className="pt-10! sm:pt-14! lg:pt-16!">
      <div aria-hidden="true" className="site-glow absolute inset-0 -z-10" />
      <div aria-hidden="true" className="site-grid-bg absolute inset-0 -z-10" />

      <Container className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr] lg:gap-10">
        <div>
          {section.eyebrow ? (
            <p
              data-reveal
              className="inline-flex items-center gap-2 rounded-full border border-site-border bg-site-card px-3.5 py-1.5 text-sm font-medium text-site-muted-foreground"
            >
              <span aria-hidden="true" className="size-2 rounded-full bg-site-accent" />
              {section.eyebrow}
            </p>
          ) : null}

          <h1
            id={titleId}
            data-reveal
            style={revealDelay(1)}
            className="mt-6 text-[2.5rem] leading-[1.08] font-semibold sm:text-5xl lg:text-[3.6rem]"
          >
            {before}
            {highlight ? <span className="site-gradient-text">{highlight}</span> : null}
            {after}
          </h1>

          <p
            data-reveal
            style={revealDelay(2)}
            className="mt-6 max-w-xl text-lg text-site-muted-foreground sm:text-xl"
          >
            {section.subtitle}
          </p>

          <div data-reveal style={revealDelay(3)} className="mt-9 flex flex-wrap gap-3">
            <ActionLink link={section.primary} arrow />
            {section.secondary ? <ActionLink link={section.secondary} variant="secondary" /> : null}
          </div>

        </div>

        {section.imageUrl?.trim() ? (
          <HeroImage url={section.imageUrl.trim()} alt={section.imageAlt?.trim() || section.title} size={section.imageSize ?? 100} />
        ) : (
          <HeroVisual />
        )}
      </Container>

      {section.points.length > 0 ? (
        // Faixa em largura total (fora da coluna de texto): cada linha tem 6 colunas fixas no computador.
        <Container>
          <ul
            data-reveal
            style={revealDelay(4)}
            className="mt-14 grid grid-cols-3 gap-x-4 gap-y-8 border-t border-site-border pt-10 md:grid-cols-6"
          >
            {section.points.map((point) => (
              <li key={point.label} className="flex min-w-0 flex-col items-center gap-3 text-center text-xs leading-snug font-medium break-words hyphens-none sm:text-sm">
                <IconTile name={point.icon} className="size-8! sm:size-10!" />
                {point.label}
              </li>
            ))}
          </ul>
        </Container>
      ) : null}
    </SectionShell>
  )
}

/** Composição ilustrativa em CSS (janela de navegador + cartões flutuantes). Decorativa: sem dados. */
function HeroVisual() {
  return (
    <div aria-hidden="true" data-reveal style={revealDelay(2)} className="relative mx-auto w-full max-w-lg lg:max-w-none">
      <div className="absolute -inset-6 -z-10 rounded-[2.5rem] bg-gradient-to-br from-site-primary/25 via-site-accent/10 to-transparent blur-2xl" />

      <div className="overflow-hidden rounded-site-lg border border-site-border bg-site-card shadow-[0_40px_80px_-30px_rgb(11_19_36/0.35)]">
        <div className="flex items-center gap-2 border-b border-site-border bg-site-muted px-4 py-3">
          <span className="size-2.5 rounded-full bg-[#ff6b6b]" />
          <span className="size-2.5 rounded-full bg-[#ffc94d]" />
          <span className="size-2.5 rounded-full bg-[#3ddc97]" />
          <span className="ml-3 h-5 flex-1 rounded-full bg-site-background" />
        </div>
        <div className="grid gap-5 p-5 sm:p-6">
          <div className="flex items-center justify-between">
            <div className="grid gap-2">
              <span className="h-3 w-32 rounded-full bg-site-foreground/80" />
              <span className="h-2.5 w-48 rounded-full bg-site-border" />
            </div>
            <span className="h-8 w-20 rounded-full bg-site-primary" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            {[0.55, 0.8, 0.65].map((fill, i) => (
              <div key={i} className="grid gap-2 rounded-site border border-site-border p-3">
                <span className="h-2 w-10 rounded-full bg-site-border" />
                <span className="h-4 w-14 rounded-full bg-site-foreground/70" />
                <span className="h-1.5 w-full overflow-hidden rounded-full bg-site-muted">
                  <span className="block h-full rounded-full bg-gradient-to-r from-site-primary to-site-accent" style={{ width: `${fill * 100}%` }} />
                </span>
              </div>
            ))}
          </div>
          <div className="flex h-36 items-end gap-2.5 rounded-site border border-site-border bg-gradient-to-b from-site-muted/40 to-transparent p-4">
            {[38, 52, 45, 64, 58, 76, 70, 88, 82, 96].map((h, i) => (
              <span
                key={i}
                className="flex-1 rounded-t-md bg-gradient-to-t from-site-primary/70 to-site-accent/80"
                style={{ height: `${h}%` }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="site-float absolute -bottom-6 -left-4 flex items-center gap-3 rounded-site-lg border border-site-border bg-site-card px-4 py-3 shadow-[0_20px_40px_-20px_rgb(11_19_36/0.35)] sm:-left-8">
        <span className="inline-flex size-9 items-center justify-center rounded-full bg-[#3ddc97]/15 text-[#14915b]">
          <CircleCheck className="size-5" />
        </span>
        <span className="grid gap-1.5">
          <span className="h-2.5 w-24 rounded-full bg-site-foreground/75" />
          <span className="h-2 w-16 rounded-full bg-site-border" />
        </span>
      </div>

      <div className="site-float-delayed absolute -top-5 -right-3 hidden rounded-site-lg border border-site-border bg-site-card p-3 shadow-[0_20px_40px_-20px_rgb(11_19_36/0.35)] sm:block">
        <div className="flex -space-x-2">
          {['from-site-primary to-site-accent', 'from-[#f59e0b] to-[#ef4444]', 'from-[#10b981] to-[#0891b2]'].map((g) => (
            <span key={g} className={`size-8 rounded-full border-2 border-site-card bg-gradient-to-br ${g}`} />
          ))}
        </div>
      </div>
    </div>
  )
}

/** Imagem do destaque (quando enviada): largura ajustável e inclinação 3D com o mouse. */
function HeroImage({ url, alt, size }: { url: string; alt: string; size: number }) {
  const theme = useSiteTheme()
  const tilt = useTilt(theme.motion !== 'none')
  return (
    <div data-reveal style={{ ...revealDelay(2), perspective: '1200px' }} className="relative mx-auto w-full">
      <div className="mx-auto" style={{ width: `${size}%` }}>
        <div {...tilt.handlers} style={tilt.style} className="relative">
          <img
            src={url}
            alt={alt}
            loading="lazy"
            decoding="async"
            className="block aspect-[4/3] w-full rounded-site-lg object-cover shadow-[0_40px_80px_-30px_rgb(11_19_36/0.45)] ring-1 ring-site-border"
          />
        </div>
      </div>
    </div>
  )
}
