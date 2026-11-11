import { DndContext, DragOverlay } from '@dnd-kit/core'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileQuestion, Monitor, MonitorSmartphone, Redo2, Smartphone, Tablet, TriangleAlert, Undo2 } from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState, type MouseEvent } from 'react'
import { Link, useBlocker, useParams } from 'react-router'
import { useDocumentTitle } from '@/admin/hooks/useDocumentTitle'
import {
  Badge,
  Button,
  buttonVariants,
  Card,
  CardBody,
  Dialog,
  DialogContent,
  DialogFooter,
  EmptyState,
  ErrorState,
  Skeleton,
  toast,
  Tooltip,
} from '@/admin/ui'
import { cn } from '@/lib/cn'
import { PreviewFrame, type PreviewDevice } from '@/modules/home/PreviewFrame'
import type { BlockType, LandingDocument } from '@/renderer/document-v2'
import { LandingRenderer, type LandingEditHooks } from '@/renderer/LandingRenderer'
import { blockLabel, createBlock, definitionOf } from '../blocks/definitions'
import { BlockLibrary } from '../editor/BlockLibrary'
import { DropIndicator, SelectionToolbar } from '../editor/CanvasOverlay'
import { LayersPanel } from '../editor/LayersPanel'
import { PropertiesPanel, type BlockCommand } from '../editor/PropertiesPanel'
import { useBlockDrag } from '../editor/useBlockDrag'
import { parseLandingDocument, validateLandingDocument, type LandingIssue } from '../schema/document'
import { fetchLandingPage, LANDING_PAGES_KEY, saveLandingDraft, type LandingPageDraft } from '../services/pages'
import {
  canMove,
  defaultTarget,
  dragType,
  duplicateBlock,
  findBlock,
  moveBlock,
  moveBlockTo,
  placeBlock,
  removeBlock,
  setSeo,
  updateBlockProps,
  type DragSource,
  type InsertTarget,
} from '../state/editor'
import { canRedo, canUndo, createHistory, pushHistory, redo, undo } from '../state/history'
import { statusLabels } from '../state/page-list'
import '../editor/canvas.css'

const pageKey = (id: string) => ['landing-page', id] as const

export default function LandingEditorPage() {
  const { id = '' } = useParams()
  // Sempre busca ao entrar e nunca rebusca durante a edição: o editor é o dono do rascunho enquanto está aberto.
  const query = useQuery({
    queryKey: pageKey(id),
    queryFn: () => fetchLandingPage(id),
    staleTime: Infinity,
    gcTime: 0,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  })
  useDocumentTitle(query.data ? `${query.data.title} · Editor` : 'Editor de landing page')

  const parsed = useMemo(() => (query.data ? parseLandingDocument(query.data.draft_document) : null), [query.data])

  if (query.isPending) {
    return (
      <div className="grid gap-4" aria-busy="true">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-[560px] w-full" />
      </div>
    )
  }

  const back = (
    <Link to="/admin/paginas" className={buttonVariants({ variant: 'secondary' })}>
      <ArrowLeft aria-hidden="true" />
      Voltar para as landing pages
    </Link>
  )

  if (query.isError) {
    return (
      <Card>
        <ErrorState description={query.error.message} onRetry={() => void query.refetch()} />
      </Card>
    )
  }

  if (!query.data) {
    return (
      <Card>
        <CardBody>
          <EmptyState icon={FileQuestion} title="Página não encontrada" description="Esta landing page não existe ou foi excluída." action={back} />
        </CardBody>
      </Card>
    )
  }

  if (!parsed?.document) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            icon={TriangleAlert}
            title="Não foi possível abrir esta página"
            description="O conteúdo salvo está em um formato que esta versão do painel não reconhece. Nada foi alterado."
            action={back}
          />
        </CardBody>
      </Card>
    )
  }

  // key: abrir outra página recomeça o estado do editor.
  return <Editor key={query.data.id} page={query.data} initial={parsed.document} />
}

const devices = [
  { value: 'desktop', label: 'Computador', icon: Monitor },
  { value: 'tablet', label: 'Tablet', icon: Tablet },
  { value: 'mobile', label: 'Celular', icon: Smartphone },
] as const

type LeftTab = 'blocks' | 'layers'

