import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { SiteThemeContext } from '../context'
import { institucionalTemplate } from '../templates/institucional'
import type { VideoCarouselSection } from '../types'
import VideoCarousel from './VideoCarousel'
import { cardFormat, cardFormats, cardTransform, cardWidthFor, visibleSlots, wrap, youtubeEmbedUrl, youtubeId } from './video-carousel-utils'

describe('links do YouTube', () => {
  it('aceita watch, youtu.be, shorts e embed', () => {
    expect(youtubeId('https://www.youtube.com/watch?v=qEVUtrk8_B4')).toBe('qEVUtrk8_B4')
    expect(youtubeId('https://youtu.be/hEJnMQG9ev8?t=10')).toBe('hEJnMQG9ev8')
    expect(youtubeId('https://m.youtube.com/watch?v=wb49-oV0F78&list=x')).toBe('wb49-oV0F78')
    expect(youtubeId('https://www.youtube.com/shorts/Y274jZs5s7s')).toBe('Y274jZs5s7s')
    expect(youtubeId('https://www.youtube.com/embed/j7jPnwVGdZ8')).toBe('j7jPnwVGdZ8')
  })

  it('recusa outros sites, http e IDs inválidos', () => {
    expect(youtubeId('https://vimeo.com/123')).toBeNull()
    expect(youtubeId('http://www.youtube.com/watch?v=qEVUtrk8_B4')).toBeNull()
    expect(youtubeId('https://www.youtube.com/watch?v=curto')).toBeNull()
    expect(youtubeId('https://evil.com/?youtube.com/watch?v=qEVUtrk8_B4')).toBeNull()
    expect(youtubeId('javascript:alert(1)')).toBeNull()
  })

  it('gera o player sem cookies', () => {
    expect(youtubeEmbedUrl('https://youtu.be/hEJnMQG9ev8')).toBe(
      'https://www.youtube-nocookie.com/embed/hEJnMQG9ev8?autoplay=1&rel=0&playsinline=1',
    )
  })
})

describe('geometria do coverflow', () => {
  it('índice circular', () => {
    expect(wrap(-1, 5)).toBe(4)
    expect(wrap(7, 5)).toBe(2)
  })

  it('cartão central fica de frente; vizinhos giram e recuam', () => {
    expect(cardTransform(0, 200)).toBe('translate3d(0px, 0, 0px) rotateY(0deg) scale(1)')
    expect(cardTransform(1, 200)).toBe('translate3d(200px, 0, -130px) rotateY(-30deg) scale(0.92)')
    expect(cardTransform(-2, 200)).toContain('rotateY(42deg)') // limite de 42°
  })

  it('desenha até 2 vizinhos de cada lado e uma posição escondida em cada ponta', () => {
    expect(visibleSlots(0, 5)).toEqual({ slots: [-3, -2, -1, 0, 1, 2, 3], before: 2, after: 2 })
    expect(visibleSlots(0, 1)).toEqual({ slots: [0], before: 0, after: 0 })
  })
})

const section: VideoCarouselSection = {
  id: 'carrossel-1',
  type: 'video-carousel',
  name: 'Carrossel de Video 01',
  tone: 'dark',
  eyebrow: 'Vídeos',
  title: 'Assista e conheça',
  format: 'poster',
  autoplay: 'off',
  intervalSeconds: 6,
  items: [
    { image: '', title: 'Primeiro', subtitle: 'Tema A', videoUrl: 'https://youtu.be/hEJnMQG9ev8' },
    { image: '', title: 'Segundo', subtitle: 'Tema B' },
    { image: '', title: 'Terceiro', subtitle: 'Tema C' },
  ],
}

function renderCarousel(patch: Partial<VideoCarouselSection> = {}) {
  return render(
    <SiteThemeContext.Provider value={institucionalTemplate.theme}>
      <VideoCarousel section={{ ...section, ...patch }} />
    </SiteThemeContext.Provider>,
  )
}

const activeTitle = () => screen.getByRole('heading', { level: 3 }).textContent

