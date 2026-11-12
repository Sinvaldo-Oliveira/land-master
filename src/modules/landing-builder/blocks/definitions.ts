import {
  AppWindow,
  CircleHelp,
  CircleDot,
  Clapperboard,
  Columns3,
  Film,
  Heading,
  Image,
  Info,
  LayoutGrid,
  Grid3X3,
  List,
  ListChecks,
  ListOrdered,
  Megaphone,
  MessageCircle,
  Minus,
  MousePointerClick,
  MoveVertical,
  PanelBottom,
  PanelTop,
  Phone,
  RectangleHorizontal,
  BadgeCheck,
  Sparkles,
  Text,
  Wand,
  type LucideIcon,
} from 'lucide-react'
import {
  addImageSection,
  addInteractiveHeroSection,
  addParticleHeroSection,
  addVideoCarouselSection,
  addVideoPlayerSection,
} from '@/modules/home/editor-state'
import {
  backgroundField,
  sectionFields,
  sectionLabels,
  sectionSummary,
  textColorsField,
  toneField,
  type FieldDef,
} from '@/modules/home/section-fields'
import {
  blockToSection,
  isSectionBlockType,
  sectionToBlock,
  type Block,
  type BlockType,
  type LandingIdentity,
  type SectionBlockType,
} from '@/renderer/document-v2'
import { institucionalTemplate } from '@/renderer/templates/institucional'
import type { PageDocument, Section } from '@/renderer/types'
import { newBlockId, type IdFactory } from '../state/editor'

/**
 * Metade de EDIÇÃO de cada bloco: nome, grupo na biblioteca, campos do painel e conteúdo inicial.
 * A metade de renderização fica em src/renderer (o site público nunca importa este arquivo).
 */

export type BlockGroup = 'structure' | 'text' | 'media' | 'action' | 'sections'

export const groupLabels: Record<BlockGroup, string> = {
  structure: 'Estrutura',
  text: 'Texto',
  media: 'Mídia',
  action: 'Ação',
  sections: 'Seções prontas',
}

export const groupOrder: BlockGroup[] = ['structure', 'text', 'media', 'action', 'sections']

export type BlockDefinition = {
  type: BlockType
  label: string
  description: string
  group: BlockGroup
  icon: LucideIcon
  fields: FieldDef[]
  /** Conteúdo inicial. Sempre um objeto novo. */
  createProps: () => Record<string, unknown>
}

// ---------------------------------------------------------------------------
// Seções prontas: os mesmos campos e o mesmo conteúdo inicial do editor da Home.
// ---------------------------------------------------------------------------

const emptyHome: PageDocument = { ...institucionalTemplate, sections: [] }

/** Reaproveita as fábricas da Home, que devolvem a seção dentro de um documento. */
function fromFactory(factory: (doc: PageDocument) => { doc: PageDocument }): () => Section {
  return () => factory(emptyHome).doc.sections[0] as Section
}

const sectionFactories: Record<SectionBlockType, () => Section> = {
  ...(Object.fromEntries(
    institucionalTemplate.sections.map((section) => [section.type, () => structuredClone(section)]),
  ) as Record<SectionBlockType, () => Section>),
  'image-card': fromFactory(addImageSection),
  'interactive-hero': fromFactory(addInteractiveHeroSection),
  'particle-hero': fromFactory(addParticleHeroSection),
  'video-carousel': fromFactory(addVideoCarouselSection),
  'video-player': fromFactory(addVideoPlayerSection),
}

const sectionMeta: Record<SectionBlockType, { icon: LucideIcon; description: string }> = {
  'site-header': { icon: PanelTop, description: 'Logo, menu e botão no topo' },
  hero: { icon: Sparkles, description: 'Título grande com botões' },
  features: { icon: LayoutGrid, description: 'Cartões de serviços ou benefícios' },
  about: { icon: Info, description: 'Texto sobre a empresa com números' },
  steps: { icon: ListOrdered, description: 'Passo a passo numerado' },
  faq: { icon: CircleHelp, description: 'Perguntas e respostas' },
  cta: { icon: Megaphone, description: 'Faixa de chamada com botão' },
  contact: { icon: Phone, description: 'Canais de contato' },
  'image-card': { icon: AppWindow, description: 'Imagem em cartão com botão' },
  'interactive-hero': { icon: Wand, description: 'Abertura com vídeo e movimento' },
  'particle-hero': { icon: Sparkles, description: 'Abertura com partículas que reagem ao mouse' },
  'video-carousel': { icon: Film, description: 'Vídeos em carrossel' },
  'video-player': { icon: Clapperboard, description: 'Vídeo de vendas com botão' },
  'site-footer': { icon: PanelBottom, description: 'Rodapé com links e contato' },
}

