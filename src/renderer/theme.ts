import type { CSSProperties } from 'react'
import type { FontId, SiteTheme, ThemeColors } from './types'

const fontStacks: Record<FontId, string> = {
  sora: '"Sora Variable", ui-sans-serif, system-ui, sans-serif',
  'plus-jakarta-sans': '"Plus Jakarta Sans Variable", ui-sans-serif, system-ui, sans-serif',
}

const radii: Record<SiteTheme['radius'], string> = {
  sm: '0.375rem',
  md: '0.625rem',
  lg: '0.875rem',
  xl: '1.25rem',
}

/** Cores do tema → variáveis CSS consumidas pelas classes `*-site-*` (ver styles/index.css). */
export function colorVars(colors: ThemeColors): CSSProperties {
  return {
    '--site-background': colors.background,
    '--site-foreground': colors.foreground,
    '--site-primary': colors.primary,
    '--site-primary-foreground': colors.primaryForeground,
    '--site-accent': colors.accent,
    '--site-accent-foreground': colors.accentForeground,
    '--site-muted': colors.muted,
    '--site-muted-foreground': colors.mutedForeground,
    '--site-card': colors.card,
    '--site-border': colors.border,
    '--site-ring': colors.ring,
  } as CSSProperties
}

/** Variáveis do `.site-root`: cores do modo base, fontes e raio. */
export function themeVars(theme: SiteTheme): CSSProperties {
  return {
    ...colorVars(theme.colors),
    '--site-font-heading': fontStacks[theme.fonts.heading],
    '--site-font-body': fontStacks[theme.fonts.body],
    '--site-radius': radii[theme.radius],
  } as CSSProperties
}

/** Luminância relativa (WCAG 2.x) de uma cor #rrggbb. */
function luminance(hex: string): number {
  const value = hex.replace('#', '')
  const channels = [0, 2, 4].map((i) => parseInt(value.slice(i, i + 2), 16) / 255)
  const [r, g, b] = channels.map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4)) as [number, number, number]
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

/** Razão de contraste WCAG entre duas cores #rrggbb (1 a 21). */
export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x) as [number, number]
  return (hi + 0.05) / (lo + 0.05)
}
