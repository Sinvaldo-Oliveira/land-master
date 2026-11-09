import type { IconName, Section } from '@/renderer/types'

export type FieldDef =
  | {
      kind: 'text'
      key: string
      label: string
      max: number
      optional?: boolean
      hint?: string
      /** Regra extra que enxerga os outros campos da seção (ex.: destaque precisa existir no título). */
      check?: (value: string, section: Record<string, unknown>) => string | undefined
    }
  | { kind: 'textarea'; key: string; label: string; max: number; optional?: boolean; rows?: number; hint?: string }
  | { kind: 'link'; key: string; label: string; optional?: boolean }
  | { kind: 'image'; key: string; label: string; hint?: string }
  | { kind: 'video'; key: string; label: string; hint?: string }
  | { kind: 'range'; key: string; label: string; min: number; max: number; step: number; unit: string }
  | { kind: 'icon'; key: string; label: string }
  | { kind: 'select'; key: string; label: string; options: { value: string; label: string }[] }
  | {
      kind: 'list'
      key: string
      label: string
      itemLabel: string
      min?: number
      max: number
      fields: FieldDef[]
      create: () => Record<string, unknown>
    }
  | { kind: 'strings'; key: string; label: string; itemLabel: string; itemMax: number; min?: number; max: number; multiline?: boolean }

export const HIGHLIGHT_ERROR = 'Este trecho não aparece no título. Copie exatamente uma parte do título (ou apague este campo).'

/** O trecho em destaque precisa estar, exatamente, dentro do título da mesma seção. */
export function highlightInTitle(value: string, section: Record<string, unknown>): string | undefined {
  if (value.trim() === '') return undefined
  const title = typeof section.title === 'string' ? section.title : ''
  return title.includes(value) ? undefined : HIGHLIGHT_ERROR
}

export const sectionLabels: Record<Section['type'], string> = {
  'site-header': 'Cabeçalho',
  hero: 'Destaque principal',
  features: 'Serviços',
  about: 'Sobre',
  steps: 'Como trabalhamos',
  faq: 'Perguntas frequentes',
  cta: 'Chamada para ação',
  contact: 'Contato',
  'site-footer': 'Rodapé',
  'image-card': 'Imagem',
  'interactive-hero': 'Hero interativo',
}

export const iconOptions: { value: IconName; label: string }[] = [
  { value: 'target', label: 'Alvo' },
  { value: 'layout', label: 'Layout' },
  { value: 'smartphone', label: 'Celular' },
  { value: 'search', label: 'Busca' },
  { value: 'megaphone', label: 'Megafone' },
  { value: 'palette', label: 'Paleta' },
  { value: 'handshake', label: 'Aperto de mãos' },
  { value: 'clock', label: 'Relógio' },
  { value: 'shield', label: 'Escudo' },
  { value: 'message', label: 'Mensagem' },
  { value: 'life-buoy', label: 'Suporte' },
  { value: 'sparkles', label: 'Brilho' },
]

const toneField: FieldDef = {
  kind: 'select',
  key: 'tone',
  label: 'Fundo da seção',
  options: [
    { value: 'light', label: 'Claro' },
    { value: 'muted', label: 'Suave' },
    { value: 'dark', label: 'Escuro' },
  ],
}
const eyebrow: FieldDef = { kind: 'text', key: 'eyebrow', label: 'Selo acima do título', max: 60, optional: true }
const subtitle: FieldDef = { kind: 'textarea', key: 'subtitle', label: 'Subtítulo', max: 240, optional: true, rows: 2 }
function linkList(label: string, max: number): FieldDef {
  return {
    kind: 'list',
    key: 'links',
    label,
    itemLabel: 'Link',
    max,
    fields: [
      { kind: 'text', key: 'label', label: 'Texto', max: 60 },
      { kind: 'text', key: 'href', label: 'Destino', max: 300, hint: 'Ex.: #contato, /sobre, https://…, mailto:, tel:' },
    ],
    create: () => ({ label: 'Novo link', href: '#contato' }),
  }
}

