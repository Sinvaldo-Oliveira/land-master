import { describe, expect, it } from 'vitest'
import { BLOCK_TYPES, canInsert, createEmptyLanding, isNestedBlockType, type Block, type LandingDocument } from '@/renderer/document-v2'
import { horizonteTheme } from '@/renderer/templates/institucional'
import { validateLandingDocument } from '../schema/document'
import { blockDefinitions, blockLabel, blockSummary, columnCountOf, createBlock, definitionOf, groupOrder } from './definitions'

describe('definições de bloco', () => {
  it('inclui todos os blocos previstos para a Etapa 4', () => {
    expect(blockDefinitions.map((definition) => definition.type)).toEqual(expect.arrayContaining([
      'columns', 'column', 'grid', 'list', 'badge', 'icon', 'video', 'whatsapp-button', 'benefit-list',
    ]))
  })
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
    let seq = 0
    let block = createBlock(type, (t) => `${t}-${++seq}`)
    // Elementos vivem dentro de uma seção.
    if (isNestedBlockType(type)) {
      if (type === 'column') {
        block = { ...createBlock('section', () => 'secao-1'), children: [{ ...createBlock('columns', () => 'colunas-1'), children: [block] }] }
      } else if (type === 'columns' || type === 'grid') {
        block = { ...createBlock('section', () => 'secao-1'), children: [block] }
      } else {
        block = { ...createBlock('section', () => 'secao-1'), children: [block] }
      }
    }
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

  it('aplica a identidade da página a cabeçalho, rodapé e WhatsApp novos', () => {
    const identity = { name: 'WebSic', logoUrl: 'https://cdn.test/logo.webp', faviconUrl: '', whatsapp: '5511999999999' }
    expect(createBlock('site-header', undefined, identity).props).toMatchObject({ brand: { name: 'WebSic' }, logoUrl: identity.logoUrl })
    expect(createBlock('site-footer', undefined, identity).props).toMatchObject({ brand: { name: 'WebSic' }, logoUrl: identity.logoUrl })
    expect(createBlock('whatsapp-button', undefined, identity).props).toMatchObject({ phone: identity.whatsapp })
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

describe('Colunas e Grade já nascem com colunas', () => {
  it('Colunas "2 iguais" cria 2 colunas vazias; Grade cria 3', () => {
    let seq = 0
    const columns = createBlock('columns', (t) => `${t}-${++seq}`)
    expect(columns.children?.map((c) => c.type)).toEqual(['column', 'column'])
    expect(columns.children?.every((c) => Array.isArray(c.children) && c.children.length === 0)).toBe(true)
    expect(new Set(columns.children?.map((c) => c.id)).size).toBe(2)
    expect(createBlock('grid').children).toHaveLength(3)
  })

  it('columnCountOf lê proporções e nº de colunas', () => {
    const make = (type: 'columns' | 'grid', props: Record<string, unknown>): Block => ({ id: 'x', type, v: 1, props })
    expect(columnCountOf(make('columns', { proportions: '1' }))).toBe(1)
    expect(columnCountOf(make('columns', { proportions: '1-2' }))).toBe(2)
    expect(columnCountOf(make('columns', { proportions: '1-1-1-1' }))).toBe(4)
    expect(columnCountOf(make('grid', { columns: 4 }))).toBe(4)
    expect(columnCountOf(make('grid', {}))).toBe(3)
    expect(columnCountOf({ id: 's', type: 'section', v: 1, props: {} })).toBeNull()
  })
})
