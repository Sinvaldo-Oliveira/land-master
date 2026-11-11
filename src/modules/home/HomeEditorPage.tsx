import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowLeft, ArrowUp, ChevronRight, ExternalLink, Eye, EyeOff, FolderOpen, FolderPlus, Globe, Monitor, Palette, Plus, Smartphone, Tablet, Trash2, TriangleAlert } from 'lucide-react'
import { useEffect, useState, type DragEvent, type ReactNode } from 'react'
import { useBlocker } from 'react-router'
import { useDocumentTitle } from '@/admin/hooks/useDocumentTitle'
import {
  Badge,
  Button,
  Card,
  CardBody,
  Dialog,
  DialogContent,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DialogFooter,
  EmptyState,
  ErrorState,
  Field,
  fieldDescribedBy,
  Input,
  PageHeader,
  Skeleton,
  Switch,
  Textarea,
  toast,
} from '@/admin/ui'
import { formatDateTime } from '@/lib/format'
import { PageRenderer } from '@/renderer/PageRenderer'
import { institucionalTemplate } from '@/renderer/templates/institucional'
import type { PageDocument, Section } from '@/renderer/types'
import { createHomeFromTemplate, fetchHomePage, publishHome, saveHomeDraft, type HomePage } from './api'
import { validateDocument, type DocumentIssue } from './document-schema'
import {
  contrastWarnings,
  getBrandName,
  addImageSection,
  addInteractiveHeroSection,
  addVideoCarouselSection,
  addVideoPlayerSection,
  isMovable,
  addCategory,
  MAX_CATEGORIES,
  removeCategory,
  removeSection,
  setSectionCategory,
  MAX_SECTIONS,
  moveSection,
  replaceSection,
  setBrandColor,
  setBackgroundColor,
  setBrandName,
  setSeo,
  toggleHidden,
  type BrandColorKey,
} from './editor-state'
import { ColorField } from './ColorField'
import { FieldsEditor } from './FieldsEditor'
import { PreviewFrame, type PreviewDevice } from './PreviewFrame'
import { sectionFields, sectionName, sectionSummary } from './section-fields'

const HOME_QUERY = ['site', 'home'] as const

export default function HomeEditorPage() {
  useDocumentTitle('Site')
  const queryClient = useQueryClient()
  const home = useQuery({ queryKey: HOME_QUERY, queryFn: fetchHomePage })

  const create = useMutation({
    mutationFn: () => createHomeFromTemplate(institucionalTemplate),
    onSuccess: (page) => {
      queryClient.setQueryData(HOME_QUERY, page)
      toast.success('Página inicial criada a partir do modelo. Edite e publique quando estiver pronta.')
    },
    onError: (error) => toast.error(error.message, { duration: Infinity }),
  })

  if (home.isPending) {
    return (
      <div className="grid gap-4" aria-busy="true">
        <Skeleton className="h-12 w-72" />
        <div className="grid gap-6 xl:grid-cols-[420px_1fr]">
          <Skeleton className="h-[520px] w-full" />
          <Skeleton className="h-[520px] w-full" />
        </div>
      </div>
    )
  }

  if (home.isError) {
    return (
      <>
        <PageHeader title="Site" description="Identidade da empresa e página inicial do site." />
        <Card className="mt-6">
          <ErrorState description={home.error.message} onRetry={() => void home.refetch()} />
        </Card>
      </>
    )
  }

  if (!home.data) {
    return (
      <>
        <PageHeader title="Site" description="Identidade da empresa e página inicial do site." />
        <Card className="mt-6">
          <CardBody>
            <EmptyState
              icon={Globe}
              title="A página inicial ainda não foi criada"
              description="Comece pelo modelo Institucional: você edita textos, cores e seções, pré-visualiza e publica quando estiver pronto. Nada vai ao ar antes de publicar."
              action={
                <Button loading={create.isPending} onClick={() => create.mutate()}>
                  Criar a partir do modelo Institucional
                </Button>
              }
            />
          </CardBody>
        </Card>
      </>
    )
  }

  return <Editor key={home.data.id} initial={home.data} />
}

type Selection = { kind: 'list' } | { kind: 'identity' } | { kind: 'section'; id: string }

