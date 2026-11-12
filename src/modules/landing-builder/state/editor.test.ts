import { describe, expect, it } from 'vitest'
import { createEmptyLanding, MAX_BLOCKS, type Block, type BlockType, type LandingDocument } from '@/renderer/document-v2'
import { horizonteTheme } from '@/renderer/templates/institucional'
import {
  canMove,
  defaultTarget,
  duplicateBlock,
  findBlock,
  insertBlock,
  moveBlock,
  placeBlock,
  removeBlock,
  setSeo,
  syncColumnCount,
  updateBlockResponsive,
  updateBlockStyle,
  updateBlockProps,
} from './editor'

const block = (id: string, type: BlockType, children?: Block[]): Block => ({ id, type, v: 1, props: {}, ...(children ? { children } : {}) })
const container = () => block('nova-secao', 'section')

/** hero, s1[h1, p1], faq, s2[] */
function sample(): LandingDocument {
  return {
    ...createEmptyLanding('Teste', horizonteTheme),
    blocks: [
      block('hero', 'hero'),
      block('s1', 'section', [block('h1', 'heading'), block('p1', 'paragraph')]),
      block('faq', 'faq'),
      block('s2', 'section', []),
    ],
  }
}

/** Estrutura resumida: "hero s1[h1 p1] faq s2[]". */
function shape(doc: LandingDocument): string {
  const draw = (blocks: readonly Block[]): string =>
    blocks.map((b) => (b.children ? `${b.id}[${draw(b.children)}]` : b.id)).join(' ')
  return draw(doc.blocks)
}

describe('findBlock', () => {
  it('acha blocos da raiz e de dentro das seções, com pai e posição', () => {
    const doc = sample()
    expect(findBlock(doc.blocks, 'faq')).toMatchObject({ parent: null, index: 2 })
    expect(findBlock(doc.blocks, 'p1')).toMatchObject({ parent: { id: 's1' }, index: 1 })
    expect(findBlock(doc.blocks, 'nao-existe')).toBeNull()
  })
})

describe('updateBlockProps', () => {
  it('troca só o conteúdo do bloco, sem alterar o documento original', () => {
    const doc = sample()
    const next = updateBlockProps(doc, 'h1', { text: 'Novo', level: 'h2' })
    expect(findBlock(next.blocks, 'h1')?.block.props).toEqual({ text: 'Novo', level: 'h2' })
    expect(findBlock(doc.blocks, 'h1')?.block.props).toEqual({})
    // Blocos fora do caminho alterado continuam sendo os mesmos objetos.
    expect(next.blocks[0]).toBe(doc.blocks[0])
    expect(next.blocks[2]).toBe(doc.blocks[2])
  })

  it('id desconhecido não muda nada', () => {
    const doc = sample()
    expect(updateBlockProps(doc, 'x', {})).toBe(doc)
  })
})

describe('estilo e responsividade', () => {
  it('atualiza estilo sem alterar props nem o documento original', () => {
    const doc = sample()
    const next = updateBlockStyle(doc, 'h1', { textSize: 'xl', paddingY: 24 })
    expect(findBlock(next.blocks, 'h1')?.block.style).toEqual({ textSize: 'xl', paddingY: 24 })
    expect(findBlock(doc.blocks, 'h1')?.block.style).toBeUndefined()
  })

  it('remove override vazio para o dispositivo voltar a herdar', () => {
    const doc = updateBlockResponsive(sample(), 'h1', { mobile: { textAlign: 'center' }, hideOn: ['mobile'] })
    const next = updateBlockResponsive(doc, 'h1', { mobile: { textAlign: undefined }, hideOn: [] })
    expect(findBlock(next.blocks, 'h1')?.block.responsive).toBeUndefined()
  })
})

describe('insertBlock', () => {
  it('insere na raiz e dentro de uma seção, na posição pedida', () => {
    const doc = sample()
    expect(shape(insertBlock(doc, null, 1, block('cta', 'cta')))).toBe('hero cta s1[h1 p1] faq s2[]')
    expect(shape(insertBlock(doc, 's1', 1, block('img', 'image')))).toBe('hero s1[h1 img p1] faq s2[]')
    expect(shape(insertBlock(doc, 's2', 99, block('btn', 'button')))).toBe('hero s1[h1 p1] faq s2[btn]')
  })

  it('recusa estrutura inválida: elemento na raiz, seção dentro de seção, filho em bloco-folha', () => {
    const doc = sample()
    expect(insertBlock(doc, null, 0, block('t', 'heading'))).toBe(doc)
    expect(insertBlock(doc, 's1', 0, block('s3', 'section'))).toBe(doc)
    expect(insertBlock(doc, 's1', 0, block('hero2', 'hero'))).toBe(doc)
    expect(insertBlock(doc, 'faq', 0, block('t', 'heading'))).toBe(doc)
    expect(insertBlock(doc, 'h1', 0, block('t', 'heading'))).toBe(doc)
    expect(insertBlock(doc, 'nao-existe', 0, block('t', 'heading'))).toBe(doc)
  })

  it('recusa id repetido e respeita o limite de blocos', () => {
    const doc = sample()
    expect(insertBlock(doc, 's1', 0, block('h1', 'heading'))).toBe(doc)

    const full: LandingDocument = { ...doc, blocks: Array.from({ length: MAX_BLOCKS }, (_, i) => block(`f${i}`, 'faq')) }
    expect(insertBlock(full, null, 0, block('extra', 'faq'))).toBe(full)
  })
})

