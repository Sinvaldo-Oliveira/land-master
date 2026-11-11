import type { LinkItem, PageDocument, Section, SectionBackground, SectionText, SectionTone, SiteTheme } from './types'

/**
 * LandingDocument (PageDocument v2) — formato das landing pages: uma ÁRVORE de blocos.
 * A Home continua em v1 (lista plana de seções). Ver docs/ARQUITETURA_LANDING_BUILDER.md §3.
 *
 * Este arquivo não depende de Zod nem do painel: o site público também o usa.
 * A validação completa fica em src/modules/landing-builder/schema/document.ts.
 */

/** Limites conferidos no painel e no banco (assert_page_document). */
export const MAX_BLOCKS = 200
export const MAX_DEPTH = 4

/** Seções completas da v1 reaproveitadas como blocos-folha do nível raiz. */
export const SECTION_BLOCK_TYPES = [
  'site-header',
  'hero',
  'features',
  'about',
  'steps',
  'faq',
  'cta',
  'contact',
  'image-card',
  'interactive-hero',
  'video-carousel',
  'video-player',
  'site-footer',
] as const satisfies readonly Section['type'][]

/** Contêiner do nível raiz: uma faixa da página que recebe elementos. */
export const CONTAINER_BLOCK_TYPES = ['section'] as const

/** Elementos simples, sempre dentro de uma seção. Colunas e grade entram na Etapa 4. */
export const ELEMENT_BLOCK_TYPES = ['heading', 'paragraph', 'image', 'button', 'spacer', 'divider'] as const

export type SectionBlockType = (typeof SECTION_BLOCK_TYPES)[number]
export type ContainerBlockType = (typeof CONTAINER_BLOCK_TYPES)[number]
export type ElementBlockType = (typeof ELEMENT_BLOCK_TYPES)[number]
export type BlockType = SectionBlockType | ContainerBlockType | ElementBlockType

export const BLOCK_TYPES: readonly BlockType[] = [...SECTION_BLOCK_TYPES, ...CONTAINER_BLOCK_TYPES, ...ELEMENT_BLOCK_TYPES]

/** Conteúdo dos blocos primitivos (as seções completas usam os tipos da v1). */
export type SectionBlockProps = {
  tone: SectionTone
  width: 'narrow' | 'normal' | 'wide'
  align: 'left' | 'center'
  anchor?: string
  background?: SectionBackground
  text?: SectionText
}
export type HeadingProps = { text: string; level: 'h1' | 'h2' | 'h3' }
export type ParagraphProps = { text: string; size: 'md' | 'lg' }
export type ImageProps = { url: string; alt: string }
export type ButtonProps = { link: LinkItem; variant: 'primary' | 'secondary' }
export type SpacerProps = { size: 'sm' | 'md' | 'lg' | 'xl' }

export type Block = {
  /** Estável e único no documento. */
  id: string
  type: BlockType
  /** Versão do esquema deste tipo de bloco. */
  v: number
  /** Conteúdo, validado pelo esquema do tipo. */
  props: Record<string, unknown>
  /** Só em contêineres (ver canInsert). */
  children?: Block[]
}

export type LandingSeo = { title: string; description: string }

export type LandingDocument = {
  schemaVersion: 2
  seo: LandingSeo
  theme: SiteTheme
  blocks: Block[]
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

export function isSectionBlockType(type: unknown): type is SectionBlockType {
  return typeof type === 'string' && (SECTION_BLOCK_TYPES as readonly string[]).includes(type)
}

export function isBlockType(type: unknown): type is BlockType {
  return typeof type === 'string' && (BLOCK_TYPES as readonly string[]).includes(type)
}

export function isElementBlockType(type: unknown): type is ElementBlockType {
  return typeof type === 'string' && (ELEMENT_BLOCK_TYPES as readonly string[]).includes(type)
}

/** Tipos que vivem no nível raiz da página: seções completas e a seção contêiner. */
export function isRootBlockType(type: unknown): boolean {
  return isSectionBlockType(type) || type === 'section'
}

/**
 * Regra ÚNICA de estrutura (parent = null é o nível raiz). Inserir, colar, duplicar,
 * arrastar e a validação usam esta função; nenhuma tela decide estrutura por conta própria.
 */
export function canInsert(parent: BlockType | null, child: BlockType): boolean {
  if (parent === null) return isRootBlockType(child)
  if (parent === 'section') return isElementBlockType(child)
  return false
}

/** Total de blocos da árvore (todos os níveis). */
export function countBlocks(blocks: readonly Block[]): number {
  return blocks.reduce((total, block) => total + 1 + countBlocks(block.children ?? []), 0)
}

/** Profundidade da árvore: 0 = vazia, 1 = só blocos no nível raiz. */
export function treeDepth(blocks: readonly Block[]): number {
  return blocks.reduce((deepest, block) => Math.max(deepest, 1 + treeDepth(block.children ?? [])), 0)
}

/** Todos os ids, na ordem do documento (para checar duplicidade). */
export function blockIds(blocks: readonly Block[]): string[] {
  return blocks.flatMap((block) => [block.id, ...blockIds(block.children ?? [])])
}

/** Página em branco. O título de SEO nasce do nome da página, cortado no limite do campo. */
export function createEmptyLanding(title: string, theme: SiteTheme): LandingDocument {
  return {
    schemaVersion: 2,
    seo: { title: title.trim().slice(0, 70), description: '' },
    theme,
    blocks: [],
  }
}

/** Seção da v1 → bloco: `id` e `type` sobem para o bloco, o resto vira `props`. */
export function sectionToBlock(section: Section): Block {
  const { id, type, ...props } = section
  return { id, type, v: 1, props }
}

/** Bloco de seção completa → seção da v1, para o renderizador delegar aos componentes existentes. */
export function blockToSection(block: Block): Section | null {
  if (!isSectionBlockType(block.type)) return null
  return { ...block.props, id: block.id, type: block.type } as unknown as Section
}

function fromV1(doc: PageDocument): LandingDocument {
  return {
    schemaVersion: 2,
    seo: { title: doc.seo.title, description: doc.seo.description },
    theme: doc.theme,
    blocks: doc.sections.map(sectionToBlock),
  }
}

/**
 * Leva um documento de qualquer versão conhecida até a atual.
 * Devolve `null` quando o valor não é um documento (ou é de uma versão futura):
 * quem chama decide o que mostrar, nunca quebra a página.
 */
export function migrateDocument(value: unknown): LandingDocument | null {
  if (!isRecord(value)) return null
  if (value.schemaVersion === 2) {
    return Array.isArray(value.blocks) && isRecord(value.seo) && isRecord(value.theme)
      ? (value as unknown as LandingDocument)
      : null
  }
  if (value.schemaVersion === 1) {
    return Array.isArray(value.sections) && isRecord(value.seo) && isRecord(value.theme)
      ? fromV1(value as unknown as PageDocument)
      : null
  }
  return null
}
