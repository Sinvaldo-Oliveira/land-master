import { contrastRatio } from '@/renderer/theme'
import type { PageDocument, Section } from '@/renderer/types'

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

/** Primeira cor da lista com o contraste mínimo sobre o fundo; senão, a de maior contraste. */
function firstReadable(candidates: string[], background: string, minimum = 4.5): string {
  const ok = candidates.find((c) => contrastRatio(c, background) >= minimum)
  return ok ?? [...candidates].sort((x, y) => contrastRatio(y, background) - contrastRatio(x, background))[0]!
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

/**
 * Cor de fundo global do site (seções claras e suaves, cartões e bordas).
 * O texto e os tons de apoio são recalculados para manter a leitura em qualquer cor.
 * Seções escuras e o rodapé usam as cores escuras do tema e não mudam.
 */
export function setBackgroundColor(doc: PageDocument, background: string): PageDocument {
  // Lado do texto decidido por preto x branco puros: o que tiver mais contraste com este fundo.
  const light = contrastRatio('#000000', background) >= contrastRatio('#ffffff', background)
  // Margem acima de 4,5:1 porque o mesmo texto também aparece sobre os tons derivados (seções suaves, cartões).
  const foreground = firstReadable(light ? ['#0b1324', '#000000'] : ['#f1f5ff', '#ffffff'], background, 5)
  const colors = {
    ...doc.theme.colors,
    background,
    foreground,
    mutedForeground: firstReadable(
      light ? ['#475569', '#334155', '#1e293b', foreground] : ['#a6b3cf', '#c7d2e6', '#e2e8f0', foreground],
      background,
    ),
    muted: derivedTone(background, foreground, foreground, 0.04),
    card: light ? derivedTone(background, foreground, '#ffffff', 0.6) : derivedTone(background, foreground, '#ffffff', 0.06),
    border: mixHex(background, foreground, 0.12),
  }
  return { ...doc, theme: { ...doc.theme, colors } }
}

export function setSeo(doc: PageDocument, seo: Partial<PageDocument['seo']>): PageDocument {
  return { ...doc, seo: { ...doc.seo, ...seo } }
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
