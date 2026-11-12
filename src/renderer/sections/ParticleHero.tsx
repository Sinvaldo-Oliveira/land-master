import { useEffect, useRef, type CSSProperties } from 'react'
import { ArrowRight, Zap } from 'lucide-react'
import { useSiteTheme } from '../context'
import { isExternal, safeHref } from '../safe-href'
import { backgroundCss, backgroundStops, validText } from '../surface'
import type { ParticleHeroSection } from '../types'
import { createParticles, linkAlpha, LINK_DISTANCE, POINTER_RADIUS, rgbTriplet, stepParticles, type Particle, type Pointer } from './particle-hero-math'
import './particle-hero.css'

const DEFAULT_BG = '#000000'

/**
 * Hero interativo 02. Carregado sob demanda pelo PageRenderer (React.lazy).
 * O canvas fica atrás do texto e só anima enquanto a seção está na tela; com "movimento: nenhum"
 * no tema ou "reduzir movimento" no dispositivo, desenha um quadro parado e não segue o mouse.
 */
export default function ParticleHero({ section }: { section: ParticleHeroSection }) {
  const theme = useSiteTheme()
  const stageRef = useRef<HTMLElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const titleId = `${section.id}-title`
  const stops = backgroundStops(section.background)
  const background = stops && section.background ? backgroundCss(section.background, stops) : DEFAULT_BG
  const solid = stops?.[0] ?? DEFAULT_BG
  const text = validText(section.text)
  const colors = {
    foreground: text?.foreground ?? '#ffffff',
    muted: text?.muted ?? '#a1a1aa',
    particle: text?.primary ?? theme.darkColors.primary,
    highlight: text?.accent ?? '#ffffff',
  }
  const particleRgb = rgbTriplet(colors.particle)
  const highlightRgb = rgbTriplet(colors.highlight, '255, 255, 255')
  const motionOff = theme.motion === 'none'

  useEffect(() => {
    const stage = stageRef.current
    const canvas = canvasRef.current
    const ctx = canvas?.getContext('2d')
    if (!stage || !canvas || !ctx) return
    const win = stage.ownerDocument.defaultView ?? window
    const reduce = motionOff || (typeof win.matchMedia === 'function' && win.matchMedia('(prefers-reduced-motion: reduce)').matches)

    let width = 0
    let height = 0
    let particles: Particle[] = []
    let pointer: Pointer = null
    let frame = 0
    let visible = true

    const draw = () => {
      ctx.clearRect(0, 0, width, height)
      for (let a = 0; a < particles.length; a++) {
        const pa = particles[a] as Particle
        for (let b = a + 1; b < particles.length; b++) {
          const pb = particles[b] as Particle
          const dx = pa.x - pb.x
          const dy = pa.y - pb.y
          // Corte barato antes da raiz quadrada.
          if (Math.abs(dx) > LINK_DISTANCE || Math.abs(dy) > LINK_DISTANCE) continue
          const alpha = linkAlpha(Math.hypot(dx, dy))
          if (alpha <= 0) continue
          const near = pointer !== null && Math.hypot(pa.x - pointer.x, pa.y - pointer.y) < POINTER_RADIUS
          ctx.strokeStyle = `rgba(${near ? highlightRgb : particleRgb}, ${alpha * (near ? 1 : 0.8)})`
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(pa.x, pa.y)
          ctx.lineTo(pb.x, pb.y)
          ctx.stroke()
        }
      }
      ctx.fillStyle = `rgba(${particleRgb}, 0.85)`
      for (const p of particles) {
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2)
        ctx.fill()
      }
    }

    const loop = () => {
      stepParticles(particles, width, height, pointer)
      draw()
      frame = visible ? win.requestAnimationFrame(loop) : 0
    }
    const start = () => {
      if (!reduce && visible && frame === 0) frame = win.requestAnimationFrame(loop)
    }
    const stop = () => {
      if (frame) win.cancelAnimationFrame(frame)
      frame = 0
    }

    const resize = () => {
      const rect = stage.getBoundingClientRect()
      if (rect.width === width && rect.height === height) return
      width = rect.width
      height = rect.height
      const dpr = Math.min(win.devicePixelRatio || 1, 2)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
      particles = createParticles(width, height, section.density)
      draw()
    }
    resize()

    const resizeObserver = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize)
    resizeObserver?.observe(stage)
    if (!resizeObserver) win.addEventListener('resize', resize)

    // Pausa quando a seção sai da tela: nada roda em segundo plano enquanto a pessoa lê o resto.
    const intersection =
      typeof IntersectionObserver === 'undefined'
        ? null
        : new IntersectionObserver(([entry]) => {
            visible = Boolean(entry?.isIntersecting)
            if (visible) start()
            else stop()
          })
    intersection?.observe(stage)

    const onMove = (event: PointerEvent) => {
      const rect = stage.getBoundingClientRect()
      pointer = { x: event.clientX - rect.left, y: event.clientY - rect.top }
    }
    const onLeave = () => {
      pointer = null
    }
    if (!reduce) {
      stage.addEventListener('pointermove', onMove)
      stage.addEventListener('pointerleave', onLeave)
    }
    start()

    return () => {
      stop()
      resizeObserver?.disconnect()
      intersection?.disconnect()
      win.removeEventListener('resize', resize)
      stage.removeEventListener('pointermove', onMove)
      stage.removeEventListener('pointerleave', onLeave)
    }
  }, [motionOff, particleRgb, highlightRgb, section.density])

  const href = section.cta ? safeHref(section.cta.href) : ''
  const external = isExternal(href)

  return (
    <section
      ref={stageRef}
      id={section.anchor || undefined}
      aria-labelledby={titleId}
      className="ph-stage"
      data-motion={motionOff ? 'none' : undefined}
      style={{ background, '--ph-text': colors.foreground, '--ph-muted': colors.muted, '--ph-particle': colors.particle, '--ph-solid': solid } as CSSProperties}
    >
      <canvas ref={canvasRef} aria-hidden="true" className="ph-canvas" />
      <div className="ph-content">
        {section.eyebrow ? (
          <p className="ph-in ph-badge" style={{ '--i': 0 } as CSSProperties}>
            <Zap aria-hidden="true" className="size-4" style={{ color: 'var(--ph-particle)' }} />
            {section.eyebrow}
          </p>
        ) : null}
        <h2 id={titleId} className="ph-in ph-title" style={{ '--i': 1 } as CSSProperties}>
          {section.title}
        </h2>
        {section.subtitle ? (
          <p className="ph-in ph-subtitle" style={{ '--i': 2 } as CSSProperties}>
            {section.subtitle}
          </p>
        ) : null}
        {section.cta ? (
          <div className="ph-in" style={{ '--i': 3 } as CSSProperties}>
            <a href={href} {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})} className="ph-cta group">
              {section.cta.label}
              <ArrowRight aria-hidden="true" className="size-5 transition-transform group-hover:translate-x-0.5" />
              {external ? <span className="sr-only"> (abre em nova aba)</span> : null}
            </a>
          </div>
        ) : null}
      </div>
    </section>
  )
}
