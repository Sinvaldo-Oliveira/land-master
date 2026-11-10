/**
 * PageDocument v1 — formato das páginas públicas (Home e landing pages).
 * Lista FECHADA de seções: o renderizador só desenha o que está aqui (sem HTML livre, sem eval).
 * Ver docs/DESIGN_SYSTEM.md Parte B e docs/ARQUITETURA_TECNICA.md (ADR-001/002).
 *
 * A validação completa (Zod) roda no admin e no publish_page; o site público
 * não carrega o Zod para manter o bundle inicial dentro do orçamento.
 */

export type ThemeColors = {
  background: string
  foreground: string
  primary: string
  primaryForeground: string
  accent: string
  accentForeground: string
  muted: string
  mutedForeground: string
  card: string
  border: string
  ring: string
}

export type FontId = 'sora' | 'plus-jakarta-sans'

export type SiteTheme = {
  preset: 'horizonte'
  colors: ThemeColors
  /** Cores usadas em seções com tom "dark". */
  darkColors: ThemeColors
  fonts: { heading: FontId; body: FontId }
  radius: 'sm' | 'md' | 'lg' | 'xl'
  motion: 'none' | 'subtle'
}

/** Ícones disponíveis para as seções (lista fechada, mapeada para lucide-react). */
export type IconName =
  | 'layout'
  | 'smartphone'
  | 'search'
  | 'life-buoy'
  | 'palette'
  | 'megaphone'
  | 'handshake'
  | 'clock'
  | 'shield'
  | 'message'
  | 'target'
  | 'sparkles'

export type LinkItem = { label: string; href: string }

export type Brand = { name: string; tagline?: string }

export type SectionTone = 'light' | 'muted' | 'dark'

export type BackgroundDirection = 'to-bottom' | 'to-right' | 'to-bottom-right' | 'to-top-right' | 'radial'

/**
 * Fundo personalizado da seção. Ausente = usa o tom do tema (claro, suave ou escuro).
 * solid: 1 cor; gradient: 2 ou 3 cores (#rrggbb) na direção escolhida.
 * Texto, cartões e bordas da seção são recalculados para manter a leitura (src/renderer/surface.ts).
 */
export type SectionBackground = {
  mode: 'solid' | 'gradient'
  colors: string[]
  direction?: BackgroundDirection
}

/**
 * Cores de texto escolhidas para a seção. Ausente = automáticas (calculadas a partir do fundo).
 * primary: botões, ícones, selos e início do trecho em destaque; accent: fim do destaque e detalhes.
 */
export type SectionText = {
  foreground: string
  muted: string
  primary: string
  accent: string
}

/** hidden: a seção continua no documento, mas não é desenhada no site. */
type SectionBase = {
  id: string
  anchor?: string
  hidden?: boolean
  /** Nome exibido no painel (ex.: "Imagem Hiro 01"). */
  name?: string
  background?: SectionBackground
  text?: SectionText
}

export type HeaderSection = SectionBase & {
  type: 'site-header'
  brand: Brand
  links: LinkItem[]
  cta?: LinkItem
  /** Logo da empresa. Vazio = iniciais + nome da empresa (automático). */
  logoUrl?: string
  /** Altura do logo em px (24 a 64). */
  logoHeight?: number
}

export type HeroSection = SectionBase & {
  type: 'hero'
  tone: SectionTone
  eyebrow?: string
  title: string
  /** Trecho do título destacado com a cor de acento (precisa existir dentro de `title`). */
  highlight?: string
  subtitle: string
  primary: LinkItem
  secondary?: LinkItem
  points: { icon: IconName; label: string }[]
  /** Imagem que substitui a ilustração padrão do destaque. Vazio = ilustração. */
  imageUrl?: string
  imageAlt?: string
  /** Largura da imagem em % da coluna (40 a 100). */
  imageSize?: number
}

export type FeaturesSection = SectionBase & {
  type: 'features'
  tone: SectionTone
  eyebrow?: string
  title: string
  subtitle?: string
  items: { icon: IconName; title: string; description: string; link?: LinkItem }[]
}

export type AboutSection = SectionBase & {
  type: 'about'
  tone: SectionTone
  eyebrow?: string
  title: string
  paragraphs: string[]
  bullets: string[]
  cta?: LinkItem
  /** Texto curto exibido no painel visual (ex.: missão da empresa). */
  quote?: string
  /** Foto que substitui o painel escuro. Vazio = painel. */
  imageUrl?: string
  imageAlt?: string
  /** cover = preenche o cartão (pode cortar bordas); contain = mostra a foto inteira. */
  imageFit?: 'cover' | 'contain'
}

