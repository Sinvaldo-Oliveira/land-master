import { env } from '@/lib/env'
import { migrateDocument, type LandingDocument } from '@/renderer/document-v2'

export type PublishedLanding = { title: string; slug: string; document: LandingDocument }

/** Busca somente a versão publicada; rascunhos e páginas fora do ar retornam null. */
export async function fetchPublishedLanding(slug: string, signal?: AbortSignal): Promise<PublishedLanding | null> {
  if (!env.supabaseUrl || !env.supabaseKey) return null
  const response = await fetch(`${env.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/get_public_landing`, {
    method: 'POST',
    headers: { apikey: env.supabaseKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({ p_slug: slug }),
    ...(signal ? { signal } : {}),
  })
  if (!response.ok) throw new Error(`get_public_landing respondeu ${response.status}`)
  const data = (await response.json()) as { title?: unknown; slug?: unknown; document?: unknown } | null
  const document = migrateDocument(data?.document)
  if (!data || typeof data.title !== 'string' || typeof data.slug !== 'string' || !document) return null
  return { title: data.title, slug: data.slug, document }
}
