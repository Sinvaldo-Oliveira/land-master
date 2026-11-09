import { zodResolver } from '@hookform/resolvers/zod'
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Contact, Plus, Search, TriangleAlert } from 'lucide-react'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { useAuth } from '@/admin/auth/auth-context'
import { useDocumentTitle } from '@/admin/hooks/useDocumentTitle'
import {
  Badge,
  Button,
  Card,
  CardBody,
  Dialog,
  DialogContent,
  DialogFooter,
  EmptyState,
  ErrorState,
  Input,
  PageHeader,
  Select,
  Skeleton,
  toast,
  type BadgeTone,
} from '@/admin/ui'
import { formatDate } from '@/lib/format'
import type { ContactLifecycle } from '@/types/database'
import { ContactFormFields } from './ContactForm'
import { createContact, fetchContacts, findDuplicateContacts, PAGE_SIZE, type ContactListFilters } from './api'
import { contactFormSchema, lifecycleLabels, lifecycleOptions, type ContactFormValues } from './schemas'

const lifecycleTone: Record<ContactLifecycle, BadgeTone> = {
  lead: 'neutral',
  prospect: 'info',
  customer: 'success',
  inactive: 'warning',
}

const filterOptions = [{ value: 'all', label: 'Todas as situações' }, ...lifecycleOptions]

