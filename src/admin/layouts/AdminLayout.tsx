import { type ReactNode, useState } from 'react'
import { usePersistentState } from '@/admin/hooks/usePersistentState'
import { Sheet, SheetContent } from '@/admin/ui'
import { cn } from '@/lib/cn'
import type { AppRole } from '@/types/database'
import { Sidebar } from './Sidebar'
import { Topbar } from './Topbar'

export function AdminLayout({ role, children }: { role: AppRole; children: ReactNode }) {
  const [collapsed, setCollapsed] = usePersistentState('admin.sidebar.collapsed', false)
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <div className="flex min-h-dvh">
      <a
        href="#conteudo"
        className="fixed top-2 left-2 z-50 -translate-y-20 rounded-admin bg-admin-accent px-4 py-2 text-white focus:translate-y-0"
      >
        Pular para o conteúdo
      </a>

      {/* Desktop: barra lateral fixa e recolhível */}
      <aside
        aria-label="Menu lateral"
        className={cn(
          'sticky top-0 hidden h-dvh shrink-0 transition-[width] duration-200 ease-admin lg:block',
          collapsed ? 'w-16' : 'w-60',
        )}
      >
        <Sidebar role={role} collapsed={collapsed} onToggleCollapsed={() => setCollapsed(!collapsed)} />
      </aside>

      {/* Mobile/tablet: gaveta */}
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" title="Menu" className="w-72 max-w-[85vw] p-0 sm:w-72">
          <Sidebar role={role} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>

      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onOpenMenu={() => setMobileOpen(true)} />
        <main id="conteudo" tabIndex={-1} className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 outline-none sm:px-6 lg:px-8 lg:py-8">
          {children}
        </main>
      </div>
    </div>
  )
}
