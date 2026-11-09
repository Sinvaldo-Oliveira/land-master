import { zodResolver } from '@hookform/resolvers/zod'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { Link, useNavigate } from 'react-router'
import { useDocumentTitle } from '@/admin/hooks/useDocumentTitle'
import { Button, Field, fieldDescribedBy, Input, Spinner, toast } from '@/admin/ui'
import { useAuth } from '../auth-context'
import { authErrorMessage } from '../auth-errors'
import { AuthLayout } from '../AuthLayout'
import { ConfigNotice } from '../ConfigNotice'
import { FormAlert } from '../FormAlert'
import { newPasswordSchema, type NewPasswordValues } from '../schemas'

const PASSWORD_HINT = 'Mínimo de 10 caracteres, com letras e números.'

/**
 * Destino dos links de recuperação de senha e de convite.
 * O supabase-js troca o código da URL por uma sessão (PKCE) automaticamente.
 */
export default function ResetPasswordPage() {
  useDocumentTitle('Definir senha')
  const auth = useAuth()
  const navigate = useNavigate()
  const [error, setError] = useState<string | null>(null)
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<NewPasswordValues>({ resolver: zodResolver(newPasswordSchema), defaultValues: { password: '', confirm: '' } })

  const onSubmit = handleSubmit(async ({ password }) => {
    setError(null)
    try {
      await auth.updatePassword(password)
      toast.success('Senha definida. Bem-vindo!')
      void navigate('/admin', { replace: true })
    } catch (err) {
      setError(authErrorMessage(err))
    }
  })

  if (auth.status === 'loading') {
    return (
      <AuthLayout title="Definir senha">
        <Spinner label="Validando link" />
      </AuthLayout>
    )
  }

  if (auth.status === 'unconfigured') {
    return (
      <AuthLayout title="Definir senha">
        <ConfigNotice />
      </AuthLayout>
    )
  }

  if (auth.status === 'signed-out') {
    return (
      <AuthLayout title="Link inválido ou expirado" description="Por segurança, os links valem por pouco tempo e só podem ser usados uma vez.">
        <Button asChild className="w-full">
          <Link to="/admin/recuperar-senha">Solicitar novo link</Link>
        </Button>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Definir senha" description={`Conta: ${auth.user?.email ?? ''}`}>
      {error ? <FormAlert tone="danger">{error}</FormAlert> : null}
      <form noValidate onSubmit={onSubmit} className="grid gap-5">
        <Field label="Nova senha" htmlFor="password" error={errors.password?.message} hint={PASSWORD_HINT} required>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            invalid={Boolean(errors.password)}
            aria-describedby={fieldDescribedBy('password', { error: errors.password?.message, hint: PASSWORD_HINT })}
            {...register('password')}
          />
        </Field>
        <Field label="Confirmar senha" htmlFor="confirm" error={errors.confirm?.message} required>
          <Input
            id="confirm"
            type="password"
            autoComplete="new-password"
            invalid={Boolean(errors.confirm)}
            aria-describedby={fieldDescribedBy('confirm', { error: errors.confirm?.message })}
            {...register('confirm')}
          />
        </Field>
        <Button type="submit" loading={isSubmitting} className="w-full">
          Salvar senha
        </Button>
      </form>
    </AuthLayout>
  )
}
