import { describe, expect, it } from 'vitest'
import { isExternal, safeHref, splitHighlight } from './safe-href'

describe('safeHref', () => {
  it('aceita âncoras, rotas internas, https, mailto e tel', () => {
    expect(safeHref('#contato')).toBe('#contato')
    expect(safeHref('/sobre')).toBe('/sobre')
    expect(safeHref('https://wa.me/5511900000000')).toBe('https://wa.me/5511900000000')
    expect(safeHref('mailto:contato@empresa.com.br')).toBe('mailto:contato@empresa.com.br')
    expect(safeHref('tel:+55 11 90000-0000')).toBe('tel:+55 11 90000-0000')
  })

  it('bloqueia esquemas perigosos e links ambíguos', () => {
    expect(safeHref('javascript:alert(1)')).toBe('#')
    expect(safeHref(' JavaScript:alert(1)')).toBe('#')
    expect(safeHref('data:text/html,<script>')).toBe('#')
    expect(safeHref('http://inseguro.com')).toBe('#')
    expect(safeHref('//outro-host.com')).toBe('#')
    expect(safeHref('')).toBe('#')
  })

  it('identifica links externos', () => {
    expect(isExternal('https://wa.me/1')).toBe(true)
    expect(isExternal('#servicos')).toBe(false)
  })
})

describe('splitHighlight', () => {
  it('separa o trecho destacado', () => {
    expect(splitHighlight('Soluções que fazem seu negócio crescer', 'crescer')).toEqual([
      'Soluções que fazem seu negócio ',
      'crescer',
      '',
    ])
  })

  it('ignora destaque ausente ou que não existe no título', () => {
    expect(splitHighlight('Título', undefined)).toEqual(['Título', '', ''])
    expect(splitHighlight('Título', 'outro')).toEqual(['Título', '', ''])
  })
})
