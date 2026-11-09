import { ChevronDown, LogOut, Menu } from 'lucide-react'
import { useLocation } from 'react-router'
import { useAuth } from '@/admin/auth/auth-context'
import { matchNavItem, navGroupLabels, roleLabels } from '@/admin/navigation'
import {
  Badge,
  Button,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/admin/ui'

function initials(nameOrEmail: string): string {
  const parts = nameOrEmail.replace(/@.*/, '').split(/[\s._-]+/).filter(Boolean)
  return ((parts[0]?.[0] ?? '') + (parts[1]?.[0] ?? '')).toUpperCase() || '?'
}

export function Topbar({ onOpenMenu }: { onOpenMenu: () => void }) {
  const { user, role, signOut } = useAuth()
  const { pathname } = useLocation()
  const current = matchNavItem(pathname)
  const displayName = (user?.user_metadata?.full_name as string | undefined) || user?.email || 'Usuário'

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-3 border-b border-admin-rule bg-admin-paper/90 px-4 backdrop-blur sm:px-6 lg:px-8">
      <Button variant="ghost" size="icon" className="lg:hidden" onClick={onOpenMenu} aria-label="Abrir menu">
        <Menu aria-hidden="true" className="size-5" />
      </Button>

      {current ? (
        <p className="min-w-0 truncate text-admin-sm text-admin-ink-3">
          <span className="hidden sm:inline">{navGroupLabels[current.group]} / </span>
          <span className="font-medium text-admin-ink">{current.label}</span>
        </p>
      ) : null}

      <div className="ml-auto flex items-center gap-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex min-h-10 items-center gap-2 rounded-admin px-1.5 hover:bg-admin-sunken focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-admin-accent"
              aria-label={`Menu da conta de ${displayName}`}
            >
              <span
                aria-hidden="true"
                className="grid size-8 place-items-center rounded-full bg-admin-ink font-admin-mono text-admin-xs font-medium text-white"
              >
                {initials(displayName)}
              </span>
              <span className="hidden max-w-40 truncate text-admin-sm font-medium md:inline">{displayName}</span>
              <ChevronDown aria-hidden="true" className="size-4 text-admin-ink-3" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-64">
            <DropdownMenuLabel>
              <span className="block truncate font-medium text-admin-ink">{displayName}</span>
              <span className="block truncate text-admin-xs font-normal text-admin-ink-3">{user?.email}</span>
              {role ? (
                <Badge tone="accent" className="mt-2">
                  {roleLabels[role]}
                </Badge>
              ) : null}
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="danger" onSelect={() => void signOut()}>
              <LogOut aria-hidden="true" className="size-4" />
              Sair
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
