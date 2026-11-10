import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageRenderer } from './PageRenderer'
import { backgroundCss, backgroundStops, surfaceColors, surfaceStyle, worstContrast } from './surface'
import { horizonteTheme, institucionalTemplate } from './templates/institucional'
import type { PageDocument, SectionBackground } from './types'

const gradient = (colors: string[], direction?: SectionBackground['direction']): SectionBackground =>
  direction ? { mode: 'gradient', colors, direction } : { mode: 'gradient', colors }

describe('backgroundStops (documento vindo do banco)', () => {
  it('aceita cor sólida e degradê de 2 ou 3 cores', () => {
    expect(backgroundStops({ mode: 'solid', colors: ['#FDF8F3'] })).toEqual(['#fdf8f3'])
    expect(backgroundStops(gradient(['#ffffff', '#fde68a']))).toEqual(['#ffffff', '#fde68a'])
    expect(backgroundStops(gradient(['#ffffff', '#fde68a', '#bae6fd']))).toHaveLength(3)
  })

  it.each([
    ['sem fundo', undefined],
    ['degradê com 1 cor', gradient(['#ffffff'])],
    ['degradê com 4 cores', gradient(['#ffffff', '#000000', '#ff0000', '#00ff00'])],
    ['valor que tenta injetar CSS', gradient(['#ffffff', 'red); background: url(https://x.y/a.png'])],
    ['cor nomeada', { mode: 'solid', colors: ['red'] }],
    ['modo desconhecido', { mode: 'image', colors: ['#ffffff'] }],
    ['cores ausentes', { mode: 'solid' }],
  ])('rejeita %s (a seção volta para o tema)', (_, value) => {
    expect(backgroundStops(value as SectionBackground | undefined)).toBeNull()
  })

  it('monta o CSS só com as direções conhecidas', () => {
    expect(backgroundCss(gradient(['#ffffff', '#000000'], 'to-right'), ['#ffffff', '#000000'])).toBe('linear-gradient(90deg, #ffffff, #000000)')
    expect(backgroundCss(gradient(['#ffffff', '#000000'], 'radial'), ['#ffffff', '#000000'])).toMatch(/^radial-gradient\(/)
    const bogus = { mode: 'gradient', colors: ['#ffffff', '#000000'], direction: 'evil' } as unknown as SectionBackground
    expect(backgroundCss(bogus, ['#ffffff', '#000000'])).toBe('linear-gradient(180deg, #ffffff, #000000)')
  })
})

describe('surfaceColors (texto legível sobre o fundo)', () => {
  it('degradê claro → texto escuro legível em todos os pontos', () => {
    const stops = ['#ffffff', '#fde68a', '#bae6fd']
    const colors = surfaceColors(horizonteTheme.colors, stops)
    expect(worstContrast(colors.foreground, stops)).toBeGreaterThanOrEqual(4.5)
    expect(worstContrast(colors.mutedForeground, stops)).toBeGreaterThanOrEqual(4.5)
    expect(colors.foreground).toBe('#0b1324')
  })

  it('degradê escuro → texto claro legível em todos os pontos', () => {
    const stops = ['#1e1b4b', '#7c2d12', '#064e3b']
    const colors = surfaceColors(horizonteTheme.darkColors, stops)
    expect(worstContrast(colors.foreground, stops)).toBeGreaterThanOrEqual(4.5)
    expect(worstContrast(colors.mutedForeground, stops)).toBeGreaterThanOrEqual(4.5)
  })
})

describe('surfaceStyle', () => {
  it('sem fundo personalizado não muda nada', () => {
    expect(surfaceStyle(horizonteTheme, undefined)).toBeUndefined()
  })

  it('fundo escuro usa as cores escuras do tema como base (primária clara)', () => {
    const style = surfaceStyle(horizonteTheme, { mode: 'solid', colors: ['#111827'] }) as Record<string, string>
    expect(style['--site-primary']).toBe(horizonteTheme.darkColors.primary)
    expect(style.background).toBe('#111827')
  })

  it('fundo claro mantém a primária do tema claro', () => {
    const style = surfaceStyle(horizonteTheme, { mode: 'solid', colors: ['#fdf8f3'] }) as Record<string, string>
    expect(style['--site-primary']).toBe(horizonteTheme.colors.primary)
  })
})

function withBackground(type: string, background: SectionBackground): PageDocument {
  return {
    ...institucionalTemplate,
    sections: institucionalTemplate.sections.map((s) => (s.type === type ? { ...s, background } : s)),
  } as PageDocument
}

describe('fundo personalizado nas seções', () => {
  it('seção com degradê recebe o fundo e a cor de texto calculada', () => {
    const { container } = render(<PageRenderer document={withBackground('features', gradient(['#0f172a', '#1e3a8a'], 'to-right'))} />)
    const section = container.querySelector('#servicos') as HTMLElement
    expect(section.getAttribute('data-tone')).toBe('custom')
    expect(section.style.background).toContain('linear-gradient(90deg')
    expect(section.style.getPropertyValue('--site-foreground')).toBe('#f1f5ff')
  })

  it('rodapé com cor sólida clara troca o fundo escuro padrão', () => {
    const { container } = render(<PageRenderer document={withBackground('site-footer', { mode: 'solid', colors: ['#fdf8f3'] })} />)
    const footer = container.querySelector('footer') as HTMLElement
    expect(footer.style.getPropertyValue('--site-background')).toBe('#fdf8f3')
    expect(footer.style.getPropertyValue('--site-foreground')).toBe('#0b1324')
  })

  it('cabeçalho com fundo personalizado fica pintado', () => {
    const { container } = render(<PageRenderer document={withBackground('site-header', { mode: 'solid', colors: ['#14532d'] })} />)
    const header = container.querySelector('header') as HTMLElement
    expect(header.style.background).not.toBe('')
    expect(header.className).toContain('text-site-foreground')
  })

  it('valor inválido salvo no banco é ignorado (seção volta ao tema)', () => {
    const bad = { mode: 'gradient', colors: ['#fff', 'url(x)'] } as unknown as SectionBackground
    const { container } = render(<PageRenderer document={withBackground('features', bad)} />)
    const section = container.querySelector('#servicos') as HTMLElement
    expect(section.getAttribute('data-tone')).not.toBe('custom')
    expect(section.getAttribute('style') ?? '').not.toContain('url(')
  })
})
