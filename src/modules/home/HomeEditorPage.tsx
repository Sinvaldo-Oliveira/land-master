import { Globe } from 'lucide-react'
import { ModulePlaceholder } from '@/admin/layouts/ModulePlaceholder'

export default function HomeEditorPage() {
  return (
    <ModulePlaceholder
      title="Site"
      description="Identidade da empresa e página inicial do site."
      icon={Globe}
      phase={4}
      upcoming={["Logotipo, cores, fontes e dados de contato","Seções da Home com variações prontas","Rascunho, pré-visualização e publicação","SEO e imagem de compartilhamento"]}
    />
  )
}
