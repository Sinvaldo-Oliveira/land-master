import { describe, expect, it } from 'vitest'
import { findPublicEnvSecrets } from './public-env-guard'

const jwt = (payload: object) =>
  ['eyJhbGciOiJIUzI1NiJ9', Buffer.from(JSON.stringify(payload)).toString('base64url'), 'assinatura'].join('.')

describe('findPublicEnvSecrets', () => {
  it('detecta chave secreta em qualquer variável VITE_ sem expor o valor', () => {
    const problems = findPublicEnvSecrets({ VITE_APP_NAME: 'sb_secret_abc123' })
    expect(problems).toEqual(['VITE_APP_NAME: parece chave secreta do Supabase (sb_secret_)'])
    expect(problems.join(' ')).not.toContain('abc123')
  })

  it('detecta token de acesso e JWT service_role', () => {
    expect(findPublicEnvSecrets({ VITE_X: 'sbp_0123456789abcdef' })).toHaveLength(1)
    expect(findPublicEnvSecrets({ VITE_SUPABASE_PUBLISHABLE_KEY: jwt({ role: 'service_role' }) })).toHaveLength(1)
  })

  it('aceita valores públicos legítimos e ignora variáveis sem prefixo VITE_', () => {
    expect(
      findPublicEnvSecrets({
        VITE_SUPABASE_URL: 'https://abcdefghijklmnopqrst.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'sb_publishable_abc',
        VITE_LEGACY_ANON: jwt({ role: 'anon' }),
        VITE_APP_NAME: 'Painel de Vendas',
        TOKEN: 'sbp_nao_e_publica',
      }),
    ).toEqual([])
  })
})
