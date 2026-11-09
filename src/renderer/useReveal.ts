import { useEffect, type RefObject } from 'react'

/**
 * Animação de entrada CSS-first: marca [data-reveal] como [data-revealed] ao entrar na tela.
 * Só ativa o modo animado (.site-motion) quando há IntersectionObserver e o tema permite;
 * sem JS ou com prefers-reduced-motion o conteúdo aparece normalmente.
 */
export function useReveal(rootRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const root = rootRef.current
    if (!root || !enabled || typeof IntersectionObserver === 'undefined') return

    const targets = Array.from(root.querySelectorAll<HTMLElement>('[data-reveal]'))
    root.classList.add('site-motion')

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.setAttribute('data-revealed', '')
            observer.unobserve(entry.target)
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    )
    targets.forEach((target) => observer.observe(target))

    return () => {
      observer.disconnect()
      root.classList.remove('site-motion')
    }
  }, [rootRef, enabled])
}
