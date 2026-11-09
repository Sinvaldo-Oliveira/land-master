function clean(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  // Valores de exemplo do .env.example contêm "<" e não contam como configurados.
  if (!trimmed || trimmed.includes('<')) return undefined
  // Segunda barreira (a primeira é o build, em vite.config.ts): nunca usar nem exibir um segredo.
  if (/sb_secret_|\bsbp_/i.test(trimmed)) return undefined
  return trimmed
}

export const env = {
  supabaseUrl: clean(import.meta.env.VITE_SUPABASE_URL),
  supabaseKey: clean(import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY),
  siteUrl: clean(import.meta.env.VITE_SITE_URL),
  appName: clean(import.meta.env.VITE_APP_NAME) ?? 'Painel de Vendas',
} as const

export const isSupabaseConfigured = Boolean(env.supabaseUrl && env.supabaseKey)
