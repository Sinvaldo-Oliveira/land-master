import '@/admin/admin-fonts.css'
import { Outlet } from 'react-router'
import { AuthProvider } from '@/admin/auth/AuthProvider'
import { Toaster, TooltipProvider } from '@/admin/ui'

/** Raiz de todo o /admin: fontes, autenticação, tooltips e toasts — só existe no chunk administrativo. */
export default function AdminRoot() {
  return (
    <AuthProvider>
      <TooltipProvider delayDuration={300}>
        <div className="admin-root">
          <Outlet />
          <Toaster />
        </div>
      </TooltipProvider>
    </AuthProvider>
  )
}
