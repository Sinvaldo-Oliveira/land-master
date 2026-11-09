import { useEffect, useLayoutEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'

export type PreviewDevice = 'desktop' | 'tablet' | 'mobile'

const deviceWidths: Record<PreviewDevice, number> = { desktop: 1280, tablet: 820, mobile: 390 }

const FRAME_HTML =
  '<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head><body style="margin:0"></body></html>'

/** Copia as folhas de estilo do painel para o iframe e acompanha as que forem carregadas depois. */
function mirrorStyles(target: Document): () => void {
  const copy = (node: Node) => {
    if (node instanceof HTMLStyleElement || (node instanceof HTMLLinkElement && node.rel === 'stylesheet')) {
      target.head.appendChild(node.cloneNode(true))
    }
  }
  document.head.querySelectorAll('style, link[rel="stylesheet"]').forEach(copy)
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) mutation.addedNodes.forEach(copy)
  })
  observer.observe(document.head, { childList: true })
  return () => observer.disconnect()
}

/**
 * Pré-visualização isolada em iframe: a página é desenhada na largura real do dispositivo
 * (os breakpoints do site funcionam de verdade) e reduzida em escala para caber no painel.
 */
export function PreviewFrame({
  device,
  focusSectionId,
  children,
}: {
  device: PreviewDevice
  /** Seção a mostrar na prévia ('top' = início, 'bottom' = fim, ou o id da seção). */
  focusSectionId?: string | null
  children: ReactNode
}) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [body, setBody] = useState<HTMLElement | null>(null)
  const [box, setBox] = useState({ width: 0, height: 0 })
  const width = deviceWidths[device]

  // Mede o espaço disponível.
  useLayoutEffect(() => {
    const element = containerRef.current
    if (!element) return
    const observer = new ResizeObserver(([entry]) => {
      if (entry) setBox({ width: entry.contentRect.width, height: entry.contentRect.height })
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  // Prepara o documento do iframe (estilos + bloqueio de navegação para fora da prévia).
  useEffect(() => {
    const iframe = iframeRef.current
    if (!iframe) return
    let stopMirror: (() => void) | undefined
    const onLoad = () => {
      const doc = iframe.contentDocument
      if (!doc) return
      stopMirror = mirrorStyles(doc)
      doc.addEventListener('click', (event) => {
        const anchor = (event.target as Element | null)?.closest?.('a')
        const href = anchor?.getAttribute('href') ?? ''
        // Âncoras (#secao) rolam a prévia; links externos abrem em nova aba; o resto não navega a prévia.
        if (anchor && !href.startsWith('#') && anchor.getAttribute('target') !== '_blank') event.preventDefault()
      })
      setBody(doc.body)
    }
    iframe.addEventListener('load', onLoad)
    return () => {
      iframe.removeEventListener('load', onLoad)
      stopMirror?.()
    }
  }, [])

  // Leva a prévia até a seção selecionada no editor.
  useEffect(() => {
    if (!body || !focusSectionId) return
    const win = body.ownerDocument.defaultView
    if (!win) return
    if (focusSectionId === 'top') return win.scrollTo({ top: 0, behavior: 'smooth' })
    if (focusSectionId === 'bottom') return win.scrollTo({ top: body.scrollHeight, behavior: 'smooth' })
    // scrollTo na janela do iframe (scrollIntoView rolaria também a página do painel).
    const target = body.querySelector(`[data-section-id="${CSS.escape(focusSectionId)}"]`)
    if (target) win.scrollTo({ top: target.getBoundingClientRect().top + win.scrollY - 72, behavior: 'smooth' })
  }, [body, focusSectionId, device])

  const scale = box.width > 0 ? Math.min(1, box.width / width) : 1
  const frameHeight = box.height > 0 ? box.height / scale : 800

  return (
    <div ref={containerRef} className="relative h-full min-h-[480px] w-full overflow-hidden">
      <div
        className="absolute top-0 left-1/2 origin-top overflow-hidden rounded-admin-lg border border-admin-rule bg-white shadow-admin-pop"
        style={{ width, height: frameHeight, transform: `translateX(-50%) scale(${scale})` }}
      >
        <iframe ref={iframeRef} title="Pré-visualização do site" srcDoc={FRAME_HTML} className="block size-full border-0" />
      </div>
      {body ? createPortal(children, body) : null}
    </div>
  )
}
