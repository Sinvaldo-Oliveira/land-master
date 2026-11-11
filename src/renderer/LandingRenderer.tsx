import { useRef, type ReactNode } from 'react'
import {
  ButtonBlock,
  BadgeBlock,
  BenefitListBlock,
  ColumnBlock,
  ColumnsBlock,
  DividerBlock,
  HeadingBlock,
  ImageBlock,
  IconBlock,
  GridBlock,
  ListBlock,
  ParagraphBlock,
  SectionBlock,
  SpacerBlock,
  VideoBlock,
  WhatsappButtonBlock,
} from './blocks/elements'
import { imageUrl } from './blocks/image-url'
import { styledBlockAttrs, type BlockAttrs } from './block-style'
import { SiteThemeContext } from './context'
import { blockToSection, canInsert, isBlockType, isSectionBlockType, type Block, type LandingDocument } from './document-v2'
import { SectionView } from './PageRenderer'
import { SiteFooter } from './sections/SiteFooter'
import { SiteHeader } from './sections/SiteHeader'
import { themeVars } from './theme'
import { useReveal } from './useReveal'
import './site.css'

/**
 * Ganchos do editor. O site público não passa nada aqui; o painel usa para marcar a seleção
 * e mostrar um aviso onde um bloco ainda não tem o que desenhar (seção vazia, imagem sem arquivo).
 */
export type LandingEditHooks = {
  attrs: (block: Block) => BlockAttrs
  placeholder: (block: Block) => ReactNode
}

const NO_ATTRS: BlockAttrs = {}

const DEVICES = ['desktop', 'tablet', 'mobile'] as const
type Device = (typeof DEVICES)[number]

function hiddenOn(block: Block): Device[] {
  const list = block.responsive?.hideOn ?? []
  return DEVICES.filter((device) => list.includes(device))
}

/**
 * Um contêiner cujos filhos visíveis estão TODOS ocultos em um dispositivo também se oculta nele:
 * senão sobraria, naquele dispositivo, uma faixa vazia do tamanho do espaçamento do contêiner.
 */
function withInheritedHiding(block: Block, children: readonly Block[]): Block {
  const inherited = DEVICES.filter((device) => children.every((child) => hiddenOn(child).includes(device)))
  const own = hiddenOn(block)
  const hideOn = DEVICES.filter((device) => own.includes(device) || inherited.includes(device))
  if (hideOn.length === own.length) return block
  return { ...block, responsive: { ...block.responsive, hideOn } }
}

/**
 * Desenha um LandingDocument (v2). É o MESMO código no canvas do editor e no site público.
 * Módulo do site: NUNCA importe nada de src/admin ou src/modules aqui (verificado pelo check:bundle).
 */
export function LandingRenderer({
  document: doc,
  preview = false,
  edit,
}: {
  document: LandingDocument
  /** Painel: sem animação de entrada. */
  preview?: boolean
  edit?: LandingEditHooks
}) {
  const rootRef = useRef<HTMLDivElement>(null)
  useReveal(rootRef, !preview && doc.theme.motion !== 'none')

  const header = doc.blocks.find((block) => block.type === 'site-header')
  const brand = header?.props.brand
  const brandName = typeof brand === 'object' && brand !== null && typeof (brand as { name?: unknown }).name === 'string' ? (brand as { name: string }).name : ''

  const renderBlock = (block: Block, parent: Block | null): ReactNode => {
    // Tipo desconhecido ou fora do lugar (documento de versão futura ou corrompido): ignora, nunca quebra a página.
    if (!isBlockType(block.type) || !canInsert(parent?.type ?? null, block.type)) return null
    const attrs = edit ? edit.attrs(block) : NO_ATTRS

    if (isSectionBlockType(block.type)) {
      const section = blockToSection(block)
      if (!section || (section.hidden && !edit)) return null
      return (
        <div key={block.id} {...styledBlockAttrs(block, attrs)}>
          {section.type === 'site-header' ? (
            <SiteHeader section={section} />
          ) : section.type === 'site-footer' ? (
            <SiteFooter section={section} />
          ) : (
            <SectionView section={section} brandName={brandName} />
          )}
        </div>
      )
    }

    switch (block.type) {
      case 'section':
      case 'columns':
      case 'grid':
      case 'column': {
        const rendered = (block.children ?? []).flatMap((child) => {
          const node = renderBlock(child, block)
          return node === null ? [] : [{ child, node }]
        })
        // Site público: contêiner sem nada visível não aparece. Sem isso, uma seção vazia (ou só com
        // imagem/vídeo ainda não enviados) vira uma faixa em branco do tamanho do espaçamento dela.
        // No editor ela continua, com o aviso, para a pessoa poder selecionar e preencher.
        if (!edit && rendered.length === 0) return null
        const shown = edit ? block : withInheritedHiding(block, rendered.map(({ child }) => child))
        const props = { block: shown, attrs, children: rendered.length > 0 ? rendered.map(({ node }) => node) : edit?.placeholder(block) }
        if (block.type === 'section') return <SectionBlock key={block.id} {...props} />
        return block.type === 'columns' ? <ColumnsBlock key={block.id} {...props} /> : block.type === 'grid' ? <GridBlock key={block.id} {...props} /> : <ColumnBlock key={block.id} {...props} />
      }
      case 'heading':
        return <HeadingBlock key={block.id} block={block} attrs={attrs} />
      case 'paragraph':
        return <ParagraphBlock key={block.id} block={block} attrs={attrs} />
      case 'image':
        // Sem arquivo, o site não desenha nada (e o contêiner não conta este bloco como conteúdo).
        if (!edit && !imageUrl(block.props.url)) return null
        return <ImageBlock key={block.id} block={block} attrs={attrs} placeholder={edit?.placeholder(block)} />
      case 'button':
        return <ButtonBlock key={block.id} block={block} attrs={attrs} />
      case 'spacer':
        return <SpacerBlock key={block.id} block={block} attrs={attrs} />
      case 'divider':
        return <DividerBlock key={block.id} block={block} attrs={attrs} />
      case 'list':
        return <ListBlock key={block.id} block={block} attrs={attrs} />
      case 'badge':
        return <BadgeBlock key={block.id} block={block} attrs={attrs} />
      case 'icon':
        return <IconBlock key={block.id} block={block} attrs={attrs} />
      case 'video':
        if (!edit && !imageUrl(block.props.url)) return null
        return <VideoBlock key={block.id} block={block} attrs={attrs} placeholder={edit?.placeholder(block)} />
      case 'whatsapp-button':
        return <WhatsappButtonBlock key={block.id} block={block} attrs={attrs} />
      case 'benefit-list':
        return <BenefitListBlock key={block.id} block={block} attrs={attrs} />
      default:
        return null
    }
  }

  return (
    <SiteThemeContext.Provider value={doc.theme}>
      <div ref={rootRef} className="site-root min-h-dvh overflow-x-clip" style={themeVars(doc.theme)}>
        <main id="conteudo" tabIndex={-1} className="outline-none">
          {doc.blocks.map((block) => renderBlock(block, null))}
        </main>
      </div>
    </SiteThemeContext.Provider>
  )
}