export default function ContactsPage() {
  useDocumentTitle('Contatos')
  const [filters, setFilters] = useState<ContactListFilters>({ search: '', lifecycle: 'all', page: 0 })
  const [creating, setCreating] = useState(false)

  const query = useQuery({
    queryKey: ['contacts', 'list', filters],
    queryFn: () => fetchContacts(filters),
    placeholderData: keepPreviousData,
  })

  const totalPages = Math.max(1, Math.ceil((query.data?.total ?? 0) / PAGE_SIZE))
  const hasFilters = filters.search.trim() !== '' || filters.lifecycle !== 'all'

  return (
    <>
      <PageHeader
        title="Contatos"
        description="Pessoas e empresas que se relacionam com o negócio."
        actions={
          <Button onClick={() => setCreating(true)}>
            <Plus aria-hidden="true" />
            Novo contato
          </Button>
        }
      />

      <div className="mt-6 flex flex-col gap-3 sm:flex-row">
        <div className="relative min-w-0 flex-1">
          <Search aria-hidden="true" className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-admin-ink-3" />
          <Input
            type="search"
            aria-label="Buscar contatos"
            placeholder="Buscar por nome, e-mail ou empresa"
            className="pl-9"
            value={filters.search}
            onChange={(event) => setFilters((f) => ({ ...f, search: event.target.value, page: 0 }))}
          />
        </div>
        <Select
          aria-label="Filtrar por situação"
          className="sm:w-56"
          value={filters.lifecycle}
          options={filterOptions}
          onValueChange={(value) =>
            setFilters((f) => ({ ...f, lifecycle: value as ContactListFilters['lifecycle'], page: 0 }))
          }
        />
      </div>

      <Card className="mt-4 overflow-hidden">
        {query.isPending ? (
          <CardBody className="grid gap-3" aria-busy="true">
            {Array.from({ length: 5 }, (_, i) => (
              <Skeleton key={i} className="h-10 w-full" />
            ))}
          </CardBody>
        ) : query.isError ? (
          <ErrorState
            description={query.error.message}
            onRetry={() => void query.refetch()}
          />
        ) : query.data.rows.length === 0 ? (
          <CardBody>
            <EmptyState
              icon={Contact}
              title={hasFilters ? 'Nenhum contato encontrado' : 'Nenhum contato cadastrado ainda'}
              description={
                hasFilters
                  ? 'Ajuste a busca ou o filtro de situação para ver outros contatos.'
                  : 'Cadastre o primeiro contato para começar a acompanhar as oportunidades.'
              }
              action={
                hasFilters ? undefined : (
                  <Button onClick={() => setCreating(true)}>
                    <Plus aria-hidden="true" />
                    Novo contato
                  </Button>
                )
              }
            />
          </CardBody>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-admin-base">
              <caption className="sr-only">Lista de contatos</caption>
              <thead className="border-b border-admin-rule bg-admin-sunken text-admin-sm text-admin-ink-2">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Nome</th>
                  <th scope="col" className="px-4 py-3 font-medium">Empresa</th>
                  <th scope="col" className="px-4 py-3 font-medium">Contato</th>
                  <th scope="col" className="px-4 py-3 font-medium">Situação</th>
                  <th scope="col" className="px-4 py-3 font-medium">Cadastrado em</th>
                </tr>
              </thead>
              <tbody>
                {query.data.rows.map((row) => (
                  <tr key={row.id} className="border-b border-admin-rule last:border-0 hover:bg-admin-sunken/60">
                    <td className="px-4 py-3">
                      <Link to={`/admin/contatos/${row.id}`} className="font-medium text-admin-ink hover:text-admin-accent-hover">
                        {row.name}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-admin-ink-2">{row.company ?? '—'}</td>
                    <td className="px-4 py-3 text-admin-ink-2">{row.email ?? row.phone ?? '—'}</td>
                    <td className="px-4 py-3">
                      <Badge tone={lifecycleTone[row.lifecycle]}>{lifecycleLabels[row.lifecycle]}</Badge>
                    </td>
                    <td className="px-4 py-3 font-admin-mono text-admin-sm text-admin-ink-2">{formatDate(row.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {query.data && query.data.total > PAGE_SIZE ? (
        <nav aria-label="Paginação de contatos" className="mt-4 flex items-center justify-between gap-3 text-admin-sm text-admin-ink-2">
          <span>
            Página {filters.page + 1} de {totalPages} · {query.data.total} contatos
          </span>
          <div className="flex gap-2">
            <Button
              variant="secondary"
              size="sm"
              disabled={filters.page === 0}
              onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            >
              Anterior
            </Button>
            <Button
              variant="secondary"
              size="sm"
              disabled={filters.page + 1 >= totalPages}
              onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            >
              Próxima
            </Button>
          </div>
        </nav>
      ) : null}

      {creating ? <NewContactDialog onClose={() => setCreating(false)} /> : null}
    </>
  )
}

type Duplicate = Awaited<ReturnType<typeof findDuplicateContacts>>[number]

function NewContactDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [duplicates, setDuplicates] = useState<Duplicate[] | null>(null)

  const form = useForm<ContactFormValues>({
    resolver: zodResolver(contactFormSchema),
    defaultValues: { name: '', email: '', phone: '', company: '', lifecycle: 'lead', notes: '' },
  })

  const save = useMutation({
    mutationFn: async (values: ContactFormValues) => {
      if (!user) throw new Error('Sessão expirada. Entre novamente.')
      return createContact(values, user.id)
    },
    onSuccess: async (contact) => {
      toast.success('Contato cadastrado.')
      await queryClient.invalidateQueries({ queryKey: ['contacts'] })
      onClose()
      void navigate(`/admin/contatos/${contact.id}`)
    },
    onError: (error) => toast.error(error.message, { duration: Infinity }),
  })

  const submit = form.handleSubmit(async (values) => {
    // Primeira tentativa: procurar possíveis duplicidades antes de gravar.
    if (duplicates === null) {
      try {
        const found = await findDuplicateContacts(values.email, values.phone)
        if (found.length > 0) {
          setDuplicates(found)
          return
        }
      } catch (error) {
        toast.error(error instanceof Error ? error.message : 'Não foi possível verificar duplicidades.', { duration: Infinity })
        return
      }
    }
    save.mutate(values)
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title="Novo contato" description="Somente o nome é obrigatório. Os demais dados podem ser completados depois.">
        <form noValidate onSubmit={submit} className="grid gap-5">
          {duplicates ? (
            <div role="alert" className="grid gap-2 rounded-admin-md border border-admin-warning/30 bg-admin-warning-soft p-4 text-admin-sm text-admin-ink">
              <p className="flex items-center gap-2 font-medium">
                <TriangleAlert aria-hidden="true" className="size-4 text-admin-warning" />
                Já existe um contato com este e-mail ou telefone:
              </p>
              <ul className="list-disc pl-5">
                {duplicates.map((item) => (
                  <li key={item.id}>
                    <Link to={`/admin/contatos/${item.id}`} className="underline underline-offset-2" onClick={onClose}>
                      {item.name}
                    </Link>{' '}
                    · {lifecycleLabels[item.lifecycle]}
                  </li>
                ))}
              </ul>
              <p>Se for outra pessoa, confirme abaixo para cadastrar mesmo assim.</p>
            </div>
          ) : null}

          <ContactFormFields form={form} idPrefix="new-contact" />

          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={save.isPending || form.formState.isSubmitting}>
              {duplicates ? 'Cadastrar mesmo assim' : 'Salvar contato'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
