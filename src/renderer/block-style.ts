import type { CSSProperties } from 'react'
import { clsx as cn } from 'clsx'
import type { Block } from './document-v2'

export type BlockAttrs = Record<string, unknown>

const names = {
  textSize: 'text-size', fontWeight: 'font-weight', textAlign: 'text-align', maxWidth: 'max-width',
  paddingX: 'padding-x', paddingY: 'padding-y', marginTop: 'margin-top', marginBottom: 'margin-bottom', gap: 'gap',
  color: 'color', backgroundColor: 'background', borderColor: 'border-color', borderWidth: 'border-width', radius: 'radius', shadow: 'shadow',
} as const

const tokenValues: Partial<Record<keyof typeof names, Record<string, string>>> = {
  textSize: { xs: '.75rem', sm: '.875rem', md: '1rem', lg: '1.125rem', xl: '1.25rem', '2xl': '1.5rem', '3xl': '1.875rem' },
  fontWeight: { normal: '400', medium: '500', semibold: '600', bold: '700' },
  maxWidth: { full: '100%', sm: '24rem', md: '32rem', lg: '48rem', xl: '64rem' },
  radius: { none: '0', sm: '.375rem', md: '.625rem', lg: '.875rem', xl: '1.25rem', full: '9999px' },
  shadow: { none: 'none', sm: '0 1px 2px rgb(0 0 0 / .08)', md: '0 8px 24px rgb(0 0 0 / .12)', lg: '0 16px 44px rgb(0 0 0 / .16)' },
}

function vars(style: Block['style'], prefix: '' | 'tablet-' | 'mobile-'): CSSProperties {
  if (!style) return {}
  return Object.fromEntries(Object.entries(style).map(([key, value]) => {
    const typed = key as keyof typeof names
    return [`--lb-${prefix}${names[typed]}`, tokenValues[typed]?.[String(value)] ?? String(value)]
  })) as CSSProperties
}

function presenceClasses(style: Block['style'], prefix: '' | 'tablet-' | 'mobile-'): string[] {
  if (!style) return []
  return Object.entries(style)
    .filter(([, value]) => value !== undefined)
    .map(([key]) => `lb-${prefix}${names[key as keyof typeof names]}`)
}

/** Somente variáveis com nomes internos; os valores já passaram pela validação de tokens. */
export function blockStyleProps(block: Block): { className: string; style: CSSProperties; 'data-hide-on'?: string } {
  const hide = block.responsive?.hideOn?.join(' ')
  return {
    className: cn(
      'lb-styled',
      presenceClasses(block.style, ''),
      presenceClasses(block.responsive?.tablet, 'tablet-'),
      presenceClasses(block.responsive?.mobile, 'mobile-'),
    ),
    style: { ...vars(block.style, ''), ...vars(block.responsive?.tablet, 'tablet-'), ...vars(block.responsive?.mobile, 'mobile-') },
    ...(hide ? { 'data-hide-on': hide } : {}),
  }
}

export function styledBlockAttrs(block: Block, attrs: BlockAttrs, className?: string): BlockAttrs {
  const styled = blockStyleProps(block)
  return { ...attrs, ...styled, className: cn(attrs.className as string | undefined, styled.className, className), style: { ...(attrs.style as CSSProperties | undefined), ...styled.style } }
}
