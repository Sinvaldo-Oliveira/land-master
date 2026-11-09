import { describe, expect, it } from 'vitest'
import { horizonteTheme } from './templates/institucional'
import { contrastRatio, themeVars } from './theme'

describe('contrastRatio', () => {
  it('calcula os extremos conhecidos', () => {
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 0)
    expect(contrastRatio('#777777', '#777777')).toBeCloseTo(1, 5)
  })
})

describe('preset Horizonte', () => {
  for (const [mode, colors] of [
    ['claro', horizonteTheme.colors],
    ['escuro', horizonteTheme.darkColors],
  ] as const) {
    it(`texto principal, secundário e botões passam AA (4,5:1) no modo ${mode}`, () => {
      expect(contrastRatio(colors.foreground, colors.background)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(colors.mutedForeground, colors.background)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(colors.mutedForeground, colors.muted)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(colors.primaryForeground, colors.primary)).toBeGreaterThanOrEqual(4.5)
      expect(contrastRatio(colors.foreground, colors.card)).toBeGreaterThanOrEqual(4.5)
    })
  }

  it('gera as variáveis CSS do .site-root', () => {
    const vars = themeVars(horizonteTheme) as Record<string, string>
    expect(vars['--site-primary']).toBe('#2f5bea')
    expect(vars['--site-font-heading']).toContain('Sora Variable')
    expect(vars['--site-radius']).toBe('0.875rem')
  })
})
