import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Check, Plus, RotateCcw, SquareKanban, X } from 'lucide-react'
import { useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { useAuth } from '@/admin/auth/auth-context'
import { useDocumentTitle } from '@/admin/hooks/useDocumentTitle'
import {
  Badge,
  Button,
  Card,
  CardBody,
  CardHeader,
  Dialog,
  DialogContent,
  DialogFooter,
  EmptyState,
  ErrorState,
  Field,
  Input,
  PageHeader,
  Select,
  Skeleton,
  toast,
  type BadgeTone,
} from '@/admin/ui'
import { requireSupabase } from '@/lib/supabase'
import { formatCurrency, formatDate } from '@/lib/format'
import type { DealRow, StageRow } from '@/types/database'
import { closeDealLost, closeDealWon, createDeal, fetchBoard, fetchContactOptions, fetchDefaultPipeline, moveDeal, reopenDeal, type Board } from './api'
import { dealFormSchema, lostFormSchema, type DealFormValues, type LostFormValues } from './schemas'

const statusLabel = { open: 'Aberta', won: 'Ganha', lost: 'Perdida' } as const
const statusTone: Record<DealRow['status'], BadgeTone> = { open: 'info', won: 'success', lost: 'danger' }

export default function CrmPage() {
  useDocumentTitle('CRM')
  const { role } = useAuth()
  const [creating, setCreating] = useState(false)

  const pipeline = useQuery({ queryKey: ['crm', 'pipeline'], queryFn: fetchDefaultPipeline })
  const board = useQuery({
    queryKey: ['crm', 'board', pipeline.data?.id],
    queryFn: () => fetchBoard(pipeline.data!),
    enabled: Boolean(pipeline.data),
  })

  if (pipeline.isPending || (pipeline.data && board.isPending)) {
    return (
      <>
        <PageHeader title="CRM" description="Oportunidades organizadas por etapa." />
        <div className="mt-6 grid gap-4 sm:grid-cols-3" aria-busy="true">
          {Array.from({ length: 3 }, (_, i) => (
            <Skeleton key={i} className="h-72 w-full" />
          ))}
        </div>
      </>
    )
  }

  if (pipeline.isError || board.isError) {
    const message = pipeline.error?.message ?? board.error?.message ?? 'Erro desconhecido.'
    return (
      <>
        <PageHeader title="CRM" />
        <Card className="mt-6">
          <ErrorState description={message} onRetry={() => void (pipeline.error ? pipeline.refetch() : board.refetch())} />
        </Card>
      </>
    )
  }

  if (!pipeline.data) {
    return (
      <>
        <PageHeader title="CRM" description="Oportunidades organizadas por etapa." />
        <Card className="mt-6">
          <CardBody>
            <EmptyState
              icon={SquareKanban}
              title="Nenhum funil configurado"
              description="Crie um funil em Configurações para começar a acompanhar as oportunidades."
            />
          </CardBody>
        </Card>
      </>
    )
  }

  const data = board.data
  if (!data) return null

  const openDeals = data.deals.filter((d) => d.status === 'open')
  const closedDeals = data.deals.filter((d) => d.status !== 'open')
  const boardStages = data.stages.filter((s) => !s.is_won)

  return (
    <>
      <PageHeader
        title="CRM"
        description={`Funil “${data.pipeline.name}” · ${openDeals.length} oportunidades abertas`}
        actions={
          <Button onClick={() => setCreating(true)} disabled={boardStages.length === 0}>
            <Plus aria-hidden="true" />
            Nova oportunidade
          </Button>
        }
      />

      {openDeals.length === 0 ? (
        <Card className="mt-6">
          <CardBody>
            <EmptyState
              icon={SquareKanban}
              title="Nenhuma oportunidade aberta"
              description="Crie a primeira oportunidade a partir de um contato. Ela aparece na etapa escolhida."
            />
          </CardBody>
        </Card>
      ) : null}

      <div className="mt-6 flex gap-4 overflow-x-auto pb-2" role="list" aria-label="Etapas do funil">
        {boardStages.map((stage) => {
          const cards = openDeals.filter((d) => d.stage_id === stage.id)
          const total = cards.reduce((sum, d) => sum + d.amount, 0)
          return (
            <section
              key={stage.id}
              role="listitem"
              aria-label={`${stage.name}, ${cards.length} oportunidades`}
              className="flex w-72 shrink-0 flex-col rounded-admin-lg border border-admin-rule bg-admin-sunken/60"
            >
              <header className="flex items-center justify-between gap-2 border-b border-admin-rule px-3 py-2.5">
                <h2 className="flex min-w-0 items-center gap-2 text-admin-sm font-semibold text-admin-ink">
                  <span aria-hidden="true" className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: stage.color }} />
                  <span className="truncate">{stage.name}</span>
                </h2>
                <span className="shrink-0 font-admin-mono text-admin-xs text-admin-ink-2">
                  {cards.length} · {formatCurrency(total)}
                </span>
              </header>
              <ul className="grid gap-2.5 p-2.5">
                {cards.map((deal) => (
                  <DealCard key={deal.id} deal={deal} stages={data.stages} board={data} />
                ))}
              </ul>
            </section>
          )
        })}
      </div>

      {closedDeals.length > 0 ? (
        <Card className="mt-8">
          <CardHeader title="Encerradas" description="Vendas concluídas e perdas. Gestores e administradores podem reabrir." />
          <CardBody>
            <ul className="grid gap-2">
              {closedDeals.map((deal) => (
                <li key={deal.id} className="flex flex-wrap items-center justify-between gap-3 rounded-admin-md border border-admin-rule p-3 text-admin-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-admin-ink">{deal.title}</p>
                    <p className="text-admin-ink-2">
                      {data.contacts[deal.contact_id]?.name ?? 'Contato'} · {deal.closed_at ? formatDate(deal.closed_at) : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge tone={statusTone[deal.status]}>{statusLabel[deal.status]}</Badge>
                    <span className="font-admin-mono text-admin-ink-2">{formatCurrency(deal.amount)}</span>
                    {role === 'admin' || role === 'manager' ? (
                      <ReopenButton dealId={deal.id} />
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </CardBody>
        </Card>
      ) : null}

      {creating ? (
        <NewDealDialog
          pipelineId={data.pipeline.id}
          stages={boardStages}
          defaultStageId={boardStages[0]?.id ?? ''}
          onClose={() => setCreating(false)}
        />
      ) : null}
    </>
  )
}

function useBoardRefresh() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: ['crm'] })
}

function DealCard({ deal, stages, board }: { deal: DealRow; stages: StageRow[]; board: Board }) {
  const refresh = useBoardRefresh()
  const contact = board.contacts[deal.contact_id]
  const [losing, setLosing] = useState(false)
  const moveOptions = stages
    .filter((s) => !s.is_won)
    .map((s) => ({ value: s.id, label: s.name }))

  const move = useMutation({
    mutationFn: (stageId: string) => moveDeal(deal.id, stageId),
    onSuccess: async () => {
      await refresh()
    },
    onError: (error) => toast.error(error.message, { duration: Infinity }),
  })

  const won = useMutation({
    mutationFn: () => closeDealWon(deal.id),
    onSuccess: async () => {
      toast.success('Venda registrada. O contato agora é cliente.')
      await refresh()
    },
    onError: (error) => toast.error(error.message, { duration: Infinity }),
  })

  return (
    <li className="rounded-admin-md border border-admin-rule bg-admin-card p-3 shadow-admin-card">
      <p className="text-admin-base font-medium text-admin-ink">{deal.title}</p>
      <p className="mt-0.5 truncate text-admin-sm text-admin-ink-2">
        {contact ? <Link to={`/admin/contatos/${contact.id}`} className="hover:text-admin-accent-hover">{contact.name}</Link> : 'Contato'}
        {contact?.company ? ` · ${contact.company}` : ''}
      </p>
      <div className="mt-2 flex items-center justify-between gap-2 text-admin-xs text-admin-ink-3">
        <span className="font-admin-mono text-admin-sm text-admin-ink">{formatCurrency(deal.amount)}</span>
        <span className="truncate">{deal.owner_id ? board.owners[deal.owner_id] ?? '' : 'Sem responsável'}</span>
      </div>

      <div className="mt-3 grid gap-2">
        <div className="grid gap-1 text-admin-xs text-admin-ink-2">
          <span>Mover para</span>
          <Select
            aria-label={`Mover ${deal.title} para outra etapa`}
            value={deal.stage_id}
            options={moveOptions}
            onValueChange={(stageId) => {
              if (stageId !== deal.stage_id) move.mutate(stageId)
            }}
            disabled={move.isPending}
          />
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="secondary" className="flex-1" loading={won.isPending} onClick={() => won.mutate()}>
            <Check aria-hidden="true" />
            Ganhou
          </Button>
          <Button size="sm" variant="ghost" className="flex-1" onClick={() => setLosing(true)}>
            <X aria-hidden="true" />
            Perdeu
          </Button>
        </div>
      </div>

      {losing ? <LostDialog dealId={deal.id} title={deal.title} onClose={() => setLosing(false)} /> : null}
    </li>
  )
}

function LostDialog({ dealId, title, onClose }: { dealId: string; title: string; onClose: () => void }) {
  const refresh = useBoardRefresh()
  const reasons = useQuery({
    queryKey: ['crm', 'lost-reasons'],
    queryFn: async () => {
      const { data, error } = await requireSupabase().from('lost_reasons').select('id, label').eq('active', true).order('position')
      if (error) throw new Error('Não foi possível carregar os motivos de perda.')
      return data ?? []
    },
  })

  const form = useForm<LostFormValues>({
    resolver: zodResolver(lostFormSchema),
    defaultValues: { reasonId: '', note: '' },
  })

  const save = useMutation({
    mutationFn: (values: LostFormValues) => closeDealLost(dealId, values.reasonId, values.note),
    onSuccess: async () => {
      toast.success('Perda registrada.')
      await refresh()
      onClose()
    },
    onError: (error) => toast.error(error.message, { duration: Infinity }),
  })

  const reasonError = form.formState.errors.reasonId?.message
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title="Registrar perda" description={`Oportunidade: ${title}`}>
        <form noValidate onSubmit={form.handleSubmit((values) => save.mutate(values))} className="grid gap-4">
          <Field label="Motivo" htmlFor={`lost-reason-${dealId}`} error={reasonError} required>
            <Controller
              control={form.control}
              name="reasonId"
              render={({ field }) => (
                <Select
                  id={`lost-reason-${dealId}`}
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={reasons.isPending ? 'Carregando…' : 'Escolha um motivo'}
                  options={(reasons.data ?? []).map((r) => ({ value: r.id, label: r.label }))}
                  invalid={Boolean(reasonError)}
                />
              )}
            />
          </Field>
          <Field label="Observação" htmlFor={`lost-note-${dealId}`} hint="Opcional. Até 500 caracteres.">
            <Input id={`lost-note-${dealId}`} {...form.register('note')} />
          </Field>
          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" variant="danger" loading={save.isPending}>
              Registrar perda
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

function ReopenButton({ dealId }: { dealId: string }) {
  const refresh = useBoardRefresh()
  const reopen = useMutation({
    mutationFn: () => reopenDeal(dealId),
    onSuccess: async () => {
      toast.success('Oportunidade reaberta.')
      await refresh()
    },
    onError: (error) => toast.error(error.message, { duration: Infinity }),
  })
  return (
    <Button size="sm" variant="ghost" loading={reopen.isPending} onClick={() => reopen.mutate()}>
      <RotateCcw aria-hidden="true" />
      Reabrir
    </Button>
  )
}

function NewDealDialog({
  pipelineId,
  stages,
  defaultStageId,
  onClose,
}: {
  pipelineId: string
  stages: StageRow[]
  defaultStageId: string
  onClose: () => void
}) {
  const { user } = useAuth()
  const refresh = useBoardRefresh()
  const contacts = useQuery({ queryKey: ['crm', 'contact-options'], queryFn: fetchContactOptions })

  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealFormSchema),
    defaultValues: { title: '', contactId: '', stageId: defaultStageId, amount: '' },
  })

  const save = useMutation({
    mutationFn: (values: DealFormValues) => {
      if (!user) throw new Error('Sessão expirada. Entre novamente.')
      return createDeal(values, pipelineId, user.id)
    },
    onSuccess: async () => {
      toast.success('Oportunidade criada.')
      await refresh()
      onClose()
    },
    onError: (error) => toast.error(error.message, { duration: Infinity }),
  })

  const errors = form.formState.errors
  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title="Nova oportunidade" description="Escolha o contato e a etapa inicial. Você pode mover a oportunidade depois.">
        <form noValidate onSubmit={form.handleSubmit((values) => save.mutate(values))} className="grid gap-4">
          <Field label="Título" htmlFor="deal-title" error={errors.title?.message} required>
            <Input id="deal-title" invalid={Boolean(errors.title)} {...form.register('title')} />
          </Field>
          <Field label="Contato" htmlFor="deal-contact" error={errors.contactId?.message} required>
            <Controller
              control={form.control}
              name="contactId"
              render={({ field }) => (
                <Select
                  id="deal-contact"
                  value={field.value}
                  onValueChange={field.onChange}
                  placeholder={contacts.isPending ? 'Carregando…' : 'Escolha um contato'}
                  options={(contacts.data ?? []).map((c) => ({
                    value: c.id,
                    label: c.company ? `${c.name} · ${c.company}` : c.name,
                  }))}
                  invalid={Boolean(errors.contactId)}
                />
              )}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Etapa" htmlFor="deal-stage" error={errors.stageId?.message} required>
              <Controller
                control={form.control}
                name="stageId"
                render={({ field }) => (
                  <Select
                    id="deal-stage"
                    value={field.value}
                    onValueChange={field.onChange}
                    options={stages.map((s) => ({ value: s.id, label: s.name }))}
                    invalid={Boolean(errors.stageId)}
                  />
                )}
              />
            </Field>
            <Field label="Valor (R$)" htmlFor="deal-amount" error={errors.amount?.message} hint="Ex.: 1.500,00">
              <Input id="deal-amount" inputMode="decimal" invalid={Boolean(errors.amount)} {...form.register('amount')} />
            </Field>
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={save.isPending}>
              Criar oportunidade
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