/** Nomes que mudam na landing para não repetir o de um elemento ("Imagem" é o bloco de imagem simples). */
const sectionLabelOverrides: Partial<Record<SectionBlockType, string>> = { 'image-card': 'Cartão com imagem' }

function sectionDefinition(type: SectionBlockType): BlockDefinition {
  return {
    type,
    label: sectionLabelOverrides[type] ?? sectionLabels[type],
    description: sectionMeta[type].description,
    group: 'sections',
    icon: sectionMeta[type].icon,
    fields: sectionFields[type],
    createProps: () => sectionToBlock(sectionFactories[type]()).props,
  }
}

// ---------------------------------------------------------------------------
// Blocos primitivos
// ---------------------------------------------------------------------------

const primitives: BlockDefinition[] = [
  {
    type: 'section',
    label: 'Seção',
    description: 'Faixa da página que recebe os elementos',
    group: 'structure',
    icon: RectangleHorizontal,
    fields: [
      toneField,
      backgroundField,
      textColorsField,
      {
        kind: 'select',
        key: 'width',
        label: 'Largura do conteúdo',
        options: [
          { value: 'narrow', label: 'Estreita (leitura)' },
          { value: 'normal', label: 'Normal' },
          { value: 'wide', label: 'Larga' },
        ],
      },
      {
        kind: 'select',
        key: 'align',
        label: 'Alinhamento',
        options: [
          { value: 'center', label: 'Centralizado' },
          { value: 'left', label: 'À esquerda' },
        ],
      },
    ],
    createProps: () => ({ tone: 'light', width: 'normal', align: 'center' }),
  },
  {
    type: 'columns', label: 'Colunas', description: 'Até 4 colunas que empilham no celular', group: 'structure', icon: Columns3,
    fields: [{ kind: 'select', key: 'proportions', label: 'Proporções', options: [
      { value: '1', label: '1 coluna' }, { value: '1-1', label: '2 iguais' }, { value: '1-2', label: '1/3 + 2/3' }, { value: '2-1', label: '2/3 + 1/3' }, { value: '1-1-1', label: '3 iguais' }, { value: '1-1-1-1', label: '4 iguais' },
    ]}, { kind: 'select', key: 'stackOnMobile', label: 'No celular', options: [{ value: 'stack', label: 'Empilhar' }, { value: 'keep', label: 'Manter lado a lado' }] }],
    createProps: () => ({ proportions: '1-1', stackOnMobile: 'stack' }),
  },
  {
    type: 'grid', label: 'Grade', description: 'Grade uniforme de cartões', group: 'structure', icon: Grid3X3,
    fields: [{ kind: 'range', key: 'columns', label: 'Colunas no desktop', min: 2, max: 4, step: 1, unit: '' }], createProps: () => ({ columns: 3 }),
  },
  { type: 'column', label: 'Coluna', description: 'Área interna de Colunas ou Grade', group: 'structure', icon: RectangleHorizontal, fields: [], createProps: () => ({}) },
  {
    type: 'heading',
    label: 'Título',
    description: 'Título ou subtítulo',
    group: 'text',
    icon: Heading,
    fields: [
      { kind: 'textarea', key: 'text', label: 'Texto', max: 160, rows: 2 },
      {
        kind: 'select',
        key: 'level',
        label: 'Tamanho',
        options: [
          { value: 'h1', label: 'Principal (H1)' },
          { value: 'h2', label: 'Seção (H2)' },
          { value: 'h3', label: 'Subtítulo (H3)' },
        ],
      },
    ],
    createProps: () => ({ text: 'Escreva o título aqui', level: 'h2' }),
  },
  {
    type: 'paragraph',
    label: 'Parágrafo',
    description: 'Texto corrido',
    group: 'text',
    icon: Text,
    fields: [
      { kind: 'textarea', key: 'text', label: 'Texto', max: 2000, rows: 6, hint: 'Use Enter para quebrar a linha.' },
      {
        kind: 'select',
        key: 'size',
        label: 'Tamanho',
        options: [
          { value: 'md', label: 'Normal' },
          { value: 'lg', label: 'Grande' },
        ],
      },
    ],
    createProps: () => ({ text: 'Escreva o texto aqui.', size: 'md' }),
  },
  {
    type: 'image',
    label: 'Imagem',
    description: 'Foto ou ilustração',
    group: 'media',
    icon: Image,
    fields: [
      { kind: 'image', key: 'url', label: 'Imagem', hint: 'JPEG, PNG ou WebP, até 5 MB.' },
      {
        kind: 'text',
        key: 'alt',
        label: 'Descrição da imagem',
        max: 160,
        optional: true,
        hint: 'Lida por leitores de tela e pelo Google. Deixe vazio se a imagem for só decorativa.',
      },
    ],
    createProps: () => ({ url: '', alt: '' }),
  },
  {
    type: 'button',
    label: 'Botão',
    description: 'Link com aparência de botão',
    group: 'action',
    icon: MousePointerClick,
    fields: [
      { kind: 'link', key: 'link', label: 'Botão' },
      {
        kind: 'select',
        key: 'variant',
        label: 'Aparência',
        options: [
          { value: 'primary', label: 'Destaque (cor da marca)' },
          { value: 'secondary', label: 'Contorno' },
        ],
      },
    ],
    createProps: () => ({ link: { label: 'Quero saber mais', href: '#' }, variant: 'primary' }),
  },
  {
    type: 'spacer',
    label: 'Espaçador',
    description: 'Espaço vazio entre elementos',
    group: 'structure',
    icon: MoveVertical,
    fields: [
      {
        kind: 'select',
        key: 'size',
        label: 'Altura',
        options: [
          { value: 'sm', label: 'Pequena' },
          { value: 'md', label: 'Média' },
          { value: 'lg', label: 'Grande' },
          { value: 'xl', label: 'Muito grande' },
        ],
      },
    ],
    createProps: () => ({ size: 'md' }),
  },
  {
    type: 'divider',
    label: 'Divisor',
    description: 'Linha fina de separação',
    group: 'structure',
    icon: Minus,
    fields: [],
    createProps: () => ({}),
  },
  { type: 'list', label: 'Lista', description: 'Lista simples ou numerada', group: 'text', icon: List, fields: [{ kind: 'strings', key: 'items', label: 'Itens', itemLabel: 'Item', itemMax: 200, min: 1, max: 20 }, { kind: 'select', key: 'ordered', label: 'Marcador', options: [{ value: 'bullets', label: 'Pontos' }, { value: 'numbers', label: 'Números' }] }], createProps: () => ({ items: ['Primeiro item'], ordered: 'bullets' }) },
  { type: 'badge', label: 'Selo', description: 'Rótulo curto de destaque', group: 'text', icon: BadgeCheck, fields: [{ kind: 'text', key: 'text', label: 'Texto', max: 60 }, { kind: 'select', key: 'tone', label: 'Cor', options: [{ value: 'primary', label: 'Primária' }, { value: 'accent', label: 'Acento' }, { value: 'neutral', label: 'Neutra' }] }], createProps: () => ({ text: 'Novo', tone: 'primary' }) },
  { type: 'icon', label: 'Ícone', description: 'Ícone da biblioteca do site', group: 'media', icon: CircleDot, fields: [{ kind: 'icon', key: 'name', label: 'Ícone' }, { kind: 'text', key: 'label', label: 'Descrição acessível', max: 80, optional: true }], createProps: () => ({ name: 'sparkles', label: '' }) },
  { type: 'video', label: 'Vídeo', description: 'Arquivo de vídeo responsivo', group: 'media', icon: Clapperboard, fields: [{ kind: 'video', key: 'url', label: 'Vídeo' }, { kind: 'image', key: 'poster', label: 'Capa' }, { kind: 'text', key: 'captions', label: 'Legendas WebVTT (https)', max: 500, optional: true }, { kind: 'text', key: 'label', label: 'Descrição acessível', max: 160 }], createProps: () => ({ url: '', poster: '', captions: '', label: 'Vídeo' }) },
  { type: 'whatsapp-button', label: 'Botão WhatsApp', description: 'Abre uma conversa com mensagem pronta', group: 'action', icon: MessageCircle, fields: [{ kind: 'text', key: 'label', label: 'Texto do botão', max: 60 }, { kind: 'text', key: 'phone', label: 'Número com país e DDD', max: 15 }, { kind: 'textarea', key: 'message', label: 'Mensagem inicial', max: 500, rows: 3, optional: true }], createProps: () => ({ label: 'Conversar no WhatsApp', phone: '5500000000000', message: '' }) },
  { type: 'benefit-list', label: 'Lista de benefícios', description: 'Vantagens com marca de confirmação', group: 'action', icon: ListChecks, fields: [{ kind: 'strings', key: 'items', label: 'Benefícios', itemLabel: 'Benefício', itemMax: 160, min: 1, max: 20 }], createProps: () => ({ items: ['Descreva um benefício'] }) },
]

