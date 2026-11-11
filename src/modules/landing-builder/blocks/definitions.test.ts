import { describe, expect, it } from 'vitest'
import { BLOCK_TYPES, canInsert, createEmptyLanding, isElementBlockType, type Block, type LandingDocument } from '@/renderer/document-v2'
import { horizonteTheme } from '@/renderer/templates/institucional'
import { validateLandingDocument } from '../schema/document'
import { blockDefinitions, blockLabel, blockSummary, createBlock, definitionOf, groupOrder } from './definitions'

describe('definições de bloco', () => {
  it('todo tipo de bloco do documento tem definição, e não há definição sobrando', () => {
    expect(blockDefinitions.map((d) => d.type).sort()).toEqual([...BLOCK_TYPES].sort())
    expect(new Set(blockDefinitions.map((d) => d.type)).size).toBe(blockDefinitions.length)
    for (const definition of blockDefinitions) expect(groupOrder).toContain(definition.group)
  })

  it('os nomes na biblioteca não se repetem', () => {
    const labels = blockDefinitions.map((d) => d.label)
    expect(new Set(labels).size).toBe(labels.length)
  })

  it('tipo desconhecido não tem definição', () => {
    expect(definitionOf('html-livre')).toBeUndefined()
  })

  it.each(BLOCK_TYPES)('o conteúdo inicial de "%s" passa na validação completa', (type) => {
    let block = createBlock(type, (t) => `${t}-1`)
    // Elementos vivem dentro de uma seção.
    if (isElementBlockType(type)) block = { ...createBlock('section', () => 'secao-1'), children: [block] }
    expect(canInsert(null, block.type)).toBe(true)
    const doc: LandingDocument = { ...createEmptyLanding('Teste', horizonteTheme), blocks: [block] }
    expect(validateLandingDocument(doc)).toEqual([])
  })

  it('cada bloco criado tem conteúdo próprio (alterar um não altera o próximo)', () => {
    for (const type of BLOCK_TYPES) {
      const first = createBlock(type)
      const second = createBlock(type)
      expect(first.id).not.toBe(second.id)
      expect(first.props).toEqual(second.props)
      expect(first.props).not.toBe(second.props)
    }
    const a = createBlock('faq')
    const b = createBlock('faq')
    expect(a.props.items).not.toBe(b.props.items)
  })

  it('nome e resumo para as camadas', () => {
    const heading: Block = { id: 't', type: 'heading', v: 1, props: { text: 'Oferta de verão', level: 'h2' } }
    expect(blockLabel(heading)).toBe('Título')
    expect(blockSummary(heading)).toBe('Oferta de verão')

    const button: Block = { id: 'b', type: 'button', v: 1, props: { link: { label: 'Comprar', href: '#' }, variant: 'primary' } }
    expect(blockSummary(button)).toBe('Comprar')

    const section = (children: Block[]): Block => ({ id: 's', type: 'section', v: 1, props: {}, children })
    expect(blockSummary(section([]))).toBe('Vazia')
    expect(blockSummary(section([heading]))).toBe('1 elemento')
    expect(blockSummary(section([heading, button]))).toBe('2 elementos')

    expect(blockSummary({ id: 'i', type: 'image', v: 1, props: { url: '', alt: '' } })).toBe('Sem imagem')
    expect(blockLabel(createBlock('faq'))).toBe('Perguntas frequentes')
    expect(blockLabel({ id: 'x', type: 'novo-tipo' as never, v: 1, props: {} })).toBe('Bloco desconhecido')
    // Nome dado pela pessoa a uma seção pronta tem prioridade.
    expect(blockLabel({ ...createBlock('faq'), props: { ...createBlock('faq').props, name: 'Dúvidas do curso' } })).toBe('Dúvidas do curso')
  })
})
