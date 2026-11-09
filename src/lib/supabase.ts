import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import { env, isSupabaseConfigured } from './env'

export type AppSupabaseClient = SupabaseClient<Database>

/**
 * Cliente único do navegador. Usa apenas a chave publicável (anon);
 * toda autorização é garantida pela RLS no banco.
 * É `null` quando o ambiente ainda não foi configurado (.env.local).
 */
export const supabase: AppSupabaseClient | null = isSupabaseConfigured
  ? createClient<Database>(env.supabaseUrl!, env.supabaseKey!, {
      auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: 'pkce' },
    })
  : null

export function requireSupabase(): AppSupabaseClient {
  if (!supabase) throw new Error('Supabase não configurado. Preencha VITE_SUPABASE_URL e VITE_SUPABASE_PUBLISHABLE_KEY.')
  return supabase
}
