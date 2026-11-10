import { useState, type CSSProperties, type PointerEvent } from 'react'

/** Inclinação máxima, em graus, em cada eixo. */
export const MAX_TILT = 10.5

/**
 * Efeito 3D que segue o mouse: o elemento inclina conforme a posição do ponteiro.
 * Só responde ao mouse (não ao toque) e só se o tema permitir movimento.
 * Quem usa deve aplicar `style` e `handlers` no mesmo elemento e colocar os
 * filhos com translateZ, para o efeito de profundidade.
 */
export function useTilt(enabled: boolean, options: { maxTilt?: number } = {}) {
  const maxTilt = options.maxTilt ?? MAX_TILT
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false, glareX: 50, glareY: 50 })

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    if (!enabled || event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: -py * 2 * maxTilt, y: px * 2 * maxTilt, active: true, glareX: (px + 0.5) * 100, glareY: (py + 0.5) * 100 })
  }
  const reset = () => setTilt((current) => ({ ...current, x: 0, y: 0, active: false }))

  const style: CSSProperties = {
    transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
    transformStyle: 'preserve-3d',
    transition: tilt.active ? 'transform 120ms linear' : 'transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  }

  return {
    style,
    handlers: { onPointerMove, onPointerLeave: reset },
    /** true enquanto o mouse está sobre o elemento (com efeito ativo). */
    active: tilt.active,
    /** Posição do ponteiro em % do elemento, para o reflexo de luz. */
    glare: { x: tilt.glareX, y: tilt.glareY },
  }
}
