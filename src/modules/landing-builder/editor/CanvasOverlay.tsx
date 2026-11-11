import { useDraggable } from '@dnd-kit/core'
import { ArrowDown, ArrowUp, Copy, GripVertical, Trash2 } from 'lucide-react'
import { useEffect, useState, type RefObject } from 'react'
import { cn } from '@/lib/cn'
import type { InsertTarget } from '../state/editor'
import { blockElement, frameOf, toPanelBox, type Box } from './canvas-geometry'
import type { BlockCommand } from './PropertiesPanel'
import type { DropState } from './useBlockDrag'

/**
 * Camada do painel desenhada POR CIMA do canvas: barra de ações do bloco selecionado e indicador de
 * onde o bloco arrastado vai cair. Fica fora do iframe de propósito: assim a alça de arrastar pertence
 * ao documento do painel (onde o arraste acontece) e nada do editor entra no HTML da página.
 */

/** Acompanha a posição do bloco selecionado dentro do canvas (rolagem, redimensionamento, edição). */
type Measured = Box & {
  /** Altura visível da área do canvas. */
  viewHeight: number
  /** Bordas esquerda e direita da página desenhada (o iframe), dentro da área do canvas. */
  frameLeft: number
  frameRight: number
}

function useBlockBox(canvasRef: RefObject<HTMLElement | null>, blockId: string | null, revision: unknown): Measured | null {
  const [box, setBox] = useState<Measured | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    let raf = 0
    const measure = () => {
      const frame = frameOf(canvas)
      const element = frame && blockId ? blockElement(frame, blockId) : null
      if (!canvas || !frame || !element) return setBox(null)
      const origin = canvas.getBoundingClientRect()
      const panel = toPanelBox(frame, element.getBoundingClientRect())
      const next: Measured = {
        left: panel.left - origin.left,
        top: panel.top - origin.top,
        width: panel.width,
        height: panel.height,
        viewHeight: origin.height,
        frameLeft: frame.rect.left - origin.left,
        frameRight: frame.rect.right - origin.left,
      }
      // Mesma medida: mantém o objeto anterior e evita renderizar de novo.
      setBox((current) => (current && (Object.keys(next) as (keyof Measured)[]).every((key) => current[key] === next[key]) ? current : next))
    }
    const schedule = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(measure)
    }
    schedule()

    const frame = frameOf(canvas)
    const view = frame?.iframe.contentWindow
    const body = frame?.iframe.contentDocument?.body
    view?.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', schedule)
    // Conteúdo que muda de altura depois (imagens, seções carregadas sob demanda) e mudança de dispositivo.
    const observer = new ResizeObserver(schedule)
    if (canvas) observer.observe(canvas)
    if (body) observer.observe(body)
    if (frame) observer.observe(frame.iframe)

    return () => {
      cancelAnimationFrame(raf)
      view?.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', schedule)
      observer.disconnect()
    }
  }, [canvasRef, blockId, revision])

  return box
}

const TOOLBAR_WIDTH = 30
const TOOLBAR_HEIGHT = 138
const GAP = 6

/**
 * A barra fica AO LADO do bloco, nunca em cima do vizinho: uma barra acima do bloco cobriria o bloco
 * anterior e roubaria o clique dele. Ordem de preferência: à direita, à esquerda e, sem espaço
 * (bloco de largura total), por dentro do canto superior direito.
 */
function toolbarPosition(box: Measured): { left: number; top: number } {
  const right = box.left + box.width
  const left =
    right + GAP + TOOLBAR_WIDTH <= box.frameRight
      ? right + GAP
      : box.left - GAP - TOOLBAR_WIDTH >= box.frameLeft
        ? box.left - GAP - TOOLBAR_WIDTH
        : right - GAP - TOOLBAR_WIDTH
  // Acompanha o topo do bloco, sem sair da área visível.
  const top = Math.min(Math.max(box.top, GAP), Math.max(GAP, box.viewHeight - TOOLBAR_HEIGHT - GAP))
  return { left, top }
}

