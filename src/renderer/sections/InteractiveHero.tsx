import { useEffect, useRef, useState, type CSSProperties, type PointerEvent } from 'react'
import { useSiteTheme } from '../context'
import { backgroundCss, backgroundStops } from '../surface'
import type { InteractiveHeroSection } from '../types'
import {
  approach,
  EASE,
  IDLE_AFTER_MS,
  idleTarget,
  pointerToClip,
  RING_EASE,
} from './interactive-hero-math'
import './interactive-hero.css'

const box = (x: number, y: number, w: number, h: number) =>
  ({ '--x': x, '--y': y, '--w': w, '--h': h }) as CSSProperties

/**
 * Hero interativo. Carregado sob demanda pelo PageRenderer (React.lazy).
 * Nada da cena é desenhado em código: o fundo é a imagem, o movimento vem do clipe
 * e a sobreposição é outra imagem (mesclada com "screen", então o preto some).
 */
export default function InteractiveHero({ section }: { section: InteractiveHeroSection }) {
  const theme = useSiteTheme()
  const stageRef = useRef<HTMLElement>(null)
  const frameRef = useRef<HTMLDivElement>(null)
  const clipRef = useRef<HTMLVideoElement>(null)
  const dotRef = useRef<HTMLSpanElement>(null)
  const ringRef = useRef<HTMLSpanElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const [overlayOn, setOverlayOn] = useState(false)
  const [finePointer, setFinePointer] = useState(false)
  const [pointerIn, setPointerIn] = useState(false)
  const [reducedMotion, setReducedMotion] = useState(theme.motion === 'none')
  const [waiting, setWaiting] = useState(theme.motion !== 'none')

  // Estado mutável do laço de animação (não precisa re-renderizar a cada quadro).
  const live = useRef({ target: 0.5, shown: 0.5, lastMove: 0, px: 0, py: 0, rx: 0, ry: 0 })

  const titleId = `${section.id}-title`
  const clipUrl = section.clipUrl.trim()
  const plateUrl = section.plateUrl.trim()
  const overlayUrl = section.overlayUrl.trim()
  const useClip = Boolean(clipUrl) && !reducedMotion

  // Preferências do dispositivo (lidas da janela onde a seção está: site ou prévia do painel).
  useEffect(() => {
    const win = stageRef.current?.ownerDocument.defaultView ?? window
    const media = (query: string) => (typeof win.matchMedia === 'function' ? win.matchMedia(query).matches : false)
    const reduce = theme.motion === 'none' || media('(prefers-reduced-motion: reduce)')
    setReducedMotion(reduce)
    setFinePointer(media('(pointer: fine)'))
    // Sem IntersectionObserver/Web Animations (navegador antigo): mostra tudo sem entrada animada.
    if (reduce || typeof IntersectionObserver === 'undefined' || typeof Element.prototype.animate !== 'function') setWaiting(false)
  }, [theme.motion])

  // Clipe: baixa o arquivo inteiro como blob para que cada busca de quadro seja instantânea.
  useEffect(() => {
    const video = clipRef.current
    if (!video || !useClip) return
    let objectUrl: string | null = null
    let cancelled = false
    fetch(clipUrl)
      .then((response) => (response.ok ? response.blob() : Promise.reject(new Error(String(response.status)))))
      .then((blob) => {
        if (cancelled) return
        objectUrl = URL.createObjectURL(blob)
        video.src = objectUrl
      })
      .catch(() => {
        if (!cancelled) video.src = clipUrl
      })
    const onSeeked = () => video.setAttribute('data-ready', '')
    video.addEventListener('seeked', onSeeked)
    return () => {
      cancelled = true
      video.removeEventListener('seeked', onSeeked)
      if (objectUrl) URL.revokeObjectURL(objectUrl)
    }
  }, [clipUrl, useClip])

  // Laço de animação: olhar seguindo o mouse (ou oscilando sozinho) + anel do cursor.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const win = stage.ownerDocument.defaultView ?? window
    let frame = 0
    let visible = true
    live.current.lastMove = win.performance.now()

    const observer =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = Boolean(entry?.isIntersecting)
          })
    observer?.observe(stage)

    const tick = (now: number) => {
      frame = win.requestAnimationFrame(tick)
      if (!visible) return
      const state = live.current
      const idleFor = now - state.lastMove - IDLE_AFTER_MS
      if (idleFor > 0) state.target = idleTarget(idleFor)
      state.shown = approach(state.shown, state.target, EASE)

      const video = clipRef.current
      if (useClip && video && video.duration > 0 && !video.seeking) {
        const time = state.shown * video.duration
        if (Math.abs(video.currentTime - time) > 1 / 48) video.currentTime = time
      }

      state.rx = approach(state.rx, state.px, RING_EASE)
      state.ry = approach(state.ry, state.py, RING_EASE)
      if (dotRef.current) dotRef.current.style.transform = `translate(${state.px}px, ${state.py}px)`
      if (ringRef.current) ringRef.current.style.transform = `translate(${state.rx}px, ${state.ry}px)`
    }
    frame = win.requestAnimationFrame(tick)
    return () => {
      win.cancelAnimationFrame(frame)
      observer?.disconnect()
    }
  }, [useClip])

  // Entrada animada (uma linha do tempo de ~1,8 s) quando a seção aparece.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage || reducedMotion || !waiting || typeof IntersectionObserver === 'undefined') return
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry?.isIntersecting) return
      observer.disconnect()
      setWaiting(false)
      const q = (selector: string) => stage.querySelector<HTMLElement>(selector)
      const ease = 'cubic-bezier(0.2, 0.8, 0.2, 1)'
      q('.ih-eyebrow')?.animate(
        [{ opacity: 0, letterSpacing: '0.9em' }, { opacity: 1, letterSpacing: '0.46em' }],
        { duration: 800, easing: ease, fill: 'backwards' },
      )
      q('.ih-title')?.animate(
        [{ opacity: 0, filter: 'blur(14px)', transform: 'translateY(24px)' }, { opacity: 1, filter: 'blur(0)', transform: 'none' }],
        { duration: 900, delay: 250, easing: ease, fill: 'backwards' },
      )
      q('.ih-subtitle')?.animate([{ opacity: 0, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], {
        duration: 600, delay: 750, easing: ease, fill: 'backwards',
      })
      stage.querySelectorAll<HTMLElement>('.ih-caption').forEach((el) =>
        el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 600, delay: 950, fill: 'backwards' }),
      )
      q('.ih-button')?.animate(
        [{ opacity: 0, transform: 'scale(0.4)' }, { opacity: 1, transform: 'scale(1.08)', offset: 0.7 }, { opacity: 1, transform: 'scale(1)' }],
        { duration: 500, delay: 1300, easing: ease, fill: 'backwards' },
      )
    }, { threshold: 0.25 })
    observer.observe(stage)
    return () => observer.disconnect()
  }, [reducedMotion, waiting])

  const onPointerMove = (event: PointerEvent<HTMLElement>) => {
    const stage = stageRef.current
    const frameEl = frameRef.current
    if (!stage || !frameEl) return
    const stageRect = stage.getBoundingClientRect()
    const frameRect = frameEl.getBoundingClientRect()
    const state = live.current
    state.px = event.clientX - stageRect.left
    state.py = event.clientY - stageRect.top
    state.target = pointerToClip((event.clientX - frameRect.left) / frameRect.width)
    // Relógio da janela onde a seção está (site ou iframe da prévia), o mesmo do laço de animação.
    state.lastMove = (stage.ownerDocument.defaultView ?? window).performance.now()
    if (!pointerIn) {
      state.rx = state.px
      state.ry = state.py
      setPointerIn(true)
    }
  }

  const toggleOverlay = () => {
    buttonRef.current?.animate?.([{ transform: 'scale(1)' }, { transform: 'scale(0.88)' }, { transform: 'scale(1)' }], {
      duration: 320,
      easing: 'ease-out',
    })
    setOverlayOn((on) => !on)
  }

  // Fundo personalizado: aparece no lugar do céu padrão quando não há imagem de fundo.
  const stops = backgroundStops(section.background)
  const customBackground = stops && section.background ? { background: backgroundCss(section.background, stops) } : undefined

  const label = section.buttonLabel.split('/').map((part) => part.trim()).filter(Boolean)

  return (
    <section
      ref={stageRef}
      aria-labelledby={titleId}
      className={`ih-stage${waiting ? ' ih-wait' : ''}`}
      style={customBackground}
      {...(finePointer ? { 'data-fine-pointer': '' } : {})}
      {...(pointerIn && finePointer ? { 'data-pointer-in': '' } : {})}
      onPointerMove={onPointerMove}
      onPointerLeave={() => setPointerIn(false)}
    >
      <div className="ih-inner">
        <div ref={frameRef} className="ih-frame">
          {plateUrl ? (
            <img className="ih-plate" src={plateUrl} alt={section.plateAlt?.trim() || ''} decoding="async" />
          ) : (
            <div aria-hidden="true" className="ih-plate-fallback" style={customBackground} />
          )}

          {useClip ? (
            <video
              ref={clipRef}
              aria-hidden="true"
              className="ih-box ih-clip"
              style={box(section.clipX, section.clipY, section.clipW, section.clipH)}
              muted
              playsInline
              preload="auto"
              disablePictureInPicture
            />
          ) : null}

          {overlayUrl ? (
            <>
              <img
                aria-hidden="true"
                alt=""
                src={overlayUrl}
                className="ih-box ih-overlay"
                style={box(section.overlayX, section.overlayY, section.overlaySize, section.overlaySize)}
                {...(overlayOn ? { 'data-on': '' } : {})}
              />
              <button
                ref={buttonRef}
                type="button"
                className="ih-box ih-button ih-anim"
                style={box(section.buttonX, section.buttonY, section.buttonSize, section.buttonSize)}
                aria-pressed={overlayOn}
                // As linhas viram blocos separados; o nome lido pelo leitor de tela precisa do espaço.
                aria-label={label.join(' ')}
                onClick={toggleOverlay}
              >
                <span>
                  {label.map((line, i) => (
                    <span key={i} className="block">
                      {line}
                    </span>
                  ))}
                </span>
              </button>
            </>
          ) : null}
        </div>

        <div className="ih-copy">
          {section.eyebrow ? <p className="ih-eyebrow ih-anim">{section.eyebrow}</p> : null}
          <h2 id={titleId} className="ih-title ih-anim">
            {section.title}
          </h2>
          {section.subtitle ? <p className="ih-subtitle ih-anim">{section.subtitle}</p> : null}
        </div>
        {section.captionLeft ? <p className="ih-caption ih-caption--left ih-anim">{section.captionLeft}</p> : null}
        {section.captionRight ? <p className="ih-caption ih-caption--right ih-anim">{section.captionRight}</p> : null}
      </div>

      {finePointer ? (
        <>
          <span ref={dotRef} aria-hidden="true" className="ih-cursor-dot" />
          <span ref={ringRef} aria-hidden="true" className="ih-cursor-ring" />
        </>
      ) : null}
    </section>
  )
}
