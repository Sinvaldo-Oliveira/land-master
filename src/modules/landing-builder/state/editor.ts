import {
  canInsert,
  countBlocks,
  isNestedBlockType,
  MAX_BLOCKS,
  type Block,
  type BlockResponsive,
  type BlockStyle,
  type BlockType,
  type LandingDocument,
} from '@/renderer/document-v2'

/**
 * Edição do LandingDocument por funções PURAS: recebem um documento e devolvem outro (ou o mesmo,
 * quando a operação não é permitida). A tela só reflete; nenhuma regra de estrutura mora na interface.
 */

export type BlockLocation = {
  block: Block
  /** null = nível raiz. */
  parent: Block | null
  index: number
}

export function findBlock(blocks: readonly Block[], id: string, parent: Block | null = null): BlockLocation | null {
  for (const [index, block] of blocks.entries()) {
    if (block.id === id) return { block, parent, index }
    const inside = findBlock(block.children ?? [], id, block)
    if (inside) return inside
  }
  return null
}

/** Aplica `change` na lista de irmãos de `parentId` (null = raiz), copiando só o caminho alterado. */
function mapSiblings(blocks: readonly Block[], parentId: string | null, change: (siblings: Block[]) => Block[]): Block[] {
  if (parentId === null) return change([...blocks])
  return blocks.map((block) => {
    if (block.id === parentId) return { ...block, children: change([...(block.children ?? [])]) }
    if (!block.children) return block
    return { ...block, children: mapSiblings(block.children, parentId, change) }
  })
}

function withBlocks(doc: LandingDocument, blocks: Block[]): LandingDocument {
  return { ...doc, blocks }
}

/** Troca o conteúdo (`props`) de um bloco. */
export function updateBlockProps(doc: LandingDocument, id: string, props: Record<string, unknown>): LandingDocument {
  const location = findBlock(doc.blocks, id)
  if (!location) return doc
  return withBlocks(
    doc,
    mapSiblings(doc.blocks, location.parent?.id ?? null, (siblings) =>
      siblings.map((block) => (block.id === id ? { ...block, props } : block)),
    ),
  )
}

function updateBlock(doc: LandingDocument, id: string, change: (block: Block) => Block): LandingDocument {
  const location = findBlock(doc.blocks, id)
  if (!location) return doc
  return withBlocks(doc, mapSiblings(doc.blocks, location.parent?.id ?? null, (siblings) => siblings.map((block) => (block.id === id ? change(block) : block))))
}

export function updateBlockStyle(doc: LandingDocument, id: string, style: BlockStyle): LandingDocument {
  return updateBlock(doc, id, (block) => {
    const clean = Object.fromEntries(Object.entries(style).filter(([, value]) => value !== undefined)) as BlockStyle
    const { style: _style, ...rest } = block
    return Object.keys(clean).length > 0 ? { ...rest, style: clean } : rest
  })
}

export function updateBlockResponsive(doc: LandingDocument, id: string, responsive: BlockResponsive): LandingDocument {
  return updateBlock(doc, id, (block) => {
    const cleanStyle = (style: BlockStyle | undefined): BlockStyle | undefined => {
      if (!style) return undefined
      const clean = Object.fromEntries(Object.entries(style).filter(([, value]) => value !== undefined)) as BlockStyle
      return Object.keys(clean).length > 0 ? clean : undefined
    }
    const tablet = cleanStyle(responsive.tablet)
    const mobile = cleanStyle(responsive.mobile)
    const hideOn = responsive.hideOn && responsive.hideOn.length > 0 ? [...new Set(responsive.hideOn)] : undefined
    const clean = { ...(tablet ? { tablet } : {}), ...(mobile ? { mobile } : {}), ...(hideOn ? { hideOn } : {}) }
    const { responsive: _responsive, ...rest } = block
    return Object.keys(clean).length > 0 ? { ...rest, responsive: clean } : rest
  })
}

/** Insere `block` em `parentId` (null = raiz) na posição `index`. Estrutura inválida ou limite estourado: nada muda. */
export function insertBlock(doc: LandingDocument, parentId: string | null, index: number, block: Block): LandingDocument {
  const parent = parentId === null ? null : (findBlock(doc.blocks, parentId)?.block ?? null)
  if (parentId !== null && !parent) return doc
  if (!canInsert(parent?.type ?? null, block.type)) return doc
  if (countBlocks(doc.blocks) + countBlocks([block]) > MAX_BLOCKS) return doc
  if (findBlock(doc.blocks, block.id)) return doc
  return withBlocks(
    doc,
    mapSiblings(doc.blocks, parentId, (siblings) => {
      siblings.splice(Math.max(0, Math.min(index, siblings.length)), 0, block)
      return siblings
    }),
  )
}

