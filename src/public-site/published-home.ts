import { env } from '@/lib/env'
import { isPageDocument } from '@/renderer/validate'
import type { PageDocument } from '@/renderer/types'

/**
 * Busca a Home publicada pela RPC pública get_public_site().
 * Usa fetch direto (e não o supabase-js) para manter o bundle público pequeno.
 * Retorna null quando não há Supabase configurado ou nenhuma Home publicada.
 */
export async function fetchPublishedHome(signal?: AbortSignal): Promise<PageDocument | null> {
  if (!env.supabaseUrl || !env.supabaseKey) return null
  const response = await fetch(`${env.supabaseUrl.replace(/\/$/, '')}/rest/v1/rpc/get_public_site`, {
    method: 'POST',
    headers: { apikey: env.supabaseKey, 'Content-Type': 'application/json' },
    body: '{}',
    ...(signal ? { signal } : {}),
  })
  if (!response.ok) throw new Error(`get_public_site respondeu ${response.status}`)
  const data = (await response.json()) as { home?: unknown } | null
  return isPageDocument(data?.home) ? data.home : null
}
