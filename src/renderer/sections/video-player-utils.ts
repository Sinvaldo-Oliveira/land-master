/** Funções puras do player de vídeo de vendas (seção "video-player"), separadas para teste. */

/** 75 → "1:15"; 3725 → "1:02:05". */
export function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00'
  const total = Math.floor(seconds)
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = String(total % 60).padStart(2, '0')
  return h > 0 ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`
}

/**
 * Só endereços https chegam ao <video>, à legenda e ao CSS da capa (o documento é dado editável).
 * Sem aspas, parênteses ou barra invertida: a capa vai num url("…") e não pode escapar dele.
 */
export function httpsOnly(value: string | undefined): string {
  const v = value?.trim() ?? ''
  return /^https:\/\/[^\s"'()\\]+$/.test(v) ? v : ''
}
