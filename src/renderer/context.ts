import { createContext, useContext, type CSSProperties } from 'react'
import type { SiteTheme } from './types'

export const SiteThemeContext = createContext<SiteTheme | null>(null)

export function useSiteTheme(): SiteTheme {
  const theme = useContext(SiteThemeContext)
  if (!theme) throw new Error('Seções precisam estar dentro de <PageRenderer>.')
  return theme
}

/** Atraso escalonado da animação de entrada (multiplicado no CSS). */
export function revealDelay(index: number): CSSProperties {
  return { '--reveal-index': index } as CSSProperties
}
