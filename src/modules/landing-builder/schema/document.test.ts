import { describe, expect, it } from 'vitest'
import { createEmptyLanding, MAX_BLOCKS, migrateDocument, type Block, type LandingDocument } from '@/renderer/document-v2'
import { horizonteTheme, institucionalTemplate } from '@/renderer/templates/institucional'
import { parseLandingDocument, validateLandingDocument } from './document'

const empty = () => createEmptyLanding('Página de teste', horizonteTheme)
const fromTemplate = () => structuredClone(migrateDocument(institucionalTemplate)) as LandingDocument
const messages = (value: unknown) => validateLandingDocument(value).map((issue) => issue.message)

describe('validateLandingDocument', () => {
  it('aceita a página em branco (descrição de SEO pode ficar vazia no rascunho)', () => {
    expect(validateLandingDocument(empty())).toEqual([])
  })

  it('aceita o template institucional migrado para v2', () => {
    expect(validateLandingDocument(fromTemplate())).toEqual([])
  })

  it('recusa documento v1, sem título de SEO ou com tema inválido', () => {
    expect(messages(institucionalTemplate)).not.toEqual([])
    expect(messages({ ...empty(), seo: { title: ' ', description: '' } })).toContain('Título da página (SEO): preencha este campo.')
    const badTheme = { ...empty(), theme: { ...horizonteTheme, colors: { ...horizonteTheme.colors, primary: 'red' } } }
    expect(messages(badTheme)).toContain('Use uma cor no formato #RRGGBB.')
  })

  it('aponta o bloco com conteúdo inválido, usando as regras da seção', () => {
    const doc = fromTemplate()
    const faq = doc.blocks.find((b) => b.type === 'faq') as Block
    faq.props = { ...faq.props, title: '' }
    const issues = validateLandingDocument(doc)
    expect(issues.length).toBeGreaterThan(0)
    expect(issues.every((issue) => issue.blockId === faq.id)).toBe(true)
  })

  it('recusa tipo de bloco fora da lista fechada', () => {
    const doc = { ...empty(), blocks: [{ id: 'b1', type: 'html-livre', v: 1, props: { html: '<script>' } }] }
    expect(validateLandingDocument(doc)).toEqual([{ blockId: 'b1', message: 'Tipo de bloco desconhecido: "html-livre".' }])
  })

  it('recusa bloco malformado', () => {
    expect(messages({ ...empty(), blocks: ['texto'] })).toEqual(['Bloco com formato inválido.'])
    expect(messages({ ...empty(), blocks: [{ type: 'faq', v: 1, props: {} }] })).toEqual(['Bloco com formato inválido.'])
  })

  it('recusa filhos em seção completa (bloco-folha)', () => {
    const doc = fromTemplate()
    const [first, second] = doc.blocks as [Block, Block]
    const nested = { ...doc, blocks: [{ ...first, children: [second] }] }
    expect(messages(nested)).toContain('Este tipo de bloco não aceita blocos dentro dele.')
  })

  it('recusa ids repetidos', () => {
    const doc = fromTemplate()
    const first = doc.blocks[0] as Block
    const issues = validateLandingDocument({ ...doc, blocks: [first, first] })
    expect(issues).toContainEqual({ blockId: first.id, message: 'Dois blocos estão com o mesmo identificador.' })
  })

  it('recusa mais blocos que o limite', () => {
    const doc = fromTemplate()
    const faq = doc.blocks.find((b) => b.type === 'faq') as Block
    const many = Array.from({ length: MAX_BLOCKS + 1 }, (_, i) => ({ ...faq, id: `faq-${i}` }))
    expect(messages({ ...doc, blocks: many })).toContain(`A página passou do limite de ${MAX_BLOCKS} blocos.`)
  })

  it('recusa árvore mais funda que o limite', () => {
    const doc = fromTemplate()
    const faq = doc.blocks.find((b) => b.type === 'faq') as Block
    const nest = (depth: number): Block => ({ ...faq, id: `n${depth}`, ...(depth > 1 ? { children: [nest(depth - 1)] } : {}) })
    expect(messages({ ...doc, blocks: [nest(5)] })).toContain('A página passou do limite de 4 níveis de blocos.')
  })
})

describe('parseLandingDocument', () => {
  it('migra um documento v1 e o valida', () => {
    const result = parseLandingDocument(institucionalTemplate)
    expect(result.document?.schemaVersion).toBe(2)
    expect(result.issues).toEqual([])
  })

  it('não abre versão desconhecida', () => {
    const result = parseLandingDocument({ schemaVersion: 9 })
    expect(result.document).toBeNull()
    expect(result.issues).toHaveLength(1)
  })
})
