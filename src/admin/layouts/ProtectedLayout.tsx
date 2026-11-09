import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '@/admin/auth/auth-context'
import { canAccessPath } from '@/admin/navigation'
import { ErrorState } from '@/admin/ui'
import { AdminLayout } from './AdminLayout'
import { ForbiddenContent } from './ForbiddenContent'
import { FullPageStatus } from './FullPageStatus'
import { NoAccessPage } from './NoAccessPage'

/**
 * Guarda de todas as rotas internas do /admin.
 * Controla a EXPERIÊNCIA (redirecionar, esconder); a SEGURANÇA dos dados é da RLS.
 */
export default function ProtectedLayout() {
  const auth = useAuth()
  const location = useLocation()

  if (auth.status === 'loading') return <FullPageStatus label="Verificando acesso" />

  if (auth.status !== 'signed-in') {
    return <Navigate to="/admin/login" replace state={{ from: location.pathname + location.search }} />
  }

  // Sessão aberta por link de recuperação: obriga a definir a nova senha primeiro.
  if (auth.recoveryMode) return <Navigate to="/admin/redefinir-senha" replace />

  if (auth.roleStatus === 'loading' || auth.roleStatus === 'idle') return <FullPageStatus label="Verificando permissões" />

  if (auth.roleStatus === 'error') {
    return (
      <FullPageStatus>
        <ErrorState
          title="Não foi possível verificar suas permissões"
          description="Verifique sua conexão e tente novamente."
          onRetry={() => void auth.refreshRole()}
        />
      </FullPageStatus>
    )
  }

  if (!auth.role) return <NoAccessPage />

  return (
    <AdminLayout role={auth.role}>
      {canAccessPath(location.pathname, auth.role) ? <Outlet /> : <ForbiddenContent />}
    </AdminLayout>
  )
}