export function SelectionToolbar({
  canvasRef,
  blockId,
  label,
  revision,
  canMoveUp,
  canMoveDown,
  hidden,
  onCommand,
}: {
  canvasRef: RefObject<HTMLElement | null>
  blockId: string
  label: string
  /** Muda a cada alteração do documento ou do dispositivo: força nova medição. */
  revision: unknown
  canMoveUp: boolean
  canMoveDown: boolean
  /** Durante um arraste a barra some para não cobrir o destino. */
  hidden: boolean
  onCommand: (command: BlockCommand) => void
}) {
  const box = useBlockBox(canvasRef, blockId, revision)
  const { setNodeRef, listeners } = useDraggable({ id: `handle:${blockId}`, data: { source: { kind: 'move', id: blockId } } })

  // Bloco fora da área visível do canvas: sem barra solta no meio da tela.
  if (!box || hidden || box.top + box.height < 0 || box.top > box.viewHeight) return null

  const { left, top } = toolbarPosition(box)
  const buttons: { command: BlockCommand; label: string; icon: typeof ArrowUp; disabled?: boolean }[] = [
    { command: 'up', label: 'Mover para cima', icon: ArrowUp, disabled: !canMoveUp },
    { command: 'down', label: 'Mover para baixo', icon: ArrowDown, disabled: !canMoveDown },
    { command: 'duplicate', label: 'Duplicar', icon: Copy },
    { command: 'delete', label: 'Excluir', icon: Trash2 },
  ]

  return (
    <div
      role="toolbar"
      aria-label={`Bloco selecionado: ${label}`}
      aria-orientation="vertical"
      className="absolute z-20 flex flex-col items-center gap-0.5 rounded-admin bg-[#2563eb] p-0.5 text-white shadow-admin-pop"
      style={{ top, left, width: TOOLBAR_WIDTH }}
    >
      <button
        ref={setNodeRef}
        type="button"
        {...listeners}
        aria-label={`Arrastar ${label}`}
        title="Arraste para mover"
        className="inline-flex size-6 cursor-grab touch-none items-center justify-center rounded-[4px] hover:bg-white/15 active:cursor-grabbing"
      >
        <GripVertical aria-hidden="true" className="size-3.5" />
      </button>
      {buttons.map(({ command, label: text, icon: Icon, disabled }) => (
        <button
          key={command}
          type="button"
          aria-label={text}
          title={text}
          disabled={disabled}
          onClick={() => onCommand(command)}
          className="inline-flex size-6 items-center justify-center rounded-[4px] hover:bg-white/15 disabled:opacity-40 disabled:hover:bg-transparent"
        >
          <Icon aria-hidden="true" className="size-3.5" />
        </button>
      ))}
    </div>
  )
}

const positionLabel: Record<InsertTarget['position'], string> = { before: 'antes', after: 'depois', inside: 'dentro' }

/** Linha (antes/depois) ou moldura (dentro) mostrando onde o bloco arrastado vai entrar. */
export function DropIndicator({ drop }: { drop: DropState | null }) {
  if (!drop || drop.zone !== 'canvas') return null

  // Página vazia: o canvas inteiro é o destino.
  if (!drop.target || !drop.box) {
    return <div data-drop-indicator="page" className="pointer-events-none absolute inset-3 z-10 rounded-admin-lg border-2 border-dashed border-[#2563eb] bg-[#2563eb]/5" />
  }

  const { position } = drop.target
  const { left, top } = drop.box
  return (
    <div
      data-drop-indicator={positionLabel[position]}
      className={cn(
        'pointer-events-none absolute z-10',
        position === 'inside' ? 'rounded-admin border-2 border-dashed border-[#2563eb] bg-[#2563eb]/10' : 'h-1 -translate-y-1/2 rounded-full bg-[#2563eb]',
      )}
      style={
        position === 'inside'
          ? { left, top, width: drop.box.width, height: drop.box.height }
          : { left, top: position === 'before' ? top : top + drop.box.height, width: drop.box.width }
      }
    />
  )
}
