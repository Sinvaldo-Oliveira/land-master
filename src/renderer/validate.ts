import type { PageDocument } from './types'

/**
 * Verificação leve (sem Zod, para não pesar no bundle público) de um documento vindo do banco.
 * Garante o que o renderizador precisa para não quebrar nem injetar valores em estilos:
 * versão, cores hexadecimais, fontes/raio conhecidos e lista de seções.
 * A validação completa (todos os campos) é feita no painel antes de salvar.
 */
const HEX = /^#[0-9a-fA-F]{6}$/
const COLOR_KEYS = [
  'background', 'foreground', 'primary', 'primaryForeground', 'accent', 'accentForeground',
  'muted', 'mutedForeground', 'card', 'border', 'ring',
] as const

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function validColors(value: unknown): boolean {
  return isRecord(value) && COLOR_KEYS.every((key) => typeof value[key] === 'string' && HEX.test(value[key]))
}

export function isPageDocument(value: unknown): value is PageDocument {
  if (!isRecord(value) || value.schemaVersion !== 1) return false
  const { theme, sections, seo } = value
  if (!isRecord(seo) || typeof seo.title !== 'string' || typeof seo.description !== 'string') return false
  if (!isRecord(theme) || !validColors(theme.colors) || !validColors(theme.darkColors)) return false
  if (!isRecord(theme.fonts) || !['sora', 'plus-jakarta-sans'].includes(String(theme.fonts.heading))) return false
  if (!['sora', 'plus-jakarta-sans'].includes(String(theme.fonts.body))) return false
  if (!['sm', 'md', 'lg', 'xl'].includes(String(theme.radius))) return false
  if (!Array.isArray(sections)) return false
  return sections.every((s) => isRecord(s) && typeof s.id === 'string' && typeof s.type === 'string')
}
