import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, BadgeCheck, NotebookPen } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useParams } from 'react-router'
import { useAuth } from '@/admin/auth/auth-context'
import { useDocumentTitle } from '@/admin/hooks/useDocumentTitle'
import { Badge, Button, Card, CardBody, CardHeader, EmptyState, ErrorState, Field, fieldDescribedBy, Skeleton, Textarea, toast, type BadgeTone } from '@/admin/ui'
import { formatCurrency, formatDateTime } from '@/lib/format'
import type { ContactLifecycle, ContactRow } from '@/types/database'
import { ContactFormFields } from './ContactForm'
import {
  addActivity,
  convertContactToCustomer,
  fetchContact,
  fetchContactActivities,
  fetchContactDeals,
  updateContact,
} from './api'
import {
  activityFormSchema,
  contactFormSchema,
  lifecycleLabels,
  type ActivityFormValues,
  type ContactFormValues,
} from './schemas'

const lifecycleTone: Record<ContactLifecycle, BadgeTone> = {
  lead: 'neutral',
  prospect: 'info',
  customer: 'success',
  inactive: 'warning',
}

export default function ContactDetailPage() {
  const { id = '' } = useParams()
  const queryClient = useQueryClient()

  const contact = useQuery({ queryKey: ['contacts', 'detail', id], queryFn: () => fetchContact(id), enabled: Boolean(id) })
  useDocumentTitle(contact.data?.name ?? 'Contato')

  const deals = useQuery({ queryKey: ['contacts', 'deals', id], queryFn: () => fetchContactDeals(id), enabled: Boolean(id) })
  const activities = useQuery({
    queryKey: ['contacts', 'activities', id],
    queryFn: () => fetchContactActivities(id),
    enabled: Boolean(id),
  })

  const refreshAll = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['contacts'] }),
      queryClient.invalidateQueries({ queryKey: ['crm'] }),
    ])

  if (contact.isPending) {
    return (
      <div className="grid gap-4" aria-busy="true">
        <Skeleton className="h-10 w-72" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (contact.isError) {
    return (
      <Card>
        <ErrorState
          title="Contato indisponível"
          description={contact.error.message}
          onRetry={() => void contact.refetch()}
          reference={id}
        />
        <div className="pb-6 text-center">
          <Link to="/admin/contatos" className="text-admin-sm text-admin-accent-hover underline underline-offset-2">
            Voltar para contatos
          </Link>
        </div>
      </Card>
    )
  }

  const data = contact.data

  return (
    <>
      <Link to="/admin/contatos" className="inline-flex items-center gap-1.5 text-admin-sm text-admin-ink-2 hover:text-admin-ink">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Contatos
      </Link>

      <header className="mt-3 flex flex-col gap-3 border-b border-admin-rule pb-5 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-admin-display text-admin-2xl font-semibold tracking-tight text-admin-ink">{data.name}</h1>
          <p className="mt-1 flex flex-wrap items-center gap-2 text-admin-base text-admin-ink-2">
            <Badge tone={lifecycleTone[data.lifecycle]}>{lifecycleLabels[data.lifecycle]}</Badge>
            {data.company ? <span>{data.company}</span> : null}
          </p>
        </div>
        {data.lifecycle !== 'customer' ? (
          <ConvertButton contactId={data.id} onDone={refreshAll} />
        ) : null}
      </header>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
        <div className="grid content-start gap-6">
          <EditContactCard key={data.updated_at} contact={data} onSaved={refreshAll} />
          <Card>
            <CardHeader title="Oportunidades" description="Negociações deste contato no funil." />
            <CardBody>
              {deals.isPending ? (
                <Skeleton className="h-16 w-full" />
              ) : deals.isError ? (
                <p className="text-admin-sm text-admin-danger">{deals.error.message}</p>
              ) : deals.data.length === 0 ? (
                <p className="text-admin-sm text-admin-ink-2">Nenhuma oportunidade ainda. Crie uma no CRM.</p>
              ) : (
                <ul className="grid gap-2">
                  {deals.data.map((deal) => (
                    <li key={deal.id} className="flex items-center justify-between gap-3 rounded-admin-md border border-admin-rule p-3 text-admin-sm">
                      <span className="min-w-0 truncate font-medium text-admin-ink">{deal.title}</span>
                      <span className="shrink-0 font-admin-mono text-admin-ink-2">{formatCurrency(deal.amount)}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardBody>
          </Card>
        </div>

        <Card className="content-start">
          <CardHeader title="Linha do tempo" description="Anotações e eventos do relacionamento." />
          <CardBody className="grid gap-5">
            <AddNoteForm contactId={data.id} onSaved={() => queryClient.invalidateQueries({ queryKey: ['contacts', 'activities', id] })} />
            {activities.isPending ? (
              <Skeleton className="h-16 w-full" />
            ) : activities.isError ? (
              <p className="text-admin-sm text-admin-danger">{activities.error.message}</p>
            ) : activities.data.length === 0 ? (
              <EmptyState
                icon={NotebookPen}
                title="Nenhum registro ainda"
                description="As anotações feitas aqui aparecem em ordem cronológica."
              />
            ) : (
              <ol className="grid gap-4 border-l border-admin-rule pl-4">
                {activities.data.map((item) => (
                  <li key={item.id} className="relative">
                    <span aria-hidden="true" className="absolute top-1.5 -left-[21px] size-2.5 rounded-full bg-admin-accent" />
                    <p className="font-admin-mono text-admin-xs text-admin-ink-3">{formatDateTime(item.occurred_at)}</p>
                    <p className="mt-1 text-admin-base whitespace-pre-line text-admin-ink">{item.body}</p>
                  </li>
                ))}
              </ol>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  )
}

/** O formulário é remontado (key = updated_at) após cada gravação, então os valores iniciais sempre refletem o banco. */
function EditContactCard({ contact, onSaved }: { contact: ContactRow; onSaved: () => Promise<unknown> }) {
  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: {
      name: contact.name,
      email: contact.email ?? '',
      phone: contact.phone ?? '',
      company: contact.company ?? '',
      lifecycle: contact.lifecycle,
      notes: contact.notes ?? '',
    },
  })

  const save = useMutation({
    mutationFn: (values: ContactFormValues) => updateContact(contact.id, values),
    onSuccess: async () => {
      toast.success('Alterações salvas.')
      await onSaved()
    },
    onError: (error) => toast.error(error.message, { duration: Infinity }),
  })

  return (
    <Card>
      <CardHeader title="Dados do contato" />
      <CardBody>
        <form noValidate onSubmit={form.handleSubmit((values) => save.mutate(values))} className="grid gap-5">
          <ContactFormFields form={form} idPrefix="edit-contact" />
          <div className="flex justify-end">
            <Button type="submit" loading={save.isPending} disabled={!form.formState.isDirty}>
              Salvar alterações
            </Button>
          </div>
        </form>
      </CardBody>
    </Card>
  )
}

function AddNoteForm({ contactId, onSaved }: { contactId: string; onSaved: () => unknown }) {
  const { user } = useAuth()
  const form = useForm<ActivityFormValues>({ resolver: zodResolver(activityFormSchema), defaultValues: { body: '' } })

  const save = useMutation({
    mutationFn: (values: ActivityFormValues) => {
      if (!user) throw new Error('Sessão expirada. Entre novamente.')
      return addActivity(contactId, values, user.id)
    },
    onSuccess: async () => {
      form.reset({ body: '' })
      toast.success('Anotação registrada.')
      await onSaved()
    },
    onError: (error) => toast.error(error.message, { duration: Infinity }),
  })

  const error = form.formState.errors.body?.message
  return (
    <form noValidate onSubmit={form.handleSubmit((values) => save.mutate(values))} className="grid gap-3">
      <Field label="Nova anotação" htmlFor="activity-body" error={error}>
        <Textarea
          id="activity-body"
          rows={3}
          invalid={Boolean(error)}
          aria-describedby={fieldDescribedBy('activity-body', { error })}
          {...form.register('body')}
        />
      </Field>
      <div className="flex justify-end">
        <Button type="submit" variant="secondary" loading={save.isPending}>
          Registrar anotação
        </Button>
      </div>
    </form>
  )
}

function ConvertButton({ contactId, onDone }: { contactId: string; onDone: () => Promise<unknown> }) {
  const convert = useMutation({
    mutationFn: () => convertContactToCustomer(contactId),
    onSuccess: async () => {
      toast.success('Contato marcado como cliente.')
      await onDone()
    },
    onError: (error) => toast.error(error.message, { duration: Infinity }),
  })
  return (
    <Button variant="secondary" loading={convert.isPending} onClick={() => convert.mutate()}>
      <BadgeCheck aria-hidden="true" />
      Marcar como cliente
    </Button>
  )
}
