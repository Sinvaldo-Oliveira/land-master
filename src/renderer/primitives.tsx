import type { CSSProperties, ReactNode } from 'react'
import { ArrowRight } from 'lucide-react'
// clsx (e não o cn com tailwind-merge do admin): o renderizador controla as próprias classes
// e cada kB conta no bundle inicial do site.
import { clsx as cn } from 'clsx'
import { sectionIcons } from './icons'
import { isExternal, safeHref } from './safe-href'
import { useSiteTheme } from './context'
import { surfaceStyle } from './surface'
import { colorVars } from './theme'
import type { IconName, LinkItem, SectionBackground, SectionTone } from './types'

export function Container({ className, children }: { className?: string; children: ReactNode }) {
  return <div className={cn('mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8', className)}>{children}</div>
}

const toneClasses: Record<SectionTone, string> = {
  light: 'bg-site-background text-site-foreground',
  muted: 'bg-site-muted text-site-foreground',
  dark: 'bg-site-background text-site-foreground',
}

/**
 * Seção com tom claro, suave ou escuro. No tom escuro as variáveis do tema são trocadas só dentro dela.
 * Com fundo personalizado (cor ou degradê), as variáveis são recalculadas a partir dele e o tom é ignorado.
 */
export function SectionShell({
  tone,
  background,
  anchor,
  labelledBy,
  className,
  children,
}: {
  tone: SectionTone
  background?: SectionBackground | undefined
  anchor?: string | undefined
  labelledBy?: string
  className?: string
  children: ReactNode
}) {
  const theme = useSiteTheme()
  const custom = surfaceStyle(theme, background)
  const style: CSSProperties | undefined = custom ?? (tone === 'dark' ? colorVars(theme.darkColors) : undefined)
  return (
    <section
      id={anchor}
      aria-labelledby={labelledBy}
      data-tone={custom ? 'custom' : tone}
      style={style}
      className={cn(
        'relative isolate overflow-hidden py-20 sm:py-24 lg:py-28',
        custom ? 'text-site-foreground' : toneClasses[tone],
        className,
      )}
    >
      {children}
    </section>
  )
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  subtitle,
  align = 'center',
}: {
  id: string
  eyebrow?: string | undefined
  title: string
  subtitle?: string | undefined
  align?: 'center' | 'left'
}) {
  return (
    <div data-reveal className={cn('max-w-2xl', align === 'center' && 'mx-auto text-center')}>
      {eyebrow ? (
        <p className="text-sm font-semibold tracking-[0.14em] text-site-primary uppercase">{eyebrow}</p>
      ) : null}
      <h2 id={id} className="mt-3 text-3xl leading-tight font-semibold sm:text-4xl">
        {title}
      </h2>
      {subtitle ? <p className="mt-4 text-lg text-site-muted-foreground">{subtitle}</p> : null}
    </div>
  )
}

type ActionVariant = 'primary' | 'secondary' | 'inverse'

const actionClasses: Record<ActionVariant, string> = {
  primary:
    'bg-site-primary text-site-primary-foreground shadow-[0_10px_30px_-12px_var(--site-primary)] hover:brightness-110',
  secondary: 'border border-site-border bg-site-card text-site-foreground hover:border-site-primary hover:text-site-primary',
  inverse: 'bg-white text-[#0b1324] hover:bg-white/90',
}

/** Link com aparência de botão. O href passa SEMPRE por safeHref (o documento é dado editável). */
export function ActionLink({
  link,
  variant = 'primary',
  arrow = false,
  className,
}: {
  link: LinkItem
  variant?: ActionVariant
  arrow?: boolean
  className?: string
}) {
  const href = safeHref(link.href)
  const external = isExternal(href)
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
      className={cn(
        'group inline-flex min-h-11 items-center justify-center gap-2 rounded-full px-6 text-[0.95rem] font-semibold whitespace-nowrap transition duration-200',
        actionClasses[variant],
        className,
      )}
    >
      {link.label}
      {arrow ? <ArrowRight aria-hidden="true" className="size-4 transition-transform group-hover:translate-x-0.5" /> : null}
      {external ? <span className="sr-only"> (abre em nova aba)</span> : null}
    </a>
  )
}

export function IconTile({ name, className }: { name: IconName; className?: string }) {
  const Icon = sectionIcons[name]
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-12 shrink-0 items-center justify-center rounded-site bg-[color-mix(in_srgb,var(--site-primary)_12%,transparent)] text-site-primary',
        className,
      )}
    >
      <Icon className="size-6" strokeWidth={1.75} />
    </span>
  )
}

/** Monograma da marca (iniciais) — usado até a empresa enviar o logotipo (Fase 4: business_settings). */
export function BrandMark({ name, className }: { name: string; className?: string }) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0]?.toUpperCase())
    .join('')
  return (
    <span
      aria-hidden="true"
      className={cn(
        'inline-flex size-9 items-center justify-center rounded-site bg-gradient-to-br from-site-primary to-site-accent font-site-heading text-sm font-bold text-white',
        className,
      )}
    >
      {initials}
    </span>
  )
}
