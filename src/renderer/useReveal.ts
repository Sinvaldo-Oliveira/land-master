import { useEffect, type RefObject } from 'react'

/**
 * Animação de entrada CSS-first: marca [data-reveal] como [data-revealed] ao entrar na tela.
 * Só ativa o modo animado (.site-motion) quando há IntersectionObserver e o tema permite;
 * sem JS ou com prefers-reduced-motion o conteúdo aparece normalmente.
 *
 * Seções pesadas entram depois (React.lazy): um MutationObserver observa também os
 * elementos que chegam depois da montagem, senão ficariam invisíveis para sempre.
 */
export function useReveal(rootRef: RefObject<HTMLElement | null>, enabled: boolean) {
  useEffect(() => {
    const root = rootRef.current
    if (!root || !enabled || typeof IntersectionObserver === 'undefined') return

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

    // observe() é idempotente: o mesmo elemento não é observado duas vezes.
    const observeNew = () => {
      root.querySelectorAll<HTMLElement>('[data-reveal]:not([data-revealed])').forEach((target) => observer.observe(target))
    }
    observeNew()

    const mutations = typeof MutationObserver === 'undefined' ? null : new MutationObserver(observeNew)
    mutations?.observe(root, { childList: true, subtree: true })

    return () => {
      mutations?.disconnect()
      observer.disconnect()
      root.classList.remove('site-motion')
    }
  }, [rootRef, enabled])
}
