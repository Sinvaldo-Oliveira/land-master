import { z } from 'zod'

export const loginSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
  password: z.string().min(1, 'Informe sua senha.'),
})
export type LoginValues = z.infer<typeof loginSchema>

export const forgotPasswordSchema = z.object({
  email: z.email('Informe um e-mail válido.'),
})
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>

export const newPasswordSchema = z
  .object({
    password: z
      .string()
      .min(10, 'Use pelo menos 10 caracteres.')
      .max(72, 'Use no máximo 72 caracteres.')
      .regex(/[A-Za-z]/, 'Inclua pelo menos uma letra.')
      .regex(/\d/, 'Inclua pelo menos um número.'),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { path: ['confirm'], message: 'As senhas não conferem.' })
export type NewPasswordValues = z.infer<typeof newPasswordSchema>
