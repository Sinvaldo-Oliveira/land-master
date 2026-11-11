import { X } from 'lucide-react'
import { Button } from '@/admin/ui'
import type { BlockType } from '@/renderer/document-v2'
import { blockDefinitions, groupLabels, groupOrder } from '../blocks/definitions'

/** Biblioteca de blocos: um clique insere o bloco na página (o destino é decidido pelo editor). */
export function BlockLibrary({
  onPick,
  insertHint,
  onCancelInsert,
}: {
  onPick: (type: BlockType) => void
  /** Aviso quando a pessoa pediu "inserir acima/abaixo" de um bloco. */
  insertHint: string | null
  onCancelInsert: () => void
}) {
  return (
    <div className="grid gap-5">
      {insertHint ? (
        <div role="status" className="flex items-start gap-2 rounded-admin-md border border-admin-accent/30 bg-admin-accent-soft p-3 text-admin-sm text-admin-ink">
          <p className="min-w-0 flex-1 break-words">{insertHint}</p>
          <Button variant="ghost" size="icon" aria-label="Cancelar inserção" className="-m-1 size-7 shrink-0" onClick={onCancelInsert}>
            <X aria-hidden="true" />
          </Button>
        </div>
      ) : null}

      {groupOrder.map((group) => (
        <section key={group} aria-label={groupLabels[group]}>
          <h3 className="font-admin-mono text-admin-xs tracking-wider text-admin-ink-3 uppercase">{groupLabels[group]}</h3>
          <ul className="mt-2 grid grid-cols-[minmax(0,1fr)] gap-1.5">
            {blockDefinitions
              .filter((definition) => definition.group === group)
              .map((definition) => (
                <li key={definition.type}>
                  <button
                    type="button"
                    onClick={() => onPick(definition.type)}
                    aria-label={`Adicionar ${definition.label}`}
                    className="flex w-full items-center gap-3 rounded-admin border border-admin-rule bg-admin-card px-3 py-2 text-left transition-colors duration-[120ms] hover:border-admin-accent hover:bg-admin-accent-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
                  >
                    <definition.icon aria-hidden="true" className="size-4 shrink-0 text-admin-ink-2" />
                    <span className="min-w-0">
                      <span className="block text-admin-sm font-medium text-admin-ink">{definition.label}</span>
                      <span className="block text-admin-xs break-words text-admin-ink-3">{definition.description}</span>
                    </span>
                  </button>
                </li>
              ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
