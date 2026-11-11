import { z } from 'zod'
import { sectionSchema, themeSchema } from '@/modules/home/document-schema'
import {
  blockIds,
  countBlocks,
  isSectionBlockType,
  MAX_BLOCKS,
  MAX_DEPTH,
  migrateDocument,
  treeDepth,
  type Block,
  type LandingDocument,
} from '@/renderer/document-v2'

/**
 * Validação COMPLETA do LandingDocument (v2) no painel, antes de criar ou salvar.
 * O banco repete as checagens estruturais (versão, limites) em assert_page_document.
 */

const envelopeSchema = z.object({
  schemaVersion: z.literal(2),
  seo: z.object({
    title: z
      .string()
      .trim()
      .min(1, 'Título da página (SEO): preencha este campo.')
      .max(70, 'Título da página (SEO): use no máximo 70 caracteres.'),
    // Pode ficar vazia no rascunho; a publicação (Etapa 7) é que exige.
    description: z.string().trim().max(170, 'Descrição da página (SEO): use no máximo 170 caracteres.'),
  }),
  theme: themeSchema,
  blocks: z.array(z.unknown()),
})

const blockShape = z.object({
  id: z.string().min(1).max(80),
  type: z.string().min(1),
  v: z.number().int().min(1),
  props: z.record(z.string(), z.unknown()),
  children: z.array(z.unknown()).optional(),
})

export type LandingIssue = { blockId: string | null; message: string }

function blockIssues(value: unknown, issues: LandingIssue[]): void {
  const shape = blockShape.safeParse(value)
  if (!shape.success) {
    issues.push({ blockId: null, message: 'Bloco com formato inválido.' })
    return
  }
  const block = shape.data
  const children = block.children ?? []

  if (!isSectionBlockType(block.type)) {
    issues.push({ blockId: block.id, message: `Tipo de bloco desconhecido: "${block.type}".` })
  } else {
    // Seção completa: mesmas regras da Home. É um bloco-folha.
    const parsed = sectionSchema.safeParse({ ...block.props, id: block.id, type: block.type })
    if (!parsed.success) {
      for (const issue of parsed.error.issues) issues.push({ blockId: block.id, message: issue.message })
    }
    if (children.length > 0) {
      issues.push({ blockId: block.id, message: 'Este tipo de bloco não aceita blocos dentro dele.' })
    }
  }
  for (const child of children) blockIssues(child, issues)
}

/** Valida e devolve os problemas, cada um com o bloco de origem quando houver. Lista vazia = válido. */
export function validateLandingDocument(value: unknown): LandingIssue[] {
  const envelope = envelopeSchema.safeParse(value)
  if (!envelope.success) {
    return envelope.error.issues.map((issue) => ({ blockId: null, message: issue.message }))
  }

  const issues: LandingIssue[] = []
  const blocks = envelope.data.blocks as Block[]
  for (const block of blocks) blockIssues(block, issues)
  // Com algum bloco malformado, contar e medir a árvore não é confiável.
  if (issues.some((issue) => issue.message === 'Bloco com formato inválido.')) return issues

  if (countBlocks(blocks) > MAX_BLOCKS) {
    issues.push({ blockId: null, message: `A página passou do limite de ${MAX_BLOCKS} blocos.` })
  }
  if (treeDepth(blocks) > MAX_DEPTH) {
    issues.push({ blockId: null, message: `A página passou do limite de ${MAX_DEPTH} níveis de blocos.` })
  }
  const seen = new Set<string>()
  for (const id of blockIds(blocks)) {
    if (seen.has(id)) issues.push({ blockId: id, message: 'Dois blocos estão com o mesmo identificador.' })
    seen.add(id)
  }
  return issues
}

/**
 * Lê um documento vindo do banco: migra para a versão atual e valida.
 * `document` é null quando o valor não pode ser aberto (formato desconhecido ou versão futura).
 */
export function parseLandingDocument(value: unknown): { document: LandingDocument | null; issues: LandingIssue[] } {
  const document = migrateDocument(value)
  if (!document) {
    return { document: null, issues: [{ blockId: null, message: 'Este documento não pode ser aberto por esta versão do painel.' }] }
  }
  return { document, issues: validateLandingDocument(document) }
}
