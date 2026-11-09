import { describe, expect, it } from 'vitest'
import { canAccessPath, matchNavItem, navForRole } from './navigation'

describe('navegação do admin', () => {
  it('associa subrotas ao item mais específico', () => {
    expect(matchNavItem('/admin/crm/funil/123')?.to).toBe('/admin/crm')
    expect(matchNavItem('/admin')?.to).toBe('/admin')
    expect(matchNavItem('/admin/')?.to).toBe('/admin')
  })

  it('operador comercial não acessa site, páginas, formulários, relatórios e configurações', () => {
    for (const path of ['/admin/site', '/admin/paginas/1/editar', '/admin/formularios', '/admin/relatorios', '/admin/configuracoes']) {
      expect(canAccessPath(path, 'sales')).toBe(false)
    }
    expect(canAccessPath('/admin/crm', 'sales')).toBe(true)
  })

  it('gestor acessa relatórios mas não configurações', () => {
    expect(canAccessPath('/admin/relatorios', 'manager')).toBe(true)
    expect(canAccessPath('/admin/configuracoes', 'manager')).toBe(false)
  })

  it('administrador vê todos os itens', () => {
    expect(navForRole('admin')).toHaveLength(8)
    expect(navForRole('sales').map((i) => i.label)).toEqual(['Painel', 'Contatos', 'CRM'])
  })
})