describe('removeBlock', () => {
  it('remove o bloco; uma seção sai com os filhos', () => {
    const doc = sample()
    expect(shape(removeBlock(doc, 'h1'))).toBe('hero s1[p1] faq s2[]')
    expect(shape(removeBlock(doc, 's1'))).toBe('hero faq s2[]')
    expect(removeBlock(doc, 'x')).toBe(doc)
  })
})

describe('moveBlock e canMove', () => {
  it('move entre os irmãos, na raiz e dentro da seção', () => {
    const doc = sample()
    expect(shape(moveBlock(doc, 'faq', -1))).toBe('hero faq s1[h1 p1] s2[]')
    expect(shape(moveBlock(doc, 'hero', 1))).toBe('s1[h1 p1] hero faq s2[]')
    expect(shape(moveBlock(doc, 'p1', -1))).toBe('hero s1[p1 h1] faq s2[]')
  })

  it('nas pontas nada muda, e um elemento nunca sai da própria seção', () => {
    const doc = sample()
    expect(shape(moveBlock(doc, 'hero', -1))).toBe(shape(doc))
    expect(shape(moveBlock(doc, 's2', 1))).toBe(shape(doc))
    expect(shape(moveBlock(doc, 'h1', -1))).toBe(shape(doc))
    expect(shape(moveBlock(doc, 'p1', 1))).toBe(shape(doc))
    expect(canMove(doc, 'hero', -1)).toBe(false)
    expect(canMove(doc, 'hero', 1)).toBe(true)
    expect(canMove(doc, 'p1', 1)).toBe(false)
    expect(canMove(doc, 'p1', -1)).toBe(true)
    expect(canMove(doc, 'x', 1)).toBe(false)
  })
})

describe('duplicateBlock', () => {
  it('copia logo depois do original, com ids novos em toda a subárvore e conteúdo independente', () => {
    const doc = updateBlockProps(sample(), 'h1', { text: 'Original', nested: { a: 1 } })
    let n = 0
    const result = duplicateBlock(doc, 's1', (type) => `${type}-copia-${++n}`)
    expect(shape(result.doc)).toBe('hero s1[h1 p1] section-copia-1[heading-copia-2 paragraph-copia-3] faq s2[]')
    expect(result.id).toBe('section-copia-1')

    const copy = findBlock(result.doc.blocks, 'heading-copia-2')?.block
    const original = findBlock(result.doc.blocks, 'h1')?.block
    expect(copy?.props).toEqual(original?.props)
    expect(copy?.props).not.toBe(original?.props)
    expect(copy?.props.nested).not.toBe(original?.props.nested)
  })

  it('não duplica além do limite', () => {
    const doc = sample()
    const full: LandingDocument = { ...doc, blocks: Array.from({ length: MAX_BLOCKS }, (_, i) => block(`f${i}`, 'faq')) }
    expect(duplicateBlock(full, 'f0')).toEqual({ doc: full, id: null })
    expect(duplicateBlock(doc, 'x')).toEqual({ doc, id: null })
  })
})