const sectionOrder: SectionBlockType[] = [
  'site-header', 'hero', 'features', 'about', 'steps', 'faq', 'cta', 'contact',
  'image-card', 'interactive-hero', 'particle-hero', 'video-carousel', 'video-player', 'site-footer',
]

export const blockDefinitions: BlockDefinition[] = [...primitives, ...sectionOrder.map(sectionDefinition)]

const byType = new Map(blockDefinitions.map((definition) => [definition.type, definition]))

/** Definição do tipo, ou undefined para um tipo que este painel não conhece. */
export function definitionOf(type: string): BlockDefinition | undefined {
  return byType.get(type as BlockType)
}

export function createBlock(type: BlockType, makeId: IdFactory = newBlockId, identity?: LandingIdentity): Block {
  const definition = byType.get(type)
  if (!definition) throw new Error(`Tipo de bloco sem definição: ${type}`)
  const block: Block = { id: makeId(type), type, v: 1, props: definition.createProps() }
  if (identity && (type === 'site-header' || type === 'site-footer')) {
    block.props = { ...block.props, brand: { ...((block.props.brand as Record<string, unknown> | undefined) ?? {}), name: identity.name }, ...(identity.logoUrl ? { logoUrl: identity.logoUrl } : {}) }
  }
  if (identity && type === 'whatsapp-button' && identity.whatsapp) block.props = { ...block.props, phone: identity.whatsapp }
  if (['section', 'columns', 'grid', 'column'].includes(type)) block.children = []
  // Colunas e Grade já nascem com as colunas prontas para receber elementos.
  const count = columnCountOf(block)
  if (count) block.children = Array.from({ length: count }, () => createBlock('column', makeId))
  return block
}

