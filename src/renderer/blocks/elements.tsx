import { createElement, type ReactNode } from 'react'
import { clsx as cn } from 'clsx'
import type { Block } from '../document-v2'
import { ActionLink, Container, SectionShell } from '../primitives'
import { imageUrl } from './image-url'
import type { LinkItem, SectionBackground, SectionText, SectionTone } from '../types'

/**
 * Blocos primitivos da landing page. Como todo o renderizador, tratam `props` como DADO não confiável:
 * cada valor é conferido contra uma lista fechada antes de virar classe, atributo ou endereço.
 * Classes são sempre fixas (existem no build); nada vindo do banco vira classe ou CSS.
 */

/** Atributos que o editor aplica no elemento raiz de cada bloco (seleção no canvas). Vazio no site público. */
export type BlockAttrs = Record<string, unknown>

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
    <div {...attrs}>
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
  return createElement(level, { ...attrs, className: cn('max-w-full break-words', headingClasses[level]) }, str(block.props.text))
}

export function ParagraphBlock({ block, attrs }: ElementProps) {
  const large = block.props.size === 'lg'
  // Texto puro: as quebras de linha digitadas são respeitadas pelo CSS, sem HTML.
  return (
    <p {...attrs} className={cn('max-w-full break-words whitespace-pre-line text-site-muted-foreground', large ? 'text-lg sm:text-xl' : 'text-base')}>
      {str(block.props.text)}
    </p>
  )
}

export function ImageBlock({ block, attrs, placeholder }: ElementProps & { placeholder?: ReactNode }) {
  const url = imageUrl(block.props.url)
  if (!url) return placeholder ? <div {...attrs} className="w-full">{placeholder}</div> : null
  return <img {...attrs} src={url} alt={str(block.props.alt)} loading="lazy" decoding="async" className="h-auto w-full max-w-full rounded-site" />
}

export function ButtonBlock({ block, attrs }: ElementProps) {
  const raw = block.props.link
  const link: LinkItem =
    typeof raw === 'object' && raw !== null
      ? { label: str((raw as Record<string, unknown>).label), href: str((raw as Record<string, unknown>).href) }
      : { label: '', href: '#' }
  const variant = oneOf(block.props.variant, ['primary', 'secondary'] as const, 'primary')
  return (
    <div {...attrs} className="max-w-full">
      {/* ActionLink passa o href por safeHref. */}
      <ActionLink link={link} variant={variant} />
    </div>
  )
}

const spacerClasses = { sm: 'h-4', md: 'h-8', lg: 'h-16', xl: 'h-24' } as const

export function SpacerBlock({ block, attrs }: ElementProps) {
  const size = oneOf(block.props.size, ['sm', 'md', 'lg', 'xl'] as const, 'md')
  return <div {...attrs} aria-hidden="true" className={cn('w-full', spacerClasses[size])} />
}

export function DividerBlock({ attrs }: ElementProps) {
  return <hr {...attrs} className="w-full border-0 border-t border-site-border" />
}
