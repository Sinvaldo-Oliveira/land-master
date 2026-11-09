import { revealDelay } from '../context'
import { Plus } from 'lucide-react'
import { Container, SectionHeading, SectionShell } from '../primitives'
import type { FaqSection } from '../types'

/** Perguntas frequentes com <details>/<summary> nativos: acessíveis e sem JavaScript. */
export function Faq({ section }: { section: FaqSection }) {
  const titleId = `${section.id}-title`
  return (
    <SectionShell tone={section.tone} anchor={section.anchor} labelledBy={titleId}>
      <Container className="grid gap-12 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
        <SectionHeading id={titleId} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} align="left" />

        <div className="grid gap-3">
          {section.items.map((item, index) => (
            <details
              key={item.question}
              data-reveal
              style={revealDelay(index)}
              className="group rounded-site-lg border border-site-border bg-site-card px-6 open:border-site-primary/40 open:shadow-[0_20px_40px_-30px_rgb(11_19_36/0.4)]"
            >
              <summary className="flex min-h-16 cursor-pointer list-none items-center justify-between gap-4 py-4 text-lg font-semibold [&::-webkit-details-marker]:hidden">
                {item.question}
                <span className="inline-flex size-8 shrink-0 items-center justify-center rounded-full border border-site-border transition-transform duration-300 group-open:rotate-45 group-open:border-site-primary group-open:text-site-primary">
                  <Plus aria-hidden="true" className="size-4" />
                </span>
              </summary>
              <p className="pb-6 text-site-muted-foreground">{item.answer}</p>
            </details>
          ))}
        </div>
      </Container>
    </SectionShell>
  )
}
