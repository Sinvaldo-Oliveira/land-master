import { useQuery } from '@tanstack/react-query'
import {
  Archive,
  ArchiveRestore,
  Copy,
  EllipsisVertical,
  EyeOff,
  FileStack,
  LayoutGrid,
  LayoutTemplate,
  List,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { useMemo, useState } from 'react'
import { Link } from 'react-router'
import { useDocumentTitle } from '@/admin/hooks/useDocumentTitle'
import { usePersistentState } from '@/admin/hooks/usePersistentState'
import {
  Badge,
  Button,
  buttonVariants,
  Card,
  CardBody,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  Skeleton,
  StatCard,
  toast,
  type BadgeTone,
} from '@/admin/ui'
import { cn } from '@/lib/cn'
import { formatDateTime } from '@/lib/format'
import type { LandingPageSummary, PageStatus } from '@/types/database'
import { PUBLIC_PREFIX } from '../schema/page-meta'
import { fetchLandingPages, LANDING_PAGES_KEY, runPageAction } from '../services/pages'
import {
  defaultListView,
  filterAndSort,
  hasActiveFilters,
  pageStats,
  statusLabels,
  type ListView,
  type SortKey,
  type StatusFilter,
} from '../state/page-list'
import { ConfirmActionDialog, DuplicateDialog, EditMetaDialog } from './PageDialogs'

const statusTone: Record<PageStatus, BadgeTone> = {
  draft: 'neutral',
  published: 'success',
  unpublished: 'warning',
  archived: 'neutral',
}

const statusOptions: { value: StatusFilter; label: string }[] = [
  { value: 'active', label: 'Todas (sem arquivadas)' },
  { value: 'draft', label: 'Rascunhos' },
  { value: 'published', label: 'Publicadas' },
  { value: 'unpublished', label: 'Fora do ar' },
  { value: 'archived', label: 'Arquivadas' },
]

const sortOptions: { value: SortKey; label: string }[] = [
  { value: 'updated', label: 'Editadas por último' },
  { value: 'created', label: 'Criadas por último' },
  { value: 'title', label: 'Nome (A–Z)' },
]

type Layout = 'cards' | 'list'
type Pending = { page: LandingPageSummary; action: 'edit' | 'duplicate' | 'unpublish' | 'archive' | 'delete' }

export default function LandingPagesPage() {
  useDocumentTitle('Landing pages')
  const [view, setView] = useState<ListView>(defaultListView)
  const [layout, setLayout] = usePersistentState<Layout>('landing-pages-layout', 'cards')
  const [pending, setPending] = useState<Pending | null>(null)

  const query = useQuery({ queryKey: LANDING_PAGES_KEY, queryFn: fetchLandingPages })
  const pages = query.data
  const stats = useMemo(() => (pages ? pageStats(pages) : null), [pages])
  const visible = useMemo(() => (pages ? filterAndSort(pages, view) : []), [pages, view])
  const filtered = hasActiveFilters(view)

  const restore = async (page: LandingPageSummary) => {
    try {
      await runPageAction('restore', page.id)
      toast.success('Página restaurada como rascunho.')
      await query.refetch()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Não foi possível restaurar a página.', { duration: Infinity })
    }
  }

  const newPageLink = (
    <Link to="/admin/paginas/nova" className={buttonVariants()}>
      <Plus aria-hidden="true" />
      Nova landing page
    </Link>
  )

  return (
    <>
      <PageHeader
        title="Landing pages"
        description="Páginas de venda e captação com endereço próprio."
        actions={newPageLink}
      />

      <section aria-label="Resumo" className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Páginas" value={stats ? String(stats.total) : null} hint="Sem contar as arquivadas" />
        <StatCard label="Publicadas" value={stats ? String(stats.published) : null} />
        <StatCard label="Rascunhos" value={stats ? String(stats.drafts) : null} />
        <StatCard label="Arquivadas" value={stats ? String(stats.archived) : null} />
      </section>

      <div className="mt-6 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-admin-ink-3" />
          <Input
            type="search"
            aria-label="Buscar landing pages"
            placeholder="Buscar por nome ou endereço"
            className="pl-9"
            value={view.search}
            onChange={(event) => setView((v) => ({ ...v, search: event.target.value }))}
          />
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Select
            aria-label="Filtrar por situação"
            className="w-full sm:w-56"
            value={view.status}
            options={statusOptions}
            onValueChange={(value) => setView((v) => ({ ...v, status: value as StatusFilter }))}
          />
          <Select
            aria-label="Ordenar"
            className="w-full sm:w-52"
            value={view.sort}
            options={sortOptions}
            onValueChange={(value) => setView((v) => ({ ...v, sort: value as SortKey }))}
          />
          <div role="radiogroup" aria-label="Modo de exibição" className="inline-flex rounded-admin-lg border border-admin-rule bg-admin-card p-1">
            {(
              [
                { value: 'cards', label: 'Cartões', icon: LayoutGrid },
                { value: 'list', label: 'Lista', icon: List },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={layout === option.value}
                aria-label={option.label}
                title={option.label}
                onClick={() => setLayout(option.value)}
                className="inline-flex size-8 items-center justify-center rounded-admin text-admin-ink-2 aria-checked:bg-admin-ink aria-checked:text-white"
              >
                <option.icon aria-hidden="true" className="size-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        {query.isPending ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3" aria-busy="true">
            {Array.from({ length: 3 }, (_, i) => (
              <Skeleton key={i} className="h-36 w-full" />
            ))}
          </div>
        ) : query.isError ? (
          <Card>
            <ErrorState description={query.error.message} onRetry={() => void query.refetch()} />
          </Card>
        ) : visible.length === 0 ? (
          <Card>
            <CardBody>
              <EmptyState
                icon={FileStack}
                title={filtered ? 'Nenhuma página encontrada' : 'Nenhuma landing page ainda'}
                description={
                  filtered
                    ? 'Ajuste a busca ou o filtro de situação para ver outras páginas.'
                    : 'Crie a primeira página para divulgar uma oferta ou captar contatos.'
                }
                action={filtered ? undefined : newPageLink}
              />
            </CardBody>
          </Card>
        ) : layout === 'cards' ? (
          <ul aria-label="Landing pages" className="grid grid-cols-[minmax(0,1fr)] gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {visible.map((page) => (
              <li key={page.id} className="min-w-0">
                <Card className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <h2 className="font-admin-display text-admin-lg font-semibold break-words text-admin-ink">
                        <Link to={`/admin/paginas/${page.id}`} className="hover:text-admin-accent-hover">
                          {page.title}
                        </Link>
                      </h2>
                      <p className="mt-0.5 truncate font-admin-mono text-admin-sm text-admin-ink-2">
                        {PUBLIC_PREFIX}
                        {page.slug}
                      </p>
                    </div>
                    <PageMenu page={page} onAction={(action) => setPending({ page, action })} onRestore={() => void restore(page)} />
                  </div>
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    <StatusBadges page={page} />
                  </div>
                  <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                    <p className="text-admin-xs text-admin-ink-3">Editada em {formatDateTime(page.draft_updated_at)}</p>
                    <Link to={`/admin/paginas/${page.id}`} className={buttonVariants({ variant: 'secondary', size: 'sm' })}>
                      <Pencil aria-hidden="true" />
                      Editar
                    </Link>
                  </div>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <Card className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-left text-admin-base">
                <caption className="sr-only">Landing pages</caption>
                <thead className="border-b border-admin-rule bg-admin-sunken text-admin-sm text-admin-ink-2">
                  <tr>
                    <th scope="col" className="px-4 py-3 font-medium">Nome</th>
                    <th scope="col" className="px-4 py-3 font-medium">Endereço</th>
                    <th scope="col" className="px-4 py-3 font-medium">Situação</th>
                    <th scope="col" className="px-4 py-3 font-medium">Editada em</th>
                    <th scope="col" className="px-4 py-3"><span className="sr-only">Ações</span></th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((page) => (
                    <tr key={page.id} className="border-b border-admin-rule last:border-0">
                      <th scope="row" className="px-4 py-3 font-medium text-admin-ink">
                        <Link to={`/admin/paginas/${page.id}`} className="hover:text-admin-accent-hover">
                          {page.title}
                        </Link>
                      </th>
                      <td className="px-4 py-3 font-admin-mono text-admin-sm text-admin-ink-2">
                        {PUBLIC_PREFIX}
                        {page.slug}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <StatusBadges page={page} />
                        </div>
                      </td>
                      <td className="px-4 py-3 font-admin-mono text-admin-sm text-admin-ink-2">{formatDateTime(page.draft_updated_at)}</td>
                      <td className="px-2 py-1.5 text-right">
                        <PageMenu page={page} onAction={(action) => setPending({ page, action })} onRestore={() => void restore(page)} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}
      </div>

      {pending?.action === 'edit' ? <EditMetaDialog page={pending.page} onClose={() => setPending(null)} /> : null}
      {pending?.action === 'duplicate' ? <DuplicateDialog page={pending.page} onClose={() => setPending(null)} /> : null}
      {pending && pending.action !== 'edit' && pending.action !== 'duplicate' ? (
        <ConfirmActionDialog page={pending.page} action={pending.action} onClose={() => setPending(null)} />
      ) : null}
    </>
  )
}

function StatusBadges({ page }: { page: LandingPageSummary }) {
  return (
    <>
      <Badge tone={statusTone[page.status]}>{statusLabels[page.status]}</Badge>
      {page.has_unpublished_changes ? <Badge tone="info">Alterações não publicadas</Badge> : null}
    </>
  )
}

type PageMenuProps = {
  page: LandingPageSummary
  onAction: (action: Pending['action']) => void
  onRestore: () => void
}

function PageMenu({ page, onAction, onRestore }: PageMenuProps) {
  const archived = page.status === 'archived'
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={`Ações de ${page.title}`} className={cn('size-8 shrink-0')}>
          <EllipsisVertical aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        <DropdownMenuItem asChild>
          <Link to={`/admin/paginas/${page.id}`}>
            <LayoutTemplate aria-hidden="true" />
            Editar página
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction('edit')}>
          <Pencil aria-hidden="true" />
          Renomear e endereço
        </DropdownMenuItem>
        <DropdownMenuItem onSelect={() => onAction('duplicate')}>
          <Copy aria-hidden="true" />
          Duplicar
        </DropdownMenuItem>
        {page.status === 'published' ? (
          <DropdownMenuItem onSelect={() => onAction('unpublish')}>
            <EyeOff aria-hidden="true" />
            Tirar do ar
          </DropdownMenuItem>
        ) : null}
        {archived ? (
          <DropdownMenuItem onSelect={onRestore}>
            <ArchiveRestore aria-hidden="true" />
            Restaurar
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem onSelect={() => onAction('archive')}>
            <Archive aria-hidden="true" />
            Arquivar
          </DropdownMenuItem>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem variant="danger" onSelect={() => onAction('delete')}>
          <Trash2 aria-hidden="true" />
          Excluir
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
