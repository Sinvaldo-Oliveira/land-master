import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { SiteThemeContext } from '../context'
import { institucionalTemplate } from '../templates/institucional'
import type { VideoPlayerSection } from '../types'
import VideoPlayer from './VideoPlayer'
import { formatTime, httpsOnly } from './video-player-utils'

const base: VideoPlayerSection = {
  id: 'vsl',
  type: 'video-player',
  tone: 'dark',
  eyebrow: 'Assista antes de decidir',
  title: 'Veja como funciona',
  videoUrl: 'https://exemplo.supabase.co/storage/v1/object/public/site-media/vsl.mp4',
  posterUrl: 'https://exemplo.supabase.co/storage/v1/object/public/site-media/capa.webp',
  format: 'wide',
  cta: { label: 'Quero saber mais', href: '#contato' },
}

function renderPlayer(patch: Partial<VideoPlayerSection> = {}) {
  return render(
    <SiteThemeContext.Provider value={institucionalTemplate.theme}>
      <VideoPlayer section={{ ...base, ...patch }} />
    </SiteThemeContext.Provider>,
  )
}

beforeEach(() => {
  // jsdom não reproduz mídia: play/pause disparam os eventos como o navegador faria.
  vi.spyOn(HTMLMediaElement.prototype, 'play').mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { configurable: true, value: false })
    this.dispatchEvent(new Event('play'))
    return Promise.resolve()
  })
  vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(function (this: HTMLMediaElement) {
    Object.defineProperty(this, 'paused', { configurable: true, value: true })
    this.dispatchEvent(new Event('pause'))
  })
})

describe('utilitários do player', () => {
  it.each([
    [0, '0:00'],
    [75, '1:15'],
    [599.9, '9:59'],
    [3725, '1:02:05'],
    [Number.NaN, '0:00'],
    [Number.POSITIVE_INFINITY, '0:00'],
  ])('formatTime(%s) = %s', (seconds, text) => {
    expect(formatTime(seconds)).toBe(text)
  })

  it('httpsOnly aceita só https sem caracteres que escapem do CSS', () => {
    expect(httpsOnly(' https://a.b/v.mp4 ')).toBe('https://a.b/v.mp4')
    expect(httpsOnly('http://a.b/v.mp4')).toBe('')
    expect(httpsOnly('javascript:alert(1)')).toBe('')
    expect(httpsOnly('https://a.b/x"),url(https://evil/')).toBe('')
    expect(httpsOnly(undefined)).toBe('')
  })
})

describe('PlayVídeo-VSL', () => {
  it('antes do play mostra título, capa e botão grande; controles ainda não existem', () => {
    const { container } = renderPlayer()
    expect(screen.getByRole('heading', { level: 2, name: 'Veja como funciona' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Assistir: Veja como funciona' })).toBeInTheDocument()
    expect(container.querySelector('video')).toHaveAttribute('poster', base.posterUrl)
    expect(screen.queryByRole('group', { name: 'Controles do vídeo' })).toBeNull()
    expect(screen.getByRole('link', { name: /Quero saber mais/ })).toHaveAttribute('href', '#contato')
  })

  it('play grande inicia o vídeo e mostra os controles (pausar, volume, velocidade, tela cheia)', () => {
    renderPlayer()
    fireEvent.click(screen.getByRole('button', { name: 'Assistir: Veja como funciona' }))
    expect(HTMLMediaElement.prototype.play).toHaveBeenCalled()
    const controls = screen.getByRole('group', { name: 'Controles do vídeo' })
    expect(controls).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pausar' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Posição do vídeo' })).toBeInTheDocument()
    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveValue('100')
    expect(screen.getByRole('button', { name: 'Tela cheia' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Assistir:/ })).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Pausar' }))
    expect(screen.getByRole('button', { name: 'Reproduzir' })).toBeInTheDocument()
  })

  it('velocidade muda o playbackRate e marca o botão escolhido', () => {
    const { container } = renderPlayer()
    fireEvent.click(screen.getByRole('button', { name: 'Assistir: Veja como funciona' }))
    const video = container.querySelector('video')!
    expect(screen.getByRole('button', { name: 'Velocidade 1x' })).toHaveAttribute('aria-pressed', 'true')
    fireEvent.click(screen.getByRole('button', { name: 'Velocidade 1,5x' }))
    expect(video.playbackRate).toBe(1.5)
    expect(screen.getByRole('button', { name: 'Velocidade 1,5x' })).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Velocidade 1x' })).toHaveAttribute('aria-pressed', 'false')
  })

  it('silenciar zera o volume mostrado; ativar som volta', () => {
    const { container } = renderPlayer()
    fireEvent.click(screen.getByRole('button', { name: 'Assistir: Veja como funciona' }))
    const video = container.querySelector('video')!
    fireEvent.click(screen.getByRole('button', { name: 'Silenciar' }))
    expect(video.muted).toBe(true)
    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveValue('0')
    fireEvent.click(screen.getByRole('button', { name: 'Ativar som' }))
    expect(video.muted).toBe(false)
    expect(screen.getByRole('slider', { name: 'Volume' })).toHaveValue('100')

    fireEvent.change(screen.getByRole('slider', { name: 'Volume' }), { target: { value: '30' } })
    expect(video.volume).toBeCloseTo(0.3)
  })

  it('barra de posição leva ao ponto escolhido do vídeo', () => {
    const { container } = renderPlayer()
    fireEvent.click(screen.getByRole('button', { name: 'Assistir: Veja como funciona' }))
    const video = container.querySelector('video')!
    Object.defineProperty(video, 'duration', { configurable: true, value: 200 })
    fireEvent(video, new Event('loadedmetadata'))
    fireEvent.change(screen.getByRole('slider', { name: 'Posição do vídeo' }), { target: { value: '50' } })
    expect(video.currentTime).toBe(100)
    expect(screen.getByRole('slider', { name: 'Posição do vídeo' })).toHaveAttribute('aria-valuetext', '1:40 de 3:20')
  })

  it('legendas .vtt viram <track> de captions em português', () => {
    const { container } = renderPlayer({ captionsUrl: 'https://exemplo.com/legendas.vtt' })
    const track = container.querySelector('track')!
    expect(track).toHaveAttribute('kind', 'captions')
    expect(track).toHaveAttribute('srclang', 'pt-BR')
    expect(track).toHaveAttribute('src', 'https://exemplo.com/legendas.vtt')
  })

  it('sem vídeo enviado usa o link direto; sem nenhum, mostra "Vídeo em breve" sem player', () => {
    const { container, unmount } = renderPlayer({ videoUrl: '', externalUrl: 'https://cdn.exemplo.com/vsl.mp4' })
    expect(container.querySelector('video')).toHaveAttribute('src', 'https://cdn.exemplo.com/vsl.mp4')
    unmount()
    const empty = renderPlayer({ videoUrl: '', externalUrl: 'http://inseguro.com/v.mp4' })
    expect(empty.container.querySelector('video')).toBeNull()
    expect(screen.getByText('Vídeo em breve')).toBeInTheDocument()
  })

  it('proporção: formatos conhecidos vão para o CSS; valor inválido vira 16:9', () => {
    const { container, unmount } = renderPlayer({ format: 'story' })
    expect(container.querySelector('.vp-frame')).toHaveAttribute('data-format', 'story')
    unmount()
    const other = renderPlayer({ format: 'cinema' as never })
    expect(other.container.querySelector('.vp-frame')).toHaveAttribute('data-format', 'wide')
  })
})
