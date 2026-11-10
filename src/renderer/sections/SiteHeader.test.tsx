import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageRenderer } from '../PageRenderer'
import { institucionalTemplate } from '../templates/institucional'
import type { PageDocument } from '../types'

function withHeader(patch: Record<string, unknown>): PageDocument {
  return {
    ...institucionalTemplate,
    sections: institucionalTemplate.sections.map((s) => (s.type === 'site-header' ? { ...s, ...patch } : s)),
  } as PageDocument
}

const homeLink = () => screen.getByRole('link', { name: 'Sua Empresa — início' })

describe('logo no cabeçalho', () => {
  it('sem logo mostra automaticamente as iniciais e o nome da empresa', () => {
    render(<PageRenderer document={institucionalTemplate} />)
    expect(homeLink().querySelector('img')).toBeNull()
    expect(homeLink()).toHaveTextContent('SESua Empresa')
  })

  it('com logo mostra só a imagem, com o nome da empresa como texto alternativo', () => {
    render(<PageRenderer document={withHeader({ logoUrl: 'https://exemplo.com/logo.webp' })} />)
    const img = homeLink().querySelector('img')!
    expect(img).toHaveAttribute('src', 'https://exemplo.com/logo.webp')
    expect(img).toHaveAttribute('alt', 'Sua Empresa')
    expect(img).toHaveStyle({ height: '40px' })
    expect(homeLink()).not.toHaveTextContent('SE')
  })

  it('usa a altura escolhida no editor', () => {
    render(<PageRenderer document={withHeader({ logoUrl: 'https://exemplo.com/logo.webp', logoHeight: 56 })} />)
    expect(homeLink().querySelector('img')).toHaveStyle({ height: '56px' })
  })

  it('logo apagado (campo vazio) volta para o nome automático', () => {
    render(<PageRenderer document={withHeader({ logoUrl: '' })} />)
    expect(homeLink().querySelector('img')).toBeNull()
    expect(homeLink()).toHaveTextContent('Sua Empresa')
  })
})
