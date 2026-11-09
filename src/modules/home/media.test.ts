import { describe, expect, it } from 'vitest'
import { buildSitePath, fitWithin, sniffImageType, storageErrorMessage } from './media'

const bytes = (...values: number[]) => new Uint8Array(values)
const text = (value: string) => new Uint8Array([...value].map((c) => c.charCodeAt(0)))

describe('sniffImageType', () => {
  it('reconhece JPEG, PNG, WebP e AVIF pela assinatura', () => {
    expect(sniffImageType(bytes(0xff, 0xd8, 0xff, 0xe0))).toBe('image/jpeg')
    expect(sniffImageType(bytes(0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a))).toBe('image/png')
    expect(sniffImageType(new Uint8Array([...text('RIFF'), 0, 0, 0, 0, ...text('WEBP')]))).toBe('image/webp')
    expect(sniffImageType(new Uint8Array([0, 0, 0, 24, ...text('ftyp'), ...text('avif')]))).toBe('image/avif')
  })

  it('rejeita conteúdo que não é imagem, mesmo com outra extensão', () => {
    expect(sniffImageType(text('<script>alert(1)</script>'))).toBeNull()
    expect(sniffImageType(text('%PDF-1.7'))).toBeNull()
    expect(sniffImageType(new Uint8Array())).toBeNull()
  })
})

describe('buildSitePath', () => {
  it('organiza por ano e mês, com nome único', () => {
    expect(buildSitePath(new Date(Date.UTC(2026, 10, 9)), 'webp', 'abc-123')).toBe('2026/11/abc-123.webp')
  })
})

describe('fitWithin', () => {
  it('reduz o maior lado mantendo a proporção e nunca amplia', () => {
    expect(fitWithin(4000, 3000, 2000)).toEqual({ width: 2000, height: 1500 })
    expect(fitWithin(800, 600, 2000)).toEqual({ width: 800, height: 600 })
  })
})

describe('storageErrorMessage', () => {
  it('explica quando o bucket ainda não existe no projeto', () => {
    expect(storageErrorMessage({ message: 'Bucket not found' })).toMatch(/migração do bucket site-media/)
  })

  it('explica quando falta permissão', () => {
    expect(storageErrorMessage({ message: 'new row violates row-level security policy' })).toMatch(/não tem permissão/)
  })

  it('usa a mensagem genérica para o resto', () => {
    expect(storageErrorMessage({ message: 'boom' })).toMatch(/Verifique a conexão/)
  })
})
