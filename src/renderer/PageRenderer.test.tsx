import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { PageRenderer } from './PageRenderer'
import { institucionalTemplate } from './templates/institucional'
import type { PageDocument } from './types'

describe('PageRenderer com o template Institucional', () => {
  it('tem exatamente um h1 e um título para cada seção', () => {
    render(<PageRenderer document={institucionalTemplate} />)
    expect(screen.getAllByRole('heading', { level: 1 })).toHaveLength(1)
    for (const title of ['O que fazemos por você', 'Um processo simples, do começo ao fim', 'Fale com a nossa equipe']) {
      expect(screen.getByRole('heading', { level: 2, name: title })).toBeInTheDocument()
    }
  })

  it('todas as âncoras do menu apontam para seções existentes', () => {
    const { container } = render(<PageRenderer document={institucionalTemplate} />)
    const nav = screen.getByRole('navigation', { name: 'Principal' })
    for (const link of within(nav).getAllByRole('link')) {
      const target = link.getAttribute('href')!
      expect(target.startsWith('#')).toBe(true)
      expect(container.querySelector(target)).not.toBeNull()
    }
  })

  it('menu do celular abre e fecha com o botão e com Esc', async () => {
    const user = userEvent.setup()
    render(<PageRenderer document={institucionalTemplate} />)
    const toggle = screen.getByRole('button', { name: 'Abrir menu' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(screen.getByRole('button', { name: 'Fechar menu' })).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(screen.getByRole('button', { name: 'Abrir menu' })).toHaveAttribute('aria-expanded', 'false')
  })

  it('links externos abrem em nova aba com rel seguro', () => {
    render(<PageRenderer document={institucionalTemplate} />)
    const whatsapp = screen.getAllByRole('link', { name: /WhatsApp/ })[0]!
    expect(whatsapp).toHaveAttribute('target', '_blank')
    expect(whatsapp).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('neutraliza links perigosos vindos do documento', () => {
    const malicious: PageDocument = structuredClone(institucionalTemplate)
    const hero = malicious.sections.find((s) => s.type === 'hero')
    if (hero?.type !== 'hero') throw new Error('template sem hero')
    hero.primary = { label: 'Clique', href: 'javascript:alert(1)' }

    const { container } = render(<PageRenderer document={malicious} />)
    expect(screen.getByRole('link', { name: 'Clique' })).toHaveAttribute('href', '#')
    expect(container.querySelector('a[href^="javascript:"]')).toBeNull()
  })
})
