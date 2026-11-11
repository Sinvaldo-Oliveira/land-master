import { z } from 'zod'
import { sectionSchema, themeSchema } from '@/modules/home/document-schema'
import { safeHref } from '@/renderer/safe-href'
import {
  blockIds,
  canInsert,
  countBlocks,
  isBlockType,
  isSectionBlockType,
  MAX_BLOCKS,
  MAX_DEPTH,
  migrateDocument,
  treeDepth,
  type Block,
  type BlockType,
  type ContainerBlockType,
  type ElementBlockType,
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

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #RRGGBB.')

/** Conteúdo dos blocos primitivos. Objetos estritos: chave desconhecida é erro, não é ignorada. */
const primitiveSchemas: Record<ContainerBlockType | ElementBlockType, z.ZodType> = {
  section: z.strictObject({
    tone: z.enum(['light', 'muted', 'dark']),
    width: z.enum(['narrow', 'normal', 'wide']),
    align: z.enum(['left', 'center']),
    anchor: z
      .string()
      .regex(/^[a-z][a-z0-9-]{1,40}$/, 'Âncora: use letras minúsculas, números e hífen.')
      .optional(),
    background: z
      .object({
        mode: z.enum(['solid', 'gradient']),
        colors: z.array(hex).min(1, 'Fundo da seção: escolha uma cor.').max(3, 'Degradê: no máximo 3 cores.'),
        direction: z.enum(['to-bottom', 'to-right', 'to-bottom-right', 'to-top-right', 'radial']).optional(),
      })
      .refine((b) => b.mode === 'solid' || b.colors.length >= 2, 'Degradê: escolha pelo menos 2 cores.')
      .optional(),
    text: z.object({ foreground: hex, muted: hex, primary: hex, accent: hex }).optional(),
  }),
  heading: z.strictObject({
    text: z.string().trim().min(1, 'Título: preencha o texto.').max(160, 'Título: use no máximo 160 caracteres.'),
    level: z.enum(['h1', 'h2', 'h3']),
  }),
  paragraph: z.strictObject({
    text: z.string().trim().min(1, 'Parágrafo: preencha o texto.').max(2000, 'Parágrafo: use no máximo 2000 caracteres.'),
    size: z.enum(['md', 'lg']),
  }),
  image: z.strictObject({
    // Vazio = ainda sem imagem (o site não desenha nada).
    url: z
      .string()
      .trim()
      .max(500, 'Imagem: use no máximo 500 caracteres.')
      .refine((v) => v === '' || /^https:\/\/\S+$/.test(v), 'Imagem: use um endereço que comece com https://.'),
    alt: z.string().trim().max(160, 'Descrição da imagem: use no máximo 160 caracteres.'),
  }),
  button: z.strictObject({
    link: z.strictObject({
      label: z.string().trim().min(1, 'Botão: preencha o texto.').max(60, 'Botão: use no máximo 60 caracteres.'),
      href: z
        .string()
        .trim()
        .min(1, 'Botão: preencha o destino do link.')
        .refine((v) => v === '#' || safeHref(v) !== '#', 'Link inválido. Use #secao, /pagina, https://, mailto: ou tel:.'),
    }),
    variant: z.enum(['primary', 'secondary']),
  }),
  spacer: z.strictObject({ size: z.enum(['sm', 'md', 'lg', 'xl']) }),
  divider: z.strictObject({}),
}

export type LandingIssue = { blockId: string | null; message: string }

function blockIssues(value: unknown, parent: BlockType | null, issues: LandingIssue[]): void {
  const shape = blockShape.safeParse(value)
  if (!shape.success) {
    issues.push({ blockId: null, message: 'Bloco com formato inválido.' })
    return
  }
  const block = shape.data
  const children = block.children ?? []

  if (!isBlockType(block.type)) {
    issues.push({ blockId: block.id, message: `Tipo de bloco desconhecido: "${block.type}".` })
    // Sem saber o tipo, não há regra para os filhos: só confere o formato deles.
    for (const child of children) blockIssues(child, null, issues)
    return
  }

  if (!canInsert(parent, block.type)) {
    issues.push({
      blockId: block.id,
      message: parent === null ? 'Este bloco precisa ficar dentro de uma seção.' : 'Este bloco não pode ficar dentro do bloco atual.',
    })
  }

  // Seção completa: mesmas regras da Home. Primitivo: esquema próprio do tipo.
  const parsed = isSectionBlockType(block.type)
    ? sectionSchema.safeParse({ ...block.props, id: block.id, type: block.type })
    : primitiveSchemas[block.type].safeParse(block.props)
  if (!parsed.success) {
    for (const issue of parsed.error.issues) issues.push({ blockId: block.id, message: issue.message })
  }

  if (children.length > 0 && block.type !== 'section') {
    issues.push({ blockId: block.id, message: 'Este tipo de bloco não aceita blocos dentro dele.' })
  }
  for (const child of children) blockIssues(child, block.type, issues)
}

/** Valida e devolve os problemas, cada um com o bloco de origem quando houver. Lista vazia = válido. */
export function validateLandingDocument(value: unknown): LandingIssue[] {
  const envelope = envelopeSchema.safeParse(value)
  if (!envelope.success) {
    return envelope.error.issues.map((issue) => ({ blockId: null, message: issue.message }))
  }

  const issues: LandingIssue[] = []
  const blocks = envelope.data.blocks as Block[]
  for (const block of blocks) blockIssues(block, null, issues)
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
