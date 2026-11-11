import { describe, expect, it } from 'vitest'
import { createEmptyLanding, type Block, type BlockType, type LandingDocument } from '@/renderer/document-v2'
import { horizonteTheme } from '@/renderer/templates/institucional'
import { dropAnchor, moveBlockTo, resolveDrop } from './editor'

const block = (id: string, type: BlockType, children?: Block[]): Block => ({ id, type, v: 1, props: {}, ...(children ? { children } : {}) })

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

function allIds(blocks: readonly Block[]): string[] {
  return blocks.flatMap((b) => [b.id, ...allIds(b.children ?? [])]).sort()
}

const everyId = ['hero', 's1', 'h1', 'p1', 'faq', 's2']

describe('moveBlockTo (arrastar um bloco existente)', () => {
  it('reordena elementos dentro da seção', () => {
    const doc = sample()
    expect(shape(moveBlockTo(doc, 'p1', { refId: 'h1', position: 'before' }))).toBe('hero s1[p1 h1] faq s2[]')
    expect(shape(moveBlockTo(doc, 'h1', { refId: 'p1', position: 'after' }))).toBe('hero s1[p1 h1] faq s2[]')
  })

  it('leva um elemento para outra seção (dentro, antes ou depois de um elemento)', () => {
    const doc = sample()
    const moved = moveBlockTo(doc, 'h1', { refId: 's2', position: 'inside' })
    expect(shape(moved)).toBe('hero s1[p1] faq s2[h1]')
    expect(shape(moveBlockTo(moved, 'p1', { refId: 'h1', position: 'before' }))).toBe('hero s1[] faq s2[p1 h1]')
    expect(shape(moveBlockTo(moved, 'p1', { refId: 'h1', position: 'after' }))).toBe('hero s1[] faq s2[h1 p1]')
  })

  it('"dentro" da própria seção leva o elemento para o fim', () => {
    expect(shape(moveBlockTo(sample(), 'h1', { refId: 's1', position: 'inside' }))).toBe('hero s1[p1 h1] faq s2[]')
  })

  it('reordena blocos da raiz, levando os filhos junto', () => {
    const doc = sample()
    expect(shape(moveBlockTo(doc, 's1', { refId: 'faq', position: 'after' }))).toBe('hero faq s1[h1 p1] s2[]')
    expect(shape(moveBlockTo(doc, 'faq', { refId: 'hero', position: 'before' }))).toBe('faq hero s1[h1 p1] s2[]')
  })

  it('recusa estrutura inválida e devolve o mesmo documento', () => {
    const doc = sample()
    // elemento para a raiz
    expect(moveBlockTo(doc, 'h1', { refId: 'hero', position: 'after' })).toBe(doc)
    expect(moveBlockTo(doc, 'h1', { refId: 's2', position: 'before' })).toBe(doc)
    // seção dentro de seção, seção pronta dentro de seção, elemento dentro de bloco-folha
    expect(moveBlockTo(doc, 's2', { refId: 's1', position: 'inside' })).toBe(doc)
    expect(moveBlockTo(doc, 'faq', { refId: 'h1', position: 'after' })).toBe(doc)
    expect(moveBlockTo(doc, 'h1', { refId: 'faq', position: 'inside' })).toBe(doc)
    expect(moveBlockTo(doc, 'h1', { refId: 'p1', position: 'inside' })).toBe(doc)
    // seção para dentro de si mesma (a referência é um filho dela)
    expect(moveBlockTo(doc, 's1', { refId: 'h1', position: 'before' })).toBe(doc)
  })

  it('movimento que não muda nada devolve o mesmo documento', () => {
    const doc = sample()
    expect(moveBlockTo(doc, 'h1', { refId: 'h1', position: 'after' })).toBe(doc)
    expect(moveBlockTo(doc, 'h1', { refId: 'p1', position: 'before' })).toBe(doc)
    expect(moveBlockTo(doc, 'p1', { refId: 'h1', position: 'after' })).toBe(doc)
    expect(moveBlockTo(doc, 'p1', { refId: 's1', position: 'inside' })).toBe(doc)
    expect(moveBlockTo(doc, 'hero', { refId: 's1', position: 'before' })).toBe(doc)
    expect(moveBlockTo(doc, 'sumiu', { refId: 'h1', position: 'after' })).toBe(doc)
    expect(moveBlockTo(doc, 'h1', { refId: 'sumiu', position: 'after' })).toBe(doc)
  })

  it('em qualquer combinação, nunca perde nem duplica blocos', () => {
    const doc = sample()
    for (const id of everyId) {
      for (const refId of everyId) {
        for (const position of ['before', 'after', 'inside'] as const) {
          expect(allIds(moveBlockTo(doc, id, { refId, position }).blocks)).toEqual(allIds(doc.blocks))
        }
      }
    }
  })
})

