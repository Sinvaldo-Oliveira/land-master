import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowDown, ArrowLeft, ArrowUp, ChevronRight, ExternalLink, Eye, EyeOff, Globe, Monitor, Palette, Plus, Smartphone, Tablet, TriangleAlert } from 'lucide-react'
import { useEffect, useState, type ReactNode } from 'react'
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
  isMovable,
  MAX_SECTIONS,
  moveSection,
  replaceSection,
  setBrandColor,
  setBrandName,
  setSeo,
  toggleHidden,
  type BrandColorKey,
} from './editor-state'
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
                onMove={(id, dir) => setDoc((d) => moveSection(d, id, dir))}
                onAdd={(kind) => {
                  const { doc: next, id } = kind === 'interactive-hero' ? addInteractiveHeroSection(doc) : addImageSection(doc)
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

function SectionList({
  doc,
  onIdentity,
  onSelect,
  onToggle,
  onMove,
  onAdd,
}: {
  doc: PageDocument
  onIdentity: () => void
  onSelect: (section: Section) => void
  onToggle: (id: string) => void
  onMove: (id: string, direction: -1 | 1) => void
  onAdd: (kind: 'image-card' | 'interactive-hero') => void
}) {
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
        <div className="mb-2 flex items-center justify-between gap-2">
          <h2 className="text-admin-xs font-medium tracking-wide text-admin-ink-3 uppercase">Seções da página</h2>
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
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <ol className="grid grid-cols-[minmax(0,1fr)] gap-2">
          {doc.sections.map((section, index) => {
            const movable = isMovable(section)
            const label = sectionName(section)
            const prev = doc.sections[index - 1]
            const next = doc.sections[index + 1]
            return (
              <li
                key={section.id}
                className="flex items-center gap-2 rounded-admin-lg border border-admin-rule bg-admin-card p-2 data-[hidden=true]:bg-admin-sunken/60"
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
                  <span className="block truncate text-admin-sm text-admin-ink-2">{sectionSummary(section)}</span>
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
                  </div>
                ) : (
                  <span className="shrink-0 px-2 text-admin-xs text-admin-ink-3">Fixo</span>
                )}
              </li>
            )
          })}
        </ol>
      </div>
    </div>
  )
}

const HEX = /^#[0-9a-fA-F]{6}$/

function ColorField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (hex: string) => void }) {
  // Remontado via key quando a cor muda pelo seletor, então o texto sempre parte do valor atual.
  const [text, setText] = useState(value)
  const error = HEX.test(text) ? undefined : 'Use o formato #RRGGBB.'
  return (
    <Field label={label} htmlFor={id} error={error}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} (seletor)`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-admin border border-admin-rule bg-admin-card p-1"
        />
        <Input
          id={id}
          value={text}
          invalid={Boolean(error)}
          aria-describedby={fieldDescribedBy(id, { error })}
          onChange={(e) => {
            setText(e.target.value)
            if (HEX.test(e.target.value)) onChange(e.target.value.toLowerCase())
          }}
          className="font-admin-mono"
        />
      </div>
    </Field>
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
        <p className="text-admin-xs text-admin-ink-3">A cor do texto sobre os botões é escolhida automaticamente para manter a leitura.</p>
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
