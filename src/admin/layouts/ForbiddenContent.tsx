import { Lock } from 'lucide-react'
import { Link } from 'react-router'
import { useDocumentTitle } from '@/admin/hooks/useDocumentTitle'
import { Button, EmptyState } from '@/admin/ui'

/** Rota existente, mas não permitida ao perfil atual. Os dados continuam protegidos pela RLS. */
export function ForbiddenContent() {
  useDocumentTitle('Acesso restrito')
  return (
    <EmptyState
      icon={Lock}
      title="Área restrita ao seu perfil"
      description="Esta seção está disponível apenas para outros perfis de acesso. Se precisar dela, fale com o administrador."
      action={
        <Button asChild variant="secondary">
          <Link to="/admin">Voltar ao painel</Link>
        </Button>
      }
      className="mt-16"
    />
  )
}
