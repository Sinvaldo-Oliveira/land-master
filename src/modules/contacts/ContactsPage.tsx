import { Contact } from 'lucide-react'
import { ModulePlaceholder } from '@/admin/layouts/ModulePlaceholder'

export default function ContactsPage() {
  return (
    <ModulePlaceholder
      title="Contatos"
      description="Pessoas e empresas que se relacionam com o negócio."
      icon={Contact}
      phase={3}
      upcoming={["Cadastro, busca e filtros de contatos","Aviso de possíveis duplicidades","Linha do tempo com atividades e formulários","Conversão de lead em cliente sem duplicar o cadastro"]}
    />
  )
}
