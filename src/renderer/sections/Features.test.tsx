import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageRenderer } from '../PageRenderer'
import { institucionalTemplate } from '../templates/institucional'
import type { FeaturesSection, PageDocument } from '../types'

function withServices(items: FeaturesSection['items']): PageDocument {
  return {
    ...institucionalTemplate,
    theme: { ...institucionalTemplate.theme, motion: 'none' },
    sections: institucionalTemplate.sections.map((s) => (s.type === 'features' ? { ...s, items } : s)),
  } as PageDocument
}

/** O card de serviço com este título (o cabeçalho também tem links, então não basta "li a"). */
const card = (container: HTMLElement, title: string) => [...container.querySelectorAll("li")].find((li) => li.querySelector("h3")?.textContent === title) as HTMLElement

const base = { icon: 'target' as const, title: 'Saúde da Mulher 40+', description: 'Orientação nutricional.' }

describe('cards de Serviços com botão de CTA', () => {
  it('cada card com link mostra o botão de CTA; cards sem link não mostram', () => {
    const { container } = render(
      <PageRenderer document={withServices([{ ...base, link: { label: 'Quero agendar', href: 'https://wa.me/5511999999999' } }, { ...base, title: 'Sem botão' }])} />,
    )
    const buttons = container.querySelectorAll<HTMLAnchorElement>('li a[href="https://wa.me/5511999999999"]')
    expect(buttons).toHaveLength(1)
    expect(buttons[0]?.textContent).toContain('Quero agendar')
    expect(buttons[0]?.target).toBe('_blank')
    expect(buttons[0]?.rel).toBe('noopener noreferrer')
    expect(card(container, 'Sem botão').querySelector('a')).toBeNull()
  })

  it('o rótulo é lido uma vez: a camada animada de trás fica escondida da leitura de tela', () => {
    const { container } = render(<PageRenderer document={withServices([{ ...base, link: { label: 'Quero agendar', href: '#contato' } }])} />)
    const button = card(container, base.title).querySelector('a') as HTMLAnchorElement
    expect(button.querySelectorAll('[aria-hidden="true"]').length).toBeGreaterThan(0)
    expect(button.querySelector('[aria-hidden="true"]')?.textContent).toContain('Quero agendar')
  })

  it('href inseguro não vira link: o botão cai para âncora neutra', () => {
    const { container } = render(<PageRenderer document={withServices([{ ...base, link: { label: 'Clique', href: 'javascript:alert(1)' } }])} />)
    const button = card(container, base.title).querySelector('a') as HTMLAnchorElement
    expect(button.getAttribute('href')).not.toContain('javascript')
  })
})
