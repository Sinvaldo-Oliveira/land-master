import type { CSSProperties } from 'react'
import { colorVars, contrastRatio } from './theme'
import type { BackgroundDirection, SectionBackground, SiteTheme, ThemeColors } from './types'

/**
 * Fundo personalizado das seções (cor sólida ou degradê de até 3 cores) e a paleta derivada dele:
 * texto, texto secundário, cartões, tom suave e bordas são recalculados para manter a leitura.
 * Também usado pela cor de fundo global (Identidade e SEO).
 *
 * O documento vem do banco: só cores #rrggbb e direções conhecidas chegam ao CSS.
 */

const HEX = /^#[0-9a-fA-F]{6}$/

const gradientHeads: Record<BackgroundDirection, string> = {
  'to-bottom': 'linear-gradient(180deg, ',
  'to-right': 'linear-gradient(90deg, ',
  'to-bottom-right': 'linear-gradient(135deg, ',
  'to-top-right': 'linear-gradient(45deg, ',
  radial: 'radial-gradient(circle at 50% 30%, ',
}

/** Mistura duas cores #rrggbb: t = 0 devolve a, t = 1 devolve b. */
export function mixHex(a: string, b: string, t: number): string {
  const parse = (hex: string) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16))
  const [ca, cb] = [parse(a), parse(b)]
  return (
    '#' +
    ca
      .map((value, i) => Math.round(value + ((cb[i] ?? value) - value) * t))
      .map((value) => value.toString(16).padStart(2, '0'))
      .join('')
  )
}

/** true quando a cor é clara (texto escuro lê melhor sobre ela). */
export function isLight(hex: string): boolean {
  return contrastRatio('#0b1324', hex) >= contrastRatio('#ffffff', hex)
}

/** Menor contraste da cor sobre todas as cores do fundo (o pior ponto do degradê). */
export function worstContrast(color: string, stops: string[]): number {
  return Math.min(...stops.map((stop) => contrastRatio(color, stop)))
}

/** Primeira cor da lista com o contraste mínimo em todo o fundo; senão, a de maior contraste. */
function firstReadable(candidates: string[], stops: string[], minimum = 4.5): string {
  const ok = candidates.find((c) => worstContrast(c, stops) >= minimum)
  return ok ?? [...candidates].sort((x, y) => worstContrast(y, stops) - worstContrast(x, stops))[0]!
}

/**
 * Tom derivado do fundo (cartão, seção suave): vai na direção preferida, mas inverte
 * (clareia em vez de escurecer, ou o contrário) se isso derrubar a leitura do texto.
 */
function derivedTone(background: string, foreground: string, toward: string, amount: number): string {
  const preferred = mixHex(background, toward, amount)
  if (contrastRatio(foreground, preferred) >= 4.5) return preferred
  const opposite = toward === '#ffffff' ? '#000000' : toward === '#000000' ? '#ffffff' : isLight(foreground) ? '#000000' : '#ffffff'
  return mixHex(background, opposite, amount)
}

/** Cor média das paradas (base para cartões, bordas e tom suave num degradê). */
function averageHex(stops: string[]): string {
  let mid = stops[0]!
  stops.slice(1).forEach((stop, i) => {
    mid = mixHex(mid, stop, 1 / (i + 2))
  })
  return mid
}

/** O fundo pede texto escuro? Decidido por preto x branco puros no pior ponto do fundo. */
export function isLightSurface(stops: string[]): boolean {
  return worstContrast('#000000', stops) >= worstContrast('#ffffff', stops)
}

/**
 * Paleta para um fundo de uma ou mais cores. Mantém primária, acento e anel de `base`;
 * troca fundo, textos, cartões, tom suave e bordas.
 */
export function surfaceColors(base: ThemeColors, stops: string[]): ThemeColors {
  const light = isLightSurface(stops)
  const background = averageHex(stops)
  // Margem acima de 4,5:1 porque o mesmo texto também aparece sobre os tons derivados (seções suaves, cartões).
  const foreground = firstReadable(light ? ['#0b1324', '#000000'] : ['#f1f5ff', '#ffffff'], stops, 5)
  return {
    ...base,
    background,
    foreground,
    mutedForeground: firstReadable(
      light ? ['#475569', '#334155', '#1e293b', foreground] : ['#a6b3cf', '#c7d2e6', '#e2e8f0', foreground],
      stops,
    ),
    muted: derivedTone(background, foreground, foreground, 0.04),
    card: light ? derivedTone(background, foreground, '#ffffff', 0.6) : derivedTone(background, foreground, '#ffffff', 0.06),
    border: mixHex(background, foreground, 0.12),
  }
}

/** Cores válidas do fundo personalizado (1 na cor sólida, 2 ou 3 no degradê); null = usar o tema. */
export function backgroundStops(background: SectionBackground | undefined): string[] | null {
  if (!background || typeof background !== 'object' || !Array.isArray(background.colors)) return null
  const colors = background.colors.filter((c): c is string => typeof c === 'string' && HEX.test(c)).map((c) => c.toLowerCase())
  if (colors.length !== background.colors.length) return null
  if (background.mode === 'solid') return colors.length >= 1 ? colors.slice(0, 1) : null
  if (background.mode === 'gradient') return colors.length >= 2 && colors.length <= 3 ? colors : null
  return null
}

/** Valor CSS do fundo (cor ou degradê). Só aceita entradas já validadas por backgroundStops. */
export function backgroundCss(background: SectionBackground, stops: string[]): string {
  if (stops.length === 1) return stops[0]!
  const head = gradientHeads[background.direction ?? 'to-bottom'] ?? gradientHeads['to-bottom']
  return head + stops.join(', ') + ')'
}

/**
 * Estilo de uma seção com fundo personalizado: variáveis do tema recalculadas + o fundo.
 * Fundo escuro usa as cores escuras do tema como base (primária mais clara, legível no escuro).
 * Devolve undefined quando a seção usa o tom do tema (ou o valor salvo é inválido).
 */
export function surfaceStyle(theme: SiteTheme, background: SectionBackground | undefined): CSSProperties | undefined {
  const stops = backgroundStops(background)
  if (!stops || !background) return undefined
  const base = isLightSurface(stops) ? theme.colors : theme.darkColors
  return { ...colorVars(surfaceColors(base, stops)), background: backgroundCss(background, stops) }
}
