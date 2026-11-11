import type { PageDocument, Section, SiteTheme } from './types'

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

/**
 * Seções completas da v1 reaproveitadas como blocos-folha do nível raiz.
 * Os blocos primitivos (título, imagem, colunas…) entram na lista a partir da Etapa 2.
 */
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

export type SectionBlockType = (typeof SECTION_BLOCK_TYPES)[number]
export type BlockType = SectionBlockType

export type Block = {
  /** Estável e único no documento. */
  id: string
  type: BlockType
  /** Versão do esquema deste tipo de bloco. */
  v: number
  /** Conteúdo, validado pelo esquema do tipo. */
  props: Record<string, unknown>
  /** Só em contêineres (nenhum tipo atual aceita filhos). */
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
