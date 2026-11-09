import { isAuthError } from '@supabase/supabase-js'

const messages: Record<string, string> = {
  invalid_credentials: 'E-mail ou senha incorretos.',
  email_not_confirmed: 'Confirme seu e-mail antes de entrar.',
  user_banned: 'Esta conta está desativada. Fale com o administrador.',
  over_request_rate_limit: 'Muitas tentativas. Aguarde alguns minutos e tente novamente.',
  over_email_send_rate_limit: 'Muitos e-mails enviados. Aguarde alguns minutos e tente novamente.',
  weak_password: 'Senha fraca. Use pelo menos 10 caracteres, misturando letras e números.',
  same_password: 'A nova senha precisa ser diferente da atual.',
  session_not_found: 'Sua sessão expirou. Entre novamente.',
  signup_disabled: 'O cadastro público está desativado. Peça um convite ao administrador.',
}

const RATE_LIMITED = 'Muitas tentativas. Aguarde alguns minutos e tente novamente.'
const NETWORK = 'Não foi possível conectar. Verifique sua internet e tente novamente.'
const GENERIC = 'Não foi possível concluir. Tente novamente em instantes.'

/** Converte erros do Supabase Auth em mensagens seguras em pt-BR (sem detalhes técnicos). */
export function authErrorMessage(error: unknown): string {
  if (isAuthError(error)) {
    const known = error.code ? messages[error.code] : undefined
    if (known) return known
    if (error.status === 429) return RATE_LIMITED
  }
  if (error instanceof TypeError) return NETWORK
  return GENERIC
}
