import { CircleHelp, FileText } from 'lucide-react'
import { cn } from '@/lib/cn'
import type { Block } from '@/renderer/document-v2'
import { blockLabel, blockSummary, definitionOf } from '../blocks/definitions'

const rowClass =
  'flex w-full items-center gap-2 rounded-admin px-2 py-1.5 text-left text-admin-sm transition-colors duration-[120ms] hover:bg-admin-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent aria-[current=true]:bg-admin-ink aria-[current=true]:text-white'

/** Árvore de camadas: a estrutura da página, na ordem em que aparece. Selecionar aqui seleciona no canvas. */
export function LayersPanel({
  blocks,
  selectedId,
  issueIds,
  onSelect,
}: {
  blocks: readonly Block[]
  selectedId: string | null
  /** Blocos com erro de validação (ganham um marcador). */
  issueIds: ReadonlySet<string>
  onSelect: (id: string | null) => void
}) {
  const renderRow = (block: Block, depth: number) => {
    const Icon = definitionOf(block.type)?.icon ?? CircleHelp
    const summary = blockSummary(block)
    const selected = block.id === selectedId
    return (
      <li key={block.id}>
        <button
          type="button"
          aria-current={selected}
          onClick={() => onSelect(block.id)}
          className={rowClass}
          style={{ paddingLeft: `${0.5 + depth * 1}rem` }}
        >
          <Icon aria-hidden="true" className="size-4 shrink-0 opacity-70" />
          <span className="min-w-0 flex-1">
            <span className="block truncate font-medium">{blockLabel(block)}</span>
            {summary ? <span className={cn('block truncate text-admin-xs', selected ? 'text-white/70' : 'text-admin-ink-3')}>{summary}</span> : null}
          </span>
          {issueIds.has(block.id) ? (
            <span className="size-2 shrink-0 rounded-full bg-admin-danger" title="Há campos a corrigir neste bloco">
              <span className="sr-only">Há campos a corrigir</span>
            </span>
          ) : null}
        </button>
        {block.children && block.children.length > 0 ? <ul className="grid grid-cols-[minmax(0,1fr)]">{block.children.map((child) => renderRow(child, depth + 1))}</ul> : null}
      </li>
    )
  }

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
