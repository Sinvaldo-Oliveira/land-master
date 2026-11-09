/**
 * Links vindos do documento da página são dados (editáveis no painel), nunca confiáveis.
 * Aceita somente: âncora (#secao), caminho interno (/rota), https:, mailto: e tel:.
 * Qualquer outro esquema (javascript:, data:, http:, //host) vira "#".
 */
export function safeHref(raw: string): string {
  const href = raw.trim()
  if (/^#[A-Za-z][\w-]*$/.test(href)) return href
  if (/^\/(?!\/)[\w\-./?=&%#]*$/.test(href)) return href
  if (/^mailto:[^\s<>"']+@[^\s<>"']+$/i.test(href)) return href
  if (/^tel:\+?[\d\s()-]{6,20}$/i.test(href)) return href
  try {
    const url = new URL(href)
    if (url.protocol === 'https:') return url.toString()
  } catch {
    // inválido → cai no retorno seguro
  }
  return '#'
}

/** Links externos abrem em nova aba com rel seguro. */
export function isExternal(href: string): boolean {
  return href.startsWith('https:')
}

/**
 * Divide o título para destacar um trecho sem usar HTML.
 * Retorna [antes, destaque, depois]; sem destaque válido, tudo fica em "antes".
 */
export function splitHighlight(title: string, highlight?: string): [string, string, string] {
  if (!highlight) return [title, '', '']
  const index = title.indexOf(highlight)
  if (index === -1) return [title, '', '']
  return [title.slice(0, index), highlight, title.slice(index + highlight.length)]
}