export function removeBlock(doc: LandingDocument, id: string): LandingDocument {
  const location = findBlock(doc.blocks, id)
  if (!location) return doc
  return withBlocks(doc, mapSiblings(doc.blocks, location.parent?.id ?? null, (siblings) => siblings.filter((block) => block.id !== id)))
}

/** Sobe (-1) ou desce (+1) o bloco entre os irmãos. Nas pontas, nada muda. */
export function moveBlock(doc: LandingDocument, id: string, direction: -1 | 1): LandingDocument {
  const location = findBlock(doc.blocks, id)
  if (!location) return doc
  const target = location.index + direction
  return withBlocks(
    doc,
    mapSiblings(doc.blocks, location.parent?.id ?? null, (siblings) => {
      if (target < 0 || target >= siblings.length) return siblings
      const [moved] = siblings.splice(location.index, 1)
      siblings.splice(target, 0, moved as Block)
      return siblings
    }),
  )
}

export function canMove(doc: LandingDocument, id: string, direction: -1 | 1): boolean {
  const location = findBlock(doc.blocks, id)
  if (!location) return false
  const siblings = location.parent ? (location.parent.children ?? []) : doc.blocks
  const target = location.index + direction
  return target >= 0 && target < siblings.length
}

export type IdFactory = (type: BlockType) => string

/** Identificador novo: tipo + trecho aleatório. Único com folga dentro de um documento de até 200 blocos. */
export const newBlockId: IdFactory = (type) => `${type}-${crypto.randomUUID().slice(0, 8)}`

function cloneWithNewIds(block: Block, makeId: IdFactory): Block {
  const copy: Block = { ...block, id: makeId(block.type), props: structuredClone(block.props) }
  if (block.children) copy.children = block.children.map((child) => cloneWithNewIds(child, makeId))
  return copy
}

/** Duplica o bloco (com os filhos) logo depois dele. Devolve o id da cópia, ou null se não coube no limite. */
export function duplicateBlock(doc: LandingDocument, id: string, makeId: IdFactory = newBlockId): { doc: LandingDocument; id: string | null } {
  const location = findBlock(doc.blocks, id)
  if (!location) return { doc, id: null }
  const copy = cloneWithNewIds(location.block, makeId)
  const next = insertBlock(doc, location.parent?.id ?? null, location.index + 1, copy)
  return next === doc ? { doc, id: null } : { doc: next, id: copy.id }
}

/** Onde o bloco novo entra em relação a um bloco de referência. `inside` só vale para contêineres. */
export type InsertTarget = { refId: string; position: 'before' | 'after' | 'inside' }

/** Bloco do nível raiz que contém `id` (ou o próprio, se já for da raiz). */
function rootIndexOf(doc: LandingDocument, id: string): number {
  return doc.blocks.findIndex((block) => block.id === id || findBlock(block.children ?? [], id) !== null)
}

/**
 * Coloca um bloco novo na página a partir de um clique na biblioteca.
 *  - Sem referência: no fim da página.
 *  - Elemento ao lado de outro elemento: mesmo contêiner, antes ou depois.
 *  - Elemento "dentro" de uma seção contêiner: no fim dela.
 *  - Elemento sem contêiner (antes/depois de um bloco de raiz, ou página vazia):
 *    cria uma seção nova para recebê-lo, usando `makeContainer`.
 *  - Bloco de raiz com um elemento como referência: ao lado da seção que contém o elemento.
 * Devolve o documento e o id do bloco inserido (null quando nada mudou).
 */
export function placeBlock(
  doc: LandingDocument,
  block: Block,
  target: InsertTarget | null,
  makeContainer: () => Block,
): { doc: LandingDocument; id: string | null } {
  const done = (next: LandingDocument) => (next === doc ? { doc, id: null } : { doc: next, id: block.id })
  const ref = target ? findBlock(doc.blocks, target.refId) : null
  const element = isNestedBlockType(block.type)

  if (element) {
    if (ref && target) {
      // No fim de uma seção contêiner.
      if (target.position === 'inside' && canInsert(ref.block.type, block.type)) {
        return done(insertBlock(doc, ref.block.id, ref.block.children?.length ?? 0, block))
      }
      // Ao lado de outro elemento.
      if (target.position !== 'inside' && ref.parent && canInsert(ref.parent.type, block.type)) {
        return done(insertBlock(doc, ref.parent.id, ref.index + (target.position === 'before' ? 0 : 1), block))
      }
    }
    // Sem contêiner: cria uma seção para o elemento, ao lado da referência (ou no fim).
    const container: Block = { ...makeContainer(), children: [block] }
    const rootIndex = ref && target ? rootIndexOf(doc, target.refId) : -1
    const index = rootIndex === -1 ? doc.blocks.length : rootIndex + (target?.position === 'before' ? 0 : 1)
    return done(insertBlock(doc, null, index, container))
  }

  // Bloco de raiz (seção completa ou seção contêiner).
  const rootIndex = target ? rootIndexOf(doc, target.refId) : -1
  const index = rootIndex === -1 ? doc.blocks.length : rootIndex + (target?.position === 'before' ? 0 : 1)
  return done(insertBlock(doc, null, index, block))
}

