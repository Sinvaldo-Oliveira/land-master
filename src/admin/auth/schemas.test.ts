import { describe, expect, it } from 'vitest'
import { loginSchema, newPasswordSchema } from './schemas'

describe('schemas de autenticação', () => {
  it('rejeita e-mail inválido', () => {
    expect(loginSchema.safeParse({ email: 'x', password: 'a' }).success).toBe(false)
  })

  it('exige senha forte e confirmação igual', () => {
    expect(newPasswordSchema.safeParse({ password: 'curta1', confirm: 'curta1' }).success).toBe(false)
    expect(newPasswordSchema.safeParse({ password: 'somenteletras', confirm: 'somenteletras' }).success).toBe(false)
    expect(newPasswordSchema.safeParse({ password: 'senhaforte123', confirm: 'outra123456' }).success).toBe(false)
    expect(newPasswordSchema.safeParse({ password: 'senhaforte123', confirm: 'senhaforte123' }).success).toBe(true)
  })
})
