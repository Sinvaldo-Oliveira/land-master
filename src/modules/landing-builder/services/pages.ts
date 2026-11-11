import { requireSupabase } from '@/lib/supabase'
import { supabaseErrorMessage } from '@/lib/supabase-errors'
import { fetchHomePage } from '@/modules/home/api'
import { createEmptyLanding, type LandingDocument } from '@/renderer/document-v2'
import { horizonteTheme } from '@/renderer/templates/institucional'
import type { SiteTheme } from '@/renderer/types'
import type { Json, LandingPageSummary } from '@/types/database'
import { validateLandingDocument } from '../schema/document'
import type { PageMetaValues } from '../schema/page-meta'

/** Chave do React Query para a lista de landing pages. */
export const LANDING_PAGES_KEY = ['landing-pages'] as const

type ErrorLike = { code?: string; message?: string } | null

const MIGRATION_HINT =
  'O banco ainda não tem as funções das landing pages. Rode o script supabase/RODAR_NO_SQL_EDITOR_landing_etapa1.sql no SQL Editor do Supabase.'

/** PGRST202 / 42883: função inexistente — a migração da Etapa 1 ainda não foi aplicada neste projeto. */
function message(error: ErrorLike, fallback: string): string {
  if (error?.code === 'PGRST202' || error?.code === '42883') return MIGRATION_HINT
  return supabaseErrorMessage(error, fallback)
}

export async function fetchLandingPages(): Promise<LandingPageSummary[]> {
  const { data, error } = await requireSupabase().rpc('list_landing_pages')
  if (error) throw new Error(message(error, 'Não foi possível carregar as landing pages.'))
  return data
}

/**
 * Tema inicial de uma página nova: o do site (rascunho da Home), para a landing nascer com a marca.
 * Sem Home criada, usa o tema padrão. O kit de identidade global entra na Etapa 4.
 */
async function initialTheme(): Promise<SiteTheme> {
  try {
    return (await fetchHomePage())?.draft_document.theme ?? horizonteTheme
  } catch {
    return horizonteTheme
  }
}

/** Cria uma landing em branco. O documento é validado aqui e de novo no banco. */
export async function createBlankLandingPage(meta: PageMetaValues): Promise<{ id: string }> {
  const document: LandingDocument = createEmptyLanding(meta.title, await initialTheme())
  const issues = validateLandingDocument(document)
  if (issues[0]) throw new Error(issues[0].message)

  const { data, error } = await requireSupabase().rpc('create_landing_page', {
    p_title: meta.title,
    p_slug: meta.slug,
    p_document: document as unknown as Json,
  })
  if (error) throw new Error(message(error, 'Não foi possível criar a página.'))
  return { id: data.id }
}

export async function duplicateLandingPage(pageId: string, meta: PageMetaValues): Promise<void> {
  const { error } = await requireSupabase().rpc('duplicate_page', {
    p_page_id: pageId,
    p_title: meta.title,
    p_slug: meta.slug,
  })
  if (error) throw new Error(message(error, 'Não foi possível duplicar a página.'))
}

export async function updateLandingMeta(pageId: string, meta: PageMetaValues, confirmSlugChange: boolean): Promise<void> {
  const { error } = await requireSupabase().rpc('update_page_meta', {
    p_page_id: pageId,
    p_title: meta.title,
    p_slug: meta.slug,
    p_confirm_slug_change: confirmSlugChange,
  })
  if (error) throw new Error(message(error, 'Não foi possível salvar as alterações.'))
}

export type PageAction = 'unpublish' | 'archive' | 'restore' | 'delete'

const actionRpc = {
  unpublish: 'unpublish_page',
  archive: 'archive_page',
  restore: 'restore_page',
  delete: 'delete_page',
} as const

const actionFallback: Record<PageAction, string> = {
  unpublish: 'Não foi possível tirar a página do ar.',
  archive: 'Não foi possível arquivar a página.',
  restore: 'Não foi possível restaurar a página.',
  delete: 'Não foi possível excluir a página.',
}

export async function runPageAction(action: PageAction, pageId: string): Promise<void> {
  const { error } = await requireSupabase().rpc(actionRpc[action], { p_page_id: pageId })
  if (error) throw new Error(message(error, actionFallback[action]))
}
