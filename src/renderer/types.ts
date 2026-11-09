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

type SectionBase = { id: string; anchor?: string }

export type HeaderSection = SectionBase & {
  type: 'site-header'
  brand: Brand
  links: LinkItem[]
  cta?: LinkItem
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

export type FooterSection = SectionBase & {
  type: 'site-footer'
  brand: Brand
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
  | FooterSection

export type PageDocument = {
  schemaVersion: 1
  seo: { title: string; description: string }
  theme: SiteTheme
  sections: Section[]
}
