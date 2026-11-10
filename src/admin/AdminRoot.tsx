import '@/admin/admin-fonts.css'
import { QueryClientProvider } from '@tanstack/react-query'
import { Outlet } from 'react-router'
import { AuthProvider } from '@/admin/auth/AuthProvider'
import { queryClient } from '@/admin/query-client'
import { Toaster, TooltipProvider } from '@/admin/ui'

/**
 * Raiz de todo o /admin: dados (React Query), fontes, autenticação, tooltips e toasts.
 * Só existe no chunk administrativo, então nada disso pesa para o visitante do site.
 */
export default function AdminRoot() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider delayDuration={300}>
          <div className="admin-root">
            <Outlet />
            <Toaster />
          </div>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
