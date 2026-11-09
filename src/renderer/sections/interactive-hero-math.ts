/**
 * Cálculos do hero interativo (seção "interactive-hero"), separados para teste.
 * O clipe de vídeo nunca é reproduzido: o tempo dele é "arrastado" pela posição do mouse.
 */

/** Faixa horizontal do quadro que percorre o clipe inteiro (14% a 86%). */
export const POINTER_START = 0.14
export const POINTER_END = 0.86
/** Quanto do caminho até o alvo é percorrido a cada quadro de animação. */
export const EASE = 0.14
/** Depois desse tempo sem mover o mouse, o olhar passa a oscilar sozinho. */
export const IDLE_AFTER_MS = 3500
/** Amplitude da oscilação automática em torno do meio do clipe (±32%). */
export const IDLE_AMPLITUDE = 0.32
/** Suavização do anel do cursor (fração do caminho por quadro). */
export const RING_EASE = 0.55

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

/** Posição do mouse no quadro (0 = borda esquerda, 1 = direita) → posição no clipe (0 a 1). */
export function pointerToClip(ratio: number): number {
  return clamp01((ratio - POINTER_START) / (POINTER_END - POINTER_START))
}

/** Alvo da oscilação automática, a partir do tempo parado além do limite (ms). */
export function idleTarget(msSinceIdleStart: number): number {
  return 0.5 + IDLE_AMPLITUDE * Math.sin((msSinceIdleStart / 1000) * 0.9)
}

/** Aproxima `current` de `target` por uma fração `factor` da distância. */
export function approach(current: number, target: number, factor: number): number {
  return current + (target - current) * factor
}
