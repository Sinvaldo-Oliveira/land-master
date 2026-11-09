import { Settings } from 'lucide-react'
import { ModulePlaceholder } from '@/admin/layouts/ModulePlaceholder'

export default function SettingsPage() {
  return (
    <ModulePlaceholder
      title="Configurações"
      description="Usuários, permissões e preferências da instalação."
      icon={Settings}
      phase={3}
      upcoming={["Convite de usuários e perfis de acesso","Funis, etapas e motivos de perda","Origens de leads","Dados da empresa e preferências gerais"]}
    />
  )
}
