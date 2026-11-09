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
    warnings.push('A cor principal fica pouco visível sobre o fundo branco (títulos destacados e links).')
  }
  return warnings
}
