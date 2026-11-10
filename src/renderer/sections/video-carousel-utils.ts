import type { VideoCardFormat } from '../types'

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

/**
 * Proporção (largura ÷ altura) e limites de largura de cada formato de cartão.
 * fraction = parte máxima da largura do palco (deixa os vizinhos aparecerem dos lados).
 */
export const cardFormats: Record<VideoCardFormat, { ratio: number; max: number; min: number; fraction: number }> = {
  poster: { ratio: 2 / 3, max: 270, min: 100, fraction: 0.58 },
  story: { ratio: 9 / 16, max: 240, min: 90, fraction: 0.5 },
  square: { ratio: 1, max: 340, min: 130, fraction: 0.62 },
  classic: { ratio: 4 / 3, max: 420, min: 150, fraction: 0.68 },
  wide: { ratio: 16 / 9, max: 480, min: 160, fraction: 0.72 },
}

/** Formato salvo no documento, ou pôster quando o valor é desconhecido (documento antigo ou inválido). */
export function cardFormat(format: unknown): VideoCardFormat {
  return typeof format === 'string' && format in cardFormats ? (format as VideoCardFormat) : 'poster'
}

/** Largura do cartão: cabe na altura do palco (menos a margem) sem passar dos limites do formato. */
export function cardWidthFor(format: VideoCardFormat, stageWidth: number, stageHeight: number): number {
  const f = cardFormats[cardFormat(format)]
  return Math.min(f.max, stageWidth * f.fraction, Math.max(f.min, (stageHeight - 28) * f.ratio))
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
