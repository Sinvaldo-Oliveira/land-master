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
  STYLE_SPACING,
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
  identity: z.object({
    name: z.string().trim().min(1).max(60),
    logoUrl: z.string().trim().max(500).refine((v) => v === '' || /^https:\/\/\S+$/.test(v), 'Logo: use um endereço https://.'),
    faviconUrl: z.string().trim().max(500).refine((v) => v === '' || /^https:\/\/\S+$/.test(v), 'Favicon: use um endereço https://.'),
    whatsapp: z.string().trim().regex(/^\d{0,15}$/, 'WhatsApp: use somente números, com país e DDD.'),
  }),
  blocks: z.array(z.unknown()),
})

const blockShape = z.object({
  id: z.string().min(1).max(80),
  type: z.string().min(1),
  v: z.number().int().min(1),
  props: z.record(z.string(), z.unknown()),
  style: z.unknown().optional(),
  responsive: z.unknown().optional(),
  children: z.array(z.unknown()).optional(),
})

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #RRGGBB.')
const styleSchema = z.strictObject({
  textSize: z.enum(['xs', 'sm', 'md', 'lg', 'xl', '2xl', '3xl']).optional(),
  fontWeight: z.enum(['normal', 'medium', 'semibold', 'bold']).optional(),
  textAlign: z.enum(['left', 'center', 'right']).optional(),
  maxWidth: z.enum(['full', 'sm', 'md', 'lg', 'xl']).optional(),
  paddingX: z.union(STYLE_SPACING.map((value) => z.literal(value))).optional(),
  paddingY: z.union(STYLE_SPACING.map((value) => z.literal(value))).optional(),
  marginTop: z.union(STYLE_SPACING.map((value) => z.literal(value))).optional(),
  marginBottom: z.union(STYLE_SPACING.map((value) => z.literal(value))).optional(),
  gap: z.union(STYLE_SPACING.map((value) => z.literal(value))).optional(),
  color: hex.optional(), backgroundColor: hex.optional(), borderColor: hex.optional(),
  borderWidth: z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(4)]).optional(),
  radius: z.enum(['none', 'sm', 'md', 'lg', 'xl', 'full']).optional(),
  shadow: z.enum(['none', 'sm', 'md', 'lg']).optional(),
})
const responsiveSchema = z.strictObject({
  tablet: styleSchema.partial().optional(), mobile: styleSchema.partial().optional(),
  hideOn: z.array(z.enum(['desktop', 'tablet', 'mobile'])).max(3).optional(),
})

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
  columns: z.strictObject({ proportions: z.enum(['1', '1-1', '1-2', '2-1', '1-1-1', '1-1-1-1']), stackOnMobile: z.enum(['stack', 'keep']) }),
  grid: z.strictObject({ columns: z.union([z.literal(2), z.literal(3), z.literal(4)]) }),
  column: z.strictObject({}),
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
  list: z.strictObject({ items: z.array(z.string().trim().min(1).max(200)).min(1).max(20), ordered: z.enum(['bullets', 'numbers']) }),
  badge: z.strictObject({ text: z.string().trim().min(1).max(60), tone: z.enum(['primary', 'accent', 'neutral']) }),
  icon: z.strictObject({ name: z.enum(['layout','smartphone','search','life-buoy','palette','megaphone','handshake','clock','shield','message','target','sparkles']), label: z.string().trim().max(80) }),
  video: z.strictObject({ url: z.string().trim().max(500).refine((v) => v === '' || /^https:\/\/\S+$/.test(v), 'Vídeo: use um endereço https://.'), poster: z.string().trim().max(500).refine((v) => v === '' || /^https:\/\/\S+$/.test(v), 'Capa: use um endereço https://.'), captions: z.string().trim().max(500).refine((v) => v === '' || /^https:\/\/\S+$/.test(v), 'Legendas: use um endereço https://.'), label: z.string().trim().min(1).max(160) }),
  'whatsapp-button': z.strictObject({ label: z.string().trim().min(1).max(60), phone: z.string().trim().regex(/^\d{8,15}$/, 'WhatsApp: use somente números, com país e DDD.'), message: z.string().trim().max(500) }),
  'benefit-list': z.strictObject({ items: z.array(z.string().trim().min(1).max(160)).min(1).max(20) }),
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
  const style = styleSchema.safeParse(block.style ?? {})
  if (!style.success) for (const issue of style.error.issues) issues.push({ blockId: block.id, message: issue.message })
  const responsive = responsiveSchema.safeParse(block.responsive ?? {})
  if (!responsive.success) for (const issue of responsive.error.issues) issues.push({ blockId: block.id, message: issue.message })

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

  if (children.length > 0 && !['section', 'columns', 'grid', 'column'].includes(block.type)) {
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
