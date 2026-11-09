import { describe, expect, it } from 'vitest'
import { contactFormSchema, sanitizeSearchTerm } from './schemas'

const valid = {
  name: 'Maria Souza',
  email: '',
  phone: '',
  company: '',
  lifecycle: 'lead' as const,
  notes: '',
}

describe('contactFormSchema', () => {
  it('aceita um contato mínimo (apenas nome)', () => {
    expect(contactFormSchema.safeParse(valid).success).toBe(true)
  })

  it('exige nome', () => {
    const result = contactFormSchema.safeParse({ ...valid, name: '   ' })
    expect(result.success).toBe(false)
  })

  it('rejeita e-mail malformado e aceita e-mail vazio', () => {
    expect(contactFormSchema.safeParse({ ...valid, email: 'maria@' }).success).toBe(false)
    expect(contactFormSchema.safeParse({ ...valid, email: 'maria@empresa.com.br' }).success).toBe(true)
  })

  it('rejeita telefone com menos de 8 dígitos e aceita formatado', () => {
    expect(contactFormSchema.safeParse({ ...valid, phone: '1234' }).success).toBe(false)
    expect(contactFormSchema.safeParse({ ...valid, phone: '(11) 90000-0001' }).success).toBe(true)
  })
})

describe('sanitizeSearchTerm', () => {
  it('remove caracteres que quebram o filtro do PostgREST', () => {
    expect(sanitizeSearchTerm('ana,email.eq.x(%)')).toBe('ana email.eq.x')
  })

  it('normaliza espaços e limita o tamanho', () => {
    expect(sanitizeSearchTerm('  maria    souza  ')).toBe('maria souza')
    expect(sanitizeSearchTerm('a'.repeat(200))).toHaveLength(80)
  })
})
