import { render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteThemeContext } from '../context'
import { institucionalTemplate } from '../templates/institucional'
import type { ParticleHeroSection, SiteTheme } from '../types'
import ParticleHero from './ParticleHero'
import { createParticles, linkAlpha, LINK_DISTANCE, particleCount, rgbTriplet, stepParticles } from './particle-hero-math'

const base: ParticleHeroSection = {
  id: 'hero-particulas-1',
  type: 'particle-hero',
  name: 'Hero Interativo 02',
  eyebrow: 'Destaque da sua marca',
  title: 'Sua marca',
  subtitle: 'Uma frase curta',
  cta: { label: 'Quero saber mais', href: '#contato' },
  density: 'medium',
}

function show(section: ParticleHeroSection, theme: SiteTheme = institucionalTemplate.theme) {
  return render(
    <SiteThemeContext.Provider value={theme}>
      <ParticleHero section={section} />
    </SiteThemeContext.Provider>,
  )
}

describe('Hero Interativo 02', () => {
  // jsdom não tem canvas: getContext devolve null e a seção precisa continuar funcionando.
  beforeEach(() => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(null)
  })
  afterEach(() => vi.restoreAllMocks())

  it('mostra selo, título, subtítulo e botão; o canvas é decorativo', () => {
    const { container } = show(base)
    expect(screen.getByRole('heading', { level: 2, name: 'Sua marca' })).toBeInTheDocument()
    expect(screen.getByText('Destaque da sua marca')).toBeInTheDocument()
    expect(screen.getByText('Uma frase curta')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Quero saber mais/ })).toHaveAttribute('href', '#contato')
    expect(container.querySelector('canvas')).toHaveAttribute('aria-hidden', 'true')
    expect(container.querySelector('section')).toHaveAttribute('aria-labelledby', 'hero-particulas-1-title')
  })

  it('sem selo, subtítulo e botão, mostra só o título', () => {
    show({ ...base, eyebrow: '', subtitle: '', cta: undefined })
    expect(screen.queryByRole('link')).toBeNull()
    expect(screen.queryByText('Destaque da sua marca')).toBeNull()
  })

  it('link externo abre em nova aba e link inseguro não vira javascript:', () => {
    const { unmount } = show({ ...base, cta: { label: 'Falar', href: 'https://wa.me/5511999999999' } })
    const link = screen.getByRole('link', { name: /Falar/ })
    expect(link).toHaveAttribute('target', '_blank')
    expect(link).toHaveAttribute('rel', 'noopener noreferrer')
    unmount()
    show({ ...base, cta: { label: 'Falar', href: 'javascript:alert(1)' } })
    expect(screen.getByRole('link', { name: /Falar/ }).getAttribute('href')).not.toContain('javascript')
  })

  it('fundo padrão preto; fundo personalizado e âncora são aplicados; "movimento: nenhum" desliga a entrada', () => {
    const { container, unmount } = show(base)
    expect((container.querySelector('section') as HTMLElement).style.background).toMatch(/rgb\(0, 0, 0\)|#000000/)
    unmount()
    const custom = show(
      { ...base, anchor: 'inicio', background: { mode: 'solid', colors: ['#0b1324'] } },
      { ...institucionalTemplate.theme, motion: 'none' },
    )
    const section = custom.container.querySelector('section') as HTMLElement
    expect(section.id).toBe('inicio')
    expect(section.style.background).toMatch(/rgb\(11, 19, 36\)|#0b1324/)
    expect(section).toHaveAttribute('data-motion', 'none')
  })
})

describe('partículas (cálculo)', () => {
  it('quantidade cresce com a área e respeita mínimo e teto por densidade', () => {
    expect(particleCount(0, 900, 'medium')).toBe(0)
    expect(particleCount(200, 200, 'medium')).toBe(12)
    expect(particleCount(1440, 900, 'low')).toBeLessThan(particleCount(1440, 900, 'medium'))
    expect(particleCount(1440, 900, 'medium')).toBeLessThan(particleCount(1440, 900, 'high'))
    expect(particleCount(4000, 3000, 'high')).toBe(170)
  })

  it('partículas nascem dentro da área e continuam dentro depois de muitos quadros', () => {
    let seed = 1
    const random = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const particles = createParticles(800, 600, 'medium', random)
    for (let frame = 0; frame < 500; frame++) stepParticles(particles, 800, 600, frame % 2 ? { x: 400, y: 300 } : null)
    expect(particles.every((p) => p.x >= 0 && p.x <= 800 && p.y >= 0 && p.y <= 600)).toBe(true)
  })

  it('o mouse afasta a partícula próxima; mouse em cima da partícula não gera NaN', () => {
    const near = [{ x: 110, y: 100, vx: 0, vy: 0, r: 1 }]
    stepParticles(near, 800, 600, { x: 100, y: 100 })
    expect(near[0]!.x).toBeGreaterThan(110)
    const same = [{ x: 100, y: 100, vx: 0, vy: 0, r: 1 }]
    stepParticles(same, 800, 600, { x: 100, y: 100 })
    expect(Number.isFinite(same[0]!.x) && Number.isFinite(same[0]!.y)).toBe(true)
  })

  it('linhas somem com a distância e cores viram rgb', () => {
    expect(linkAlpha(0)).toBeGreaterThan(linkAlpha(LINK_DISTANCE / 2))
    expect(linkAlpha(LINK_DISTANCE)).toBe(0)
    expect(rgbTriplet('#ff8000')).toBe('255, 128, 0')
    expect(rgbTriplet('vermelho')).toBe('191, 128, 255')
  })
})
