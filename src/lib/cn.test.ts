import { describe, expect, it } from 'vitest'
import { cn } from './cn'

describe('cn', () => {
  it('mantém tamanho e cor do admin juntos', () => {
    expect(cn('text-admin-sm', 'text-admin-ink')).toBe('text-admin-sm text-admin-ink')
  })
  it('resolve conflitos de cor', () => {
    expect(cn('text-admin-ink', 'text-admin-danger')).toBe('text-admin-danger')
  })
  it('resolve conflitos de tamanho', () => {
    expect(cn('text-admin-sm', 'text-admin-lg')).toBe('text-admin-lg')
  })
})
