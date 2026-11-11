import { describe, expect, it } from 'vitest'
import { institucionalTemplate } from '@/renderer/templates/institucional'
import { identityFromHome } from './pages'

describe('identityFromHome', () => {
  it('extrai nome, logo e WhatsApp do rascunho da Home', () => {
    const home = structuredClone(institucionalTemplate)
    const header = home.sections.find((section) => section.type === 'site-header')!
    const contact = home.sections.find((section) => section.type === 'contact')!
    if (header.type === 'site-header') { header.brand.name = 'WebSic'; header.logoUrl = 'https://cdn.test/logo.webp' }
    if (contact.type === 'contact') contact.channels = [{ kind: 'whatsapp', label: 'WhatsApp', value: '(11) 99999-9999', href: 'https://wa.me/5511999999999' }]
    expect(identityFromHome(home)).toEqual({ name: 'WebSic', logoUrl: 'https://cdn.test/logo.webp', faviconUrl: '', whatsapp: '5511999999999' })
  })
})