/** Campos editáveis por tipo de seção (a marca e as cores ficam em "Identidade"). */
export const sectionFields: Record<Section['type'], FieldDef[]> = {
  'site-header': [
    linkList('Links do menu', 7),
    { kind: 'link', key: 'cta', label: 'Botão em destaque', optional: true },
  ],
  hero: [
    toneField,
    eyebrow,
    { kind: 'text', key: 'title', label: 'Título', max: 120 },
    {
      kind: 'text',
      key: 'highlight',
      label: 'Trecho do título em destaque',
      max: 60,
      optional: true,
      hint: 'Deixe vazio para não destacar. Se preencher, copie exatamente um trecho que esteja no título.',
      check: highlightInTitle,
    },
    { kind: 'textarea', key: 'subtitle', label: 'Subtítulo', max: 300, rows: 3 },
    { kind: 'link', key: 'primary', label: 'Botão principal' },
    { kind: 'image', key: 'imageUrl', label: 'Imagem do destaque', hint: 'Opcional. Substitui a ilustração padrão. Sem imagem, aparece a ilustração.' },
    { kind: 'text', key: 'imageAlt', label: 'Descrição da imagem (acessibilidade)', max: 160, optional: true },
    { kind: 'range', key: 'imageSize', label: 'Tamanho da imagem', min: 40, max: 100, step: 5, unit: '%' },
    { kind: 'link', key: 'secondary', label: 'Botão secundário', optional: true },
    {
      kind: 'list', key: 'points', label: 'Diferenciais', itemLabel: 'Diferencial', max: 12,
      fields: [{ kind: 'icon', key: 'icon', label: 'Ícone' }, { kind: 'text', key: 'label', label: 'Texto', max: 40 }],
      create: () => ({ icon: 'sparkles', label: 'Novo diferencial' }),
    },
  ],
  features: [
    toneField,
    eyebrow,
    { kind: 'text', key: 'title', label: 'Título', max: 100 },
    subtitle,
    {
      kind: 'list', key: 'items', label: 'Serviços', itemLabel: 'Serviço', min: 1, max: 9,
      fields: [
        { kind: 'icon', key: 'icon', label: 'Ícone' },
        { kind: 'text', key: 'title', label: 'Título', max: 60 },
        { kind: 'textarea', key: 'description', label: 'Descrição', max: 220, rows: 2 },
      ],
      create: () => ({ icon: 'sparkles', title: 'Novo serviço', description: 'Descreva o serviço em uma ou duas frases.' }),
    },
  ],
  about: [
    toneField,
    eyebrow,
    { kind: 'text', key: 'title', label: 'Título', max: 120 },
    { kind: 'strings', key: 'paragraphs', label: 'Parágrafos', itemLabel: 'Parágrafo', itemMax: 600, min: 1, max: 4, multiline: true },
    { kind: 'strings', key: 'bullets', label: 'Lista de vantagens', itemLabel: 'Vantagem', itemMax: 90, max: 8 },
    { kind: 'textarea', key: 'quote', label: 'Frase em destaque (painel)', max: 240, optional: true, rows: 2 },
    { kind: 'link', key: 'cta', label: 'Botão', optional: true },
  ],
  steps: [
    toneField,
    eyebrow,
    { kind: 'text', key: 'title', label: 'Título', max: 100 },
    subtitle,
    {
      kind: 'list', key: 'items', label: 'Etapas', itemLabel: 'Etapa', min: 2, max: 6,
      fields: [
        { kind: 'icon', key: 'icon', label: 'Ícone' },
        { kind: 'text', key: 'title', label: 'Título', max: 50 },
        { kind: 'textarea', key: 'description', label: 'Descrição', max: 200, rows: 2 },
      ],
      create: () => ({ icon: 'target', title: 'Nova etapa', description: 'O que acontece nesta etapa.' }),
    },
  ],
  faq: [
    toneField,
    eyebrow,
    { kind: 'text', key: 'title', label: 'Título', max: 100 },
    subtitle,
    {
      kind: 'list', key: 'items', label: 'Perguntas', itemLabel: 'Pergunta', min: 1, max: 12,
      fields: [
        { kind: 'text', key: 'question', label: 'Pergunta', max: 160 },
        { kind: 'textarea', key: 'answer', label: 'Resposta', max: 800, rows: 3 },
      ],
      create: () => ({ question: 'Nova pergunta?', answer: 'Escreva a resposta.' }),
    },
  ],
  cta: [
    { kind: 'text', key: 'title', label: 'Título', max: 100 },
    subtitle,
    { kind: 'link', key: 'primary', label: 'Botão principal' },
    { kind: 'link', key: 'secondary', label: 'Botão secundário', optional: true },
  ],
  contact: [
    toneField,
    eyebrow,
    { kind: 'text', key: 'title', label: 'Título', max: 100 },
    subtitle,
    {
      kind: 'list', key: 'channels', label: 'Canais de contato', itemLabel: 'Canal', max: 6,
      fields: [
        {
          kind: 'select', key: 'kind', label: 'Tipo',
          options: [
            { value: 'whatsapp', label: 'WhatsApp' },
            { value: 'email', label: 'E-mail' },
            { value: 'phone', label: 'Telefone' },
            { value: 'address', label: 'Endereço' },
            { value: 'hours', label: 'Horário' },
          ],
        },
        { kind: 'text', key: 'label', label: 'Nome exibido', max: 40 },
        { kind: 'text', key: 'value', label: 'Valor exibido', max: 160 },
        { kind: 'text', key: 'href', label: 'Link (opcional)', max: 300, optional: true, hint: 'Ex.: https://wa.me/5511999999999, mailto:…, tel:…' },
      ],
      create: () => ({ kind: 'email', label: 'E-mail', value: 'contato@empresa.com.br', href: 'mailto:contato@empresa.com.br' }),
    },
    { kind: 'link', key: 'primary', label: 'Botão', optional: true },
  ],
  'image-card': [
    { kind: 'text', key: 'name', label: 'Nome no painel', max: 60 },
    toneField,
    { kind: 'text', key: 'title', label: 'Título', max: 60 },
    { kind: 'text', key: 'subtitle', label: 'Subtítulo (ex.: local)', max: 120, optional: true },
    { kind: 'image', key: 'imageUrl', label: 'Upload da imagem' },
    { kind: 'text', key: 'imageAlt', label: 'Descrição da imagem (acessibilidade)', max: 160, optional: true },
    { kind: 'link', key: 'action', label: 'Botão' },
    { kind: 'link', key: 'corner', label: 'Ícone no canto (link)', optional: true },
  ],
  'interactive-hero': [
    { kind: 'text', key: 'name', label: 'Nome no painel', max: 60 },
    { kind: 'text', key: 'eyebrow', label: 'Selo acima do título', max: 40, optional: true },
    { kind: 'text', key: 'title', label: 'Título (grande, com brilho)', max: 40 },
    { kind: 'text', key: 'subtitle', label: 'Subtítulo', max: 120, optional: true },
    { kind: 'text', key: 'captionLeft', label: 'Legenda inferior esquerda', max: 40, optional: true },
    { kind: 'text', key: 'captionRight', label: 'Legenda inferior direita', max: 40, optional: true },
    { kind: 'image', key: 'plateUrl', label: 'Imagem de fundo (16:9)', hint: 'Ideal 1920×1080. Cobre toda a seção. Sem imagem, aparece um céu escuro com horizonte.' },
    { kind: 'text', key: 'plateAlt', label: 'Descrição da imagem de fundo (acessibilidade)', max: 160, optional: true },
    {
      kind: 'video',
      key: 'clipUrl',
      label: 'Clipe que segue o mouse',
      hint: 'MP4 ou WebM sem som, até 5 MB. O primeiro quadro olha para a esquerda e o último para a direita. O clipe não é reproduzido: a posição do mouse escolhe o quadro.',
    },
    { kind: 'range', key: 'clipX', label: 'Clipe: posição horizontal', min: 0, max: 1440, step: 1, unit: ' px' },
    { kind: 'range', key: 'clipY', label: 'Clipe: posição vertical', min: 0, max: 810, step: 1, unit: ' px' },
    { kind: 'range', key: 'clipW', label: 'Clipe: largura', min: 50, max: 1440, step: 1, unit: ' px' },
    { kind: 'range', key: 'clipH', label: 'Clipe: altura', min: 50, max: 810, step: 1, unit: ' px' },
    { kind: 'image', key: 'overlayUrl', label: 'Imagem do botão (ex.: capacete)', hint: 'Sobre fundo preto: o preto fica transparente. Sem imagem, o botão não aparece.' },
    { kind: 'range', key: 'overlayX', label: 'Sobreposição: posição horizontal', min: 0, max: 1440, step: 1, unit: ' px' },
    { kind: 'range', key: 'overlayY', label: 'Sobreposição: posição vertical', min: 0, max: 810, step: 1, unit: ' px' },
    { kind: 'range', key: 'overlaySize', label: 'Sobreposição: tamanho', min: 50, max: 1000, step: 1, unit: ' px' },
    { kind: 'text', key: 'buttonLabel', label: 'Texto do botão (use / para quebrar a linha)', max: 30 },
    { kind: 'range', key: 'buttonX', label: 'Botão: posição horizontal', min: 0, max: 1440, step: 1, unit: ' px' },
    { kind: 'range', key: 'buttonY', label: 'Botão: posição vertical', min: 0, max: 810, step: 1, unit: ' px' },
    { kind: 'range', key: 'buttonSize', label: 'Botão: tamanho', min: 30, max: 200, step: 1, unit: ' px' },
  ],
  'site-footer': [
    { kind: 'textarea', key: 'description', label: 'Descrição', max: 240, rows: 2 },
    {
      kind: 'list', key: 'columns', label: 'Colunas de links', itemLabel: 'Coluna', max: 3,
      fields: [{ kind: 'text', key: 'title', label: 'Título', max: 40 }, linkList('Links', 8)],
      create: () => ({ title: 'Nova coluna', links: [] }),
    },
    { kind: 'text', key: 'legal', label: 'Texto legal', max: 160 },
  ],
}

/** Nome da seção no painel: o nome dado pelo usuário, ou o rótulo do tipo. */
export function sectionName(section: Section): string {
  return section.name?.trim() || sectionLabels[section.type]
}

/** Resumo exibido na lista de seções (título da seção, quando houver). */
export function sectionSummary(section: Section): string {
  if ('title' in section && typeof section.title === 'string') return section.title
  if (section.type === 'site-header') return `${section.links.length} links no menu`
  if (section.type === 'site-footer') return section.description
  return ''
}
