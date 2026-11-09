import { AuthApiError } from '@supabase/supabase-js'
import { describe, expect, it } from 'vitest'
import { authErrorMessage } from './auth-errors'

describe('authErrorMessage', () => {
  it('traduz credenciais inválidas', () => {
    expect(authErrorMessage(new AuthApiError('Invalid login credentials', 400, 'invalid_credentials'))).toBe(
      'E-mail ou senha incorretos.',
    )
  })

  it('trata limite de requisições pelo status', () => {
    expect(authErrorMessage(new AuthApiError('Too many', 429, undefined))).toMatch(/Muitas tentativas/)
  })

  it('não vaza mensagens técnicas desconhecidas', () => {
    expect(authErrorMessage(new Error('relation "x" does not exist'))).toBe(
      'Não foi possível concluir. Tente novamente em instantes.',
    )
  })

  it('identifica falha de rede', () => {
    expect(authErrorMessage(new TypeError('Failed to fetch'))).toMatch(/conectar/)
  })
})
