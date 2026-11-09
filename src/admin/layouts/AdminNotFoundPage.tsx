import { Compass } from 'lucide-react'
import { Link } from 'react-router'
import { useDocumentTitle } from '@/admin/hooks/useDocumentTitle'
import { Button, EmptyState } from '@/admin/ui'

export default function AdminNotFoundPage() {
  useDocumentTitle('Página não encontrada')
  return (
    <EmptyState
      icon={Compass}
      title="Página não encontrada"
      description="Este endereço não existe no painel."
      action={
        <Button asChild variant="secondary">
          <Link to="/admin">Voltar ao painel</Link>
        </Button>
      }
      className="mt-16"
    />
  )
}
