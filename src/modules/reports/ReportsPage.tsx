import { ChartColumn } from 'lucide-react'
import { ModulePlaceholder } from '@/admin/layouts/ModulePlaceholder'

export default function ReportsPage() {
  return (
    <ModulePlaceholder
      title="Relatórios"
      description="Indicadores calculados a partir dos dados reais."
      icon={ChartColumn}
      phase={7}
      upcoming={["Leads por período, página e origem","Oportunidades por etapa e vendas concluídas","Taxa de conversão de leads em clientes","Exportação em CSV"]}
    />
  )
}
