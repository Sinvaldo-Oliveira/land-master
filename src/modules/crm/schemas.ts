import { z } from 'zod'

/** Converte o valor digitado (ex.: "1.500,00", "1500.5", "") em número. Vazio = 0. */
export function parseAmount(raw: string): number {
  const cleaned = raw.trim().replace(/\s/g, '')
  if (cleaned === '') return 0
  const normalized = cleaned.includes(',') ? cleaned.replace(/\./g, '').replace(',', '.') : cleaned
  return Number(normalized)
}

const amountField = z
  .string()
  .trim()
  .refine((value) => value === '' || Number.isFinite(parseAmount(value)), 'Informe um valor numérico.')
  .refine((value) => value === '' || parseAmount(value) >= 0, 'O valor não pode ser negativo.')
  .refine((value) => value === '' || parseAmount(value) <= 999_999_999_999.99, 'Valor acima do limite.')

export const dealFormSchema = z.object({
  title: z.string().trim().min(1, 'Informe o título da oportunidade.').max(160, 'Use no máximo 160 caracteres.'),
  contactId: z.string().min(1, 'Escolha o contato.'),
  stageId: z.string().min(1, 'Escolha a etapa.'),
  amount: amountField,
})
export type DealFormValues = z.infer<typeof dealFormSchema>

export const lostFormSchema = z.object({
  reasonId: z.string().min(1, 'Escolha o motivo da perda.'),
  note: z.string().trim().max(500, 'Use no máximo 500 caracteres.'),
})
export type LostFormValues = z.infer<typeof lostFormSchema>
