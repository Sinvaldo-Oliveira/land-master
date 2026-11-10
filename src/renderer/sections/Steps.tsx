import { revealDelay } from '../context'
import { Container, IconTile, SectionHeading, SectionShell } from '../primitives'
import type { StepsSection } from '../types'

export function Steps({ section }: { section: StepsSection }) {
  const titleId = `${section.id}-title`
  return (
    <SectionShell tone={section.tone} background={section.background} text={section.text} anchor={section.anchor} labelledBy={titleId}>
      <div aria-hidden="true" className="site-glow absolute inset-0 -z-10 opacity-80" />
      <div aria-hidden="true" className="site-grid-bg absolute inset-0 -z-10 opacity-60" />
      <Container>
        <SectionHeading id={titleId} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} />

        <ol className="relative mt-16 grid gap-6 sm:grid-cols-2 lg:grid-cols-4 lg:gap-5">
          <span
            aria-hidden="true"
            className="absolute top-6 right-[12%] left-[12%] hidden h-px bg-gradient-to-r from-transparent via-site-border to-transparent lg:block"
          />
          {section.items.map((item, index) => (
            <li
              key={item.title}
              data-reveal
              style={revealDelay(index)}
              className="relative rounded-site-lg border border-site-border bg-[color-mix(in_srgb,var(--site-card)_70%,transparent)] p-6 backdrop-blur-sm"
            >
              <div className="flex items-center justify-between">
                <IconTile name={item.icon} />
                <span className="font-site-heading text-3xl font-semibold text-site-muted-foreground/60 tabular-nums">
                  {String(index + 1).padStart(2, '0')}
                </span>
              </div>
              <h3 className="mt-6 text-lg font-semibold">{item.title}</h3>
              <p className="mt-2 text-site-muted-foreground">{item.description}</p>
            </li>
          ))}
        </ol>
      </Container>
    </SectionShell>
  )
}
