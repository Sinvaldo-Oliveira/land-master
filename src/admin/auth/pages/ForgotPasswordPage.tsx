import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link } from 'react-router'
import { useDocumentTitle } from '@/admin/hooks/useDocumentTitle'
import { Button, Field, fieldDescribedBy, Input } from '@/admin/ui'
import { useAuth } from '../auth-context'
import { authErrorMessage } from '../auth-errors'
import { AuthLayout } from '../AuthLayout'
import { ConfigNotice } from '../ConfigNotice'
import { FormAlert } from '../FormAlert'
import { forgotPasswordSchema, type ForgotPasswordValues } from '../schemas'

export default function ForgotPasswordPage() {
  useDocumentTitle('Recuperar senha')
  const auth = useAuth()
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordValues>({ resolver: zodResolver(forgotPasswordSchema), defaultValues: { email: '' } })

  const unconfigured = auth.status === 'unconfigured'

  const onSubmit = handleSubmit(async ({ email }) => {
    setError(null)
    try {
      await auth.sendPasswordReset(email)
      // Mesma resposta exista ou não a conta: não revela quais e-mails estão cadastrados.
      setSent(true)
    } catch (err) {
      setError(authErrorMessage(err))
    }
  })

  return (
    <AuthLayout title="Recuperar senha" description="Enviaremos um link para você criar uma nova senha.">
      {unconfigured ? <ConfigNotice /> : null}
      {error ? <FormAlert tone="danger">{error}</FormAlert> : null}

      {sent ? (
        <FormAlert tone="success">
          Se este e-mail estiver cadastrado, você receberá o link em instantes. Confira também a caixa de spam.
        </FormAlert>
      ) : (
        <form noValidate onSubmit={onSubmit} className="grid gap-5">
          <Field label="E-mail" htmlFor="email" error={errors.email?.message} required>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              invalid={Boolean(errors.email)}
              aria-describedby={fieldDescribedBy('email', { error: errors.email?.message })}
              {...register('email')}
            />
          </Field>
          <Button type="submit" loading={isSubmitting} disabled={unconfigured} className="w-full">
            Enviar link
          </Button>
        </form>
      )}

      <p className="mt-6 text-admin-sm">
        <Link to="/admin/login" className="font-medium text-admin-accent underline-offset-4 hover:underline">
          Voltar para o login
        </Link>
      </p>
    </AuthLayout>
  )
}