/** Destino padrão de um clique na biblioteca: continua de onde a pessoa está (bloco selecionado). */
export function defaultTarget(doc: LandingDocument, selectedId: string | null): InsertTarget | null {
  const selected = selectedId ? findBlock(doc.blocks, selectedId) : null
  if (!selected) return null
  return { refId: selected.block.id, position: selected.block.type === 'section' ? 'inside' : 'after' }
}

export function setSeo(doc: LandingDocument, seo: Partial<LandingDocument['seo']>): LandingDocument {
  return { ...doc, seo: { ...doc.seo, ...seo } }
}

// ---------------------------------------------------------------------------
// Arrastar e soltar: tudo vira um InsertTarget validado aqui, antes de tocar no documento.
// ---------------------------------------------------------------------------

/** O que está sendo arrastado: um bloco novo da biblioteca ou um bloco que já está na página. */
export type DragSource = { kind: 'new'; type: BlockType } | { kind: 'move'; id: string }

export function dragType(doc: LandingDocument, source: DragSource): BlockType | null {
  return source.kind === 'new' ? source.type : (findBlock(doc.blocks, source.id)?.block.type ?? null)
}

/**
 * Bloco que serve de referência para o que está sob o ponteiro.
 * Um bloco de raiz (seção) arrastado sobre um elemento se refere à seção que contém o elemento:
 * seções só trocam de lugar com seções.
 */
export function dropAnchor(doc: LandingDocument, source: DragSource, hoveredId: string): string | null {
  const type = dragType(doc, source)
  const hovered = findBlock(doc.blocks, hoveredId)
  if (!type || !hovered) return null
  if (isNestedBlockType(type)) return hovered.block.id
  return hovered.parent ? hovered.parent.id : hovered.block.id
}

/**
 * Destino de um arraste, ou null quando soltar ali não é permitido (a tela não mostra indicador).
 * `ratio` é a posição vertical do ponteiro dentro do bloco de referência (0 = topo, 1 = base).
 */
export function resolveDrop(doc: LandingDocument, source: DragSource, anchorId: string, ratio: number): InsertTarget | null {
  const type = dragType(doc, source)
  const anchor = findBlock(doc.blocks, anchorId)
  if (!type || !anchor) return null
  const half: InsertTarget['position'] = ratio < 0.5 ? 'before' : 'after'

  let target: InsertTarget
  if (isNestedBlockType(type)) {
    if (anchor.parent) {
      // Sobre outro elemento: antes ou depois dele.
      if (!canInsert(anchor.parent.type, type)) return null
      target = { refId: anchorId, position: half }
    } else if (canInsert(anchor.block.type, type)) {
      // Sobre uma seção contêiner (fora dos filhos): entra no fim dela.
      target = { refId: anchorId, position: 'inside' }
    } else if (source.kind === 'new') {
      // Bloco novo ao lado de uma seção pronta: o editor cria uma seção para recebê-lo.
      target = { refId: anchorId, position: half }
    } else {
      // Mover um elemento para fora de qualquer seção não é permitido.
      return null
    }
  } else {
    if (anchor.parent) return null
    target = { refId: anchorId, position: half }
  }

  if (source.kind === 'move') {
    // Soltar sobre si mesmo, ou exatamente onde já está, não é um movimento.
    if (source.id === target.refId) return null
    return moveBlockTo(doc, source.id, target) === doc ? null : target
  }
  return target
}

/**
 * Move um bloco existente para `target`. Estrutura inválida, destino inexistente ou movimento
 * que não muda nada: devolve o MESMO documento.
 */
export function moveBlockTo(doc: LandingDocument, id: string, target: InsertTarget): LandingDocument {
  const moving = findBlock(doc.blocks, id)
  const ref = findBlock(doc.blocks, target.refId)
  if (!moving || !ref || id === target.refId) return doc
  // O destino não pode estar dentro do próprio bloco que está sendo movido.
  if (findBlock(moving.block.children ?? [], target.refId)) return doc

  const parent = target.position === 'inside' ? ref.block : ref.parent
  if (!canInsert(parent?.type ?? null, moving.block.type)) return doc

  const without = removeBlock(doc, id)
  let index: number
  if (target.position === 'inside') {
    index = findBlock(without.blocks, ref.block.id)?.block.children?.length ?? 0
  } else {
    const refNow = findBlock(without.blocks, target.refId)
    if (!refNow) return doc
    index = refNow.index + (target.position === 'before' ? 0 : 1)
  }

  const sameParent = (moving.parent?.id ?? null) === (parent?.id ?? null)
  if (sameParent && index === moving.index) return doc
  const next = insertBlock(without, parent?.id ?? null, index, moving.block)
  return next === without ? doc : next
}
