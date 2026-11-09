import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, Navigate, useLocation, useNavigate } from 'react-router'
import { useDocumentTitle } from '@/admin/hooks/useDocumentTitle'
import { Button, Field, fieldDescribedBy, Input } from '@/admin/ui'
import { useAuth } from '../auth-context'
import { authErrorMessage } from '../auth-errors'
import { AuthLayout } from '../AuthLayout'
import { ConfigNotice } from '../ConfigNotice'
import { FormAlert } from '../FormAlert'
import { safeAdminRedirect } from '../redirect'
import { loginSchema, type LoginValues } from '../schemas'

export default function LoginPage() {
  useDocumentTitle('Entrar')
  const auth = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const destination = safeAdminRedirect((location.state as { from?: unknown } | null)?.from)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } })

  if (auth.status === 'signed-in') return <Navigate to={destination} replace />

  const unconfigured = auth.status === 'unconfigured'

  const onSubmit = handleSubmit(async (values) => {
    setError(null)
    try {
      await auth.signIn(values.email, values.password)
      void navigate(destination, { replace: true })
    } catch (err) {
      setError(authErrorMessage(err))
    }
  })

  return (
    <AuthLayout title="Entrar" description="Use o e-mail e a senha da sua conta de equipe.">
      {unconfigured ? <ConfigNotice /> : null}
      {error ? <FormAlert tone="danger">{error}</FormAlert> : null}

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

        <Field label="Senha" htmlFor="password" error={errors.password?.message} required>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            invalid={Boolean(errors.password)}
            aria-describedby={fieldDescribedBy('password', { error: errors.password?.message })}
            {...register('password')}
          />
        </Field>

        <Button type="submit" loading={isSubmitting} disabled={unconfigured} className="mt-1 w-full">
          Entrar
        </Button>
      </form>

      <p className="mt-6 text-admin-sm">
        <Link to="/admin/recuperar-senha" className="font-medium text-admin-accent underline-offset-4 hover:underline">
          Esqueci minha senha
        </Link>
      </p>
    </AuthLayout>
  )
}
