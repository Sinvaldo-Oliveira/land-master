/**
 * Toda variável VITE_* é embutida no JavaScript entregue ao navegador.
 * Este guarda impede que um segredo vá parar no build por engano
 * (ex.: chave secreta do Supabase colada em VITE_APP_NAME).
 */
const SECRET_PATTERNS: { name: string; test: (value: string) => boolean }[] = [
  { name: 'chave secreta do Supabase (sb_secret_)', test: (v) => /sb_secret_/i.test(v) },
  { name: 'token de acesso do Supabase (sbp_)', test: (v) => /\bsbp_[A-Za-z0-9]/.test(v) },
  {
    name: 'JWT com papel service_role',
    test: (v) => {
      const parts = v.trim().split('.')
      if (parts.length !== 3 || !parts[1]) return false
      try {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as { role?: string }
        return payload.role === 'service_role'
      } catch {
        return false
      }
    },
  },
  { name: 'chave privada', test: (v) => /-----BEGIN [A-Z ]*PRIVATE KEY-----/.test(v) },
]

/** Retorna os problemas encontrados (nome da variável + tipo), sem nunca incluir o valor. */
export function findPublicEnvSecrets(env: Record<string, string | undefined>): string[] {
  const problems: string[] = []
  for (const [key, value] of Object.entries(env)) {
    if (!key.startsWith('VITE_') || !value) continue
    for (const pattern of SECRET_PATTERNS) {
      if (pattern.test(value)) problems.push(`${key}: parece ${pattern.name}`)
    }
  }
  return problems
}
