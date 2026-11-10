import { ArrowLeft, ArrowRight, ChevronLeft, ChevronRight, Pause, Play, X } from 'lucide-react'
import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type PointerEvent } from 'react'
import { useSiteTheme } from '../context'
import { Container, SectionHeading, SectionShell } from '../primitives'
import type { VideoCarouselItem, VideoCarouselSection } from '../types'
import { cardTransform, cardWidthFor, visibleSlots, wrap, youtubeEmbedUrl } from './video-carousel-utils'
import './video-carousel.css'

/**
 * Carrossel em perspectiva (coverflow) de vídeos. Carregado sob demanda pelo PageRenderer.
 * Navegação por arrasto, setas do teclado (← → Home End) e botões. Clicar no cartão
 * ativo abre o vídeo num player do YouTube sem cookies; nada do YouTube é carregado antes.
 */
export default function VideoCarousel({ section }: { section: VideoCarouselSection }) {
  const theme = useSiteTheme()
  const items = section.items
  const titleId = `${section.id}-title`

  const [index, setIndex] = useState(0)
  const [playing, setPlaying] = useState(section.autoplay === 'on')
  const [reduced, setReduced] = useState(theme.motion === 'none')
  const [drag, setDrag] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [stageSize, setStageSize] = useState({ width: 1100, height: 460 })
  const [preview, setPreview] = useState<VideoCarouselItem | null>(null)
  const [paused, setPaused] = useState({ hover: false, focus: false, hidden: false })

  const stageRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDialogElement>(null)
  const gesture = useRef<{ x: number; y: number; time: number; horizontal: boolean } | null>(null)
  const suppressClickUntil = useRef(0)
  const focusActiveCard = useRef(false)

  const length = items.length
  const activeIndex = length ? wrap(index, length) : 0
  const active = items[activeIndex]
  const cardWidth = cardWidthFor(section.format, stageSize.width, stageSize.height)
  const step = cardWidth * 0.78
  const interval = Math.min(15, Math.max(3, section.intervalSeconds || 6)) * 1000
  const running = playing && !reduced && !preview && !dragging && !paused.hover && !paused.focus && !paused.hidden && length > 1
  const { slots, before, after } = visibleSlots(index, length)

  // Se o editor mudar "avançar sozinho", acompanha (ajuste durante a renderização, sem efeito).
  const [autoplaySetting, setAutoplaySetting] = useState(section.autoplay)
  if (autoplaySetting !== section.autoplay) {
    setAutoplaySetting(section.autoplay)
    setPlaying(section.autoplay === 'on')
  }

  // Preferência de movimento e visibilidade da página (janela onde a seção está: site ou prévia).
  useEffect(() => {
    const win = stageRef.current?.ownerDocument.defaultView ?? window
    const doc = win.document
    const media = typeof win.matchMedia === 'function' ? win.matchMedia('(prefers-reduced-motion: reduce)') : null
    const update = () => setReduced(theme.motion === 'none' || Boolean(media?.matches))
    const visibility = () => setPaused((p) => ({ ...p, hidden: doc.hidden }))
    update()
    media?.addEventListener('change', update)
    doc.addEventListener('visibilitychange', visibility)
    return () => {
      media?.removeEventListener('change', update)
      doc.removeEventListener('visibilitychange', visibility)
    }
  }, [theme.motion])

  // Tamanho do palco (define a largura dos cartões).
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || typeof ResizeObserver === 'undefined') return
    const measure = () => setStageSize({ width: stage.clientWidth || 1100, height: stage.clientHeight || 460 })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [])

  // Avanço automático.
  useEffect(() => {
    if (!running) return
    const timer = setTimeout(() => setIndex((current) => current + 1), interval)
    return () => clearTimeout(timer)
  }, [running, index, interval])

  // Janela do vídeo (diálogo nativo: Esc fecha e o foco volta para o cartão).
  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return
    if (preview && !dialog.open) dialog.showModal?.()
    if (!preview && dialog.open) dialog.close?.()
  }, [preview])

  useEffect(() => {
    if (!focusActiveCard.current) return
    focusActiveCard.current = false
    stageRef.current?.querySelector<HTMLButtonElement>('.vc-card[data-active]')?.focus({ preventScroll: true })
  }, [index])

  if (!active) return null

  const select = (next: number) => {
    setIndex(next)
    setDrag(0)
  }

  /** Setas, Home e End no cartão ativo trocam o vídeo; o foco vai junto. */
  const onCardKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (preview || event.altKey || event.ctrlKey || event.metaKey) return
    const keys: Record<string, () => void> = {
      ArrowRight: () => select(index + 1),
      ArrowLeft: () => select(index - 1),
      Home: () => select(index - activeIndex),
      End: () => select(index - activeIndex + length - 1),
    }
    const action = keys[event.key]
    if (action) {
      event.preventDefault()
      focusActiveCard.current = true
      action()
    }
  }

  const pointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return
    gesture.current = { x: event.clientX, y: event.clientY, time: performance.now(), horizontal: false }
  }
  const pointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = gesture.current
    if (!start) return
    const dx = event.clientX - start.x
    const dy = event.clientY - start.y
    // Gesto vertical: deixa a página rolar.
    if (!start.horizontal && Math.abs(dy) > 12 && Math.abs(dy) > Math.abs(dx)) {
      gesture.current = null
      return
    }
    if (!start.horizontal && Math.abs(dx) > 8) {
      start.horizontal = true
      event.currentTarget.setPointerCapture?.(event.pointerId)
      setDragging(true)
    }
    if (start.horizontal) setDrag(Math.max(-1.2, Math.min(1.2, dx / step)))
  }
  const pointerUp = (event: PointerEvent<HTMLDivElement>, cancel = false) => {
    const start = gesture.current
    gesture.current = null
    if (start?.horizontal) {
      const dx = event.clientX - start.x
      const velocity = Math.abs(dx) / Math.max(1, performance.now() - start.time)
      const far = Math.abs(dx) > Math.min(55, cardWidth * 0.18)
      const fast = Math.abs(dx) > 14 && velocity > 0.35
      if (!cancel && (far || fast)) setIndex((current) => current + (dx < 0 ? 1 : -1))
      suppressClickUntil.current = performance.now() + 300
    }
    setDrag(0)
    setDragging(false)
    if (event.currentTarget.hasPointerCapture?.(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  const embed = youtubeEmbedUrl(preview?.videoUrl)

  return (
    <SectionShell tone={section.tone} background={section.background} anchor={section.anchor} labelledBy={titleId}>
      <Container>
        <SectionHeading id={titleId} eyebrow={section.eyebrow} title={section.title} subtitle={section.subtitle} />

        <div
          role="region"
          aria-roledescription="carrossel"
          aria-label={section.title}
          className="mt-10"
          style={{ '--vc-card-width': `${cardWidth}px` } as CSSProperties}
        >
          <div
            ref={stageRef}
            className="vc-stage"
            data-format={section.format}
            {...(dragging ? { 'data-dragging': '' } : {})}
            onPointerDown={pointerDown}
            onPointerMove={pointerMove}
            onPointerUp={(event) => pointerUp(event)}
            onPointerCancel={(event) => pointerUp(event, true)}
            onMouseEnter={() => setPaused((p) => ({ ...p, hover: true }))}
            onMouseLeave={() => setPaused((p) => ({ ...p, hover: false }))}
            onFocusCapture={() => setPaused((p) => ({ ...p, focus: true }))}
            onBlurCapture={(event) => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setPaused((p) => ({ ...p, focus: false }))
            }}
          >
            <div className="vc-floor" aria-hidden="true" />
            {slots.map((slot) => {
              const item = items[wrap(slot, length)]!
              const d = slot - index
              const offset = d + drag
              const offstage = d < -before || d > after
              const selected = slot === index
              const hasVideo = Boolean(youtubeEmbedUrl(item.videoUrl))
              return (
                <button
                  key={slot}
                  type="button"
                  className="vc-card"
                  {...(selected ? { 'data-active': '' } : {})}
                  tabIndex={selected ? 0 : -1}
                  aria-hidden={offstage || undefined}
                  aria-current={selected ? 'true' : undefined}
                  aria-label={selected ? (hasVideo ? `Assistir: ${item.title}` : `Ampliar: ${item.title}`) : `Selecionar ${item.title}`}
                  onClick={() => {
                    if (performance.now() < suppressClickUntil.current) return
                    if (selected) setPreview(item)
                    else select(index + d)
                  }}
                  onKeyDown={onCardKeyDown}
                  style={
                    {
                      transform: cardTransform(offset, step),
                      opacity: offstage ? 0 : 1,
                      zIndex: 10 - Math.abs(d),
                      pointerEvents: offstage ? 'none' : undefined,
                      '--vc-shade': Math.min(Math.abs(offset), 2) * 0.19,
                    } as CSSProperties
                  }
                >
                  <span className="vc-poster">
                    {item.image.trim() ? (
                      <img
                        src={item.image.trim()}
                        alt=""
                        draggable={false}
                        loading={Math.abs(d) < 2 ? 'eager' : 'lazy'}
                      />
                    ) : (
                      <span className="vc-placeholder" aria-hidden="true">
                        <Play className="size-8" fill="currentColor" strokeWidth={0} />
                        <span>{item.title}</span>
                      </span>
                    )}
                    <span className="vc-shade" aria-hidden="true" />
                    {hasVideo ? (
                      <span className="vc-watch" aria-hidden="true">
                        <Play className="size-3.5" fill="currentColor" strokeWidth={0} /> Assistir vídeo
                      </span>
                    ) : null}
                  </span>
                </button>
              )
            })}
          </div>

          <div className="vc-bottom">
            <div>
              <h3 className="vc-active-title">{active.title}</h3>
              {active.subtitle ? <p className="vc-active-subtitle">{active.subtitle}</p> : null}
            </div>
            <div className="vc-dock" role="group" aria-label="Controles do carrossel">
              <span className="vc-position" aria-hidden="true">
                <strong>{String(activeIndex + 1).padStart(2, '0')}</strong> / {String(length).padStart(2, '0')}
              </span>
              <button type="button" onClick={() => select(index - 1)} aria-label="Anterior" disabled={length < 2}>
                <ChevronLeft className="size-5" />
              </button>
              <button
                type="button"
                className="vc-play"
                onClick={() => setPlaying((value) => !value)}
                aria-label={playing ? 'Pausar avanço automático' : 'Avançar automaticamente'}
                aria-pressed={playing}
                disabled={reduced || length < 2}
              >
                {playing ? <Pause className="size-4" fill="currentColor" /> : <Play className="size-4" fill="currentColor" />}
              </button>
              <button type="button" onClick={() => select(index + 1)} aria-label="Próximo" disabled={length < 2}>
                <ChevronRight className="size-5" />
              </button>
            </div>
            {length > 1 ? (
              <p className="vc-hint">
                <span>Arraste para explorar ou use</span>
                <ArrowLeft aria-hidden="true" className="size-3" />
                <ArrowRight aria-hidden="true" className="size-3" />
                <span className="sr-only">as setas do teclado</span>
              </p>
            ) : null}
          </div>

          <p className="sr-only" aria-live="polite" aria-atomic="true">
            {!running ? `${active.title}. ${activeIndex + 1} de ${length}.` : ''}
          </p>
        </div>

        {/* Clique no fundo escuro fecha; pelo teclado, o Esc do próprio <dialog> faz o mesmo. */}
        {/* eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/no-noninteractive-element-interactions */}
        <dialog
          ref={dialogRef}
          className="vc-dialog"
          aria-labelledby={`${section.id}-dialog-title`}
          onCancel={() => setPreview(null)}
          onClose={() => setPreview(null)}
          onClick={(event) => {
            if (event.target === event.currentTarget) setPreview(null)
          }}
        >
          {preview ? (
            <div>
              <div className="vc-dialog-bar">
                <span>{embed ? 'Vídeo' : 'Imagem'}</span>
                <button type="button" onClick={() => setPreview(null)}>
                  <X aria-hidden="true" className="size-4" /> Fechar
                </button>
              </div>
              <div className="vc-player">
                {embed ? (
                  <iframe
                    src={embed}
                    title={`Vídeo: ${preview.title}`}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                  />
                ) : preview.image.trim() ? (
                  <img src={preview.image.trim()} alt={preview.imageAlt?.trim() || preview.title} />
                ) : null}
              </div>
              <div className="vc-dialog-caption">
                <h3 id={`${section.id}-dialog-title`}>{preview.title}</h3>
                {preview.description || preview.subtitle ? <p>{preview.description || preview.subtitle}</p> : null}
              </div>
            </div>
          ) : null}
        </dialog>
      </Container>
    </SectionShell>
  )
}
