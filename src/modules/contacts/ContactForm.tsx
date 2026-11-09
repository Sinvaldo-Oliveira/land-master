import { Controller, type UseFormReturn } from 'react-hook-form'
import { Field, fieldDescribedBy, Input, Select, Textarea } from '@/admin/ui'
import { lifecycleOptions, type ContactFormValues } from './schemas'

type ContactFormProps = {
  form: UseFormReturn<ContactFormValues>
  idPrefix: string
}

/** Campos do cadastro de contato. Usado no diálogo de novo contato e na edição do detalhe. */
export function ContactFormFields({ form, idPrefix }: ContactFormProps) {
  const {
    register,
    control,
    formState: { errors },
  } = form
  const id = (name: string) => `${idPrefix}-${name}`

  return (
    <div className="grid gap-4">
      <Field label="Nome" htmlFor={id('name')} error={errors.name?.message} required>
        <Input
          id={id('name')}
          autoComplete="off"
          invalid={Boolean(errors.name)}
          aria-describedby={fieldDescribedBy(id('name'), { error: errors.name?.message })}
          {...register('name')}
        />
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="E-mail" htmlFor={id('email')} error={errors.email?.message}>
          <Input
            id={id('email')}
            type="email"
            inputMode="email"
            autoComplete="off"
            invalid={Boolean(errors.email)}
            aria-describedby={fieldDescribedBy(id('email'), { error: errors.email?.message })}
            {...register('email')}
          />
        </Field>
        <Field label="Telefone" htmlFor={id('phone')} error={errors.phone?.message}>
          <Input
            id={id('phone')}
            type="tel"
            inputMode="tel"
            autoComplete="off"
            invalid={Boolean(errors.phone)}
            aria-describedby={fieldDescribedBy(id('phone'), { error: errors.phone?.message })}
            {...register('phone')}
          />
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Empresa" htmlFor={id('company')} error={errors.company?.message}>
          <Input id={id('company')} autoComplete="off" invalid={Boolean(errors.company)} {...register('company')} />
        </Field>
        <Field label="Situação" htmlFor={id('lifecycle')} error={errors.lifecycle?.message}>
          <Controller
            control={control}
            name="lifecycle"
            render={({ field }) => (
              <Select
                id={id('lifecycle')}
                value={field.value}
                onValueChange={field.onChange}
                options={lifecycleOptions}
                invalid={Boolean(errors.lifecycle)}
              />
            )}
          />
        </Field>
      </div>

      <Field label="Observações" htmlFor={id('notes')} error={errors.notes?.message}>
        <Textarea id={id('notes')} rows={3} invalid={Boolean(errors.notes)} {...register('notes')} />
      </Field>
    </div>
  )
}
