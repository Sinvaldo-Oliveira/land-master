import { describe, expect, it } from 'vitest'
import type { LandingPageSummary, PageStatus } from '@/types/database'
import { defaultListView, filterAndSort, hasActiveFilters, pageStats } from './page-list'

function page(id: string, title: string, status: PageStatus, day: number, createdDay = day): LandingPageSummary {
  const iso = (d: number) => `2026-11-${String(d).padStart(2, '0')}T12:00:00+00:00`
  return {
    id,
    title,
    slug: id,
    status,
    draft_updated_at: iso(day),
    published_at: null,
    archived_at: null,
    created_at: iso(createdDay),
    has_unpublished_changes: false,
  }
}

const pages = [
  page('black-friday', 'Black Friday', 'published', 3, 1),
  page('aula-gratis', 'Aula grátis', 'draft', 5, 2),
  page('promocao-verao', 'Promoção de verão', 'draft', 4, 6),
  page('antiga', 'Campanha antiga', 'archived', 9),
  page('pausada', 'Zeladoria', 'unpublished', 2),
]
const ids = (list: LandingPageSummary[]) => list.map((p) => p.id)

describe('pageStats', () => {
  it('conta por situação; o total não inclui as arquivadas', () => {
    expect(pageStats(pages)).toEqual({ total: 4, published: 1, drafts: 2, archived: 1 })
    expect(pageStats([])).toEqual({ total: 0, published: 0, drafts: 0, archived: 0 })
  })
})

describe('filterAndSort', () => {
  it('visão padrão: esconde as arquivadas e ordena pela edição mais recente', () => {
    expect(ids(filterAndSort(pages, defaultListView))).toEqual(['aula-gratis', 'promocao-verao', 'black-friday', 'pausada'])
  })

  it('filtra por situação, inclusive arquivadas', () => {
    expect(ids(filterAndSort(pages, { ...defaultListView, status: 'draft' }))).toEqual(['aula-gratis', 'promocao-verao'])
    expect(ids(filterAndSort(pages, { ...defaultListView, status: 'archived' }))).toEqual(['antiga'])
  })

  it('busca por nome sem depender de acento ou maiúscula, e por endereço', () => {
    expect(ids(filterAndSort(pages, { ...defaultListView, search: 'PROMOCAO' }))).toEqual(['promocao-verao'])
    expect(ids(filterAndSort(pages, { ...defaultListView, search: 'gratis' }))).toEqual(['aula-gratis'])
    expect(ids(filterAndSort(pages, { ...defaultListView, search: 'black-fr' }))).toEqual(['black-friday'])
    expect(filterAndSort(pages, { ...defaultListView, search: 'inexistente' })).toEqual([])
  })

  it('ordena por criação e por nome', () => {
    expect(ids(filterAndSort(pages, { ...defaultListView, sort: 'created' }))).toEqual(['promocao-verao', 'aula-gratis', 'pausada', 'black-friday'])
    expect(ids(filterAndSort(pages, { ...defaultListView, sort: 'title' }))).toEqual(['aula-gratis', 'black-friday', 'promocao-verao', 'pausada'])
  })

  it('não altera a lista original', () => {
    const before = ids(pages)
    filterAndSort(pages, { ...defaultListView, sort: 'title' })
    expect(ids(pages)).toEqual(before)
  })
})

describe('hasActiveFilters', () => {
  it('só considera busca preenchida ou filtro diferente do padrão', () => {
    expect(hasActiveFilters(defaultListView)).toBe(false)
    expect(hasActiveFilters({ ...defaultListView, search: '  ' })).toBe(false)
    expect(hasActiveFilters({ ...defaultListView, search: 'a' })).toBe(true)
    expect(hasActiveFilters({ ...defaultListView, status: 'archived' })).toBe(true)
    expect(hasActiveFilters({ ...defaultListView, sort: 'title' })).toBe(false)
  })
})
