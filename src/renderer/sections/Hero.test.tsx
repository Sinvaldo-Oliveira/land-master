import { fireEvent, render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { PageRenderer } from '../PageRenderer'
import { institucionalTemplate } from '../templates/institucional'
import type { PageDocument } from '../types'

function withHero(patch: Record<string, unknown>): PageDocument {
  return {
    ...institucionalTemplate,
    sections: institucionalTemplate.sections.map((s) => (s.type === 'hero' ? { ...s, ...patch } : s)),
  } as PageDocument
}

describe('imagem do destaque principal', () => {
  it('sem imagem mostra a ilustração padrão', () => {
    const { container } = render(<PageRenderer document={institucionalTemplate} />)
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })

  it('com imagem mostra a foto com a largura escolhida', () => {
    const { container } = render(
      <PageRenderer document={withHero({ imageUrl: 'https://exemplo.com/foto.webp', imageAlt: 'Consultório', imageSize: 60 })} />,
    )
    const img = container.querySelector('img')!
    expect(img).toHaveAttribute('src', 'https://exemplo.com/foto.webp')
    expect(img).toHaveAttribute('alt', 'Consultório')
    expect(img.parentElement!.parentElement).toHaveStyle({ width: '60%' })
  })

  it('inclina em 3D com o mouse e volta ao plano ao sair', () => {
    const { container } = render(<PageRenderer document={withHero({ imageUrl: 'https://exemplo.com/foto.webp', imageSize: 100 })} />)
    const tiltEl = container.querySelector('img')!.parentElement as HTMLElement
    tiltEl.getBoundingClientRect = () => ({ left: 0, top: 0, width: 200, height: 150, right: 200, bottom: 150, x: 0, y: 0, toJSON: () => ({}) }) as DOMRect
    fireEvent.pointerMove(tiltEl, { clientX: 0, clientY: 0, pointerType: 'mouse' })
    expect(tiltEl.style.transform).toMatch(/rotateX\(10\.5deg\) rotateY\(-10\.5deg\)/)
    fireEvent.pointerLeave(tiltEl)
    expect(tiltEl.style.transform).toMatch(/rotateX\(0deg\) rotateY\(0deg\)/)
  })
})
