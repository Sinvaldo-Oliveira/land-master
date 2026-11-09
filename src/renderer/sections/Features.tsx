import { revealDelay } from '../context'
import { ActionLink, Container, IconTile, SectionHeading, SectionShell } from '../primitives'
import type { FeaturesSection } from '../types'

export function Features({ section }: { section: FeaturesSection }) {
  const titleId = `${section.id}-title`
  return (
    <SectionShell tone={section.tone} anchor={section.anchor} labelledBy={titleId}>
      <Container>
        <SectionHeading id={titleId} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} />

        <ul className="mt-14 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {section.items.map((item, index) => (
            <li
              key={item.title}
              data-reveal
              style={revealDelay(index % 3)}
              className="group relative flex flex-col overflow-hidden rounded-site-lg border border-site-border bg-site-card p-7 transition duration-300 hover:-translate-y-1 hover:border-site-primary/40 hover:shadow-[0_24px_50px_-28px_rgb(11_19_36/0.35)]"
            >
              <span
                aria-hidden="true"
                className="absolute inset-x-0 top-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-site-primary to-site-accent transition-transform duration-500 group-hover:scale-x-100"
              />
              <IconTile name={item.icon} />
              <h3 className="mt-6 text-xl font-semibold">{item.title}</h3>
              <p className="mt-2.5 text-site-muted-foreground">{item.description}</p>
              {item.link ? (
                <div className="mt-6">
                  <ActionLink link={item.link} variant="secondary" arrow />
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </Container>
    </SectionShell>
  )
}
