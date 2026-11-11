import { PointerSensor, useSensor, useSensors, type DragEndEvent, type DragMoveEvent, type DragStartEvent } from '@dnd-kit/core'
import { useCallback, useState, type RefObject } from 'react'
import type { LandingDocument } from '@/renderer/document-v2'
import { dropAnchor, resolveDrop, type DragSource, type InsertTarget } from '../state/editor'
import { blockElement, blockIdAt, containsPoint, frameOf, toFramePoint, toPanelBox, verticalRatio, type Box } from './canvas-geometry'

/**
 * Arrastar e soltar do editor. A biblioteca (dnd-kit) cuida do gesto: quando o arraste começa, quando
 * termina e do cartão que acompanha o ponteiro. O DESTINO é calculado aqui, a partir da posição do
 * ponteiro, e sempre passa por resolveDrop: a tela só oferece o que a regra de estrutura permite.
 */

export type DropState = {
  zone: 'canvas' | 'layers'
  /** null = fim da página (só para bloco novo em página vazia). */
  target: InsertTarget | null
  /** Onde desenhar o indicador no canvas, em relação ao canto da área do canvas. */
  box: Box | null
}

const AUTO_SCROLL_EDGE = 56
const AUTO_SCROLL_STEP = 28

function pointerOf(event: DragMoveEvent | DragEndEvent): { x: number; y: number } | null {
  const start = event.activatorEvent
  if (!(start instanceof MouseEvent)) return null
  return { x: start.clientX + event.delta.x, y: start.clientY + event.delta.y }
}

function hitLayers(doc: LandingDocument, source: DragSource, x: number, y: number): DropState | null {
  const row = document.elementFromPoint(x, y)?.closest<HTMLElement>('[data-layer-id]')
  const hoveredId = row?.dataset.layerId
  if (!hoveredId) return null
  const anchorId = dropAnchor(doc, source, hoveredId)
  const anchorRow = anchorId ? document.querySelector<HTMLElement>(`[data-layer-id="${CSS.escape(anchorId)}"]`) : null
  if (!anchorId || !anchorRow) return null
  const target = resolveDrop(doc, source, anchorId, verticalRatio(anchorRow.getBoundingClientRect(), y))
  return target ? { zone: 'layers', target, box: null } : null
}

function hitCanvas(doc: LandingDocument, source: DragSource, x: number, y: number, canvas: HTMLElement | null): DropState | null {
  const frame = frameOf(canvas)
  if (!frame || !containsPoint(frame.rect, x, y)) return null

  // Perto das bordas, rola a página do canvas para alcançar blocos fora da vista.
  const view = frame.iframe.contentWindow
  if (y - frame.rect.top < AUTO_SCROLL_EDGE) view?.scrollBy(0, -AUTO_SCROLL_STEP)
  else if (frame.rect.bottom - y < AUTO_SCROLL_EDGE) view?.scrollBy(0, AUTO_SCROLL_STEP)

  if (doc.blocks.length === 0) {
    // Página vazia: um bloco novo pode ser solto em qualquer ponto do canvas.
    return source.kind === 'new' ? { zone: 'canvas', target: null, box: null } : null
  }

  const point = toFramePoint(frame, x, y)
  // Área sem bloco (abaixo do conteúdo): vale como "depois do último bloco".
  const hoveredId = blockIdAt(frame, point.x, point.y) ?? doc.blocks.at(-1)?.id
  const anchorId = hoveredId ? dropAnchor(doc, source, hoveredId) : null
  const element = anchorId ? blockElement(frame, anchorId) : null
  if (!anchorId || !element) return null

  const rect = element.getBoundingClientRect()
  const target = resolveDrop(doc, source, anchorId, verticalRatio(rect, point.y))
  if (!target || !canvas) return null
  const origin = canvas.getBoundingClientRect()
  const panel = toPanelBox(frame, rect)
  return { zone: 'canvas', target, box: { ...panel, left: panel.left - origin.left, top: panel.top - origin.top } }
}

export function useBlockDrag({
  document: doc,
  canvasRef,
  onDrop,
}: {
  document: LandingDocument
  canvasRef: RefObject<HTMLElement | null>
  onDrop: (source: DragSource, target: InsertTarget | null) => void
}) {
  // Distância mínima: um clique simples continua sendo clique (inserir, selecionar).
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }))
  const [source, setSource] = useState<DragSource | null>(null)
  const [drop, setDrop] = useState<DropState | null>(null)

  const onDragStart = useCallback((event: DragStartEvent) => {
    setSource((event.active.data.current?.source as DragSource | undefined) ?? null)
    setDrop(null)
  }, [])

  const locate = useCallback(
    (event: DragMoveEvent | DragEndEvent): DropState | null => {
      const dragged = event.active.data.current?.source as DragSource | undefined
      const pointer = pointerOf(event)
      if (!dragged || !pointer) return null
      return hitLayers(doc, dragged, pointer.x, pointer.y) ?? hitCanvas(doc, dragged, pointer.x, pointer.y, canvasRef.current)
    },
    [doc, canvasRef],
  )

  const onDragMove = useCallback((event: DragMoveEvent) => setDrop(locate(event)), [locate])

  const finish = useCallback(() => {
    setSource(null)
    setDrop(null)
  }, [])

  const onDragEnd = useCallback(
    (event: DragEndEvent) => {
      const dragged = event.active.data.current?.source as DragSource | undefined
      // Recalcula no ponto exato em que a pessoa soltou (o último movimento pode estar defasado).
      const final = locate(event)
      finish()
      if (dragged && final) onDrop(dragged, final.target)
    },
    [finish, locate, onDrop],
  )

  return { sensors, source, drop, handlers: { onDragStart, onDragMove, onDragEnd, onDragCancel: finish } }
}
