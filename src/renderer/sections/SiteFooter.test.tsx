import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageRenderer } from '../PageRenderer'
import { institucionalTemplate } from '../templates/institucional'
import type { PageDocument } from '../types'

function withFooter(patch: Record<string, unknown>): PageDocument {
  return {
    ...institucionalTemplate,
    sections: institucionalTemplate.sections.map((s) => (s.type === 'site-footer' ? { ...s, ...patch } : s)),
  } as PageDocument
}

const footer = (container: HTMLElement) => container.querySelector('footer')!

describe('logo no rodapé', () => {
  it('sem logo mostra automaticamente as iniciais e o nome da empresa', () => {
    const { container } = render(<PageRenderer document={institucionalTemplate} />)
    expect(footer(container).querySelector('img')).toBeNull()
    expect(footer(container)).toHaveTextContent('Sua Empresa')
  })

  it('com logo mostra a imagem com o nome como texto alternativo e a altura escolhida', () => {
    const { container } = render(<PageRenderer document={withFooter({ logoUrl: 'https://exemplo.com/logo-claro.webp', logoHeight: 48 })} />)
    const img = footer(container).querySelector('img')!
    expect(img).toHaveAttribute('src', 'https://exemplo.com/logo-claro.webp')
    expect(img).toHaveAttribute('alt', 'Sua Empresa')
    expect(img).toHaveStyle({ height: '48px' })
  })

  it('logo apagado (campo vazio) volta para o nome automático', () => {
    const { container } = render(<PageRenderer document={withFooter({ logoUrl: '' })} />)
    expect(footer(container).querySelector('img')).toBeNull()
  })
})
