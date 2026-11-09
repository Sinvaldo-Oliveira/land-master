import { ArrowUpRight } from 'lucide-react'
import { useState, type CSSProperties, type PointerEvent } from 'react'
import { revealDelay, useSiteTheme } from '../context'
import { Container, SectionShell } from '../primitives'
import { isExternal, safeHref } from '../safe-href'
import type { ImageCardSection } from '../types'

/** Inclinação máxima em graus, em cada eixo. */
const MAX_TILT = 10.5

/**
 * Cartão com imagem que inclina em 3D conforme o mouse se move sobre ele.
 * Camadas em profundidade (translateZ) dão a sensação de relevo.
 * Sem movimento para toque e para quem pede menos animação (tema "none" ou prefers-reduced-motion).
 */
export function ImageCard({ section }: { section: ImageCardSection }) {
  const theme = useSiteTheme()
  const titleId = `${section.id}-title`
  const [tilt, setTilt] = useState({ x: 0, y: 0, active: false })
  const tiltEnabled = theme.motion !== 'none'

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    if (!tiltEnabled || event.pointerType !== 'mouse') return
    const rect = event.currentTarget.getBoundingClientRect()
    const px = (event.clientX - rect.left) / rect.width - 0.5
    const py = (event.clientY - rect.top) / rect.height - 0.5
    setTilt({ x: -py * 2 * MAX_TILT, y: px * 2 * MAX_TILT, active: true })
  }
  const reset = () => setTilt({ x: 0, y: 0, active: false })

  const card: CSSProperties = {
    transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`,
    transformStyle: 'preserve-3d',
    transition: tilt.active ? 'transform 120ms linear' : 'transform 500ms cubic-bezier(0.2, 0.8, 0.2, 1)',
  }
  const hasImage = section.imageUrl.trim() !== ''
  const action = safeHref(section.action.href)
  const corner = section.corner ? safeHref(section.corner.href) : null

  return (
    <SectionShell tone={section.tone} anchor={section.anchor} labelledBy={titleId}>
      <Container className="flex justify-center">
        <div data-reveal style={{ ...revealDelay(1), perspective: '1000px' }}>
          <div
            onPointerMove={onPointerMove}
            onPointerLeave={reset}
            style={card}
            className="relative h-[26rem] w-[min(20rem,88vw)] rounded-site-lg shadow-[0_40px_80px_-30px_rgb(11_19_36/0.45)]"
          >
            {/* Base: imagem (ou fundo de cor) e véu escuro para o texto ler bem */}
            <div className="absolute inset-4 rounded-site" style={{ transform: 'translateZ(20px)' }}>
              {hasImage ? (
                <img
                  src={section.imageUrl.trim()}
                  alt={section.imageAlt?.trim() || section.title}
                  loading="lazy"
                  decoding="async"
                  className="absolute inset-0 size-full rounded-site object-cover"
                />
              ) : (
                <div aria-hidden="true" className="absolute inset-0 rounded-site bg-gradient-to-br from-site-primary via-site-accent to-[#0b1324]" />
              )}
              <div aria-hidden="true" className="absolute inset-0 rounded-site bg-gradient-to-b from-black/20 via-transparent to-black/65" />
            </div>

            {/* Conteúdo em profundidade maior que a imagem */}
            <div className="absolute inset-4 flex flex-col justify-between p-4 text-white" style={{ transform: 'translateZ(50px)' }}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0" style={{ transform: 'translateZ(40px)' }}>
                  <h2 id={titleId} className="text-2xl leading-tight font-bold [overflow-wrap:anywhere]">
                    {section.title}
                  </h2>
                  {section.subtitle ? <p className="mt-1 text-sm font-light text-white/85">{section.subtitle}</p> : null}
                </div>
                {section.corner && corner ? (
                  <a
                    href={corner}
                    {...(isExternal(corner) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                    aria-label={`${section.corner.label}${isExternal(corner) ? ' (abre em nova aba)' : ''}`}
                    className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/20 ring-1 ring-inset ring-white/30 backdrop-blur-sm transition-transform duration-200 hover:scale-110 hover:bg-white/30"
                    style={{ transform: 'translateZ(60px)' }}
                  >
                    <ArrowUpRight aria-hidden="true" className="size-5" />
                  </a>
                ) : null}
              </div>

              <a
                href={action}
                {...(isExternal(action) ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                className="block w-full rounded-site py-3 text-center font-semibold text-white ring-1 ring-inset ring-white/25 backdrop-blur-md transition duration-200 hover:scale-[1.03] hover:bg-white/25 active:scale-95"
                style={{ transform: 'translateZ(40px)', background: 'rgb(255 255 255 / 0.12)' }}
              >
                {section.action.label}
                {isExternal(action) ? <span className="sr-only"> (abre em nova aba)</span> : null}
              </a>
            </div>
          </div>
        </div>
      </Container>
    </SectionShell>
  )
}
