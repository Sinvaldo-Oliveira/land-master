import { backgroundCss, backgroundStops, isLightSurface, mixHex, surfaceColors, validText, worstContrast } from '@/renderer/surface'
import { contrastRatio } from '@/renderer/theme'
import type { PageDocument, Section, SectionBackground, SectionText, SectionTone, SiteTheme, ThemeColors } from '@/renderer/types'

/** Cabeçalho e rodapé ficam sempre nas pontas; só as seções do meio são reordenadas. */
export const FIXED_SECTIONS: Section['type'][] = ['site-header', 'site-footer']

export function isMovable(section: Section): boolean {
  return !FIXED_SECTIONS.includes(section.type)
}

export function moveSection(doc: PageDocument, id: string, direction: -1 | 1): PageDocument {
  const sections = [...doc.sections]
  const from = sections.findIndex((s) => s.id === id)
  const to = from + direction
  const current = sections[from]
  const neighbor = sections[to]
  if (!current || !neighbor || !isMovable(current) || !isMovable(neighbor)) return doc
  sections[from] = neighbor
  sections[to] = current
  return { ...doc, sections }
}

export function toggleHidden(doc: PageDocument, id: string): PageDocument {
  return {
    ...doc,
    sections: doc.sections.map((s) => (s.id === id ? { ...s, hidden: !s.hidden } : s)),
  }
}

export function replaceSection(doc: PageDocument, next: Section): PageDocument {
  return { ...doc, sections: doc.sections.map((s) => (s.id === next.id ? next : s)) }
}

export function getBrandName(doc: PageDocument): string {
  for (const s of doc.sections) {
    if (s.type === 'site-header' || s.type === 'site-footer') return s.brand.name
  }
  return ''
}

/** O nome da empresa aparece no cabeçalho e no rodapé: muda nos dois de uma vez. */
export function setBrandName(doc: PageDocument, name: string): PageDocument {
  return {
    ...doc,
    sections: doc.sections.map((s) =>
      s.type === 'site-header' || s.type === 'site-footer' ? { ...s, brand: { ...s.brand, name } } : s,
    ),
  }
}

/** Escolhe branco ou quase-preto para o texto sobre a cor, o que tiver mais contraste. */
export function readableForeground(background: string): string {
  return contrastRatio('#ffffff', background) >= contrastRatio('#0b1324', background) ? '#ffffff' : '#0b1324'
}

export type BrandColorKey = 'primary' | 'accent'

/** Atualiza a cor da marca no modo claro (e o texto sobre ela, automaticamente). */
export function setBrandColor(doc: PageDocument, key: BrandColorKey, value: string): PageDocument {
  const foregroundKey = key === 'primary' ? 'primaryForeground' : 'accentForeground'
  const colors = { ...doc.theme.colors, [key]: value, [foregroundKey]: readableForeground(value) }
  if (key === 'primary') colors.ring = value
  return { ...doc, theme: { ...doc.theme, colors } }
}

export const MAX_SECTIONS = 20

/** Cria uma seção de imagem antes do rodapé. Devolve o documento e o id da nova seção. */
export function addImageSection(doc: PageDocument, name = 'Imagem Hiro 01'): { doc: PageDocument; id: string } {
  const id = `imagem-${Date.now().toString(36)}`
  const section: Section = {
    id,
    type: 'image-card',
    name,
    tone: 'light',
    title: 'Título da imagem',
    subtitle: 'Local ou detalhe',
    imageUrl: '',
    imageAlt: '',
    action: { label: 'Saiba mais', href: '#contato' },
    corner: { label: 'Abrir link', href: '#contato' },
  }
  return insertBeforeFooter(doc, section)
}

/** Insere a seção antes do rodapé (ou no fim, se não houver rodapé). */
function insertBeforeFooter(doc: PageDocument, section: Section): { doc: PageDocument; id: string } {
  const footerIndex = doc.sections.findIndex((s) => s.type === 'site-footer')
  const sections = [...doc.sections]
  if (footerIndex === -1) sections.push(section)
  else sections.splice(footerIndex, 0, section)
  return { doc: { ...doc, sections }, id: section.id }
}

