import { FileStack } from 'lucide-react'
import { ModulePlaceholder } from '@/admin/layouts/ModulePlaceholder'

export default function LandingPagesPage() {
  return (
    <ModulePlaceholder
      title="Landing pages"
      description="Páginas de venda e captação criadas visualmente."
      icon={FileStack}
      phase={5}
      upcoming={["Editor visual com biblioteca de seções","Templates prontos para começar","Pré-visualização em desktop, tablet e celular","Publicação com endereço amigável"]}
    />
  )
}
