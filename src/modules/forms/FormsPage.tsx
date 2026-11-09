import { ClipboardList } from 'lucide-react'
import { ModulePlaceholder } from '@/admin/layouts/ModulePlaceholder'

export default function FormsPage() {
  return (
    <ModulePlaceholder
      title="Formulários"
      description="Captação de leads ligada ao funil de vendas."
      icon={ClipboardList}
      phase={6}
      upcoming={["Campos configuráveis e consentimento LGPD","Destino automático no funil e etapa escolhidos","Proteção contra spam e envios duplicados","Leads aparecendo direto no CRM"]}
    />
  )
}