/** Cria o carrossel de vídeos ("Carrossel de Video 01") antes do rodapé, com 3 itens a preencher. */
export function addVideoCarouselSection(doc: PageDocument, name = 'Carrossel de Video 01'): { doc: PageDocument; id: string } {
  return insertBeforeFooter(doc, {
    id: `carrossel-${Date.now().toString(36)}`,
    type: 'video-carousel',
    name,
    tone: 'dark',
    eyebrow: 'Vídeos',
    title: 'Assista e conheça',
    subtitle: '',
    format: 'poster',
    autoplay: 'off',
    intervalSeconds: 6,
    items: [1, 2, 3].map((n) => ({ image: '', title: `Título do vídeo ${n}`, subtitle: 'Tema · duração', description: '', videoUrl: '' })),
  })
}

/**
 * Cria o hero interativo ("Imagem Hiro 02") antes do rodapé.
 * Posições padrão do quadro de 1440×810; mídias vazias até o usuário enviar.
 */
export function addInteractiveHeroSection(doc: PageDocument, name = 'Imagem Hiro 02'): { doc: PageDocument; id: string } {
  return insertBeforeFooter(doc, {
    id: `hero-interativo-${Date.now().toString(36)}`,
    type: 'interactive-hero',
    name,
    eyebrow: 'Destaque',
    title: 'Sua marca',
    subtitle: 'Uma frase curta sobre o que você entrega',
    captionLeft: 'Interação 3D',
    captionRight: '@seuperfil',
    plateUrl: '',
    plateAlt: '',
    clipUrl: '',
    clipX: 510,
    clipY: 255,
    clipW: 435,
    clipH: 450,
    overlayUrl: '',
    overlayX: 533,
    overlayY: 288,
    overlaySize: 360,
    buttonLabel: 'APERTE/AQUI',
    buttonX: 675,
    buttonY: 720,
    buttonSize: 75,
  })
}

export { isLight, mixHex } from '@/renderer/surface'

/**
 * Cor de fundo global do site (seções claras e suaves, cartões e bordas).
 * O texto e os tons de apoio são recalculados para manter a leitura em qualquer cor.
 * Seções escuras e o rodapé usam as cores escuras do tema e não mudam.
 */
export function setBackgroundColor(doc: PageDocument, background: string): PageDocument {
  return { ...doc, theme: { ...doc.theme, colors: surfaceColors(doc.theme.colors, [background]) } }
}

export function setSeo(doc: PageDocument, seo: Partial<PageDocument['seo']>): PageDocument {
  return { ...doc, seo: { ...doc.seo, ...seo } }
}

/**
 * Fundo personalizado inicial ao trocar o tipo de fundo de uma seção: parte das cores atuais
 * do tema (o fundo do tom escolhido e a cor principal), para a troca não "pular" de cor.
 */
export function startBackground(
  theme: SiteTheme,
  tone: SectionTone | undefined,
  mode: SectionBackground['mode'],
  current?: SectionBackground,
): SectionBackground {
  const base = tone === 'dark' ? theme.darkColors : theme.colors
  const first = current?.colors[0] ?? (tone === 'muted' ? base.muted : base.background)
  if (mode === 'solid') return { mode, colors: [first] }
  const second = current?.colors[1] ?? mixHex(first, base.primary, 0.35)
  return { mode, colors: [first, second, ...(current?.colors.slice(2, 3) ?? [])], direction: current?.direction ?? 'to-bottom' }
}

/** Avisos de leitura para o fundo personalizado de uma seção (lista vazia = tudo legível). */
export function backgroundWarnings(
  theme: SiteTheme,
  section: { type: string; background?: SectionBackground | undefined; text?: SectionText | undefined },
): string[] {
  const stops = backgroundStops(section.background)
  // Com cores de texto escolhidas, quem avisa é o campo "Cor do texto" (textWarnings).
  if (!stops || validText(section.text)) return []
  if (section.type === 'interactive-hero') {
    return worstContrast('#ffffff', stops) < 4.5
      ? ['O texto desta seção é branco: escolha cores mais escuras para ele continuar legível (vale quando não há imagem de fundo).']
      : []
  }
  const warnings: string[] = []
  const colors = surfaceColors(isLightSurface(stops) ? theme.colors : theme.darkColors, stops)
  if (worstContrast(colors.foreground, stops) < 4.5) {
    warnings.push('Com estas cores, nenhuma cor de texto fica bem legível em toda a seção. Deixe as cores mais claras, mais escuras ou mais parecidas entre si.')
  }
  if (section.type !== 'cta' && section.type !== 'site-footer' && worstContrast(colors.primary, stops) < 3) {
    warnings.push('A cor principal fica pouco visível sobre este fundo (selos, destaques e ícones). Ajuste o fundo ou a cor principal.')
  }
  return warnings
}

