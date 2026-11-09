import { KeyRound } from 'lucide-react'
import { useDocumentTitle } from '@/admin/hooks/useDocumentTitle'
import { Button, EmptyState } from '@/admin/ui'
import { useAuth } from '@/admin/auth/auth-context'
import { FullPageStatus } from './FullPageStatus'

/** Usuário autenticado, mas sem perfil de acesso ativo (não convidado corretamente ou desativado). */
export function NoAccessPage() {
  useDocumentTitle('Sem acesso')
  const { user, signOut } = useAuth()
  return (
    <FullPageStatus>
      <div className="w-full max-w-md rounded-admin-lg border border-admin-rule bg-admin-card p-2 shadow-admin-card">
        <EmptyState
          icon={KeyRound}
          title="Sua conta ainda não tem acesso"
          description={`A conta ${user?.email ?? ''} está autenticada, mas não possui um perfil ativo nesta instalação. Peça ao administrador para liberar seu acesso.`}
          action={
            <Button variant="secondary" onClick={() => void signOut()}>
              Sair
            </Button>
          }
        />
      </div>
    </FullPageStatus>
  )
}
