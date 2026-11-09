import type { Page } from '@playwright/test'

/*
 * Simula uma sessão do Supabase Auth para testar o layout autenticado sem serviço real.
 * O projeto "fictício" vem de .env.e2e (https://e2etest.supabase.co); nada sai da máquina:
 * toda requisição para esse host é interceptada aqui.
 */

export type FakeRole = 'admin' | 'manager' | 'sales' | null

const STORAGE_KEY = 'sb-e2etest-auth-token'
const USER_ID = '00000000-0000-4000-8000-0000000000e2'

function base64url(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url')
}

function fakeSession(fullName: string) {
  const exp = Math.floor(Date.now() / 1000) + 3600
  const user = {
    id: USER_ID,
    aud: 'authenticated',
    role: 'authenticated',
    email: 'equipe@exemplo.test',
    user_metadata: { full_name: fullName },
    app_metadata: { provider: 'email' },
    created_at: new Date().toISOString(),
  }
  const accessToken = [
    base64url({ alg: 'HS256', typ: 'JWT' }),
    base64url({ sub: USER_ID, role: 'authenticated', aud: 'authenticated', exp, email: user.email }),
    'assinatura-ficticia',
  ].join('.')
  return { access_token: accessToken, refresh_token: 'refresh-ficticio', token_type: 'bearer', expires_in: 3600, expires_at: exp, user }
}

export async function signInAs(page: Page, role: FakeRole, fullName = 'Marina Costa') {
  const session = fakeSession(fullName)

  await page.route('https://e2etest.supabase.co/**', async (route) => {
    const url = new URL(route.request().url())
    if (url.pathname === '/rest/v1/rpc/current_app_role') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(role) })
    }
    if (url.pathname === '/auth/v1/user') {
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(session.user) })
    }
    if (url.pathname === '/auth/v1/logout') {
      return route.fulfill({ status: 204, body: '' })
    }
    return route.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"não simulado"}' })
  })

  await page.addInitScript(
    ([key, value]) => {
      // Só injeta se ainda não houver sessão: permite testar o logout entre navegações.
      if (!window.sessionStorage.getItem('e2e-session-injected')) {
        window.localStorage.setItem(key, value)
        window.sessionStorage.setItem('e2e-session-injected', '1')
      }
    },
    [STORAGE_KEY, JSON.stringify(session)] as const,
  )
}
