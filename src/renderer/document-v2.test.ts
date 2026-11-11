import { describe, expect, it } from 'vitest'
import {
  blockIds,
  blockToSection,
  countBlocks,
  createEmptyLanding,
  migrateDocument,
  sectionToBlock,
  treeDepth,
  type Block,
} from './document-v2'
import { horizonteTheme, institucionalTemplate } from './templates/institucional'

const leaf = (id: string, children?: Block[]): Block => ({ id, type: 'faq', v: 1, props: {}, ...(children ? { children } : {}) })

describe('medidas da árvore', () => {
  const tree = [leaf('a', [leaf('b', [leaf('c')]), leaf('d')]), leaf('e')]

  it('conta os blocos de todos os níveis', () => {
    expect(countBlocks([])).toBe(0)
    expect(countBlocks(tree)).toBe(5)
  })

  it('mede a profundidade a partir do nível raiz', () => {
    expect(treeDepth([])).toBe(0)
    expect(treeDepth([leaf('a')])).toBe(1)
    expect(treeDepth(tree)).toBe(3)
  })

  it('lista os ids na ordem do documento', () => {
    expect(blockIds(tree)).toEqual(['a', 'b', 'c', 'd', 'e'])
  })
})

describe('createEmptyLanding', () => {
  it('cria uma página v2 sem blocos, com o título de SEO vindo do nome', () => {
    const doc = createEmptyLanding('  Promoção de verão  ', horizonteTheme)
    expect(doc).toEqual({
      schemaVersion: 2,
      seo: { title: 'Promoção de verão', description: '' },
      theme: horizonteTheme,
      identity: { name: 'Sua Empresa', logoUrl: '', faviconUrl: '', whatsapp: '' },
      blocks: [],
    })
  })

  it('corta o título de SEO em 70 caracteres', () => {
    expect(createEmptyLanding('x'.repeat(120), horizonteTheme).seo.title).toHaveLength(70)
  })
})

describe('seção ↔ bloco', () => {
  it('ida e volta preserva a seção', () => {
    for (const section of institucionalTemplate.sections) {
      const block = sectionToBlock(section)
      expect(block.id).toBe(section.id)
      expect(block.type).toBe(section.type)
      expect(block.props).not.toHaveProperty('id')
      expect(block.props).not.toHaveProperty('type')
      expect(blockToSection(block)).toEqual(section)
    }
  })

  it('bloco de tipo desconhecido não vira seção', () => {
    expect(blockToSection({ id: 'x', type: 'carrossel-3d' as never, v: 1, props: {} })).toBeNull()
  })
})

describe('migrateDocument', () => {
  it('v1 → v2: cada seção vira um bloco, na mesma ordem, com tema e SEO mantidos', () => {
    const migrated = migrateDocument(institucionalTemplate)
    expect(migrated?.schemaVersion).toBe(2)
    expect(migrated?.theme).toEqual(institucionalTemplate.theme)
    expect(migrated?.seo).toEqual(institucionalTemplate.seo)
    expect(migrated?.blocks.map((b) => b.id)).toEqual(institucionalTemplate.sections.map((s) => s.id))
  })

  it('v2 passa sem alteração', () => {
    const doc = createEmptyLanding('Página', horizonteTheme)
    expect(migrateDocument(doc)).toBe(doc)
  })

  it('não altera o documento original', () => {
    const before = JSON.stringify(institucionalTemplate)
    migrateDocument(institucionalTemplate)
    expect(JSON.stringify(institucionalTemplate)).toBe(before)
  })

  it.each([
    ['null', null],
    ['texto', 'documento'],
    ['lista', []],
    ['versão futura', { schemaVersion: 3, seo: {}, theme: {}, blocks: [] }],
    ['v2 sem blocos', { schemaVersion: 2, seo: {}, theme: {} }],
    ['v1 sem seções', { schemaVersion: 1, seo: {}, theme: {} }],
  ])('devolve null para %s', (_label, value) => {
    expect(migrateDocument(value)).toBeNull()
  })
})
