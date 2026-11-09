import { describe, expect, it } from 'vitest'
import { dealFormSchema, lostFormSchema, parseAmount } from './schemas'

describe('parseAmount', () => {
  it('entende o formato brasileiro e o formato com ponto', () => {
    expect(parseAmount('1.500,50')).toBe(1500.5)
    expect(parseAmount('1500.5')).toBe(1500.5)
    expect(parseAmount('2000')).toBe(2000)
  })

  it('trata vazio como zero', () => {
    expect(parseAmount('   ')).toBe(0)
  })
})

describe('dealFormSchema', () => {
  const base = { title: 'Site institucional', contactId: 'c1', stageId: 's1', amount: '' }

  it('aceita oportunidade sem valor', () => {
    expect(dealFormSchema.safeParse(base).success).toBe(true)
  })

  it('rejeita valor negativo e texto no valor', () => {
    expect(dealFormSchema.safeParse({ ...base, amount: '-10' }).success).toBe(false)
    expect(dealFormSchema.safeParse({ ...base, amount: 'mil' }).success).toBe(false)
  })

  it('exige contato e etapa', () => {
    expect(dealFormSchema.safeParse({ ...base, contactId: '' }).success).toBe(false)
    expect(dealFormSchema.safeParse({ ...base, stageId: '' }).success).toBe(false)
  })
})

describe('lostFormSchema', () => {
  it('exige um motivo', () => {
    expect(lostFormSchema.safeParse({ reasonId: '', note: '' }).success).toBe(false)
    expect(lostFormSchema.safeParse({ reasonId: 'r1', note: '' }).success).toBe(true)
  })
})
