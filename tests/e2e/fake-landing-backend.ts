import type { Page } from '@playwright/test'
import type { FakeRole } from './fake-supabase'

/*
 * Backend FALSO em memória das landing pages: imita as RPCs da migração
 * 20261111160000_landing_pages_management.sql e a leitura de public.pages pelo id.
 * Repete as regras que as telas precisam respeitar (só admin, endereço único, confirmação para
 * trocar endereço no ar, conflito de rascunho). A segurança real (RLS) é coberta pelo pgTAP.
 */

export type Row = {
  id: string
  title: string
  slug: string
  status: 'draft' | 'published' | 'unpublished' | 'archived'
  draft_document: unknown
  draft_updated_at: string
  published_at: string | null
  archived_at: string | null
  created_at: string
}

export type Backend = { rows: Row[]; calls: { name: string; body: Record<string, unknown> }[] }

const RPCS = 'save_page_draft|publish_page|get_public_landing|list_landing_pages|create_landing_page|duplicate_page|update_page_meta|unpublish_page|archive_page|restore_page|delete_page'

export async function fakeLandingBackend(page: Page, role: FakeRole, seed: Partial<Row>[] = []): Promise<Backend> {
  let clock = Date.parse('2026-11-01T12:00:00Z')
  const tick = () => new Date((clock += 60_000)).toISOString()
  const backend: Backend = { rows: [], calls: [] }
  const published = new Map<string, unknown>()
  for (const [index, partial] of seed.entries()) {
    const now = tick()
    backend.rows.push({
      id: `seed-${index + 1}`, title: `Página ${index + 1}`, slug: `pagina-${index + 1}`, status: 'draft',
      draft_document: { schemaVersion: 2, blocks: [] }, draft_updated_at: now, published_at: null, archived_at: null, created_at: now,
      ...partial,
    })
  }

  const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })
  const fail = (code: string, message: string) => json({ code, message }, 400)
  const taken = (slug: unknown, ignoreId?: string) => backend.rows.some((row) => row.slug === slug && row.id !== ignoreId)
  const duplicateSlug = (slug: unknown) => fail('P0001', `Já existe uma página com o endereço /lp/${String(slug)}. Escolha outro.`)

  await page.route(new RegExp(`https://e2etest\\.supabase\\.co/rest/v1/(pages|rpc/(${RPCS}))`), async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const body = (request.postDataJSON() ?? {}) as Record<string, unknown>

    if (path === '/rest/v1/pages') {
      const query = new URL(request.url()).searchParams
      const wantsObject = (request.headers()['accept'] ?? '').includes('vnd.pgrst.object')
      const id = query.get('id')?.slice('eq.'.length)
      // Sem filtro de id é a busca da Home (ainda não criada: a página nova usa o tema padrão).
      const found = id && role === 'admin' ? backend.rows.filter((item) => item.id === id) : []
      if (!wantsObject) return route.fulfill(json(found))
      return route.fulfill(found[0] ? json(found[0]) : json({ code: 'PGRST116', message: '0 rows' }, 406))
    }

    const name = path.split('/').pop() ?? ''
    backend.calls.push({ name, body })
    if (name === 'get_public_landing') {
      const row = backend.rows.find((item) => item.slug === body.p_slug && item.status === 'published')
      const document = row ? published.get(row.id) : null
      return route.fulfill(json(row && document ? { title: row.title, slug: row.slug, document } : null))
    }
    if (role !== 'admin') return route.fulfill(json({ code: '42501', message: 'Apenas administradores.' }, 403))

    const row = backend.rows.find((item) => item.id === body.p_page_id)
    const missing = () => route.fulfill(fail('P0002', 'Página não encontrada.'))

    switch (name) {
      case 'list_landing_pages':
        return route.fulfill(
          json(
            backend.rows.map(({ draft_document: _document, ...rest }) => ({
              ...rest,
              has_unpublished_changes: rest.status === 'published' && rest.published_at !== null && rest.draft_updated_at > rest.published_at,
            })),
          ),
        )
      case 'create_landing_page':
      case 'duplicate_page': {
        if (name === 'duplicate_page' && !row) return missing()
        if (taken(body.p_slug)) return route.fulfill(duplicateSlug(body.p_slug))
        const now = tick()
        const created: Row = {
          id: `page-${backend.rows.length + 1}`, title: String(body.p_title).trim(), slug: String(body.p_slug), status: 'draft',
          draft_document: row ? row.draft_document : body.p_document,
          draft_updated_at: now, published_at: null, archived_at: null, created_at: now,
        }
        backend.rows.push(created)
        return route.fulfill(json(created))
      }
      case 'save_page_draft':
        if (!row) return missing()
        if (body.p_expected_updated_at && body.p_expected_updated_at !== row.draft_updated_at) {
          return route.fulfill(fail('P0001', 'O rascunho foi alterado em outra sessão. Recarregue a página para ver a versão mais recente.'))
        }
        row.draft_document = body.p_document
        row.draft_updated_at = tick()
        return route.fulfill(json(row))
      case 'publish_page':
        if (!row) return missing()
        published.set(row.id, structuredClone(row.draft_document))
        row.status = 'published'
        row.published_at = tick()
        return route.fulfill(json(row))
      case 'update_page_meta':
        if (!row) return missing()
        if (taken(body.p_slug, row.id)) return route.fulfill(duplicateSlug(body.p_slug))
        if (row.status === 'published' && row.slug !== body.p_slug && body.p_confirm_slug_change !== true) {
          return route.fulfill(fail('P0001', 'Esta página está no ar. Confirme a troca de endereço.'))
        }
        row.title = String(body.p_title).trim()
        row.slug = String(body.p_slug)
        return route.fulfill(json(row))
      case 'unpublish_page':
        if (!row || row.status !== 'published') return missing()
        row.status = 'unpublished'
        return route.fulfill(json(row))
      case 'archive_page':
        if (!row || row.status === 'archived') return missing()
        row.status = 'archived'
        row.archived_at = tick()
        return route.fulfill(json(row))
      case 'restore_page':
        if (!row || row.status !== 'archived') return missing()
        row.status = 'draft'
        row.archived_at = null
        return route.fulfill(json(row))
      case 'delete_page':
        if (!row) return missing()
        backend.rows = backend.rows.filter((item) => item.id !== row.id)
        return route.fulfill({ status: 204, body: '' })
      default:
        return route.fallback()
    }
  })
  return backend
}
