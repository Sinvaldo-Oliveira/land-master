import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SiteThemeContext } from '../context'
import { institucionalTemplate } from '../templates/institucional'
import type { InteractiveHeroSection, SiteTheme } from '../types'
import InteractiveHero from './InteractiveHero'
import { approach, idleTarget, IDLE_AMPLITUDE, pointerToClip } from './interactive-hero-math'

const base: InteractiveHeroSection = {
  id: 'hero-interativo-1',
  type: 'interactive-hero',
  name: 'Imagem Hiro 02',
  eyebrow: 'Destaque',
  title: 'Sua marca',
  subtitle: 'Uma frase curta',
  captionLeft: 'Interação 3D',
  captionRight: '@seuperfil',
  plateUrl: '',
  clipUrl: '',
  clipX: 510,
  clipY: 255,
  clipW: 435,
  clipH: 450,
  overlayUrl: '',
  overlayX: 533,
  overlayY: 288,
  overlaySize: 360,
  buttonLabel: 'APERTE/AQUI',
  buttonX: 675,
  buttonY: 720,
  buttonSize: 75,
}

function renderHero(section: Partial<InteractiveHeroSection> = {}, theme: SiteTheme = institucionalTemplate.theme) {
  return render(
    <SiteThemeContext.Provider value={theme}>
      <InteractiveHero section={{ ...base, ...section }} />
    </SiteThemeContext.Provider>,
  )
}

describe('cálculos do hero interativo', () => {
  it('mapeia 14% a 86% da largura para o início e o fim do clipe', () => {
    expect(pointerToClip(0)).toBe(0)
    expect(pointerToClip(0.14)).toBe(0)
    expect(pointerToClip(0.5)).toBeCloseTo(0.5)
    expect(pointerToClip(0.86)).toBe(1)
    expect(pointerToClip(1)).toBe(1)
  })

  it('oscila em torno do meio com amplitude de 32%', () => {
    for (let t = 0; t < 20000; t += 250) {
      const value = idleTarget(t)
      expect(value).toBeGreaterThanOrEqual(0.5 - IDLE_AMPLITUDE - 1e-9)
      expect(value).toBeLessThanOrEqual(0.5 + IDLE_AMPLITUDE + 1e-9)
    }
  })

  it('aproxima o valor mostrado do alvo aos poucos', () => {
    expect(approach(0, 1, 0.14)).toBeCloseTo(0.14)
  })
})

describe('componente', () => {
  it('mostra selo, título, subtítulo e legendas', () => {
    renderHero()
    expect(screen.getByRole('heading', { level: 2, name: 'Sua marca' })).toBeInTheDocument()
    expect(screen.getByText('Destaque')).toBeInTheDocument()
    expect(screen.getByText('@seuperfil')).toBeInTheDocument()
  })

  it('sem imagem do botão, o botão não aparece', () => {
    renderHero()
    expect(screen.queryByRole('button')).toBeNull()
  })

  it('o botão liga e desliga a sobreposição (aria-pressed)', () => {
    const { container } = renderHero({ overlayUrl: 'https://exemplo.com/capacete.webp' })
    const button = screen.getByRole('button', { name: 'APERTE AQUI' })
    const overlay = container.querySelector('.ih-overlay')!
    expect(button).toHaveAttribute('aria-pressed', 'false')
    expect(overlay).not.toHaveAttribute('data-on')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'true')
    expect(overlay).toHaveAttribute('data-on')
    fireEvent.click(button)
    expect(button).toHaveAttribute('aria-pressed', 'false')
  })

  it('posiciona o clipe nas coordenadas do quadro', () => {
    const { container } = renderHero({ clipUrl: 'https://exemplo.com/clipe.mp4' })
    const clip = container.querySelector('video')!
    expect(clip.style.getPropertyValue('--x')).toBe('510')
    expect(clip.style.getPropertyValue('--w')).toBe('435')
  })

  it('com o tema sem movimento, não carrega o clipe (só a imagem de fundo)', () => {
    const { container } = renderHero({ clipUrl: 'https://exemplo.com/clipe.mp4' }, { ...institucionalTemplate.theme, motion: 'none' })
    expect(container.querySelector('video')).toBeNull()
  })
})
