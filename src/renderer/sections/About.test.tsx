import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageRenderer } from '../PageRenderer'
import { institucionalTemplate } from '../templates/institucional'
import type { PageDocument } from '../types'

function withAbout(patch: Record<string, unknown>, motion: 'none' | 'subtle' = 'subtle'): PageDocument {
  return {
    ...institucionalTemplate,
    theme: { ...institucionalTemplate.theme, motion },
    sections: institucionalTemplate.sections.map((s) => (s.type === 'about' ? { ...s, ...patch } : s)),
  } as PageDocument
}

const photo = (container: HTMLElement) => container.querySelector('img[alt="Leila Marques"]') as HTMLImageElement

function card(container: HTMLElement) {
  const el = photo(container).parentElement as HTMLElement
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 250, right: 200, bottom: 250, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
  return el
}

describe('foto da seção Sobre', () => {
  it('sem imagem mantém o painel escuro com a citação', () => {
    const { container } = render(<PageRenderer document={institucionalTemplate} />)
    expect(container.querySelectorAll('img')).toHaveLength(0)
    expect(container.querySelector('blockquote')).not.toBeNull()
  })

  it('com imagem troca o painel pelo cartão com a foto', () => {
    const { container } = render(<PageRenderer document={withAbout({ imageUrl: 'https://exemplo.com/leila.webp', imageAlt: 'Leila Marques' })} />)
    expect(photo(container)).toHaveAttribute('src', 'https://exemplo.com/leila.webp')
    expect(photo(container)).toHaveClass('object-cover')
    expect(container.querySelector('blockquote')).toBeNull()
  })

  it('inclina até 15°, cresce e mostra o reflexo que segue o mouse; volta ao sair', () => {
    const { container } = render(<PageRenderer document={withAbout({ imageUrl: 'https://exemplo.com/leila.webp', imageAlt: 'Leila Marques' })} />)
    const el = card(container)
    const glare = container.querySelector('[data-glare]') as HTMLElement
    expect(glare.style.opacity).toBe('0')

    fireEvent.pointerMove(el, { clientX: 200, clientY: 0, pointerType: 'mouse' }) // canto superior direito
    expect(el.style.transform).toBe('rotateX(15deg) rotateY(15deg) scale(1.05)')
    expect(glare.style.opacity).toBe('1')
    expect(glare.style.background).toContain('100% 0%')

    fireEvent.pointerLeave(el)
    expect(el.style.transform).toBe('rotateX(0deg) rotateY(0deg) scale(1)')
    expect(glare.style.opacity).toBe('0')
  })

  it('"mostrar a imagem inteira" não corta a foto', () => {
    const { container } = render(
      <PageRenderer document={withAbout({ imageUrl: 'https://exemplo.com/leila.webp', imageAlt: 'Leila Marques', imageFit: 'contain' })} />,
    )
    expect(photo(container)).toHaveClass('object-contain')
  })

  it('sem movimento no tema, não inclina', () => {
    const { container } = render(
      <PageRenderer document={withAbout({ imageUrl: 'https://exemplo.com/leila.webp', imageAlt: 'Leila Marques' }, 'none')} />,
    )
    const el = card(container)
    fireEvent.pointerMove(el, { clientX: 200, clientY: 0, pointerType: 'mouse' })
    expect(el.style.transform).toBe('rotateX(0deg) rotateY(0deg) scale(1)')
  })
})