type SectionLike = { type: string; tone?: unknown; background?: SectionBackground | undefined; text?: SectionText | undefined }

/**
 * Fundo efetivo de uma seção no site (cores, CSS para a amostra do painel) e a paleta automática dele.
 * Espelha o renderizador: fundo personalizado > tom (claro/suave/escuro) > padrão do tipo de seção.
 */
export function sectionSurface(theme: SiteTheme, section: SectionLike): { stops: string[]; css: string; colors: ThemeColors } {
  const stops = backgroundStops(section.background)
  // O hero interativo tem texto próprio (branco e cinza-azulado), qualquer que seja o fundo.
  const heroText = { foreground: '#ffffff', mutedForeground: '#cdd2e6' }
  if (stops && section.background) {
    const colors = surfaceColors(isLightSurface(stops) ? theme.colors : theme.darkColors, stops)
    const css = backgroundCss(section.background, stops)
    return { stops, css, colors: section.type === 'interactive-hero' ? { ...colors, ...heroText } : colors }
  }
  if (section.type === 'interactive-hero') {
    return { stops: ['#02040d'], css: '#02040d', colors: { ...theme.darkColors, ...heroText } }
  }
  const colors = section.type === 'site-footer' || section.tone === 'dark' ? theme.darkColors : theme.colors
  const bg = section.tone === 'muted' ? colors.muted : colors.background
  return { stops: [bg], css: bg, colors }
}

/** Cores de texto iniciais ao escolher "Personalizada": as automáticas atuais da seção (nada muda de cara). */
export function startText(theme: SiteTheme, section: SectionLike): SectionText {
  const { colors } = sectionSurface(theme, section)
  const ctaDefault = section.type === 'cta'
  // No hero interativo os destaques são o brilho azul do título.
  const heroGlow = section.type === 'interactive-hero'
  return {
    foreground: ctaDefault ? '#ffffff' : colors.foreground,
    muted: ctaDefault ? '#e6e9f2' : colors.mutedForeground,
    primary: heroGlow ? '#3d6bff' : colors.primary,
    accent: heroGlow ? '#b9cbff' : colors.accent,
  }
}

const ratio = (value: number) => value.toFixed(1).replace('.', ',')

/** Avisos de leitura das cores de texto escolhidas, medidas contra o fundo efetivo da seção. */
export function textWarnings(theme: SiteTheme, section: SectionLike): string[] {
  const text = validText(section.text)
  if (!text) return []
  // Na chamada para ação o texto fica sobre o cartão (degradê da cor de destaque 1 até o azul-noite).
  const stops =
    section.type === 'cta'
      ? [text.primary, mixHex(text.primary, '#0b1324', 0.3), '#0b1324']
      : sectionSurface(theme, section).stops
  const warnings: string[] = []
  const check = (color: string, minimum: number, label: string) => {
    const worst = worstContrast(color, stops)
    if (worst < minimum) {
      warnings.push(`${label}: pouco contraste com o fundo (${ratio(worst)}:1; o mínimo recomendado é ${ratio(minimum)}:1).`)
    }
  }
  check(text.foreground, 4.5, 'Títulos e texto principal')
  check(text.muted, 4.5, 'Texto secundário')
  // Na chamada para ação e no brilho do hero interativo os destaques são decorativos.
  if (section.type !== 'cta' && section.type !== 'interactive-hero') {
    check(text.primary, 3, 'Destaque 1')
    check(text.accent, 3, 'Destaque 2')
  }
  return warnings
}

/** Avisos de contraste (WCAG AA 4,5:1) para as cores escolhidas no modo claro. */
export function contrastWarnings(doc: PageDocument): string[] {
  const c = doc.theme.colors
  const warnings: string[] = []
  if (contrastRatio(c.primaryForeground, c.primary) < 4.5) {
    warnings.push('O texto dos botões fica com pouco contraste sobre a cor principal. Escolha um tom mais escuro ou mais claro.')
  }
  if (contrastRatio(c.primary, c.background) < 3) {
    warnings.push('A cor principal fica pouco visível sobre o fundo do site (títulos destacados e links). Ajuste a cor principal ou a cor de fundo.')
  }
  return warnings
}