/** Foco em campo de texto ou em um diálogo: as teclas pertencem a ele (apagar letras, desfazer a digitação…). */
function isTyping(target: EventTarget | null): boolean {
  // O alvo pode ser de outro documento (iframe do canvas): não dá para usar `instanceof Element`.
  const element = target as Element | null
  if (!element || typeof element.closest !== 'function') return false
  return element.closest('input, textarea, select, [contenteditable="true"], [role="combobox"], [role="listbox"], [role="dialog"]') !== null
}

function Editor({ page, initial }: { page: LandingPageDraft; initial: LandingDocument }) {
  const queryClient = useQueryClient()
  const canvasRef = useRef<HTMLElement>(null)
  const [saved, setSaved] = useState({ document: initial, updatedAt: page.draft_updated_at })
  const [history, setHistory] = useState(() => createHistory(initial))
  const doc = history.present
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [device, setDevice] = useState<PreviewDevice>('desktop')
  const [tab, setTab] = useState<LeftTab>('blocks')
  const [pendingInsert, setPendingInsert] = useState<InsertTarget | null>(null)
  // A lista de problemas aparece depois da primeira tentativa de salvar e se atualiza a cada alteração.
  const [attempted, setAttempted] = useState(false)

  // Voltar exatamente ao documento salvo (desfazendo) também conta como "tudo salvo".
  const dirty = doc !== saved.document
  const issues: LandingIssue[] = useMemo(() => (attempted ? validateLandingDocument(doc) : []), [attempted, doc])
  const issueIds = useMemo(() => new Set(issues.flatMap((issue) => (issue.blockId ? [issue.blockId] : []))), [issues])
  const selected = selectedId ? (findBlock(doc.blocks, selectedId)?.block ?? null) : null

  /** Toda alteração do documento passa por aqui e vira um passo do histórico. `key` agrupa digitação. */
  const commit = useCallback((change: (current: LandingDocument) => LandingDocument, key: string | null = null) => {
    const now = Date.now()
    setHistory((current) => pushHistory(current, change(current.present), now, key))
  }, [])

  const undoStep = useCallback(() => setHistory((current) => undo(current)), [])
  const redoStep = useCallback(() => setHistory((current) => redo(current)), [])

  const save = useMutation({
    mutationFn: (document: LandingDocument) => saveLandingDraft(page.id, document, saved.updatedAt),
    onSuccess: (row, document) => {
      // Guarda a mesma referência que foi enviada: se a pessoa editou durante o envio, continua "não salvo".
      setSaved({ document, updatedAt: row.draft_updated_at })
      void queryClient.invalidateQueries({ queryKey: LANDING_PAGES_KEY })
      toast.success('Rascunho salvo.')
    },
    onError: (error) => toast.error(error.message, { duration: Infinity }),
  })

  const requestSave = useCallback(() => {
    if (save.isPending || doc === saved.document) return
    setAttempted(true)
    const found = validateLandingDocument(doc)
    if (found.length > 0) {
      toast.error(found.length === 1 ? 'Há 1 problema a corrigir antes de salvar.' : `Há ${found.length} problemas a corrigir antes de salvar.`, { duration: 6000 })
      return
    }
    save.mutate(doc)
  }, [doc, save, saved.document])

  // Protege alterações não salvas (navegação interna e fechamento da aba).
  const blocker = useBlocker(dirty)
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  /** Seleção vinda das camadas ou da lista de problemas: também rola o canvas até o bloco. */
  const selectAndReveal = useCallback((id: string | null) => {
    setSelectedId(id)
    setFocusId(id ?? 'top')
  }, [])

  /** Bloco novo (clique na biblioteca ou arraste). `target` null = fim da página. */
  const insertNew = useCallback(
    (type: BlockType, target: InsertTarget | null) => {
      const result = placeBlock(doc, createBlock(type), target, () => createBlock('section'))
      if (!result.id) {
        toast.error('Não foi possível inserir o bloco: a página chegou ao limite de blocos.')
        return
      }
      commit(() => result.doc)
      setPendingInsert(null)
      selectAndReveal(result.id)
    },
    [commit, doc, selectAndReveal],
  )

  const pick = (type: BlockType) => insertNew(type, pendingInsert ?? defaultTarget(doc, selectedId))

  const command = useCallback(
    (name: BlockCommand) => {
      if (!selected) return
      const id = selected.id
      switch (name) {
        case 'up':
          return commit((current) => moveBlock(current, id, -1))
        case 'down':
          return commit((current) => moveBlock(current, id, 1))
        case 'duplicate': {
          const result = duplicateBlock(doc, id)
          if (!result.id) return void toast.error('Não foi possível duplicar: a página chegou ao limite de blocos.')
          commit(() => result.doc)
          return selectAndReveal(result.id)
        }
        case 'delete':
          commit((current) => removeBlock(current, id))
          setPendingInsert((current) => (current?.refId === id ? null : current))
          setSelectedId(null)
          // Sem pergunta antes: excluir é um passo do histórico e pode ser desfeito na hora.
          return void toast(`“${blockLabel(selected)}” excluído.`, { action: { label: 'Desfazer', onClick: undoStep } })
        case 'insert-before':
        case 'insert-after':
          setPendingInsert({ refId: id, position: name === 'insert-before' ? 'before' : 'after' })
          return setTab('blocks')
      }
    },
    [commit, doc, selectAndReveal, selected, undoStep],
  )

  // Atalhos de teclado. Valem no painel e com o foco dentro do canvas (o iframe não repassa as teclas).
  const onKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const mod = event.ctrlKey || event.metaKey
      const key = event.key.toLowerCase()
      if (mod && key === 's') {
        event.preventDefault()
        return requestSave()
      }
      if (isTyping(event.target)) return

      if (mod && key === 'z') {
        event.preventDefault()
        return event.shiftKey ? redoStep() : undoStep()
      }
      if (mod && key === 'y') {
        event.preventDefault()
        return redoStep()
      }
      if (key === 'escape') return setSelectedId(null)
      if (!selected) return

      if (key === 'delete' || key === 'backspace') {
        event.preventDefault()
        return command('delete')
      }
      if (mod && key === 'd') {
        event.preventDefault()
        return command('duplicate')
      }
      if (event.altKey && (key === 'arrowup' || key === 'arrowdown')) {
        event.preventDefault()
        return command(key === 'arrowup' ? 'up' : 'down')
      }
    },
    [command, redoStep, requestSave, selected, undoStep],
  )
  useEffect(() => {
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [onKeyDown])

  // Arrastar e soltar: o destino já chega validado pela regra de estrutura.
  const onDrop = useCallback(
    (source: DragSource, target: InsertTarget | null) => {
      if (source.kind === 'new') return insertNew(source.type, target)
      if (!target) return
      commit((current) => moveBlockTo(current, source.id, target))
      setSelectedId(source.id)
    },
    [commit, insertNew],
  )
  const drag = useBlockDrag({ document: doc, canvasRef, onDrop })
  const dragging = drag.source !== null
  const draggedType = drag.source ? dragType(doc, drag.source) : null
  const draggedDefinition = draggedType ? definitionOf(draggedType) : undefined

  const edit: LandingEditHooks = useMemo(
    () => ({
      attrs: (block) => ({
        'data-block-id': block.id,
        // data-section-id: o PreviewFrame usa para rolar até o bloco.
        'data-section-id': block.id,
        'data-selected': block.id === selectedId ? 'true' : undefined,
        'data-hidden': block.props.hidden === true ? 'true' : undefined,
        // No canvas, clicar seleciona: links e botões da página não navegam.
        onClick: (event: MouseEvent) => {
          event.preventDefault()
          event.stopPropagation()
          setSelectedId(block.id)
        },
      }),
      placeholder: (block) => (
        <div className="lb-placeholder">
          {block.type === 'section' ? 'Seção vazia. Escolha ou arraste um elemento da lista de blocos.' : 'Imagem ainda não enviada.'}
        </div>
      ),
    }),
    [selectedId],
  )

  const insertRef = pendingInsert ? findBlock(doc.blocks, pendingInsert.refId)?.block : null
  const insertHint =
    pendingInsert && insertRef
      ? `Escolha o bloco para inserir ${pendingInsert.position === 'before' ? 'acima' : 'abaixo'} de “${blockLabel(insertRef)}”.`
      : null

  const historyButtons = [
    { label: 'Desfazer (Ctrl+Z)', icon: Undo2, enabled: canUndo(history), run: undoStep },
    { label: 'Refazer (Ctrl+Shift+Z)', icon: Redo2, enabled: canRedo(history), run: redoStep },
  ]

  return (
    <>
      {/* Telas pequenas: o editor precisa de três colunas. */}
      <Card className="lg:hidden">
        <CardBody>
          <EmptyState
            icon={MonitorSmartphone}
            title="Abra o editor em uma tela maior"
            description="O editor de landing pages precisa de pelo menos 1024 px de largura. No celular você ainda pode criar e organizar as páginas."
            action={
              <Link to="/admin/paginas" className={buttonVariants({ variant: 'secondary' })}>
                Voltar para as landing pages
              </Link>
            }
          />
        </CardBody>
      </Card>

      <div className="hidden lg:block">
        <header className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-admin-rule pb-4">
          <Link
            to="/admin/paginas"
            aria-label="Voltar para as landing pages"
            className={cn(buttonVariants({ variant: 'ghost', size: 'icon' }), 'shrink-0')}
          >
            <ArrowLeft aria-hidden="true" />
          </Link>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-admin-display text-admin-xl font-semibold text-admin-ink">{page.title}</h1>
            <p className="flex flex-wrap items-center gap-2 text-admin-sm text-admin-ink-2">
              <Badge tone={page.status === 'published' ? 'success' : 'neutral'}>{statusLabels[page.status]}</Badge>
              <span role="status" aria-live="polite">
                {save.isPending ? 'Salvando…' : dirty ? 'Alterações não salvas' : 'Tudo salvo'}
              </span>
            </p>
          </div>
          <div role="group" aria-label="Histórico" className="inline-flex gap-1">
            {historyButtons.map((button) => (
              <Tooltip key={button.label} content={button.label}>
                <Button variant="secondary" size="icon" aria-label={button.label} disabled={!button.enabled} onClick={button.run}>
                  <button.icon aria-hidden="true" />
                </Button>
              </Tooltip>
            ))}
          </div>
          <div role="radiogroup" aria-label="Tamanho da tela" className="inline-flex rounded-admin-lg border border-admin-rule bg-admin-card p-1">
            {devices.map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={device === option.value}
                aria-label={option.label}
                title={option.label}
                onClick={() => setDevice(option.value)}
                className="inline-flex size-8 items-center justify-center rounded-admin text-admin-ink-2 aria-checked:bg-admin-ink aria-checked:text-white"
              >
                <option.icon aria-hidden="true" className="size-4" />
              </button>
            ))}
          </div>
          <Button disabled={!dirty} loading={save.isPending} onClick={requestSave}>
            Salvar rascunho
          </Button>
        </header>

        {issues.length > 0 ? (
          <div role="alert" className="mt-4 rounded-admin-lg border border-admin-danger/30 bg-admin-danger-soft p-4 text-admin-sm text-admin-ink">
            <p className="font-medium">Corrija antes de salvar:</p>
            <ul className="mt-2 grid gap-1">
              {issues.slice(0, 8).map((issue, index) => {
                const block = issue.blockId ? findBlock(doc.blocks, issue.blockId)?.block : null
                return (
                  <li key={`${issue.blockId ?? 'page'}-${index}`}>
                    {block ? (
                      <button type="button" className="text-left underline underline-offset-2" onClick={() => selectAndReveal(block.id)}>
                        {blockLabel(block)}: {issue.message}
                      </button>
                    ) : (
                      issue.message
                    )}
                  </li>
                )
              })}
              {issues.length > 8 ? <li>…e mais {issues.length - 8}.</li> : null}
            </ul>
          </div>
        ) : null}

        <DndContext sensors={drag.sensors} {...drag.handlers}>
          <div className="mt-4 grid h-[calc(100dvh-13.5rem)] min-h-[520px] grid-cols-[15rem_minmax(0,1fr)_19rem] gap-3">
            <aside aria-label="Blocos e camadas" className="flex min-h-0 flex-col rounded-admin-lg border border-admin-rule bg-admin-card">
              <div role="tablist" aria-label="Painel esquerdo" className="grid grid-cols-2 gap-1 border-b border-admin-rule p-1">
                {(
                  [
                    { value: 'blocks', label: 'Blocos' },
                    { value: 'layers', label: 'Camadas' },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    role="tab"
                    id={`editor-tab-${option.value}`}
                    aria-selected={tab === option.value}
                    aria-controls="editor-left-panel"
                    onClick={() => setTab(option.value)}
                    className="rounded-admin px-3 py-1.5 text-admin-sm font-medium text-admin-ink-2 aria-selected:bg-admin-ink aria-selected:text-white"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <div id="editor-left-panel" role="tabpanel" aria-labelledby={`editor-tab-${tab}`} className="min-h-0 flex-1 overflow-y-auto p-3">
                {tab === 'blocks' ? (
                  <BlockLibrary onPick={pick} insertHint={insertHint} onCancelInsert={() => setPendingInsert(null)} />
                ) : (
                  <LayersPanel
                    blocks={doc.blocks}
                    selectedId={selectedId}
                    issueIds={issueIds}
                    drop={drag.drop?.zone === 'layers' ? drag.drop.target : null}
                    onSelect={selectAndReveal}
                  />
                )}
              </div>
            </aside>

            <section
              ref={canvasRef}
              aria-label="Canvas"
              // Durante o arraste o iframe não recebe o ponteiro: quem acompanha o movimento é o painel.
              className={cn('relative min-h-0 min-w-0 rounded-admin-lg bg-admin-sunken p-3', dragging && '[&_iframe]:pointer-events-none')}
            >
              <PreviewFrame device={device} focusSectionId={focusId} onKeyDown={onKeyDown}>
                {doc.blocks.length === 0 ? (
                  <div className="lb-placeholder" style={{ margin: '3rem auto', maxWidth: '32rem', fontFamily: 'system-ui, sans-serif' }}>
                    Página em branco. Escolha ou arraste um bloco da coluna da esquerda para começar.
                  </div>
                ) : (
                  <LandingRenderer document={doc} preview edit={edit} />
                )}
              </PreviewFrame>
              {selected ? (
                <SelectionToolbar
                  canvasRef={canvasRef}
                  blockId={selected.id}
                  label={blockLabel(selected)}
                  revision={`${device}:${history.past.length}:${history.future.length}:${history.lastAt}`}
                  canMoveUp={canMove(doc, selected.id, -1)}
                  canMoveDown={canMove(doc, selected.id, 1)}
                  hidden={dragging}
                  onCommand={command}
                />
              ) : null}
              <DropIndicator drop={drag.drop} />
            </section>

            <aside aria-label="Propriedades" className="min-h-0 overflow-y-auto rounded-admin-lg border border-admin-rule bg-admin-card p-4">
              <PropertiesPanel
                document={doc}
                block={selected}
                slug={page.slug}
                canMoveUp={selected ? canMove(doc, selected.id, -1) : false}
                canMoveDown={selected ? canMove(doc, selected.id, 1) : false}
                onChangeProps={(blockId, props) => commit((current) => updateBlockProps(current, blockId, props), `props:${blockId}`)}
                onChangeSeo={(seo) => commit((current) => setSeo(current, seo), 'seo')}
                onCommand={command}
              />
            </aside>
          </div>

          {/* Cartão que acompanha o ponteiro. Não recebe o ponteiro, para não esconder o destino. */}
          <DragOverlay dropAnimation={null} style={{ pointerEvents: 'none' }}>
            {draggedDefinition ? (
              <div className="inline-flex items-center gap-2 rounded-admin border border-[#2563eb] bg-admin-card px-3 py-2 text-admin-sm font-medium text-admin-ink shadow-admin-pop">
                <draggedDefinition.icon aria-hidden="true" className="size-4 text-admin-ink-2" />
                {draggedDefinition.label}
              </div>
            ) : null}
          </DragOverlay>
        </DndContext>
      </div>

      <Dialog open={blocker.state === 'blocked'} onOpenChange={(open) => !open && blocker.reset?.()}>
        <DialogContent title="Sair sem salvar?" description="Há alterações no rascunho que ainda não foram salvas.">
          <DialogFooter>
            <Button variant="secondary" onClick={() => blocker.reset?.()}>
              Continuar editando
            </Button>
            <Button variant="danger" onClick={() => blocker.proceed?.()}>
              Sair e descartar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