export type StepsSection = SectionBase & {
  type: 'steps'
  tone: SectionTone
  eyebrow?: string
  title: string
  subtitle?: string
  items: { icon: IconName; title: string; description: string }[]
}

export type FaqSection = SectionBase & {
  type: 'faq'
  tone: SectionTone
  eyebrow?: string
  title: string
  subtitle?: string
  items: { question: string; answer: string }[]
}

export type CtaSection = SectionBase & {
  type: 'cta'
  title: string
  subtitle?: string
  primary: LinkItem
  secondary?: LinkItem
}

export type ContactChannel = {
  kind: 'email' | 'phone' | 'whatsapp' | 'address' | 'hours'
  label: string
  value: string
  href?: string
}

export type ContactSection = SectionBase & {
  type: 'contact'
  tone: SectionTone
  eyebrow?: string
  title: string
  subtitle?: string
  channels: ContactChannel[]
  primary?: LinkItem
}

/** Cartão de imagem com inclinação 3D ao passar o mouse (efeito próprio, sem dependências extras). */
export type ImageCardSection = SectionBase & {
  type: 'image-card'
  tone: SectionTone
  title: string
  subtitle?: string
  /** Endereço https de uma imagem. Vazio = fundo de cor do tema. */
  imageUrl: string
  imageAlt?: string
  action: LinkItem
  /** Link do ícone no canto superior direito. */
  corner?: LinkItem
}

/**
 * Hero interativo: quadro 16:9 que cobre a tela, com imagem de fundo, clipe de vídeo
 * "arrastado" pela posição do mouse (ex.: a cabeça de um personagem seguindo o cursor)
 * e uma sobreposição que aparece ao apertar um botão (ex.: um capacete).
 * Posições e tamanhos em pixels de um quadro de 1440×810.
 */
export type InteractiveHeroSection = SectionBase & {
  type: 'interactive-hero'
  eyebrow?: string
  title: string
  subtitle?: string
  captionLeft?: string
  captionRight?: string
  plateUrl: string
  plateAlt?: string
  clipUrl: string
  clipX: number
  clipY: number
  clipW: number
  clipH: number
  overlayUrl: string
  overlayX: number
  overlayY: number
  overlaySize: number
  /** Texto do botão; "/" quebra a linha (ex.: "APERTE/AQUI"). */
  buttonLabel: string
  buttonX: number
  buttonY: number
  buttonSize: number
}

export type VideoCardFormat = 'poster' | 'story' | 'square' | 'classic' | 'wide'

export type VideoCarouselItem = {
  /** Pôster (upload). Vazio = cartão de cor com o título. */
  image: string
  imageAlt?: string
  title: string
  subtitle?: string
  description?: string
  /** Link do YouTube (watch, youtu.be, shorts). Abre num player sem cookies, só ao clicar. */
  videoUrl?: string
}

/** Carrossel em perspectiva (coverflow) de vídeos, com pôsteres e player do YouTube. */
export type VideoCarouselSection = SectionBase & {
  type: 'video-carousel'
  tone: SectionTone
  eyebrow?: string
  title: string
  subtitle?: string
  /** Proporção dos cartões: poster 2:3, story 9:16 (vertical), square 1:1, classic 4:3, wide 16:9. */
  format: VideoCardFormat
  autoplay: 'on' | 'off'
  /** Tempo entre avanços automáticos, em segundos (3 a 15). */
  intervalSeconds: number
  items: VideoCarouselItem[]
}

export type FooterSection = SectionBase & {
  type: 'site-footer'
  brand: Brand
  /** Logo do rodapé (fundo escuro: use uma versão clara). Vazio = iniciais + nome. */
  logoUrl?: string
  /** Altura do logo em px (24 a 64). */
  logoHeight?: number
  description: string
  columns: { title: string; links: LinkItem[] }[]
  legal: string
}

export type Section =
  | HeaderSection
  | HeroSection
  | FeaturesSection
  | AboutSection
  | StepsSection
  | FaqSection
  | CtaSection
  | ContactSection
  | ImageCardSection
  | InteractiveHeroSection
  | VideoCarouselSection
  | FooterSection

export type PageDocument = {
  schemaVersion: 1
  seo: { title: string; description: string }
  theme: SiteTheme
  sections: Section[]
}
