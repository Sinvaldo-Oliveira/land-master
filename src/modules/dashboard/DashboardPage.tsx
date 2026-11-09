import { ChartColumn } from 'lucide-react'
import { useAuth } from '@/admin/auth/auth-context'
import { useDocumentTitle } from '@/admin/hooks/useDocumentTitle'
import { Badge, Card, CardBody, EmptyState, PageHeader, StatCard } from '@/admin/ui'

/**
 * Definições oficiais dos indicadores (docs/PRD_SISTEMA_VENDAS.md §5).
 * Até a Fase 7 os valores ficam vazios — nunca exibimos números de exemplo.
 */
const indicators = [
  { label: 'Novos leads no período', definition: 'Contatos criados dentro do período selecionado.' },
  { label: 'Oportunidades em aberto', definition: 'Oportunidades com status “aberta” neste momento.' },
  { label: 'Vendas concluídas', definition: 'Oportunidades ganhas com data de fechamento no período.' },
  { label: 'Valor vendido', definition: 'Soma dos valores das vendas concluídas no período.' },
  { label: 'Valor estimado do funil', definition: 'Soma dos valores das oportunidades em aberto (versão ponderada pela probabilidade da etapa também disponível).' },
  { label: 'Taxa de conversão', definition: 'Contatos criados no período que hoje são clientes ÷ contatos criados no período.' },
] as const

export default function DashboardPage() {
  useDocumentTitle('Painel')
  const { user } = useAuth()
  const firstName = ((user?.user_metadata?.full_name as string | undefined) ?? '').split(' ')[0]

  return (
    <>
      <PageHeader
        title={firstName ? `Olá, ${firstName}` : 'Painel'}
        description="Visão geral da operação comercial."
        actions={<Badge tone="info">Indicadores na Fase 7</Badge>}
      />

      <section aria-label="Indicadores" className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {indicators.map((item) => (
          <StatCard key={item.label} label={item.label} value={null} definition={item.definition} hint="Aguardando dados reais" />
        ))}
      </section>

      <Card className="mt-6">
        <CardBody>
          <EmptyState
            icon={ChartColumn}
            title="Ainda não há dados para mostrar"
            description="Assim que contatos, oportunidades e formulários estiverem em uso, os indicadores e gráficos serão calculados a partir dos registros reais."
          />
        </CardBody>
      </Card>
    </>
  )
}
