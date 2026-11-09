import { describe, expect, it } from 'vitest'
import { safeAdminRedirect } from './redirect'

describe('safeAdminRedirect', () => {
  it('mantém caminhos internos do admin', () => {
    expect(safeAdminRedirect('/admin/crm?etapa=2')).toBe('/admin/crm?etapa=2')
  })
  it('bloqueia destinos externos ou malformados', () => {
    for (const bad of ['https://evil.com', '//evil.com', '/admin\\..\\x', '/', '/outra', 42, null, undefined]) {
      expect(safeAdminRedirect(bad)).toBe('/admin')
    }
  })
  it('não volta para as próprias telas de acesso', () => {
    expect(safeAdminRedirect('/admin/login')).toBe('/admin')
    expect(safeAdminRedirect('/admin/redefinir-senha?code=x')).toBe('/admin')
  })
})
