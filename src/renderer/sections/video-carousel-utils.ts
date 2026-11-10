/**
 * Funções puras do carrossel de vídeos (seção "video-carousel"), separadas para teste.
 */

/** Índice circular: wrap(-1, 5) = 4. */
export function wrap(value: number, length: number): number {
  return ((value % length) + length) % length
}

const YOUTUBE_ID = /^[\w-]{11}$/

/**
 * Extrai o ID de um link do YouTube (watch, youtu.be, shorts ou embed).
 * Qualquer outro endereço devolve null: só YouTube é aceito como vídeo do carrossel.
 */
export function youtubeId(url: string | undefined): string | null {
  if (!url) return null
  try {
    const parsed = new URL(url.trim())
    if (parsed.protocol !== 'https:') return null
    const host = parsed.hostname.replace(/^(www|m)\./, '')
    let id: string | null = null
    if (host === 'youtu.be') id = parsed.pathname.slice(1).split('/')[0] ?? null
    else if (host === 'youtube.com' || host === 'youtube-nocookie.com') {
      if (parsed.pathname === '/watch') id = parsed.searchParams.get('v')
      else {
        const match = parsed.pathname.match(/^\/(shorts|embed|live)\/([^/?#]+)/)
        id = match?.[2] ?? null
      }
    }
    return id && YOUTUBE_ID.test(id) ? id : null
  } catch {
    return null
  }
}

/** Player sem cookies de rastreamento, carregado só quando o visitante pede o vídeo. */
export function youtubeEmbedUrl(url: string | undefined): string | null {
  const id = youtubeId(url)
  return id ? `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1` : null
}

/** Largura do cartão conforme o palco e o formato (pôster 2:3 ou largo 16:9). */
export function cardWidthFor(format: 'poster' | 'wide', stageWidth: number, stageHeight: number): number {
  if (format === 'poster') return Math.min(270, stageWidth * 0.58, Math.max(100, (stageHeight - 28) / 1.5))
  return Math.min(480, stageWidth * 0.72, Math.max(160, (stageHeight - 28) * (16 / 9)))
}

/** Posição 3D de um cartão a `offset` posições do cartão ativo (pode ser fracionário ao arrastar). */
export function cardTransform(offset: number, step: number): string {
  const abs = Math.abs(offset)
  const depth = Math.min(abs, 3)
  const angle = -Math.max(-42, Math.min(42, offset * 30))
  return `translate3d(${offset * step}px, 0, ${-depth * 130}px) rotateY(${angle}deg) scale(${1 - depth * 0.08})`
}

/**
 * Posições "virtuais" desenhadas em volta do índice atual (até 2 de cada lado + 1 escondida
 * em cada ponta). Os cartões das pontas são reciclados sem atravessar o baralho na volta.
 */
export function visibleSlots(index: number, length: number): { slots: number[]; before: number; after: number } {
  if (length <= 1) return { slots: [index], before: 0, after: 0 }
  const before = Math.min(2, Math.floor((length - 1) / 2))
  const after = Math.min(2, Math.ceil((length - 1) / 2))
  const slots = Array.from({ length: before + after + 3 }, (_, position) => index + position - before - 1)
  return { slots, before, after }
}
