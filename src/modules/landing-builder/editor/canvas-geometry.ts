/**
 * Geometria do canvas: o site é desenhado dentro de um iframe reduzido em escala (transform),
 * então todo ponto precisa ser convertido entre as coordenadas do painel e as do iframe.
 * Funções puras de conversão + leitura do DOM do iframe.
 */

export type Box = { left: number; top: number; width: number; height: number }

export type Frame = {
  iframe: HTMLIFrameElement
  /** Posição do iframe na janela do painel, já com a escala aplicada. */
  rect: DOMRect
  /** 1 = tamanho real; 0,5 = metade. */
  scale: number
}

export function frameOf(container: HTMLElement | null): Frame | null {
  const iframe = container?.querySelector('iframe')
  if (!iframe?.contentDocument || iframe.offsetWidth === 0) return null
  const rect = iframe.getBoundingClientRect()
  return { iframe, rect, scale: rect.width / iframe.offsetWidth }
}

/** Ponto da janela do painel → ponto dentro do iframe. */
export function toFramePoint(frame: Pick<Frame, 'rect' | 'scale'>, x: number, y: number): { x: number; y: number } {
  return { x: (x - frame.rect.left) / frame.scale, y: (y - frame.rect.top) / frame.scale }
}

/** Retângulo dentro do iframe → retângulo na janela do painel. */
export function toPanelBox(frame: Pick<Frame, 'rect' | 'scale'>, box: Box): Box {
  return {
    left: frame.rect.left + box.left * frame.scale,
    top: frame.rect.top + box.top * frame.scale,
    width: box.width * frame.scale,
    height: box.height * frame.scale,
  }
}

export function containsPoint(rect: Pick<DOMRect, 'left' | 'top' | 'right' | 'bottom'>, x: number, y: number): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom
}

/** Posição vertical do ponto dentro do retângulo: 0 = topo, 1 = base (pode passar dos limites). */
export function verticalRatio(box: Pick<Box, 'top' | 'height'>, y: number): number {
  return box.height > 0 ? (y - box.top) / box.height : 0.5
}

export function blockElement(frame: Frame, blockId: string): HTMLElement | null {
  return frame.iframe.contentDocument?.querySelector<HTMLElement>(`[data-block-id="${CSS.escape(blockId)}"]`) ?? null
}

/** Id do bloco mais interno sob um ponto do iframe, ou null em área sem bloco. */
export function blockIdAt(frame: Frame, x: number, y: number): string | null {
  const element = frame.iframe.contentDocument?.elementFromPoint(x, y)
  return element?.closest<HTMLElement>('[data-block-id]')?.dataset.blockId ?? null
}
