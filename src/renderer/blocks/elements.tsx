import { createElement, type ReactNode } from 'react'
import { clsx as cn } from 'clsx'
import type { Block } from '../document-v2'
import { styledBlockAttrs, type BlockAttrs } from '../block-style'
import { ActionLink, Container, SectionShell } from '../primitives'
import { imageUrl } from './image-url'
import type { LinkItem, SectionBackground, SectionText, SectionTone } from '../types'
import { sectionIcons } from '../icons'

/**
 * Blocos primitivos da landing page. Como todo o renderizador, tratam `props` como DADO não confiável:
 * cada valor é conferido contra uma lista fechada antes de virar classe, atributo ou endereço.
 * Classes são sempre fixas (existem no build); nada vindo do banco vira classe ou CSS.
 */

/** Atributos que o editor aplica no elemento raiz de cada bloco (seleção no canvas). Vazio no site público. */
type ElementProps = { block: Block; attrs: BlockAttrs }

const str = (value: unknown): string => (typeof value === 'string' ? value : '')
function oneOf<T extends string>(value: unknown, options: readonly T[], fallback: T): T {
  return options.includes(value as T) ? (value as T) : fallback
}

const widthClasses = { narrow: 'max-w-2xl', normal: 'max-w-4xl', wide: 'max-w-none' } as const

export function SectionBlock({ block, attrs, children }: ElementProps & { children: ReactNode }) {
  const { props } = block
  const tone = oneOf<SectionTone>(props.tone, ['light', 'muted', 'dark'], 'light')
  const width = oneOf(props.width, ['narrow', 'normal', 'wide'] as const, 'normal')
  const centered = props.align !== 'left'
  const anchor = /^[a-z][a-z0-9-]{1,40}$/.test(str(props.anchor)) ? str(props.anchor) : undefined
  return (
    <div {...styledBlockAttrs(block, attrs)}>
      <SectionShell
        tone={tone}
        background={props.background as SectionBackground | undefined}
        text={props.text as SectionText | undefined}
        anchor={anchor}
      >
        <Container>
          <div className={cn('flex w-full flex-col gap-6', widthClasses[width], centered ? 'mx-auto items-center text-center' : 'items-start')}>
            {children}
          </div>
        </Container>
      </SectionShell>
    </div>
  )
}

const headingClasses = {
  h1: 'text-4xl leading-[1.05] font-semibold tracking-tight sm:text-5xl lg:text-6xl',
  h2: 'text-3xl leading-tight font-semibold sm:text-4xl',
  h3: 'text-xl leading-snug font-semibold sm:text-2xl',
} as const

export function HeadingBlock({ block, attrs }: ElementProps) {
  const level = oneOf(block.props.level, ['h1', 'h2', 'h3'] as const, 'h2')
  return createElement(level, styledBlockAttrs(block, attrs, cn('max-w-full break-words', headingClasses[level])), str(block.props.text))
}

export function ParagraphBlock({ block, attrs }: ElementProps) {
  const large = block.props.size === 'lg'
  // Texto puro: as quebras de linha digitadas são respeitadas pelo CSS, sem HTML.
  return (
    <p {...styledBlockAttrs(block, attrs, cn('max-w-full break-words whitespace-pre-line text-site-muted-foreground', large ? 'text-lg sm:text-xl' : 'text-base'))}>
      {str(block.props.text)}
    </p>
  )
}

export function ImageBlock({ block, attrs, placeholder }: ElementProps & { placeholder?: ReactNode }) {
  const url = imageUrl(block.props.url)
  if (!url) return placeholder ? <div {...styledBlockAttrs(block, attrs, 'w-full')}>{placeholder}</div> : null
  return <img {...styledBlockAttrs(block, attrs, 'h-auto w-full max-w-full rounded-site')} src={url} alt={str(block.props.alt)} loading="lazy" decoding="async" />
}

export function ButtonBlock({ block, attrs }: ElementProps) {
  const raw = block.props.link
  const link: LinkItem =
    typeof raw === 'object' && raw !== null
      ? { label: str((raw as Record<string, unknown>).label), href: str((raw as Record<string, unknown>).href) }
      : { label: '', href: '#' }
  const variant = oneOf(block.props.variant, ['primary', 'secondary'] as const, 'primary')
  return (
    <div {...styledBlockAttrs(block, attrs, 'max-w-full')}>
      {/* ActionLink passa o href por safeHref. */}
      <ActionLink link={link} variant={variant} />
    </div>
  )
}

const spacerClasses = { sm: 'h-4', md: 'h-8', lg: 'h-16', xl: 'h-24' } as const

