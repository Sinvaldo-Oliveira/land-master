import { requireSupabase } from '@/lib/supabase'
import { supabaseErrorMessage } from '@/lib/supabase-errors'
import type { PageDocument } from '@/renderer/types'
import type { Json, PageRow } from '@/types/database'

export type HomePage = Omit<PageRow, 'draft_document'> & { draft_document: PageDocument }

const columns =
  'id, kind, title, slug, status, draft_document, draft_updated_at, draft_updated_by, published_version_id, published_at, created_by, created_at, updated_at'

function asHome(row: PageRow): HomePage {
  return { ...row, draft_document: row.draft_document as unknown as PageDocument }
}

/** Home da instalação ou null se ainda não foi criada. */
export async function fetchHomePage(): Promise<HomePage | null> {
  const { data, error } = await requireSupabase().from('pages').select(columns).eq('kind', 'home').maybeSingle()
  if (error) {
    // 42P01/PGRST205: tabela inexistente — migração do site ainda não aplicada no projeto.
    if (error.code === '42P01' || error.code === 'PGRST205') {
      throw new Error('O banco ainda não tem as tabelas do site. Aplique a migração 20261111120000_site_pages.sql.')
    }
    throw new Error(supabaseErrorMessage(error, 'Não foi possível carregar a página inicial.'))
  }
  return data ? asHome(data) : null
}

export async function createHomeFromTemplate(template: PageDocument): Promise<HomePage> {
  const { data, error } = await requireSupabase().rpc('ensure_home_page', { p_document: template as unknown as Json })
  if (error) throw new Error(supabaseErrorMessage(error, 'Não foi possível criar a página inicial.'))
  return asHome(data)
}

export async function saveHomeDraft(page: HomePage, document: PageDocument): Promise<HomePage> {
  const { data, error } = await requireSupabase().rpc('save_page_draft', {
    p_page_id: page.id,
    p_document: document as unknown as Json,
    p_expected_updated_at: page.draft_updated_at,
  })
  if (error) throw new Error(supabaseErrorMessage(error, 'Não foi possível salvar o rascunho.'))
  return asHome(data)
}

export async function publishHome(pageId: string): Promise<HomePage> {
  const { data, error } = await requireSupabase().rpc('publish_page', { p_page_id: pageId })
  if (error) throw new Error(supabaseErrorMessage(error, 'Não foi possível publicar.'))
  return asHome(data)
}
