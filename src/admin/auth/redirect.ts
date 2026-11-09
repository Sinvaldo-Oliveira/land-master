const AUTH_PAGES = ['/admin/login', '/admin/recuperar-senha', '/admin/redefinir-senha']

/** Destino pós-login seguro: só caminhos internos do /admin (evita open redirect). */
export function safeAdminRedirect(from: unknown): string {
  if (typeof from !== 'string') return '/admin'
  if (!from.startsWith('/admin') || from.startsWith('//') || from.includes('\\')) return '/admin'
  if (AUTH_PAGES.some((p) => from === p || from.startsWith(`${p}?`))) return '/admin'
  return from
}
