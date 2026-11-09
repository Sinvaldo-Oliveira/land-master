import { z } from 'zod'
import type { ContactLifecycle } from '@/types/database'

export const lifecycleLabels: Record<ContactLifecycle, string> = {
  lead: 'Lead',
  prospect: 'Em negociação',
  customer: 'Cliente',
  inactive: 'Inativo',
}

export const lifecycleOptions = (Object.keys(lifecycleLabels) as ContactLifecycle[]).map((value) => ({
  value,
  label: lifecycleLabels[value],
}))

const optionalPhone = z
  .string()
  .trim()
  .max(30, 'Use no máximo 30 caracteres.')
  .refine((value) => value === '' || value.replace(/\D/g, '').length >= 8, 'Telefone incompleto.')

export const contactFormSchema = z.object({
  name: z.string().trim().min(1, 'Informe o nome.').max(160, 'Use no máximo 160 caracteres.'),
  email: z
    .string()
    .trim()
    .max(254, 'Use no máximo 254 caracteres.')
    .refine((value) => value === '' || z.email().safeParse(value).success, 'Informe um e-mail válido.'),
  phone: optionalPhone,
  company: z.string().trim().max(160, 'Use no máximo 160 caracteres.'),
  lifecycle: z.enum(['lead', 'prospect', 'customer', 'inactive']),
  notes: z.string().trim().max(5000, 'Use no máximo 5000 caracteres.'),
})
export type ContactFormValues = z.infer<typeof contactFormSchema>

export const activityFormSchema = z.object({
  body: z.string().trim().min(1, 'Escreva uma anotação.').max(5000, 'Use no máximo 5000 caracteres.'),
})
export type ActivityFormValues = z.infer<typeof activityFormSchema>

/**
 * Prepara o termo digitado para um filtro `or(...)` do PostgREST.
 * Remove caracteres que alteram a sintaxe do filtro (vírgula, parênteses, curingas).
 */
export function sanitizeSearchTerm(raw: string): string {
  return raw.replace(/[,()%*\\]/g, ' ').replace(/\s+/g, ' ').trim().slice(0, 80)
}
