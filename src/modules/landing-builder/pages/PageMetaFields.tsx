import { useState } from 'react'
import { useWatch, type UseFormReturn } from 'react-hook-form'
import { Field, fieldDescribedBy, Input } from '@/admin/ui'
import { PUBLIC_PREFIX, slugify, type PageMetaValues } from '../schema/page-meta'

type PageMetaFieldsProps = {
  form: UseFormReturn<PageMetaValues>
  idPrefix: string
  /** Página nova: o endereço acompanha o nome até a pessoa editar o endereço à mão. */
  followTitle?: boolean
}

/** Nome e endereço de uma landing page. Usado em criar, duplicar e renomear. */
export function PageMetaFields({ form, idPrefix, followTitle = false }: PageMetaFieldsProps) {
  const {
    register,
    setValue,
    control,
    formState: { errors },
  } = form
  const [slugTouched, setSlugTouched] = useState(!followTitle)
  const titleId = `${idPrefix}-title`
  const slugId = `${idPrefix}-slug`
  const slug = useWatch({ control, name: 'slug' })
  const slugHint = `Endereço público: ${PUBLIC_PREFIX}${slug || 'seu-endereco'}`

  const title = register('title', {
    onChange: (event: { target: { value: string } }) => {
      if (!slugTouched) setValue('slug', slugify(event.target.value), { shouldValidate: form.formState.isSubmitted })
    },
  })
  const slugField = register('slug', { onChange: () => setSlugTouched(true) })

  return (
    <div className="grid gap-4">
      <Field label="Nome da página" htmlFor={titleId} error={errors.title?.message} hint="Aparece só no painel." required>
        <Input
          id={titleId}
          autoComplete="off"
          invalid={Boolean(errors.title)}
          aria-describedby={fieldDescribedBy(titleId, { error: errors.title?.message, hint: 'Aparece só no painel.' })}
          {...title}
        />
      </Field>
      <Field label="Endereço" htmlFor={slugId} error={errors.slug?.message} hint={slugHint} required>
        <div className="flex items-center">
          <span
            aria-hidden="true"
            className="inline-flex h-9 items-center rounded-l-admin border border-r-0 border-admin-rule-strong bg-admin-sunken px-3 font-admin-mono text-admin-sm text-admin-ink-2"
          >
            {PUBLIC_PREFIX}
          </span>
          <Input
            id={slugId}
            autoComplete="off"
            autoCapitalize="none"
            spellCheck={false}
            className="rounded-l-none font-admin-mono"
            invalid={Boolean(errors.slug)}
            aria-describedby={fieldDescribedBy(slugId, { error: errors.slug?.message, hint: slugHint })}
            {...slugField}
          />
        </div>
      </Field>
    </div>
  )
}
