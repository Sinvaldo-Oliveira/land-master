/*
 * Rede de partículas do "Hero interativo 02". Funções puras (sem DOM): o componente só desenha.
 * Unidades em pixels CSS da seção (o canvas multiplica pelo devicePixelRatio na hora de desenhar).
 */

export type Particle = { x: number; y: number; vx: number; vy: number; r: number }
export type Pointer = { x: number; y: number } | null
export type Density = 'low' | 'medium' | 'high'

/** Área (px²) por partícula e teto, por densidade. O teto mantém o laço de ligações leve (n² / 2 pares). */
const DENSITY: Record<Density, { area: number; max: number }> = {
  low: { area: 16000, max: 70 },
  medium: { area: 10000, max: 120 },
  high: { area: 6500, max: 170 },
}

/** Distância máxima (px) para ligar duas partículas com uma linha. */
export const LINK_DISTANCE = 130
/** Raio (px) em que o mouse afasta as partículas e clareia as linhas. */
export const POINTER_RADIUS = 170
/** Empurrão máximo por quadro (px) bem embaixo do mouse. */
const PUSH = 4
/** Velocidade máxima de deriva (px por quadro). */
const DRIFT = 0.25

export function particleCount(width: number, height: number, density: Density): number {
  if (width <= 0 || height <= 0) return 0
  const { area, max } = DENSITY[density] ?? DENSITY.medium
  return Math.min(max, Math.max(12, Math.round((width * height) / area)))
}

export function createParticles(width: number, height: number, density: Density, random: () => number = Math.random): Particle[] {
  return Array.from({ length: particleCount(width, height, density) }, () => ({
    x: random() * width,
    y: random() * height,
    vx: (random() * 2 - 1) * DRIFT,
    vy: (random() * 2 - 1) * DRIFT,
    r: 1 + random() * 1.8,
  }))
}

/** Avança um quadro: deriva, afasta do mouse e quica nas bordas (sempre termina dentro da área). */
export function stepParticles(particles: Particle[], width: number, height: number, pointer: Pointer): void {
  for (const p of particles) {
    if (pointer) {
      const dx = p.x - pointer.x
      const dy = p.y - pointer.y
      const distance = Math.hypot(dx, dy)
      if (distance > 0 && distance < POINTER_RADIUS) {
        const force = (1 - distance / POINTER_RADIUS) * PUSH
        p.x += (dx / distance) * force
        p.y += (dy / distance) * force
      }
    }
    p.x += p.vx
    p.y += p.vy
    if (p.x < 0 || p.x > width) {
      p.vx = -p.vx
      p.x = Math.min(width, Math.max(0, p.x))
    }
    if (p.y < 0 || p.y > height) {
      p.vy = -p.vy
      p.y = Math.min(height, Math.max(0, p.y))
    }
  }
}

/** Opacidade da linha entre duas partículas a `distance` px: 1 encostadas, 0 a partir de LINK_DISTANCE. */
export function linkAlpha(distance: number): number {
  if (distance >= LINK_DISTANCE) return 0
  return Math.max(0, 1 - distance / LINK_DISTANCE) * 0.9
}

/** "#rrggbb" → "r, g, b" para montar rgba() no canvas. Cor inválida cai na cor padrão. */
export function rgbTriplet(hex: string, fallback = '191, 128, 255'): string {
  const match = /^#([0-9a-f]{6})$/i.exec(hex.trim())
  if (!match?.[1]) return fallback
  const value = Number.parseInt(match[1], 16)
  return `${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}`
}
