import { zodResolver } from '@hookform/resolvers/zod'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { TriangleAlert } from 'lucide-react'
import { useForm, useWatch } from 'react-hook-form'
import { Button, Dialog, DialogContent, DialogFooter, toast } from '@/admin/ui'
import type { LandingPageSummary } from '@/types/database'
import { copySlug, pageMetaSchema, PUBLIC_PREFIX, TITLE_MAX, type PageMetaValues } from '../schema/page-meta'
import { duplicateLandingPage, LANDING_PAGES_KEY, runPageAction, updateLandingMeta, type PageAction } from '../services/pages'
import { PageMetaFields } from './PageMetaFields'

type DialogProps = { page: LandingPageSummary; onClose: () => void }

/** Renomear e trocar o endereço. Página no ar pede confirmação explícita para trocar o endereço. */
export function EditMetaDialog({ page, onClose }: DialogProps) {
  const queryClient = useQueryClient()
  const form = useForm<PageMetaValues>({
    resolver: zodResolver(pageMetaSchema),
    defaultValues: { title: page.title, slug: page.slug },
  })
  const slugChanged = useWatch({ control: form.control, name: 'slug' }).trim() !== page.slug
  const needsConfirmation = page.status === 'published' && slugChanged

  const save = useMutation({
    mutationFn: (values: PageMetaValues) => updateLandingMeta(page.id, values, needsConfirmation),
    onSuccess: async () => {
      toast.success('Página atualizada.')
      await queryClient.invalidateQueries({ queryKey: LANDING_PAGES_KEY })
      onClose()
    },
    onError: (error) => toast.error(error.message, { duration: Infinity }),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title="Renomear página" description="Altere o nome e o endereço da página.">
        <form noValidate onSubmit={form.handleSubmit((values) => save.mutate(values))} className="grid gap-5">
          <PageMetaFields form={form} idPrefix="edit-page" />
          {needsConfirmation ? (
            <p role="alert" className="flex gap-2 rounded-admin-md border border-admin-warning/30 bg-admin-warning-soft p-3 text-admin-sm text-admin-ink">
              <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-admin-warning" />
              <span>
                Esta página está no ar. Ao salvar, o endereço <strong className="font-admin-mono">{PUBLIC_PREFIX}{page.slug}</strong>{' '}
                deixa de funcionar e os links já divulgados param de abrir.
              </span>
            </p>
          ) : null}
          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={save.isPending}>
              {needsConfirmation ? 'Trocar endereço e salvar' : 'Salvar'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

export function DuplicateDialog({ page, onClose }: DialogProps) {
  const queryClient = useQueryClient()
  const form = useForm<PageMetaValues>({
    resolver: zodResolver(pageMetaSchema),
    defaultValues: { title: `Cópia de ${page.title}`.slice(0, TITLE_MAX), slug: copySlug(page.slug) },
  })

  const duplicate = useMutation({
    mutationFn: (values: PageMetaValues) => duplicateLandingPage(page.id, values),
    onSuccess: async () => {
      toast.success('Página duplicada. A cópia começa como rascunho.')
      await queryClient.invalidateQueries({ queryKey: LANDING_PAGES_KEY })
      onClose()
    },
    onError: (error) => toast.error(error.message, { duration: Infinity }),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title="Duplicar página" description={`Cria uma cópia de “${page.title}” como rascunho. A original não muda.`}>
        <form noValidate onSubmit={form.handleSubmit((values) => duplicate.mutate(values))} className="grid gap-5">
          <PageMetaFields form={form} idPrefix="duplicate-page" />
          <DialogFooter>
            <Button variant="secondary" onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" loading={duplicate.isPending}>
              Duplicar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

type Confirmable = Exclude<PageAction, 'restore'>

const confirmCopy: Record<Confirmable, { title: string; body: (page: LandingPageSummary) => string; button: string; done: string; danger: boolean }> = {
  unpublish: {
    title: 'Tirar esta página do ar?',
    body: (page) => `O endereço ${PUBLIC_PREFIX}${page.slug} deixa de abrir para os visitantes. O conteúdo fica guardado e pode ser publicado de novo.`,
    button: 'Tirar do ar',
    done: 'Página fora do ar.',
    danger: false,
  },
  archive: {
    title: 'Arquivar esta página?',
    body: (page) =>
      page.status === 'published'
        ? `A página sai do ar (${PUBLIC_PREFIX}${page.slug} deixa de abrir) e sai da lista principal. Você pode restaurá-la depois.`
        : 'A página sai da lista principal. Você pode restaurá-la depois, no filtro “Arquivadas”.',
    button: 'Arquivar',
    done: 'Página arquivada.',
    danger: false,
  },
  delete: {
    title: 'Excluir esta página?',
    body: (page) => `“${page.title}” e todas as versões publicadas dela serão apagadas. Esta ação não pode ser desfeita.`,
    button: 'Excluir página',
    done: 'Página excluída.',
    danger: true,
  },
}

export function ConfirmActionDialog({ page, action, onClose }: DialogProps & { action: Confirmable }) {
  const queryClient = useQueryClient()
  const copy = confirmCopy[action]
  const run = useMutation({
    mutationFn: () => runPageAction(action, page.id),
    onSuccess: async () => {
      toast.success(copy.done)
      await queryClient.invalidateQueries({ queryKey: LANDING_PAGES_KEY })
      onClose()
    },
    onError: (error) => toast.error(error.message, { duration: Infinity }),
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent title={copy.title} description={copy.body(page)}>
        <DialogFooter className="mt-0">
          <Button variant="secondary" onClick={onClose}>
            Cancelar
          </Button>
          <Button variant={copy.danger ? 'danger' : 'primary'} loading={run.isPending} onClick={() => run.mutate()}>
            {copy.button}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