describe('carrossel', () => {
  it('mostra o título da seção, o vídeo ativo e a posição', () => {
    renderCarousel()
    expect(screen.getByRole('heading', { level: 2, name: 'Assista e conheça' })).toBeInTheDocument()
    expect(activeTitle()).toBe('Primeiro')
    expect(screen.getByText('01')).toBeInTheDocument()
  })

  it('botões Próximo e Anterior trocam o vídeo (com volta circular)', () => {
    renderCarousel()
    fireEvent.click(screen.getByRole('button', { name: 'Próximo' }))
    expect(activeTitle()).toBe('Segundo')
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    fireEvent.click(screen.getByRole('button', { name: 'Anterior' }))
    expect(activeTitle()).toBe('Terceiro')
  })

  it('setas do teclado no cartão ativo trocam o vídeo', () => {
    renderCarousel()
    fireEvent.keyDown(screen.getByRole('button', { name: 'Assistir: Primeiro' }), { key: 'ArrowRight' })
    expect(activeTitle()).toBe('Segundo')
    fireEvent.keyDown(screen.getByRole('button', { name: 'Ampliar: Segundo' }), { key: 'End' })
    expect(activeTitle()).toBe('Terceiro')
  })

  it('clicar no cartão ativo abre o player sem cookies do YouTube; Fechar remove o player', () => {
    const { container } = renderCarousel()
    expect(container.querySelector('iframe')).toBeNull() // nada do YouTube antes do clique
    fireEvent.click(screen.getByRole('button', { name: 'Assistir: Primeiro' }))
    const iframe = container.querySelector('iframe')!
    expect(iframe.getAttribute('src')).toMatch(/^https:\/\/www\.youtube-nocookie\.com\/embed\/hEJnMQG9ev8/)
    // jsdom não abre <dialog> modal; no navegador real o E2E confere a janela aberta.
    fireEvent.click(screen.getByRole('button', { name: /Fechar/, hidden: true }))
    expect(container.querySelector('iframe')).toBeNull()
  })

  it('com um único vídeo, a navegação fica desativada', () => {
    renderCarousel({ items: [section.items[0]!] })
    expect(screen.getByRole('button', { name: 'Próximo' })).toBeDisabled()
  })
})

describe('formato dos cartões', () => {
  it.each([
    ['poster', 2 / 3],
    ['story', 9 / 16],
    ['square', 1],
    ['classic', 4 / 3],
    ['wide', 16 / 9],
  ] as const)('%s: o cartão cabe na altura do palco na proporção certa', (format, ratio) => {
    // Palco largo e baixo: quem limita é a altura (ou o máximo do formato).
    const width = cardWidthFor(format, 2000, 400)
    expect(width).toBeLessThanOrEqual(cardFormats[format].max)
    expect(width / ratio).toBeLessThanOrEqual(400 - 28 + 0.01)
    expect(cardFormats[format].ratio).toBeCloseTo(ratio)
  })

  it('no celular nenhum formato passa da largura reservada (vizinhos aparecem dos lados)', () => {
    for (const format of Object.keys(cardFormats) as (keyof typeof cardFormats)[]) {
      expect(cardWidthFor(format, 360, 600)).toBeLessThanOrEqual(360 * 0.72)
    }
  })

  it('formato desconhecido (documento antigo ou inválido) vira pôster', () => {
    expect(cardFormat('cinema')).toBe('poster')
    expect(cardFormat(undefined)).toBe('poster')
    expect(cardFormat('story')).toBe('story')
  })

  it.each(['story', 'square', 'classic'] as const)('palco marca o formato %s para o CSS', (format) => {
    const { container } = renderCarousel({ format })
    expect(container.querySelector('.vc-stage')).toHaveAttribute('data-format', format)
  })

  it('valor inválido no palco cai para pôster', () => {
    const { container } = renderCarousel({ format: 'cinema' as never })
    expect(container.querySelector('.vc-stage')).toHaveAttribute('data-format', 'poster')
  })
})
