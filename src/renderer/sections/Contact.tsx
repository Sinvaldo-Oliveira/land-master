import { revealDelay } from '../context'
import { Clock, Mail, MapPin, MessageCircle, Phone, type LucideIcon } from 'lucide-react'
import { ActionLink, Container, SectionHeading, SectionShell } from '../primitives'
import { isExternal, safeHref } from '../safe-href'
import type { ContactChannel, ContactSection } from '../types'

const channelIcons: Record<ContactChannel['kind'], LucideIcon> = {
  email: Mail,
  phone: Phone,
  whatsapp: MessageCircle,
  address: MapPin,
  hours: Clock,
}

/**
 * Canais de contato. O formulário conectado ao CRM chega na Fase 6
 * (Edge Function submit-form) — até lá esta seção não coleta dados.
 */
export function Contact({ section }: { section: ContactSection }) {
  const titleId = `${section.id}-title`
  return (
    <SectionShell tone={section.tone} background={section.background} text={section.text} anchor={section.anchor} labelledBy={titleId}>
      <Container className="grid gap-12 lg:grid-cols-[0.85fr_1.15fr] lg:gap-16">
        <div>
          <SectionHeading id={titleId} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} align="left" />
          {section.primary ? (
            <div data-reveal style={revealDelay(1)} className="mt-8">
              <ActionLink link={section.primary} arrow />
            </div>
          ) : null}
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {section.channels.map((channel, index) => {
            const Icon = channelIcons[channel.kind]
            const href = channel.href ? safeHref(channel.href) : null
            const content = (
              <>
                <span
                  aria-hidden="true"
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--site-primary)_12%,transparent)] text-site-primary"
                >
                  <Icon className="size-5" strokeWidth={1.75} />
                </span>
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-site-muted-foreground">{channel.label}</span>
                  <span className="mt-0.5 block font-semibold [overflow-wrap:anywhere]">{channel.value}</span>
                </span>
              </>
            )
            const boxClass =
              'flex h-full items-center gap-4 rounded-site-lg border border-site-border bg-site-card p-5 transition'
            return (
              <li key={channel.kind + channel.value} data-reveal style={revealDelay(index % 2)} className={channel.kind === 'address' ? 'sm:col-span-2' : undefined}>
                {href && href !== '#' ? (
                  <a
                    href={href}
                    {...(isExternal(href) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    className={`${boxClass} hover:border-site-primary/50 hover:shadow-[0_18px_40px_-28px_rgb(11_19_36/0.4)]`}
                  >
                    {content}
                  </a>
                ) : (
                  <div className={boxClass}>{content}</div>
                )}
              </li>
            )
          })}
        </ul>
      </Container>
    </SectionShell>
  )
}
