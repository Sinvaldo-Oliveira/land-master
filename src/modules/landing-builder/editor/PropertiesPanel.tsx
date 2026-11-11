import { ArrowDown, ArrowUp, CircleHelp, Copy, ListEnd, ListStart, Trash2 } from 'lucide-react'
import { Button, Tooltip } from '@/admin/ui'
import { FieldsEditor } from '@/modules/home/FieldsEditor'
import type { Block, LandingDocument } from '@/renderer/document-v2'
import { blockLabel, definitionOf } from '../blocks/definitions'
import { PUBLIC_PREFIX } from '../schema/page-meta'

export type BlockCommand = 'up' | 'down' | 'duplicate' | 'delete' | 'insert-before' | 'insert-after'

type Data = Record<string, unknown>

/** Painel de propriedades (aba Conteúdo): campos do bloco selecionado, ou os dados da página. */
export function PropertiesPanel({
  document: doc,
  block,
  slug,
  canMoveUp,
  canMoveDown,
  onChangeProps,
  onChangeSeo,
  onCommand,
}: {
  document: LandingDocument
  block: Block | null
  slug: string
  canMoveUp: boolean
  canMoveDown: boolean
  onChangeProps: (id: string, props: Data) => void
  onChangeSeo: (seo: LandingDocument['seo']) => void
  onCommand: (command: BlockCommand) => void
}) {
  if (!block) {
    return (
      <div className="grid gap-5">
        <header>
          <h2 className="font-admin-display text-admin-lg font-semibold text-admin-ink">Página</h2>
          <p className="mt-0.5 font-admin-mono text-admin-sm break-all text-admin-ink-2">
            {PUBLIC_PREFIX}
            {slug}
          </p>
        </header>
        <FieldsEditor
          idPrefix="page-seo"
          value={doc.seo}
          onChange={(next) => onChangeSeo(next as LandingDocument['seo'])}
          fields={[
            { kind: 'text', key: 'title', label: 'Título da página (SEO)', max: 70, hint: 'Aparece na aba do navegador e no Google.' },
            {
              kind: 'textarea',
              key: 'description',
              label: 'Descrição da página (SEO)',
              max: 170,
              optional: true,
              rows: 3,
              hint: 'Resumo que aparece no Google. Será obrigatória para publicar.',
            },
          ]}
        />
        <p className="text-admin-sm text-admin-ink-3">Selecione um bloco no canvas ou nas camadas para editar o conteúdo dele.</p>
      </div>
    )
  }

  const definition = definitionOf(block.type)
  const Icon = definition?.icon ?? CircleHelp
  const commands: { command: BlockCommand; label: string; icon: typeof ArrowUp; disabled?: boolean; danger?: boolean }[] = [
    { command: 'up', label: 'Mover para cima', icon: ArrowUp, disabled: !canMoveUp },
    { command: 'down', label: 'Mover para baixo', icon: ArrowDown, disabled: !canMoveDown },
    { command: 'insert-before', label: 'Inserir bloco acima', icon: ListStart },
    { command: 'insert-after', label: 'Inserir bloco abaixo', icon: ListEnd },
    { command: 'duplicate', label: 'Duplicar', icon: Copy },
    { command: 'delete', label: 'Excluir', icon: Trash2, danger: true },
  ]

  return (
    <div className="grid gap-5">
      <header className="grid gap-3">
        <h2 className="flex items-center gap-2 font-admin-display text-admin-lg font-semibold text-admin-ink">
          <Icon aria-hidden="true" className="size-4 shrink-0 text-admin-ink-2" />
          <span className="min-w-0 break-words">{blockLabel(block)}</span>
        </h2>
        <div role="toolbar" aria-label="Ações do bloco" className="flex flex-wrap gap-1">
          {commands.map(({ command, label, icon: CommandIcon, disabled, danger }) => (
            <Tooltip key={command} content={label}>
              <Button
                variant="secondary"
                size="icon"
                aria-label={label}
                disabled={disabled}
                className={danger ? 'size-8 text-admin-danger' : 'size-8'}
                onClick={() => onCommand(command)}
              >
                <CommandIcon aria-hidden="true" />
              </Button>
            </Tooltip>
          ))}
        </div>
      </header>

      {!definition ? (
        <p role="alert" className="rounded-admin-md border border-admin-warning/30 bg-admin-warning-soft p-3 text-admin-sm text-admin-ink">
          Este bloco é de um tipo que esta versão do painel não conhece. Ele não aparece no site; você pode excluí-lo.
        </p>
      ) : definition.fields.length === 0 ? (
        <p className="text-admin-sm text-admin-ink-3">Este bloco não tem opções de conteúdo.</p>
      ) : (
        <FieldsEditor
          // Trocar de bloco remonta o formulário: nenhum estado de campo vaza de um bloco para outro.
          key={block.id}
          idPrefix={`block-${block.id}`}
          theme={doc.theme}
          fields={definition.fields}
          // `type` vai junto porque campos como o de fundo consultam o tipo da seção.
          value={{ ...block.props, type: block.type }}
          onChange={(next) => {
            const { type: _type, ...props } = next
            onChangeProps(block.id, props)
          }}
        />
      )}
    </div>
  )
}
