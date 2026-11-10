import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { SiteThemeContext } from '../context'
import { ImageCard } from './ImageCard'
import { institucionalTemplate } from '../templates/institucional'
import type { ImageCardSection, PageDocument } from '../types'

const withCard = (motion: 'none' | 'subtle' = 'subtle'): PageDocument => ({
  ...institucionalTemplate,
  theme: { ...institucionalTemplate.theme, motion },
  sections: [
    ...institucionalTemplate.sections.filter((s) => s.type !== 'site-footer'),
    {
      id: 'imagem-1',
      type: 'image-card',
      name: 'Imagem Hiro 01',
      tone: 'light',
      title: 'Título da imagem',
      subtitle: 'Local',
      imageUrl: '',
      action: { label: 'Saiba mais', href: '#contato' },
      corner: { label: 'Abrir link', href: '#contato' },
    },
    institucionalTemplate.sections.find((s) => s.type === 'site-footer')!,
  ],
})

function renderCard(document: PageDocument) {
  const card = document.sections.find((x): x is ImageCardSection => x.type === 'image-card')!
  return render(
    <SiteThemeContext.Provider value={document.theme}>
      <ImageCard section={card} />
    </SiteThemeContext.Provider>,
  )
}

function cardBox() {
  // jsdom não calcula layout: fixa um retângulo de 200×400 no elemento que recebe o mouse.
  const el = screen.getByRole('heading', { level: 2, name: 'Título da imagem' }).closest('[style*="preserve-3d"]') as HTMLElement
  el.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 400, right: 200, bottom: 400, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
  return el
}

describe('cartão de imagem com inclinação 3D', () => {
  it('inclina conforme o mouse e volta ao plano ao sair', () => {
    renderCard(withCard())
    const card = cardBox()
    fireEvent.pointerMove(card, { clientX: 200, clientY: 0, pointerType: 'mouse' }) // canto superior direito
    expect(card.style.transform).toMatch(/rotateX\(10\.5deg\) rotateY\(10\.5deg\)/)
    fireEvent.pointerLeave(card)
    expect(card.style.transform).toMatch(/rotateX\(0deg\) rotateY\(0deg\)/)
  })

  it('não inclina com toque nem quando o tema pede menos movimento', () => {
    const { unmount } = renderCard(withCard())
    fireEvent.pointerMove(cardBox(), { clientX: 200, clientY: 0, pointerType: 'touch' })
    expect(cardBox().style.transform).toMatch(/rotateX\(0deg\) rotateY\(0deg\)/)
    unmount()

    renderCard(withCard('none'))
    fireEvent.pointerMove(cardBox(), { clientX: 200, clientY: 0, pointerType: 'mouse' })
    expect(cardBox().style.transform).toMatch(/rotateX\(0deg\) rotateY\(0deg\)/)
  })

  it('sem imagem usa fundo de cor, e com imagem usa o endereço informado', () => {
    const withImage = withCard()
    const section = withImage.sections.find((s) => s.type === 'image-card')
    if (section?.type !== 'image-card') throw new Error('sem cartão')
    const { container, unmount } = renderCard(withImage)
    expect(container.querySelector('img[src]')).toBeNull()
    unmount()

    const img = { ...withImage, sections: withImage.sections.map((s) => (s.type === 'image-card' ? { ...s, imageUrl: 'https://exemplo.com/foto.jpg', imageAlt: 'Vista' } : s)) }
    const { container: c2 } = renderCard(img)
    expect(c2.querySelector('img')).toHaveAttribute('src', 'https://exemplo.com/foto.jpg')
    expect(c2.querySelector('img')).toHaveAttribute('alt', 'Vista')
    vi.restoreAllMocks()
  })
})
