import { SquareKanban } from 'lucide-react'
import { ModulePlaceholder } from '@/admin/layouts/ModulePlaceholder'

export default function CrmPage() {
  return (
    <ModulePlaceholder
      title="CRM"
      description="Funil de vendas em quadro Kanban."
      icon={SquareKanban}
      phase={3}
      upcoming={["Quadro Kanban com arrastar e soltar (mouse, toque e teclado)","Oportunidades com valor, responsável e próxima ação","Atividades, tarefas e motivos de perda","Histórico automático de mudanças"]}
    />
  )
}
