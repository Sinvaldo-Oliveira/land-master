import {
  ChartColumn,
  ClipboardList,
  Contact,
  FileStack,
  Globe,
  LayoutDashboard,
  Settings,
  SquareKanban,
  type LucideIcon,
} from 'lucide-react'
import type { AppRole } from '@/types/database'

export type NavItem = {
  to: string
  label: string
  icon: LucideIcon
  roles: readonly AppRole[]
  group: 'main' | 'site' | 'system'
}

const ALL: readonly AppRole[] = ['admin', 'manager', 'sales']

/**
 * Fonte única da navegação e da visibilidade por perfil (UX).
 * A autorização real é feita pela RLS no banco — esconder um item não protege dados.
 */
export const adminNav: readonly NavItem[] = [
  { to: '/admin', label: 'Painel', icon: LayoutDashboard, roles: ALL, group: 'main' },
  { to: '/admin/contatos', label: 'Contatos', icon: Contact, roles: ALL, group: 'main' },
  { to: '/admin/crm', label: 'CRM', icon: SquareKanban, roles: ALL, group: 'main' },
  { to: '/admin/relatorios', label: 'Relatórios', icon: ChartColumn, roles: ['admin', 'manager'], group: 'main' },
  { to: '/admin/site', label: 'Site', icon: Globe, roles: ['admin'], group: 'site' },
  { to: '/admin/paginas', label: 'Landing pages', icon: FileStack, roles: ['admin'], group: 'site' },
  { to: '/admin/formularios', label: 'Formulários', icon: ClipboardList, roles: ['admin'], group: 'site' },
  { to: '/admin/configuracoes', label: 'Configurações', icon: Settings, roles: ['admin'], group: 'system' },
]

export const navGroupLabels: Record<NavItem['group'], string> = {
  main: 'Comercial',
  site: 'Site e captação',
  system: 'Sistema',
}

export const roleLabels: Record<AppRole, string> = {
  admin: 'Administrador',
  manager: 'Gestor',
  sales: 'Operador comercial',
}

/** Item de navegação que corresponde ao caminho (o mais específico vence). */
export function matchNavItem(pathname: string): NavItem | undefined {
  const normalized = pathname.replace(/\/+$/, '') || '/'
  return [...adminNav]
    .sort((a, b) => b.to.length - a.to.length)
    .find((item) => normalized === item.to || normalized.startsWith(`${item.to}/`))
}

export function navForRole(role: AppRole): NavItem[] {
  return adminNav.filter((item) => item.roles.includes(role))
}

export function canAccessPath(pathname: string, role: AppRole): boolean {
  const item = matchNavItem(pathname)
  return item ? item.roles.includes(role) : true
}