export function SpacerBlock({ block, attrs }: ElementProps) {
  const size = oneOf(block.props.size, ['sm', 'md', 'lg', 'xl'] as const, 'md')
  return <div {...styledBlockAttrs(block, attrs, cn('w-full', spacerClasses[size]))} aria-hidden="true" />
}

export function DividerBlock({ block, attrs }: ElementProps) {
  return <hr {...styledBlockAttrs(block, attrs, 'w-full border-0 border-t border-site-border')} />
}

export function ColumnsBlock({ block, attrs, children }: ElementProps & { children: ReactNode }) {
  const proportions = oneOf(block.props.proportions, ['1', '1-1', '1-2', '2-1', '1-1-1', '1-1-1-1'] as const, '1-1')
  return <div {...styledBlockAttrs(block, attrs, 'grid w-full gap-6')} data-columns={proportions} data-stack-mobile={block.props.stackOnMobile === 'keep' ? 'false' : 'true'}>{children}</div>
}

export function GridBlock({ block, attrs, children }: ElementProps & { children: ReactNode }) {
  const columns = oneOf(String(block.props.columns), ['2', '3', '4'] as const, '3')
  return <div {...styledBlockAttrs(block, attrs, 'grid w-full gap-6')} data-grid-columns={columns}>{children}</div>
}

export function ColumnBlock({ block, attrs, children }: ElementProps & { children: ReactNode }) {
  return <div {...styledBlockAttrs(block, attrs, 'flex min-w-0 flex-col gap-4')}>{children}</div>
}

export function ListBlock({ block, attrs }: ElementProps) {
  const items = Array.isArray(block.props.items) ? block.props.items.filter((item): item is string => typeof item === 'string') : []
  const Tag = block.props.ordered === true || block.props.ordered === 'numbers' ? 'ol' : 'ul'
  return <Tag {...styledBlockAttrs(block, attrs, cn('grid gap-2 text-left', Tag === 'ol' ? 'list-decimal' : 'list-disc', 'pl-6'))}>{items.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</Tag>
}

export function BadgeBlock({ block, attrs }: ElementProps) {
  const tone = oneOf(block.props.tone, ['primary', 'accent', 'neutral'] as const, 'primary')
  return <span {...styledBlockAttrs(block, attrs, 'inline-flex rounded-full px-3 py-1 text-sm font-semibold')} data-badge-tone={tone}>{str(block.props.text)}</span>
}

export function IconBlock({ block, attrs }: ElementProps) {
  const name = oneOf(block.props.name, Object.keys(sectionIcons) as (keyof typeof sectionIcons)[], 'sparkles')
  const Icon = sectionIcons[name]
  const label = str(block.props.label)
  return <span {...styledBlockAttrs(block, attrs, 'inline-flex')} role={label ? 'img' : undefined} aria-label={label || undefined} aria-hidden={label ? undefined : 'true'}><Icon /></span>
}

export function VideoBlock({ block, attrs, placeholder }: ElementProps & { placeholder?: ReactNode }) {
  const url = imageUrl(block.props.url)
  if (!url) return placeholder ? <div {...styledBlockAttrs(block, attrs, 'w-full')}>{placeholder}</div> : null
  const poster = imageUrl(block.props.poster)
  const captions = imageUrl(block.props.captions)
  return <video {...styledBlockAttrs(block, attrs, 'h-auto w-full max-w-full rounded-site')} src={url} poster={poster || undefined} controls preload="metadata" aria-label={str(block.props.label)}><track kind="captions" src={captions || undefined} srcLang="pt-BR" label="Português" default /></video>
}

export function WhatsappButtonBlock({ block, attrs }: ElementProps) {
  const phone = /^\d{8,15}$/.test(str(block.props.phone)) ? str(block.props.phone) : ''
  const href = phone ? `https://wa.me/${phone}${str(block.props.message) ? `?text=${encodeURIComponent(str(block.props.message))}` : ''}` : '#'
  return <div {...styledBlockAttrs(block, attrs, 'max-w-full')}><ActionLink link={{ label: str(block.props.label), href }} variant="primary" /></div>
}

export function BenefitListBlock({ block, attrs }: ElementProps) {
  const items = Array.isArray(block.props.items) ? block.props.items.filter((item): item is string => typeof item === 'string') : []
  return <ul {...styledBlockAttrs(block, attrs, 'grid gap-3 text-left')}>{items.map((item, index) => <li key={`${index}-${item}`} className="flex gap-2"><span aria-hidden="true" className="font-bold text-site-primary">✓</span><span>{item}</span></li>)}</ul>
}
