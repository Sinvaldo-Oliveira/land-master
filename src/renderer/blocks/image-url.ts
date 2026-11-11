/** Só endereços https viram imagem (o documento é dado editável). */
export function imageUrl(value: unknown): string | null {
  const url = typeof value === 'string' ? value.trim() : ''
  return /^https:\/\/\S+$/.test(url) ? url : null
}