function Editor({ initial }: { initial: HomePage }) {
  const queryClient = useQueryClient()
  const [saved, setSaved] = useState(initial)
  const [doc, setDoc] = useState<PageDocument>(initial.draft_document)
  const [selection, setSelection] = useState<Selection>({ kind: 'list' })
  // Seção aguardando confirmação de exclusão (o popup pergunta antes de apagar).
  const [pendingRemoval, setPendingRemoval] = useState<Section | null>(null)
  const [device, setDevice] = useState<PreviewDevice>('desktop')
  const [focus, setFocus] = useState<string | null>(null)
  // A lista de erros é recalculada a cada alteração, depois da primeira tentativa de salvar.
  const [attempted, setAttempted] = useState(false)
  const issues: DocumentIssue[] = attempted ? validateDocument(doc) : []

  const dirty = doc !== saved.draft_document
  const neverPublished = !saved.published_at
  const unpublished = neverPublished || new Date(saved.draft_updated_at) > new Date(saved.published_at ?? 0)

  const commitSaved = (page: HomePage) => {
    const next = { ...page, draft_document: doc } // mantém a mesma referência → dirty = false
    setSaved(next)
    queryClient.setQueryData(HOME_QUERY, next)
  }

  const validate = (): boolean => {
    const found = validateDocument(doc)
    setAttempted(true)
    if (found.length > 0) {
      toast.error(`Há ${found.length} campo(s) a corrigir antes de salvar.`, { duration: 6000 })
      return false
    }
    return true
  }

  const save = useMutation({
    mutationFn: () => saveHomeDraft(saved, doc),
    onSuccess: (page) => {
      commitSaved(page)
      toast.success('Rascunho salvo. O site público só muda quando você publicar.')
    },
    onError: (error) => toast.error(error.message, { duration: Infinity }),
  })

  const publish = useMutation({
    mutationFn: async () => {
      let current = saved
      if (dirty) {
        current = await saveHomeDraft(saved, doc)
        commitSaved(current)
      }
      return publishHome(current.id)
    },
    onSuccess: (page) => {
      commitSaved(page)
      toast.success('Site publicado. A nova versão já está no ar.')
    },
    onError: (error) => toast.error(error.message, { duration: Infinity }),
  })

  // Protege alterações não salvas (navegação interna e fechamento da aba).
  const blocker = useBlocker(dirty)
  useEffect(() => {
    if (!dirty) return
    const onBeforeUnload = (event: BeforeUnloadEvent) => event.preventDefault()
    window.addEventListener('beforeunload', onBeforeUnload)
    return () => window.removeEventListener('beforeunload', onBeforeUnload)
  }, [dirty])

  const selectSection = (section: Section) => {
    setSelection({ kind: 'section', id: section.id })
    setFocus(section.type === 'site-header' ? 'top' : section.type === 'site-footer' ? 'bottom' : section.id)
  }

  const busy = save.isPending || publish.isPending
  const selected = selection.kind === 'section' ? doc.sections.find((s) => s.id === selection.id) : undefined

  return (
    <>
      <PageHeader
        title="Site"
        description="Edite a página inicial. As mudanças só aparecem para os visitantes depois de publicar."
        actions={
          <>
            <StatusBadge dirty={dirty} unpublished={unpublished} neverPublished={neverPublished} publishedAt={saved.published_at} />
            <Button variant="ghost" asChild>
              <a href="/" target="_blank" rel="noopener noreferrer">
                <ExternalLink aria-hidden="true" />
                Ver site
              </a>
            </Button>
            <Button variant="secondary" disabled={!dirty || busy} loading={save.isPending} onClick={() => validate() && save.mutate()}>
              Salvar rascunho
            </Button>
            <Button disabled={busy || (!dirty && !unpublished)} loading={publish.isPending} onClick={() => validate() && publish.mutate()}>
              Publicar
            </Button>
          </>
        }
      />

      {issues.length > 0 ? (
        <div role="alert" className="mt-4 rounded-admin-lg border border-admin-danger/30 bg-admin-danger-soft p-4 text-admin-sm text-admin-ink">
          <p className="flex items-center gap-2 font-medium">
            <TriangleAlert aria-hidden="true" className="size-4 text-admin-danger" />
            Corrija estes campos para salvar:
          </p>
          <ul className="mt-2 grid gap-1 pl-6">
            {issues.slice(0, 8).map((issue, i) => {
              const section = issue.sectionId ? doc.sections.find((s) => s.id === issue.sectionId) : undefined
              return (
                <li key={i} className="list-disc">
                  {section ? (
                    <button type="button" className="font-medium underline underline-offset-2" onClick={() => selectSection(section)}>
                      {sectionName(section)}
                    </button>
                  ) : (
                    <button type="button" className="font-medium underline underline-offset-2" onClick={() => setSelection({ kind: 'identity' })}>
                      Identidade e SEO
                    </button>
                  )}
                  : {issue.message}
                </li>
              )
            })}
          </ul>
        </div>
      ) : null}

      <div className="mt-6 grid gap-6 xl:grid-cols-[420px_minmax(0,1fr)]">
        <Card className="h-fit xl:sticky xl:top-4 xl:max-h-[calc(100dvh-8rem)] xl:overflow-y-auto">
          <CardBody>
            {selection.kind === 'list' ? (
              <SectionList
                doc={doc}
                onIdentity={() => {
                  setSelection({ kind: 'identity' })
                  setFocus('top')
                }}
                onSelect={selectSection}
                onToggle={(id) => setDoc((d) => toggleHidden(d, id))}
                onRemove={(section) => setPendingRemoval(section)}
                onSetCategory={(id, category) => setDoc((d) => setSectionCategory(d, id, category))}
                onAddCategory={(name) => setDoc((d) => addCategory(d, name))}
                onRemoveCategory={(name) => setDoc((d) => removeCategory(d, name))}
                onMove={(id, dir) => setDoc((d) => moveSection(d, id, dir))}
                onAdd={(kind) => {
                  const { doc: next, id } =
                    kind === 'interactive-hero'
                      ? addInteractiveHeroSection(doc)
                      : kind === 'video-carousel'
                        ? addVideoCarouselSection(doc)
                        : kind === 'video-player'
                          ? addVideoPlayerSection(doc)
                          : addImageSection(doc)
                  setDoc(() => next)
                  setSelection({ kind: 'section', id })
                  setFocus(id)
                }}
              />
            ) : selection.kind === 'identity' ? (
              <PanelShell title="Identidade e SEO" onBack={() => setSelection({ kind: 'list' })}>
                <IdentityPanel doc={doc} onChange={setDoc} />
              </PanelShell>
            ) : selected ? (
              <PanelShell title={sectionName(selected)} onBack={() => setSelection({ kind: 'list' })}>
                {isMovable(selected) ? (
                  <div className="mb-5 flex items-center justify-between gap-3 rounded-admin-lg border border-admin-rule p-3 text-admin-sm">
                    <label htmlFor={`visible-${selected.id}`}>
                      <span className="block font-medium text-admin-ink">Exibir no site</span>
                      <span className="text-admin-ink-2">Seções ocultas continuam salvas e podem voltar depois.</span>
                    </label>
                    <Switch id={`visible-${selected.id}`} checked={!selected.hidden} onCheckedChange={() => setDoc((d) => toggleHidden(d, selected.id))} />
                  </div>
                ) : null}
                <FieldsEditor
                  idPrefix={`sec-${selected.id}`}
                  theme={doc.theme}
                  fields={sectionFields[selected.type]}
                  value={selected as unknown as Record<string, unknown>}
                  onChange={(next) => setDoc((d) => replaceSection(d, next as unknown as Section))}
                />
              </PanelShell>
            ) : null}
          </CardBody>
        </Card>

        <section aria-label="Pré-visualização" className="flex min-w-0 flex-col gap-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-admin-sm text-admin-ink-2">Pré-visualização do rascunho (ainda não publicado)</p>
            <div role="radiogroup" aria-label="Tamanho da tela" className="inline-flex rounded-admin-lg border border-admin-rule bg-admin-card p-1">
              {(
                [
                  { value: 'desktop', label: 'Computador', icon: Monitor },
                  { value: 'tablet', label: 'Tablet', icon: Tablet },
                  { value: 'mobile', label: 'Celular', icon: Smartphone },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={device === option.value}
                  onClick={() => setDevice(option.value)}
                  className="inline-flex items-center gap-1.5 rounded-admin px-3 py-1.5 text-admin-sm text-admin-ink-2 aria-checked:bg-admin-ink aria-checked:text-white"
                >
                  <option.icon aria-hidden="true" className="size-4" />
                  {option.label}
                </button>
              ))}
            </div>
          </div>
          <div className="h-[calc(100dvh-13rem)] min-h-[520px] rounded-admin-lg bg-admin-sunken p-3">
            <PreviewFrame device={device} focusSectionId={focus}>
              <PageRenderer document={doc} preview />
            </PreviewFrame>
          </div>
        </section>
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
          title="Excluir esta seção?"
          description={pendingRemoval ? `"${sectionName(pendingRemoval)}" sai do rascunho. O site só muda depois de publicar.` : undefined}
        >
          <DialogFooter>
            <Button variant="secondary" onClick={() => setPendingRemoval(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              onClick={() => {
                if (!pendingRemoval) return
                const id = pendingRemoval.id
                setDoc((d) => removeSection(d, id))
                if (selection.kind === 'section' && selection.id === id) setSelection({ kind: 'list' })
                setPendingRemoval(null)
              }}
            >
              Excluir seção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

function StatusBadge({
  dirty,
  unpublished,
  neverPublished,
  publishedAt,
}: {
  dirty: boolean
  unpublished: boolean
  neverPublished: boolean
  publishedAt: string | null
}) {
  if (dirty) return <Badge tone="warning">Alterações não salvas</Badge>
  if (neverPublished) return <Badge tone="warning">Ainda não publicada</Badge>
  if (unpublished) return <Badge tone="info">Rascunho diferente do site</Badge>
  return <Badge tone="success">Publicada em {publishedAt ? formatDateTime(publishedAt) : ''}</Badge>
}

function PanelShell({ title, onBack, children }: { title: string; onBack: () => void; children: ReactNode }) {
  return (
    <div>
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1.5 text-admin-sm text-admin-ink-2 hover:text-admin-ink"
      >
        <ArrowLeft aria-hidden="true" className="size-4" />
        Todas as seções
      </button>
      <h2 className="mb-5 font-admin-display text-admin-xl font-semibold text-admin-ink">{title}</h2>
      {children}
    </div>
  )
}

type Item = { section: Section; index: number }
type Block = { category: string | undefined; items: Item[] }

/** Blocos de seções seguidas da mesma categoria. Seções sem categoria (e as fixas) ficam num bloco "sem categoria". */
function buildBlocks(sections: Section[]): Block[] {
  const blocks: Block[] = []
  sections.forEach((section, index) => {
    const category = isMovable(section) ? section.category : undefined
    const last = blocks[blocks.length - 1]
    if (last && last.category === category) last.items.push({ section, index })
    else blocks.push({ category, items: [{ section, index }] })
  })
  return blocks
}

function SectionList({
  doc,
  onIdentity,
  onSelect,
  onToggle,
  onMove,
  onAdd,
  onRemove,
  onSetCategory,
  onAddCategory,
  onRemoveCategory,
}: {
  doc: PageDocument
  onIdentity: () => void
  onSelect: (section: Section) => void
  onToggle: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
  onAdd: (kind: 'image-card' | 'interactive-hero' | 'video-carousel' | 'video-player') => void
  onRemove: (section: Section) => void
  onSetCategory: (id: string, category: string | undefined) => void
  onAddCategory: (name: string) => void
  onRemoveCategory: (name: string) => void
}) {
  const [creating, setCreating] = useState(false)
  // Arrastar e soltar (nativo): dragId é o card em movimento; overKey é a pasta sob o cursor.
  const [dragId, setDragId] = useState<string | null>(null)
  const [overKey, setOverKey] = useState<string | null>(null)
  const dropZone = (key: string, onDropHere: (id: string) => void) => ({
    onDragOver: (event: DragEvent<HTMLElement>) => {
      if (!dragId) return
      event.preventDefault()
      event.dataTransfer.dropEffect = 'move'
      setOverKey(key)
    },
    onDragLeave: (event: DragEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOverKey(null)
    },
    onDrop: (event: DragEvent<HTMLElement>) => {
      event.preventDefault()
      // O id vem do dataTransfer (preenchido ao iniciar o arraste); o estado é só reserva.
      const id = event.dataTransfer.getData('text/plain') || dragId
      if (id) onDropHere(id)
      setDragId(null)
      setOverKey(null)
    },
  })
  const [draft, setDraft] = useState('')
  const categories = doc.categories ?? []
  const trimmed = draft.trim()
  const duplicate = trimmed !== '' && categories.some((c) => c.toLowerCase() === trimmed.toLowerCase())
  const full = categories.length >= MAX_CATEGORIES
  const createError = duplicate ? 'Já existe uma categoria com este nome.' : full ? `Limite de ${MAX_CATEGORIES} categorias.` : undefined
  const canCreate = trimmed !== '' && !duplicate && !full
  const closeCreate = () => {
    setCreating(false)
    setDraft('')
  }
  const blocks = buildBlocks(doc.sections)
  // Categorias criadas que ainda não têm seções aparecem vazias, para receber cards.
  const emptyCategories = categories.filter((name) => !doc.sections.some((s) => s.category === name))

  const renderCard = ({ section, index }: Item) => {
    const movable = isMovable(section)
    const label = sectionName(section)
    const prev = doc.sections[index - 1]
    const next = doc.sections[index + 1]
    return (
      <li
        key={section.id}
        draggable={movable}
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move'
          event.dataTransfer.setData('text/plain', section.id)
          setDragId(section.id)
        }}
        onDragEnd={() => {
          setDragId(null)
          setOverKey(null)
        }}
        className={`flex items-center gap-2 rounded-admin-lg border border-admin-rule bg-admin-card p-2 data-[hidden=true]:bg-admin-sunken/60 ${movable ? 'cursor-grab active:cursor-grabbing' : ''} ${dragId === section.id ? 'opacity-50' : ''}`}
        data-hidden={section.hidden ? 'true' : 'false'}
      >
        <button
          type="button"
          onClick={() => onSelect(section)}
          className="min-w-0 flex-1 rounded-admin px-2 py-1.5 text-left hover:bg-admin-sunken"
        >
          <span className="flex items-center gap-2">
            <span className="font-medium text-admin-ink">{label}</span>
            {section.hidden ? <Badge tone="neutral">Oculta</Badge> : null}
          </span>
          <span className="block break-words text-admin-sm text-admin-ink-2">{sectionSummary(section)}</span>
        </button>
        {movable ? (
          <div className="flex shrink-0 items-center">
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={section.hidden ? `Mostrar ${label}` : `Ocultar ${label}`}
              onClick={() => onToggle(section.id)}
            >
              {section.hidden ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="size-8" aria-label={`Categoria de ${label}`} title="Mover para categoria">
                  <FolderOpen aria-hidden="true" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuLabel>Mover para categoria</DropdownMenuLabel>
                {categories.length === 0 ? <DropdownMenuItem disabled>Crie uma categoria primeiro</DropdownMenuItem> : null}
                {categories.map((name) => (
                  <DropdownMenuItem key={name} onSelect={() => onSetCategory(section.id, name)}>
                    {name}
                    {section.category === name ? ' ✓' : ''}
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => onSetCategory(section.id, undefined)}>Sem categoria</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={`Subir ${label}`}
              disabled={!prev || !isMovable(prev)}
              onClick={() => onMove(section.id, -1)}
            >
              <ArrowUp aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8"
              aria-label={`Descer ${label}`}
              disabled={!next || !isMovable(next)}
              onClick={() => onMove(section.id, 1)}
            >
              <ArrowDown aria-hidden="true" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="size-8 text-admin-danger hover:text-admin-danger"
              aria-label={`Excluir ${label}`}
              onClick={() => onRemove(section)}
            >
              <Trash2 aria-hidden="true" />
            </Button>
          </div>
        ) : (
          <span className="shrink-0 px-2 text-admin-xs text-admin-ink-3">Fixo</span>
        )}
      </li>
    )
  }

  const renderGroup = (name: string, items: Item[], key: string) => (
    <section
      key={key}
      aria-label={`Categoria ${name}`}
      {...dropZone(name, (id) => onSetCategory(id, name))}
      className={`grid grid-cols-[minmax(0,1fr)] gap-2 rounded-admin-lg border p-2 transition-colors ${
        dragId && overKey === name ? 'border-admin-accent bg-admin-accent-soft ring-2 ring-admin-accent' : 'border-admin-accent/25 bg-admin-accent-soft/30'
      }`}
    >
      <header className="flex items-center justify-between gap-2 px-1">
        <span className="flex min-w-0 items-center gap-2 text-admin-sm font-semibold text-admin-ink">
          <FolderOpen aria-hidden="true" className="size-4 shrink-0 text-admin-accent" />
          <span className="truncate">{name}</span>
          <Badge tone="neutral">{items.length}</Badge>
        </span>
        <Button
          variant="ghost"
          size="icon"
          className="size-8 text-admin-danger hover:text-admin-danger"
          aria-label={`Excluir categoria ${name}`}
          title="Excluir categoria (as seções continuam no site)"
          onClick={() => onRemoveCategory(name)}
        >
          <Trash2 aria-hidden="true" />
        </Button>
      </header>
      {items.length ? (
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-2">{items.map(renderCard)}</ol>
      ) : (
        <p className="px-1 pb-1 text-admin-xs text-admin-ink-3">
          Nenhuma seção aqui. Use o ícone de pasta em uma seção para movê-la para esta categoria.
        </p>
      )}
    </section>
  )

  return (
    // minmax(0,1fr): sem isso a coluna do grid cresce até o tamanho dos textos com reticências.
    <div className="grid grid-cols-[minmax(0,1fr)] gap-5">
      <button
        type="button"
        onClick={onIdentity}
        className="flex items-center gap-3 rounded-admin-lg border border-admin-rule p-3 text-left hover:border-admin-accent/50 hover:bg-admin-accent-soft/40"
      >
        <span className="inline-flex size-9 items-center justify-center rounded-admin bg-admin-accent-soft text-admin-accent">
          <Palette aria-hidden="true" className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block font-medium text-admin-ink">Identidade e SEO</span>
          <span className="block truncate text-admin-sm text-admin-ink-2">Nome da empresa, cores, título e descrição para o Google</span>
        </span>
        <ChevronRight aria-hidden="true" className="size-4 text-admin-ink-3" />
      </button>

      <div>
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-admin-xs font-medium tracking-wide text-admin-ink-3 uppercase">Seções da página</h2>
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setCreating(true)} disabled={full}>
              <FolderPlus aria-hidden="true" />
              Nova categoria
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="secondary" size="sm" disabled={doc.sections.length >= MAX_SECTIONS}>
                  <Plus aria-hidden="true" />
                  Nova seção
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => onAdd('image-card')}>Cartão de imagem 3D</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAdd('interactive-hero')}>Hero interativo (mouse e botão)</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAdd('video-carousel')}>Carrossel de vídeos</DropdownMenuItem>
                <DropdownMenuItem onSelect={() => onAdd('video-player')}>Vídeo de vendas (VSL)</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <p className="mb-3 text-admin-xs text-admin-ink-3">Arraste um card para uma pasta de categoria. Pelo teclado, use o ícone de pasta.</p>
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
          {/* Pastas vazias ficam no topo: a pasta recém-criada aparece logo abaixo do botão. */}
          {emptyCategories.map((name) => renderGroup(name, [], `empty-${name}`))}
          {blocks.map((block) =>
            block.category === undefined ? (
              <ol key={`flat-${block.items[0]!.section.id}`} className="grid grid-cols-[minmax(0,1fr)] gap-2">
                {block.items.map(renderCard)}
              </ol>
            ) : (
              renderGroup(block.category, block.items, `cat-${block.items[0]!.section.id}`)
            ),
          )}
          {dragId ? (
            <div
              {...dropZone('__none__', (id) => onSetCategory(id, undefined))}
              className={`rounded-admin-lg border-2 border-dashed px-4 py-3 text-center text-admin-sm transition-colors ${
                overKey === '__none__' ? 'border-admin-accent bg-admin-accent-soft text-admin-ink' : 'border-admin-rule-strong text-admin-ink-3'
              }`}
            >
              Solte aqui para tirar da categoria
            </div>
          ) : null}
        </div>
      </div>

      <Dialog
        open={creating}
        onOpenChange={(open) => {
          if (!open) closeCreate()
        }}
      >
        <DialogContent
          title="Nova categoria"
          description="Agrupe seções parecidas, como Menu, Vídeos ou Depoimentos. A categoria só organiza o painel: o site não mostra o nome."
        >
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (!canCreate) return
              onAddCategory(trimmed)
              closeCreate()
            }}
            className="grid gap-6"
          >
            <Field label="Nome da categoria" htmlFor="new-category" error={createError} hint="Até 40 caracteres.">
              <Input
                id="new-category"
                value={draft}
                maxLength={40}
                invalid={Boolean(createError)}
                onChange={(event) => setDraft(event.target.value)}
              />
            </Field>
            <DialogFooter>
              <Button type="button" variant="secondary" onClick={closeCreate}>
                Cancelar
              </Button>
              <Button type="submit" disabled={!canCreate}>
                Criar categoria
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function IdentityPanel({ doc, onChange }: { doc: PageDocument; onChange: (updater: (d: PageDocument) => PageDocument) => void }) {
  const brand = getBrandName(doc)
  const warnings = contrastWarnings(doc)
  const setColor = (key: BrandColorKey) => (hex: string) => onChange((d) => setBrandColor(d, key, hex))
  const brandError = brand.trim() === '' ? 'Informe o nome da empresa.' : brand.length > 60 ? 'Use no máximo 60 caracteres.' : undefined
  const titleError = doc.seo.title.trim() === '' ? 'Preencha o título.' : doc.seo.title.length > 70 ? `Use no máximo 70 caracteres (${doc.seo.title.length}).` : undefined
  const descError =
    doc.seo.description.trim() === ''
      ? 'Preencha a descrição.'
      : doc.seo.description.length > 170
        ? `Use no máximo 170 caracteres (${doc.seo.description.length}).`
        : undefined

  return (
    <div className="grid gap-6">
      <Field label="Nome da empresa" htmlFor="brand-name" error={brandError} hint="Aparece no cabeçalho, no rodapé e no painel Sobre." required>
        <Input
          id="brand-name"
          value={brand}
          invalid={Boolean(brandError)}
          aria-describedby={fieldDescribedBy('brand-name', { error: brandError, hint: 'Aparece no cabeçalho, no rodapé e no painel Sobre.' })}
          onChange={(e) => {
            const value = e.target.value
            onChange((d) => setBrandName(d, value))
          }}
        />
      </Field>

      <fieldset className="grid gap-4">
        <legend className="mb-1 text-admin-sm font-medium text-admin-ink">Cores da marca</legend>
        <ColorField key={`p-${doc.theme.colors.primary}`} id="color-primary" label="Cor principal (botões e destaques)" value={doc.theme.colors.primary} onChange={setColor('primary')} />
        <ColorField key={`a-${doc.theme.colors.accent}`} id="color-accent" label="Cor de apoio (gradientes e detalhes)" value={doc.theme.colors.accent} onChange={setColor('accent')} />
        <ColorField
          key={`b-${doc.theme.colors.background}`}
          id="color-background"
          label="Cor de fundo do site (global)"
          value={doc.theme.colors.background}
          onChange={(hex) => onChange((d) => setBackgroundColor(d, hex))}
        />
        <p className="text-admin-xs text-admin-ink-3">
          O fundo vale para todas as seções claras e suaves (as seções escuras e o rodapé mantêm o fundo escuro). A cor dos
          textos, cartões e bordas, e a do texto sobre os botões, é ajustada automaticamente para manter a leitura.
        </p>
        {warnings.map((warning) => (
          <p key={warning} role="status" className="flex gap-2 rounded-admin-md border border-admin-warning/30 bg-admin-warning-soft p-3 text-admin-sm text-admin-ink">
            <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-admin-warning" />
            {warning}
          </p>
        ))}
      </fieldset>

      <fieldset className="grid gap-4">
        <legend className="mb-1 text-admin-sm font-medium text-admin-ink">Google e redes sociais (SEO)</legend>
        <Field label="Título da página" htmlFor="seo-title" error={titleError} hint={`${doc.seo.title.length}/70 · aparece na aba do navegador e no Google`} required>
          <Input
            id="seo-title"
            value={doc.seo.title}
            invalid={Boolean(titleError)}
            onChange={(e) => {
              const title = e.target.value
              onChange((d) => setSeo(d, { title }))
            }}
          />
        </Field>
        <Field label="Descrição" htmlFor="seo-description" error={descError} hint={`${doc.seo.description.length}/170 · resumo exibido nos resultados de busca`} required>
          <Textarea
            id="seo-description"
            rows={3}
            value={doc.seo.description}
            invalid={Boolean(descError)}
            onChange={(e) => {
              const description = e.target.value
              onChange((d) => setSeo(d, { description }))
            }}
          />
        </Field>
      </fieldset>
    </div>
  )
}