/** Quantas colunas um bloco Colunas ("1-2" = 2) ou Grade (columns) mostra lado a lado; null para outros tipos. */
export function columnCountOf(block: Block): number | null {
  if (block.type === 'columns') {
    const proportions = typeof block.props.proportions === 'string' ? block.props.proportions : '1-1'
    return Math.min(4, Math.max(1, proportions.split('-').length))
  }
  if (block.type === 'grid') {
    const columns = Number(block.props.columns)
    return Number.isFinite(columns) ? Math.min(4, Math.max(2, Math.round(columns))) : 3
  }
  return null
}

const text = (value: unknown): string => (typeof value === 'string' ? value.trim() : '')

/** Nome do bloco nas camadas e no painel ("Título", "Perguntas frequentes", ou o nome dado pela pessoa). */
export function blockLabel(block: Block): string {
  if (isSectionBlockType(block.type)) {
    // Nome dado pela pessoa tem prioridade; sem ele, o nome do bloco na biblioteca.
    const name = blockToSection(block)?.name?.trim()
    return name || (definitionOf(block.type)?.label ?? sectionLabels[block.type])
  }
  return definitionOf(block.type)?.label ?? 'Bloco desconhecido'
}

/** Trecho do conteúdo, para diferenciar blocos do mesmo tipo nas camadas. */
export function blockSummary(block: Block): string {
  if (isSectionBlockType(block.type)) {
    const section = blockToSection(block)
    return section ? sectionSummary(section) : ''
  }
  switch (block.type) {
    case 'heading':
    case 'paragraph':
      return text(block.props.text)
    case 'button':
      return text((block.props.link as { label?: unknown } | undefined)?.label)
    case 'image':
      return text(block.props.alt) || (text(block.props.url) ? '' : 'Sem imagem')
    case 'section': {
      const count = block.children?.length ?? 0
      return count === 0 ? 'Vazia' : count === 1 ? '1 elemento' : `${count} elementos`
    }
    default:
      return ''
  }
}
