import {
  AppWindow,
  CircleHelp,
  Clapperboard,
  Film,
  Heading,
  Image,
  Info,
  LayoutGrid,
  ListOrdered,
  Megaphone,
  Minus,
  MousePointerClick,
  MoveVertical,
  PanelBottom,
  PanelTop,
  Phone,
  RectangleHorizontal,
  Sparkles,
  Text,
  Wand,
  type LucideIcon,
} from 'lucide-react'
import {
  addImageSection,
  addInteractiveHeroSection,
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
]

const sectionOrder: SectionBlockType[] = [
  'site-header', 'hero', 'features', 'about', 'steps', 'faq', 'cta', 'contact',
  'image-card', 'interactive-hero', 'video-carousel', 'video-player', 'site-footer',
]

export const blockDefinitions: BlockDefinition[] = [...primitives, ...sectionOrder.map(sectionDefinition)]

const byType = new Map(blockDefinitions.map((definition) => [definition.type, definition]))

/** Definição do tipo, ou undefined para um tipo que este painel não conhece. */
export function definitionOf(type: string): BlockDefinition | undefined {
  return byType.get(type as BlockType)
}

export function createBlock(type: BlockType, makeId: IdFactory = newBlockId): Block {
  const definition = byType.get(type)
  if (!definition) throw new Error(`Tipo de bloco sem definição: ${type}`)
  return { id: makeId(type), type, v: 1, props: definition.createProps() }
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
