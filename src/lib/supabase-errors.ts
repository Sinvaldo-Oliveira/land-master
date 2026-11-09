/** Código de erro do PostgREST/Postgres quando a RLS ou um privilégio bloqueia a operação. */
const PERMISSION_DENIED = '42501'

type ErrorLike = { code?: string; message?: string } | null | undefined

/**
 * Converte erros do Supabase em mensagens para a equipe.
 * Mensagens de regra de negócio (P0001) vêm do banco já em português e são exibidas como estão.
 * Detalhes técnicos nunca são exibidos para o usuário.
 */
export function supabaseErrorMessage(error: unknown, fallback = 'Não foi possível concluir a ação. Tente novamente.'): string {
  const err = error as ErrorLike
  if (err?.code === PERMISSION_DENIED) return 'Seu perfil não permite esta ação.'
  if (err?.code === 'P0001' && err.message) return err.message
  if (err?.code === 'P0002' && err.message) return err.message
  return fallback
}
