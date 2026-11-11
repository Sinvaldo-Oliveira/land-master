import { useDraggable } from '@dnd-kit/core'
import { CircleHelp, FileText } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Block } from '@/renderer/document-v2'
import { blockLabel, blockSummary, definitionOf } from '../blocks/definitions'
import type { InsertTarget } from '../state/editor'

const rowClass =
  'flex w-full items-center gap-2 rounded-admin px-2 py-1.5 text-left text-admin-sm transition-colors duration-[120ms] hover:bg-admin-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent aria-[current=true]:bg-admin-ink aria-[current=true]:text-white'

/** Onde o bloco arrastado vai cair em relação a esta linha (a cor é fixa, igual à do canvas). */
const dropClass: Record<InsertTarget['position'], string> = {
  before: 'shadow-[inset_0_3px_0_0_#2563eb]',
  after: 'shadow-[inset_0_-3px_0_0_#2563eb]',
  inside: 'outline-2 -outline-offset-2 outline-dashed outline-[#2563eb]',
}

type RowProps = {
  block: Block
  depth: number
  selected: boolean
  hasIssue: boolean
  drop: InsertTarget['position'] | null
  onSelect: (id: string) => void
}

function LayerRow({ block, depth, selected, hasIssue, drop, onSelect }: RowProps) {
  const { setNodeRef, listeners, isDragging } = useDraggable({ id: `layer:${block.id}`, data: { source: { kind: 'move', id: block.id } } })
  const Icon = definitionOf(block.type)?.icon ?? CircleHelp
  const summary = blockSummary(block)
  return (
    <button
      ref={setNodeRef}
      type="button"
      {...listeners}
      data-layer-id={block.id}
      data-drop={drop ?? undefined}
      aria-current={selected}
      onClick={() => onSelect(block.id)}
      title="Clique para selecionar ou arraste para mover"
      className={cn(rowClass, 'touch-none', drop ? dropClass[drop] : null, isDragging && 'opacity-40')}
      style={{ paddingLeft: `${0.5 + depth}rem` }}
    >
      <Icon aria-hidden="true" className="size-4 shrink-0 opacity-70" />
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{blockLabel(block)}</span>
        {summary ? <span className={cn('block truncate text-admin-xs', selected ? 'text-white/70' : 'text-admin-ink-3')}>{summary}</span> : null}
      </span>
      {hasIssue ? (
        <span className="size-2 shrink-0 rounded-full bg-admin-danger" title="Há campos a corrigir neste bloco">
          <span className="sr-only">Há campos a corrigir</span>
        </span>
      ) : null}
    </button>
  )
}

/** Árvore de camadas: a estrutura da página, na ordem em que aparece. Selecionar aqui seleciona no canvas. */
export function LayersPanel({
  blocks,
  selectedId,
  issueIds,
  drop,
  onSelect,
}: {
  blocks: readonly Block[]
  selectedId: string | null
  /** Blocos com erro de validação (ganham um marcador). */
  issueIds: ReadonlySet<string>
  /** Destino do arraste em andamento, quando o ponteiro está sobre as camadas. */
  drop: InsertTarget | null
  onSelect: (id: string | null) => void
}) {
  const renderRow = (block: Block, depth: number) => (
    <li key={block.id}>
      <LayerRow
        block={block}
        depth={depth}
        selected={block.id === selectedId}
        hasIssue={issueIds.has(block.id)}
        drop={drop?.refId === block.id ? drop.position : null}
        onSelect={onSelect}
      />
      {block.children && block.children.length > 0 ? (
        <ul className="grid grid-cols-[minmax(0,1fr)]">{block.children.map((child) => renderRow(child, depth + 1))}</ul>
      ) : null}
    </li>
  )

  return (
    <nav aria-label="Camadas da página">
      <button type="button" aria-current={selectedId === null} onClick={() => onSelect(null)} className={rowClass}>
        <FileText aria-hidden="true" className="size-4 shrink-0 opacity-70" />
        <span className="font-medium">Página</span>
      </button>
      {blocks.length === 0 ? (
        <p className="px-2 py-3 text-admin-sm text-admin-ink-3">A página ainda não tem blocos. Escolha um na aba “Blocos”.</p>
      ) : (
        <ul className="mt-1 grid grid-cols-[minmax(0,1fr)]">{blocks.map((block) => renderRow(block, 0))}</ul>
      )}
    </nav>
  )
}
