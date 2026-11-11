import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { ArrowLeft, FilePlus2, LayoutTemplate } from 'lucide-react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { useDocumentTitle } from '@/admin/hooks/useDocumentTitle'
import { Badge, Button, buttonVariants, Card, CardBody, PageHeader, toast } from '@/admin/ui'
import { pageMetaSchema, type PageMetaValues } from '../schema/page-meta'
import { createBlankLandingPage, LANDING_PAGES_KEY } from '../services/pages'
import { PageMetaFields } from './PageMetaFields'

export default function NewLandingPage() {
  useDocumentTitle('Nova landing page')
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const form = useForm<PageMetaValues>({
    resolver: zodResolver(pageMetaSchema),
    defaultValues: { title: '', slug: '' },
  })

  const create = useMutation({
    mutationFn: createBlankLandingPage,
    onSuccess: async () => {
      toast.success('Página criada como rascunho.')
      await queryClient.invalidateQueries({ queryKey: LANDING_PAGES_KEY })
      void navigate('/admin/paginas')
    },
    onError: (error) => {
      // Endereço repetido é o erro mais comum: mostra no próprio campo, além do aviso.
      if (error.message.includes('endereço')) form.setError('slug', { message: error.message })
      toast.error(error.message, { duration: Infinity })
    },
  })

  return (
    <>
      <Link to="/admin/paginas" className="inline-flex items-center gap-1.5 text-admin-sm text-admin-ink-2 hover:text-admin-ink">
        <ArrowLeft aria-hidden="true" className="size-4" />
        Landing pages
      </Link>
      <PageHeader
        className="mt-3"
        title="Nova landing page"
        description="Dê um nome e escolha o endereço. A página nasce como rascunho e só vai ao ar quando você publicar."
      />

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <Card>
          <CardBody>
            <form noValidate onSubmit={form.handleSubmit((values) => create.mutate(values))} className="grid gap-6">
              <PageMetaFields form={form} idPrefix="new-page" followTitle />
              <div className="flex flex-col-reverse gap-2 border-t border-admin-rule pt-5 sm:flex-row sm:justify-end">
                <Link to="/admin/paginas" className={buttonVariants({ variant: 'secondary' })}>
                  Cancelar
                </Link>
                <Button type="submit" loading={create.isPending}>
                  Criar página
                </Button>
              </div>
            </form>
          </CardBody>
        </Card>

        <section aria-label="Ponto de partida" className="grid content-start gap-3">
          <div className="rounded-admin-lg border-2 border-admin-accent bg-admin-card p-4">
            <p className="flex items-center gap-2 font-medium text-admin-ink">
              <FilePlus2 aria-hidden="true" className="size-4 text-admin-accent" />
              Começar do zero
            </p>
            <p className="mt-1 text-admin-sm text-admin-ink-2">Página em branco, com as cores e fontes do seu site.</p>
          </div>
          <div className="rounded-admin-lg border border-dashed border-admin-rule-strong p-4">
            <p className="flex flex-wrap items-center gap-2 font-medium text-admin-ink-2">
              <LayoutTemplate aria-hidden="true" className="size-4" />
              Começar por um modelo
              <Badge tone="info">Em breve</Badge>
            </p>
            <p className="mt-1 text-admin-sm text-admin-ink-3">Os modelos prontos chegam em uma próxima etapa.</p>
          </div>
        </section>
      </div>
    </>
  )
}
