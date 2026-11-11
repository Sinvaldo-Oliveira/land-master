import { describe, expect, it } from 'vitest'
import { copySlug, pageMetaSchema, SLUG_MAX, SLUG_PATTERN, slugify } from './page-meta'

describe('slugify', () => {
  it.each([
    ['Promoção de Verão 2026!', 'promocao-de-verao-2026'],
    ['  Aula   grátis — inscrição  ', 'aula-gratis-inscricao'],
    ['Ação & Reação', 'acao-reacao'],
    ['---', ''],
    ['', ''],
  ])('%s → %s', (input, expected) => {
    expect(slugify(input)).toBe(expected)
  })

  it('respeita o limite e não termina em hífen', () => {
    const slug = slugify(`${'a'.repeat(SLUG_MAX - 1)} b c`)
    expect(slug.length).toBeLessThanOrEqual(SLUG_MAX)
    expect(slug).toMatch(SLUG_PATTERN)
  })
})

describe('copySlug', () => {
  it('acrescenta -copia', () => {
    expect(copySlug('black-friday')).toBe('black-friday-copia')
  })

  it('cabe no limite mesmo com endereço no tamanho máximo', () => {
    const slug = copySlug('a'.repeat(SLUG_MAX))
    expect(slug).toHaveLength(SLUG_MAX)
    expect(slug).toMatch(SLUG_PATTERN)
  })
})

describe('pageMetaSchema', () => {
  const parse = (title: string, slug: string) => pageMetaSchema.safeParse({ title, slug })

  it('aceita nome e endereço válidos e remove espaços das pontas', () => {
    const result = parse('  Black Friday  ', 'black-friday')
    expect(result.success && result.data).toEqual({ title: 'Black Friday', slug: 'black-friday' })
  })

  it.each([
    ['nome vazio', '   ', 'black-friday'],
    ['nome longo demais', 'x'.repeat(121), 'black-friday'],
    ['endereço curto', 'Página', 'ab'],
    ['endereço com maiúsculas', 'Página', 'Black-Friday'],
    ['endereço com espaço', 'Página', 'black friday'],
    ['endereço com acento', 'Página', 'promoção'],
    ['hífen duplo', 'Página', 'black--friday'],
    ['hífen na ponta', 'Página', 'black-friday-'],
    ['barra', 'Página', 'lp/black'],
    ['endereço longo demais', 'Página', 'a'.repeat(81)],
  ])('recusa %s', (_label, title, slug) => {
    expect(parse(title, slug).success).toBe(false)
  })
})