describe('placeBlock (clique na biblioteca)', () => {
  const place = (doc: LandingDocument, b: Block, target: Parameters<typeof placeBlock>[2]) => placeBlock(doc, b, target, container)

  it('sem referência: bloco de raiz vai para o fim', () => {
    expect(shape(place(sample(), block('cta', 'cta'), null).doc)).toBe('hero s1[h1 p1] faq s2[] cta')
  })

  it('página vazia + elemento: cria uma seção para recebê-lo e devolve o id do elemento', () => {
    const empty = createEmptyLanding('Vazia', horizonteTheme)
    const result = place(empty, block('t', 'heading'), null)
    expect(shape(result.doc)).toBe('nova-secao[t]')
    expect(result.id).toBe('t')
  })

  it('elemento ao lado de outro elemento: mesmo contêiner, antes ou depois', () => {
    const doc = sample()
    expect(shape(place(doc, block('t', 'heading'), { refId: 'h1', position: 'after' }).doc)).toBe('hero s1[h1 t p1] faq s2[]')
    expect(shape(place(doc, block('t', 'heading'), { refId: 'h1', position: 'before' }).doc)).toBe('hero s1[t h1 p1] faq s2[]')
  })

  it('elemento "dentro" de uma seção: no fim dela', () => {
    expect(shape(place(sample(), block('t', 'heading'), { refId: 's1', position: 'inside' }).doc)).toBe('hero s1[h1 p1 t] faq s2[]')
  })

  it('elemento antes/depois de um bloco de raiz: seção nova ao lado', () => {
    const doc = sample()
    expect(shape(place(doc, block('t', 'heading'), { refId: 'hero', position: 'after' }).doc)).toBe('hero nova-secao[t] s1[h1 p1] faq s2[]')
    expect(shape(place(doc, block('t', 'heading'), { refId: 'faq', position: 'before' }).doc)).toBe('hero s1[h1 p1] nova-secao[t] faq s2[]')
    expect(shape(place(doc, block('t', 'heading'), { refId: 's1', position: 'after' }).doc)).toBe('hero s1[h1 p1] nova-secao[t] faq s2[]')
  })

  it('bloco de raiz com um elemento como referência: ao lado da seção que contém o elemento', () => {
    const doc = sample()
    expect(shape(place(doc, block('cta', 'cta'), { refId: 'p1', position: 'after' }).doc)).toBe('hero s1[h1 p1] cta faq s2[]')
    expect(shape(place(doc, block('cta', 'cta'), { refId: 'p1', position: 'before' }).doc)).toBe('hero cta s1[h1 p1] faq s2[]')
    expect(shape(place(doc, block('cta', 'cta'), { refId: 's1', position: 'inside' }).doc)).toBe('hero s1[h1 p1] cta faq s2[]')
  })

  it('referência que não existe mais: vai para o fim', () => {
    expect(shape(place(sample(), block('cta', 'cta'), { refId: 'sumiu', position: 'before' }).doc)).toBe('hero s1[h1 p1] faq s2[] cta')
  })

  it('no limite de blocos nada muda e o id volta null', () => {
    const doc = sample()
    const full: LandingDocument = { ...doc, blocks: Array.from({ length: MAX_BLOCKS }, (_, i) => block(`f${i}`, 'faq')) }
    expect(place(full, block('cta', 'cta'), null)).toEqual({ doc: full, id: null })
    // Elemento + seção nova = 2 blocos: também não cabe.
    const almost: LandingDocument = { ...doc, blocks: full.blocks.slice(1) }
    expect(place(almost, block('t', 'heading'), null)).toEqual({ doc: almost, id: null })
  })
})

describe('defaultTarget', () => {
  it('continua de onde a pessoa está', () => {
    const doc = sample()
    expect(defaultTarget(doc, null)).toBeNull()
    expect(defaultTarget(doc, 'sumiu')).toBeNull()
    expect(defaultTarget(doc, 's1')).toEqual({ refId: 's1', position: 'inside' })
    expect(defaultTarget(doc, 'h1')).toEqual({ refId: 'h1', position: 'after' })
    expect(defaultTarget(doc, 'hero')).toEqual({ refId: 'hero', position: 'after' })
  })
})

describe('setSeo', () => {
  it('altera só os campos enviados', () => {
    const doc = sample()
    expect(setSeo(doc, { description: 'Nova' }).seo).toEqual({ title: 'Teste', description: 'Nova' })
    expect(doc.seo.description).toBe('')
  })
})

describe('syncColumnCount', () => {
  const withColumns = (columns: Block[]): LandingDocument => ({
    ...createEmptyLanding('Teste', horizonteTheme),
    blocks: [block('s', 'section', [block('cols', 'columns', columns)])],
  })
  let seq = 0
  const makeColumn = () => block(`nova-${++seq}`, 'column', [])

  it('cria as colunas que faltam no fim', () => {
    seq = 0
    const doc = withColumns([block('c1', 'column', [block('h', 'heading')]), block('c2', 'column', [])])
    expect(shape(syncColumnCount(doc, 'cols', 4, makeColumn))).toBe('s[cols[c1[h] c2[] nova-1[] nova-2[]]]')
  })

  it('remove só colunas vazias do fim; coluna com conteúdo fica', () => {
    const doc = withColumns([block('c1', 'column', []), block('c2', 'column', [block('h', 'heading')]), block('c3', 'column', [])])
    expect(shape(syncColumnCount(doc, 'cols', 1, makeColumn))).toBe('s[cols[c1[] c2[h]]]')
  })

  it('mesmo número de colunas ou bloco que não é Colunas/Grade: nada muda', () => {
    const doc = withColumns([block('c1', 'column', []), block('c2', 'column', [])])
    expect(syncColumnCount(doc, 'cols', 2, makeColumn)).toBe(doc)
    expect(syncColumnCount(doc, 's', 3, makeColumn)).toBe(doc)
  })
})
