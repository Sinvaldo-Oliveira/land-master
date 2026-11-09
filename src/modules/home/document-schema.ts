import { z } from 'zod'
import { safeHref } from '@/renderer/safe-href'
import type { PageDocument } from '@/renderer/types'

/**
 * Validação COMPLETA do PageDocument v1 no painel, antes de salvar ou publicar.
 * O site público faz só a checagem leve (src/renderer/validate.ts) para não carregar o Zod.
 */

const hex = z.string().regex(/^#[0-9a-fA-F]{6}$/, 'Use uma cor no formato #RRGGBB.')
const text = (label: string, max: number) =>
  z.string().trim().min(1, `${label}: preencha este campo.`).max(max, `${label}: use no máximo ${max} caracteres.`)
const optionalText = (label: string, max: number) =>
  z.string().trim().max(max, `${label}: use no máximo ${max} caracteres.`).optional()

const href = z
  .string()
  .trim()
  .min(1, 'Link: preencha o destino.')
  .refine((value) => value === '#' || safeHref(value) !== '#', 'Link inválido. Use #secao, /pagina, https://, mailto: ou tel:.')

/** Endereço https (ou vazio = sem mídia). */
const httpsOrEmpty = (label: string) =>
  z
    .string()
    .trim()
    .max(500, label + ': use no máximo 500 caracteres.')
    .refine((v) => v === '' || /^https:\/\/\S+$/.test(v), label + ': use um endereço que comece com https://.')

/** Posição ou tamanho em pixels do quadro de 1440×810. */
const framePx = (label: string, min: number, max: number) =>
  z
    .number()
    .int(label + ': use um número inteiro.')
    .min(min, label + ': mínimo ' + min + '.')
    .max(max, label + ': máximo ' + max + '.')

const link = z.object({ label: text('Texto do botão', 60), href })

const icon = z.enum([
  'layout', 'smartphone', 'search', 'life-buoy', 'palette', 'megaphone',
  'handshake', 'clock', 'shield', 'message', 'target', 'sparkles',
])
const tone = z.enum(['light', 'muted', 'dark'])
const anchor = z
  .string()
  .regex(/^[a-z][a-z0-9-]{1,40}$/, 'Âncora: use letras minúsculas, números e hífen.')
  .optional()

const base = { id: z.string().min(1), anchor, hidden: z.boolean().optional(), name: optionalText('Nome da seção', 60) }
const brand = z.object({ name: text('Nome da empresa', 60), tagline: optionalText('Slogan', 80) })

const colors = z.object({
  background: hex, foreground: hex, primary: hex, primaryForeground: hex, accent: hex, accentForeground: hex,
  muted: hex, mutedForeground: hex, card: hex, border: hex, ring: hex,
})

const section = z.discriminatedUnion('type', [
  z.object({ ...base, type: z.literal('site-header'), brand, links: z.array(link).max(7, 'Menu: no máximo 7 links.'), cta: link.optional() }),
  z.object({
    ...base,
    type: z.literal('hero'),
    imageUrl: z
      .string()
      .trim()
      .max(500, 'Endereço da imagem: use no máximo 500 caracteres.')
      .refine((v) => v === '' || /^https:\/\/\S+$/.test(v), 'Imagem: use um endereço que comece com https://.')
      .optional(),
    imageAlt: optionalText('Descrição da imagem', 160),
    imageSize: z.number().int().min(40, 'Tamanho da imagem: mínimo 40%.').max(100, 'Tamanho da imagem: máximo 100%.').optional(),
    tone,
    eyebrow: optionalText('Selo', 60),
    title: text('Título', 120),
    highlight: optionalText('Destaque do título', 60),
    subtitle: text('Subtítulo', 300),
    primary: link,
    secondary: link.optional(),
    points: z.array(z.object({ icon, label: text('Diferencial', 40) })).max(12, 'No máximo 12 diferenciais (2 linhas de 6).'),
  }),
  z.object({
    ...base,
    type: z.literal('features'),
    tone,
    eyebrow: optionalText('Selo', 60),
    title: text('Título', 100),
    subtitle: optionalText('Subtítulo', 240),
    items: z
      .array(z.object({ icon, title: text('Título do item', 60), description: text('Descrição do item', 220), link: link.optional() }))
      .min(1, 'Inclua pelo menos 1 item.')
      .max(9, 'No máximo 9 itens.'),
  }),
  z.object({
    ...base,
    type: z.literal('about'),
    tone,
    eyebrow: optionalText('Selo', 60),
    title: text('Título', 120),
    paragraphs: z.array(text('Parágrafo', 600)).min(1, 'Inclua pelo menos 1 parágrafo.').max(4, 'No máximo 4 parágrafos.'),
    bullets: z.array(text('Item da lista', 90)).max(8, 'No máximo 8 itens.'),
    cta: link.optional(),
    quote: optionalText('Frase em destaque', 240),
  }),
  z.object({
    ...base,
    type: z.literal('steps'),
    tone,
    eyebrow: optionalText('Selo', 60),
    title: text('Título', 100),
    subtitle: optionalText('Subtítulo', 240),
    items: z
      .array(z.object({ icon, title: text('Título da etapa', 50), description: text('Descrição da etapa', 200) }))
      .min(2, 'Inclua pelo menos 2 etapas.')
      .max(6, 'No máximo 6 etapas.'),
  }),
  z.object({
    ...base,
    type: z.literal('faq'),
    tone,
    eyebrow: optionalText('Selo', 60),
    title: text('Título', 100),
    subtitle: optionalText('Subtítulo', 240),
    items: z
      .array(z.object({ question: text('Pergunta', 160), answer: text('Resposta', 800) }))
      .min(1, 'Inclua pelo menos 1 pergunta.')
      .max(12, 'No máximo 12 perguntas.'),
  }),
  z.object({
    ...base,
    type: z.literal('cta'),
    title: text('Título', 100),
    subtitle: optionalText('Subtítulo', 240),
    primary: link,
    secondary: link.optional(),
  }),
  z.object({
    ...base,
    type: z.literal('contact'),
    tone,
    eyebrow: optionalText('Selo', 60),
    title: text('Título', 100),
    subtitle: optionalText('Subtítulo', 240),
    channels: z
      .array(
        z.object({
          kind: z.enum(['email', 'phone', 'whatsapp', 'address', 'hours']),
          label: text('Nome do canal', 40),
          value: text('Valor do canal', 160),
          href: href.optional(),
        }),
      )
      .max(6, 'No máximo 6 canais.'),
    primary: link.optional(),
  }),
  z.object({
    ...base,
    type: z.literal('image-card'),
    tone,
    title: text('Título', 60),
    subtitle: optionalText('Subtítulo', 120),
    imageUrl: z
      .string()
      .trim()
      .max(500, 'Endereço da imagem: use no máximo 500 caracteres.')
      .refine((v) => v === '' || /^https:\/\/\S+$/.test(v), 'Imagem: use um endereço que comece com https://.'),
    imageAlt: optionalText('Descrição da imagem', 160),
    action: link,
    corner: link.optional(),
  }),
  z.object({
    ...base,
    type: z.literal('interactive-hero'),
    eyebrow: optionalText('Selo', 40),
    title: text('Título', 40),
    subtitle: optionalText('Subtítulo', 120),
    captionLeft: optionalText('Legenda esquerda', 40),
    captionRight: optionalText('Legenda direita', 40),
    plateUrl: httpsOrEmpty('Imagem de fundo'),
    plateAlt: optionalText('Descrição da imagem de fundo', 160),
    clipUrl: httpsOrEmpty('Clipe'),
    clipX: framePx('Clipe: posição horizontal', 0, 1440),
    clipY: framePx('Clipe: posição vertical', 0, 810),
    clipW: framePx('Clipe: largura', 50, 1440),
    clipH: framePx('Clipe: altura', 50, 810),
    overlayUrl: httpsOrEmpty('Imagem do botão'),
    overlayX: framePx('Sobreposição: posição horizontal', 0, 1440),
    overlayY: framePx('Sobreposição: posição vertical', 0, 810),
    overlaySize: framePx('Sobreposição: tamanho', 50, 1000),
    buttonLabel: text('Texto do botão', 30),
    buttonX: framePx('Botão: posição horizontal', 0, 1440),
    buttonY: framePx('Botão: posição vertical', 0, 810),
    buttonSize: framePx('Botão: tamanho', 30, 200),
  }),
  z.object({
    ...base,
    type: z.literal('site-footer'),
    brand,
    description: text('Descrição', 240),
    columns: z
      .array(z.object({ title: text('Título da coluna', 40), links: z.array(link).max(8, 'No máximo 8 links por coluna.') }))
      .max(3, 'No máximo 3 colunas.'),
    legal: text('Texto legal', 160),
  }),
])

export const pageDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  seo: z.object({
    title: text('Título da página (SEO)', 70),
    description: text('Descrição da página (SEO)', 170),
  }),
  theme: z.object({
    preset: z.literal('horizonte'),
    colors,
    darkColors: colors,
    fonts: z.object({ heading: z.enum(['sora', 'plus-jakarta-sans']), body: z.enum(['sora', 'plus-jakarta-sans']) }),
    radius: z.enum(['sm', 'md', 'lg', 'xl']),
    motion: z.enum(['none', 'subtle']),
  }),
  sections: z.array(section).max(20),
}).superRefine((doc, ctx) => {
  // Regras que dependem de dois campos da mesma seção (o trecho precisa existir no título).
  doc.sections.forEach((s, index) => {
    if (s.type === 'hero' && s.highlight && !s.title.includes(s.highlight)) {
      ctx.addIssue({
        code: 'custom',
        path: ['sections', index, 'highlight'],
        message: 'Trecho do título em destaque: este trecho não aparece no título.',
      })
    }
  })
})

export type DocumentIssue = { sectionId: string | null; message: string }

/** Valida e devolve os problemas agrupados por seção (para o painel levar o usuário até o campo). */
export function validateDocument(doc: PageDocument): DocumentIssue[] {
  const result = pageDocumentSchema.safeParse(doc)
  if (result.success) return []
  return result.error.issues.map((issue) => {
    const [root, index] = issue.path
    const sectionId = root === 'sections' && typeof index === 'number' ? (doc.sections[index]?.id ?? null) : null
    return { sectionId, message: issue.message }
  })
}
