import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FileQuestion, Monitor, MonitorSmartphone, Smartphone, Tablet, TriangleAlert } from 'lucide-react'
import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react'
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
} from '@/admin/ui'
import { cn } from '@/lib/cn'
import { PreviewFrame, type PreviewDevice } from '@/modules/home/PreviewFrame'
import type { Block, BlockType, LandingDocument } from '@/renderer/document-v2'
import { LandingRenderer, type LandingEditHooks } from '@/renderer/LandingRenderer'
import { blockLabel, createBlock } from '../blocks/definitions'
import { BlockLibrary } from '../editor/BlockLibrary'
import { LayersPanel } from '../editor/LayersPanel'
import { PropertiesPanel, type BlockCommand } from '../editor/PropertiesPanel'
import { parseLandingDocument, validateLandingDocument, type LandingIssue } from '../schema/document'
import { fetchLandingPage, LANDING_PAGES_KEY, saveLandingDraft, type LandingPageDraft } from '../services/pages'
import {
  canMove,
  defaultTarget,
  duplicateBlock,
  findBlock,
  moveBlock,
  placeBlock,
  removeBlock,
  setSeo,
  updateBlockProps,
  type InsertTarget,
} from '../state/editor'
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

function Editor({ page, initial }: { page: LandingPageDraft; initial: LandingDocument }) {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState({ document: initial, updatedAt: page.draft_updated_at })
  const [doc, setDoc] = useState(initial)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [focusId, setFocusId] = useState<string | null>(null)
  const [device, setDevice] = useState<PreviewDevice>('desktop')
  const [tab, setTab] = useState<LeftTab>('blocks')
  const [pendingInsert, setPendingInsert] = useState<InsertTarget | null>(null)
  const [pendingRemoval, setPendingRemoval] = useState<Block | null>(null)
  // A lista de problemas aparece depois da primeira tentativa de salvar e se atualiza a cada alteração.
  const [attempted, setAttempted] = useState(false)

  const dirty = doc !== saved.document
  const issues: LandingIssue[] = useMemo(() => (attempted ? validateLandingDocument(doc) : []), [attempted, doc])
  const issueIds = useMemo(() => new Set(issues.flatMap((issue) => (issue.blockId ? [issue.blockId] : []))), [issues])
  const selected = selectedId ? (findBlock(doc.blocks, selectedId)?.block ?? null) : null

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

  // Ctrl/Cmd + S salva.
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
        event.preventDefault()
        requestSave()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [requestSave])

  // Protege alterações não salvas (navegação interna e fechamento da aba).
  const blocker = useBlocker(dirty)
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  /** Seleção vinda das camadas ou da lista de problemas: também rola o canvas até o bloco. */
  const selectAndReveal = (id: string | null) => {
    setSelectedId(id)
    setFocusId(id ?? 'top')
  }

  const pick = (type: BlockType) => {
    const block = createBlock(type)
    const result = placeBlock(doc, block, pendingInsert ?? defaultTarget(doc, selectedId), () => createBlock('section'))
    if (!result.id) {
      toast.error('Não foi possível inserir o bloco: a página chegou ao limite de blocos.')
      return
    }
    setDoc(result.doc)
    setPendingInsert(null)
    selectAndReveal(result.id)
  }

  const command = (name: BlockCommand) => {
    if (!selected) return
    switch (name) {
      case 'up':
        return setDoc(moveBlock(doc, selected.id, -1))
      case 'down':
        return setDoc(moveBlock(doc, selected.id, 1))
      case 'duplicate': {
        const result = duplicateBlock(doc, selected.id)
        if (!result.id) return void toast.error('Não foi possível duplicar: a página chegou ao limite de blocos.')
        setDoc(result.doc)
        return selectAndReveal(result.id)
      }
      case 'delete':
        return setPendingRemoval(selected)
      case 'insert-before':
      case 'insert-after':
        setPendingInsert({ refId: selected.id, position: name === 'insert-before' ? 'before' : 'after' })
        return setTab('blocks')
    }
  }

  const confirmRemoval = () => {
    if (!pendingRemoval) return
    setDoc(removeBlock(doc, pendingRemoval.id))
    if (pendingInsert?.refId === pendingRemoval.id) setPendingInsert(null)
    setSelectedId(null)
    setPendingRemoval(null)
  }

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
          {block.type === 'section' ? 'Seção vazia. Escolha um elemento na lista de blocos.' : 'Imagem ainda não enviada.'}
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
                <LayersPanel blocks={doc.blocks} selectedId={selectedId} issueIds={issueIds} onSelect={selectAndReveal} />
              )}
            </div>
          </aside>

          <section aria-label="Canvas" className="min-h-0 min-w-0 rounded-admin-lg bg-admin-sunken p-3">
            <PreviewFrame device={device} focusSectionId={focusId}>
              {doc.blocks.length === 0 ? (
                <div className="lb-placeholder" style={{ margin: '3rem auto', maxWidth: '32rem', fontFamily: 'system-ui, sans-serif' }}>
                  Página em branco. Escolha um bloco na coluna da esquerda para começar.
                </div>
              ) : (
                <LandingRenderer document={doc} preview edit={edit} />
              )}
            </PreviewFrame>
          </section>

          <aside aria-label="Propriedades" className="min-h-0 overflow-y-auto rounded-admin-lg border border-admin-rule bg-admin-card p-4">
            <PropertiesPanel
              document={doc}
              block={selected}
              slug={page.slug}
              canMoveUp={selected ? canMove(doc, selected.id, -1) : false}
              canMoveDown={selected ? canMove(doc, selected.id, 1) : false}
              onChangeProps={(blockId, props) => setDoc((current) => updateBlockProps(current, blockId, props))}
              onChangeSeo={(seo) => setDoc((current) => setSeo(current, seo))}
              onCommand={command}
            />
          </aside>
        </div>
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

      <Dialog open={pendingRemoval !== null} onOpenChange={(open) => !open && setPendingRemoval(null)}>
        <DialogContent
          title="Excluir este bloco?"
          description={
            pendingRemoval
              ? `“${blockLabel(pendingRemoval)}” sai do rascunho${(pendingRemoval.children?.length ?? 0) > 0 ? ', junto com os elementos dentro dele' : ''}. Ainda não há desfazer.`
              : undefined
          }
        >
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPendingRemoval(null)}>
              Cancelar
            </Button>
            <Button variant="danger" onClick={confirmRemoval}>
              Excluir bloco
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
