import { describe, expect, it } from 'vitest'
import { emptyToNull, formatCurrency } from './format'
import { supabaseErrorMessage } from './supabase-errors'

describe('formatCurrency', () => {
  it('formata em reais no padrão brasileiro', () => {
    expect(formatCurrency(1500)).toMatch(/R\$\s?1\.500,00/)
  })
})

describe('emptyToNull', () => {
  it('converte vazio e espaços em null e mantém o texto aparado', () => {
    expect(emptyToNull('   ')).toBeNull()
    expect(emptyToNull(undefined)).toBeNull()
    expect(emptyToNull('  Ana  ')).toBe('Ana')
  })
})

describe('supabaseErrorMessage', () => {
  it('traduz bloqueio de permissão sem expor detalhes técnicos', () => {
    expect(supabaseErrorMessage({ code: '42501', message: 'new row violates row-level security policy' }))
      .toBe('Seu perfil não permite esta ação.')
  })

  it('mostra a mensagem de regra de negócio do banco', () => {
    expect(supabaseErrorMessage({ code: 'P0001', message: 'Oportunidade já encerrada.' })).toBe('Oportunidade já encerrada.')
  })

  it('usa a mensagem genérica para erros desconhecidos', () => {
    expect(supabaseErrorMessage({ code: 'XX000', message: 'detalhe interno' })).toBe(
      'Não foi possível concluir a ação. Tente novamente.',
    )
  })
})
