import { z } from 'zod'

/** Mesma regra do banco (pages.slug): minúsculas, números e hífen simples, de 3 a 80 caracteres. */
export const SLUG_PATTERN = /^[a-z0-9]+(-[a-z0-9]+)*$/
export const SLUG_MIN = 3
export const SLUG_MAX = 80
export const TITLE_MAX = 120

/** Prefixo do endereço público das landing pages (decisão D-L1). */
export const PUBLIC_PREFIX = '/lp/'

/** "Promoção de Verão 2026!" → "promocao-de-verao-2026". */
export function slugify(text: string): string {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, SLUG_MAX)
    .replace(/-+$/, '')
}

/** Sugestão de endereço para uma cópia: acrescenta "-copia" respeitando o limite. */
export function copySlug(slug: string): string {
  const suffix = '-copia'
  return slug.slice(0, SLUG_MAX - suffix.length).replace(/-+$/, '') + suffix
}

export const pageMetaSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Dê um nome para a página.')
    .max(TITLE_MAX, `Use no máximo ${TITLE_MAX} caracteres.`),
  slug: z
    .string()
    .trim()
    .min(SLUG_MIN, `Use pelo menos ${SLUG_MIN} caracteres.`)
    .max(SLUG_MAX, `Use no máximo ${SLUG_MAX} caracteres.`)
    .regex(SLUG_PATTERN, 'Use só letras minúsculas, números e hífen (sem espaços nem acentos).'),
})

export type PageMetaValues = z.infer<typeof pageMetaSchema>
