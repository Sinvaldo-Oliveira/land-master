import { ExternalLink, PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { NavLink } from 'react-router'
import { navForRole, navGroupLabels, type NavItem } from '@/admin/navigation'
import { Tooltip } from '@/admin/ui'
import { cn } from '@/lib/cn'
import { env } from '@/lib/env'
import type { AppRole } from '@/types/database'
import { BrandMark } from './BrandMark'

type SidebarProps = {
  role: AppRole
  collapsed?: boolean
  onToggleCollapsed?: () => void
  onNavigate?: () => void
}

const groupOrder: NavItem['group'][] = ['main', 'site', 'system']

export function Sidebar({ role, collapsed = false, onToggleCollapsed, onNavigate }: SidebarProps) {
  const items = navForRole(role)

  return (
    <div className="flex h-full flex-col bg-admin-ink text-white">
      <div className={cn('flex h-14 shrink-0 items-center gap-3 border-b border-white/10', collapsed ? 'justify-center px-2' : 'px-5')}>
        <BrandMark className="size-7 text-white/10" />
        {!collapsed && <span className="truncate font-admin-display text-admin-lg font-semibold tracking-tight">{env.appName}</span>}
      </div>

      <nav aria-label="Navegação do painel" className="flex-1 overflow-y-auto py-4">
        {groupOrder.map((group) => {
          const groupItems = items.filter((i) => i.group === group)
          if (groupItems.length === 0) return null
          return (
            <div key={group} className="mb-5">
              {collapsed ? (
                <div aria-hidden="true" className="mx-4 mb-2 h-px bg-white/10" />
              ) : (
                <p className="mb-1.5 px-5 font-admin-mono text-admin-xs tracking-wider text-white/40 uppercase">
                  {navGroupLabels[group]}
                </p>
              )}
              <ul className="grid gap-0.5 px-2">
                {groupItems.map((item) => (
                  <li key={item.to}>
                    <SidebarLink item={item} collapsed={collapsed} onNavigate={onNavigate} />
                  </li>
                ))}
              </ul>
            </div>
          )
        })}
      </nav>

      <div className="grid shrink-0 gap-0.5 border-t border-white/10 p-2">
        <a
          href="/"
          target="_blank"
          rel="noopener noreferrer"
          className={cn(itemClass, 'text-white/65 hover:bg-white/5 hover:text-white', collapsed && 'justify-center')}
        >
          <ExternalLink aria-hidden="true" className="size-4 shrink-0" />
          {collapsed ? <span className="sr-only">Ver site (abre em nova aba)</span> : <span>Ver site</span>}
        </a>
        {onToggleCollapsed ? (
          <button
            type="button"
            onClick={onToggleCollapsed}
            aria-label={collapsed ? 'Expandir menu lateral' : 'Recolher menu lateral'}
            className={cn(itemClass, 'text-white/65 hover:bg-white/5 hover:text-white', collapsed && 'justify-center')}
          >
            {collapsed ? <PanelLeftOpen aria-hidden="true" className="size-4" /> : <PanelLeftClose aria-hidden="true" className="size-4" />}
            {!collapsed && <span>Recolher</span>}
          </button>
        ) : null}
      </div>
    </div>
  )
}

const itemClass =
  'relative flex min-h-10 w-full items-center gap-3 rounded-admin px-3 text-admin-base transition-colors duration-150 ease-admin focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent'

function SidebarLink({ item, collapsed, onNavigate }: { item: NavItem; collapsed: boolean; onNavigate?: () => void }) {
  const Icon = item.icon
  const link = (
    <NavLink
      to={item.to}
      end={item.to === '/admin'}
      onClick={onNavigate}
      className={({ isActive }) =>
        cn(
          itemClass,
          collapsed && 'justify-center',
          isActive
            ? 'bg-white/[0.07] font-medium text-white before:absolute before:inset-y-1.5 before:left-0 before:w-[3px] before:rounded-full before:bg-admin-accent'
            : 'text-white/65 hover:bg-white/5 hover:text-white',
        )
      }
    >
      <Icon aria-hidden="true" className="size-4 shrink-0" />
      {collapsed ? <span className="sr-only">{item.label}</span> : <span className="truncate">{item.label}</span>}
    </NavLink>
  )
  return collapsed ? (
    <Tooltip content={item.label} side="right">
      {link}
    </Tooltip>
  ) : (
    link
  )
}
