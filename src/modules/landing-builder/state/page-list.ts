import type { LandingPageSummary, PageStatus } from '@/types/database'

/** "active" = tudo que não está arquivado (visão padrão da lista). */
export type StatusFilter = 'active' | PageStatus
export type SortKey = 'updated' | 'created' | 'title'

export type ListView = { search: string; status: StatusFilter; sort: SortKey }

export const defaultListView: ListView = { search: '', status: 'active', sort: 'updated' }

export const statusLabels: Record<PageStatus, string> = {
  draft: 'Rascunho',
  published: 'Publicada',
  unpublished: 'Fora do ar',
  archived: 'Arquivada',
}

export type PageStats = { total: number; published: number; drafts: number; archived: number }

/** Indicadores do topo: contagens reais da lista. "Total" não conta as arquivadas. */
export function pageStats(pages: readonly LandingPageSummary[]): PageStats {
  const count = (status: PageStatus) => pages.filter((page) => page.status === status).length
  const archived = count('archived')
  return { total: pages.length - archived, published: count('published'), drafts: count('draft'), archived }
}

/** Comparação sem acentos e sem diferença de maiúsculas ("promocao" encontra "Promoção"). */
function fold(text: string): string {
  return text.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
}

const collator = new Intl.Collator('pt-BR', { sensitivity: 'base', numeric: true })

export function filterAndSort(pages: readonly LandingPageSummary[], view: ListView): LandingPageSummary[] {
  const term = fold(view.search.trim())
  const visible = pages.filter((page) => {
    const statusMatch = view.status === 'active' ? page.status !== 'archived' : page.status === view.status
    return statusMatch && (term === '' || fold(page.title).includes(term) || page.slug.includes(term))
  })
  return visible.sort((a, b) => {
    if (view.sort === 'title') return collator.compare(a.title, b.title)
    const key = view.sort === 'created' ? 'created_at' : 'draft_updated_at'
    return Date.parse(b[key]) - Date.parse(a[key])
  })
}

export function hasActiveFilters(view: ListView): boolean {
  return view.search.trim() !== '' || view.status !== 'active'
}
