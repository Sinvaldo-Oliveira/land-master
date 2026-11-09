import type { LucideIcon } from 'lucide-react'
import { useDocumentTitle } from '@/admin/hooks/useDocumentTitle'
import { Badge, Card, CardBody, EmptyState, PageHeader } from '@/admin/ui'

type ModulePlaceholderProps = {
  title: string
  description: string
  icon: LucideIcon
  phase: number
  upcoming: string[]
}

/** Estado honesto de um módulo ainda não implementado: o que virá e em qual fase. Sem dados fictícios. */
export function ModulePlaceholder({ title, description, icon, phase, upcoming }: ModulePlaceholderProps) {
  useDocumentTitle(title)
  return (
    <>
      <PageHeader title={title} description={description} />
      <Card className="mt-6">
        <CardBody>
          <EmptyState
            icon={icon}
            title="Módulo em construção"
            description={`Este módulo será entregue na Fase ${phase} do plano de desenvolvimento.`}
            action={<Badge tone="info">Fase {phase}</Badge>}
          />
          <div className="mx-auto mt-2 max-w-md border-t border-admin-rule pt-5 pb-2">
            <p className="font-admin-mono text-admin-xs tracking-wider text-admin-ink-3 uppercase">O que vai aparecer aqui</p>
            <ul className="mt-3 grid gap-2 text-admin-ink-2">
              {upcoming.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-admin-accent" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </CardBody>
      </Card>
    </>
  )
}