describe('dropAnchor e resolveDrop (o que o ponteiro quer dizer)', () => {
  const newElement = { kind: 'new', type: 'heading' } as const
  const newRoot = { kind: 'new', type: 'cta' } as const

  it('seção arrastada sobre um elemento se refere à seção que o contém', () => {
    const doc = sample()
    expect(dropAnchor(doc, newRoot, 'p1')).toBe('s1')
    expect(dropAnchor(doc, { kind: 'move', id: 'faq' }, 'h1')).toBe('s1')
    expect(dropAnchor(doc, newElement, 'p1')).toBe('p1')
    expect(dropAnchor(doc, newElement, 's1')).toBe('s1')
    expect(dropAnchor(doc, newElement, 'sumiu')).toBeNull()
    expect(dropAnchor(doc, { kind: 'move', id: 'sumiu' }, 'p1')).toBeNull()
  })

  it('elemento novo: antes/depois de um elemento, dentro de uma seção, ou ao lado de uma seção pronta', () => {
    const doc = sample()
    expect(resolveDrop(doc, newElement, 'h1', 0.2)).toEqual({ refId: 'h1', position: 'before' })
    expect(resolveDrop(doc, newElement, 'h1', 0.8)).toEqual({ refId: 'h1', position: 'after' })
    expect(resolveDrop(doc, newElement, 's2', 0.1)).toEqual({ refId: 's2', position: 'inside' })
    expect(resolveDrop(doc, newElement, 'faq', 0.9)).toEqual({ refId: 'faq', position: 'after' })
  })

  it('bloco de raiz novo: antes ou depois de outro bloco de raiz, nunca dentro', () => {
    const doc = sample()
    expect(resolveDrop(doc, newRoot, 's1', 0.3)).toEqual({ refId: 's1', position: 'before' })
    expect(resolveDrop(doc, newRoot, 's1', 0.7)).toEqual({ refId: 's1', position: 'after' })
    expect(resolveDrop(doc, newRoot, 'h1', 0.7)).toBeNull()
  })

  it('mover: só devolve destino quando o documento realmente muda', () => {
    const doc = sample()
    expect(resolveDrop(doc, { kind: 'move', id: 'p1' }, 'h1', 0.1)).toEqual({ refId: 'h1', position: 'before' })
    expect(resolveDrop(doc, { kind: 'move', id: 'h1' }, 's2', 0.5)).toEqual({ refId: 's2', position: 'inside' })
    // sobre si mesmo, ou onde já está
    expect(resolveDrop(doc, { kind: 'move', id: 'h1' }, 'h1', 0.9)).toBeNull()
    expect(resolveDrop(doc, { kind: 'move', id: 'h1' }, 'p1', 0.1)).toBeNull()
    // elemento não sai para a raiz; seção não entra em seção
    expect(resolveDrop(doc, { kind: 'move', id: 'h1' }, 'faq', 0.9)).toBeNull()
    expect(resolveDrop(doc, { kind: 'move', id: 'faq' }, 'h1', 0.9)).toBeNull()
    expect(resolveDrop(doc, { kind: 'move', id: 'sumiu' }, 'h1', 0.9)).toBeNull()
  })

  it('todo destino oferecido a um movimento é aplicável e mantém a estrutura válida', () => {
    const doc = sample()
    let offered = 0
    for (const id of everyId) {
      for (const hovered of everyId) {
        for (const ratio of [0.1, 0.9]) {
          const source = { kind: 'move', id } as const
          const anchor = dropAnchor(doc, source, hovered)
          const target = anchor ? resolveDrop(doc, source, anchor, ratio) : null
          if (!target) continue
          offered++
          const next = moveBlockTo(doc, id, target)
          expect(next).not.toBe(doc)
          // raiz só com blocos de raiz; seções só com elementos
          for (const root of next.blocks) {
            expect(['hero', 'faq', 'section']).toContain(root.type)
            for (const child of root.children ?? []) expect(['heading', 'paragraph']).toContain(child.type)
          }
        }
      }
    }
    expect(offered).toBeGreaterThan(10)
  })
})
