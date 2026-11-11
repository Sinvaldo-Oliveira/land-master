import { useRef, type ReactNode } from 'react'
import {
  ButtonBlock,
  DividerBlock,
  HeadingBlock,
  ImageBlock,
  ParagraphBlock,
  SectionBlock,
  SpacerBlock,
  type BlockAttrs,
} from './blocks/elements'
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
        <div key={block.id} {...attrs}>
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
      case 'section': {
        const children = (block.children ?? []).map((child) => renderBlock(child, block)).filter((node) => node !== null)
        return (
          <SectionBlock key={block.id} block={block} attrs={attrs}>
            {children.length > 0 ? children : edit?.placeholder(block)}
          </SectionBlock>
        )
      }
      case 'heading':
        return <HeadingBlock key={block.id} block={block} attrs={attrs} />
      case 'paragraph':
        return <ParagraphBlock key={block.id} block={block} attrs={attrs} />
      case 'image':
        return <ImageBlock key={block.id} block={block} attrs={attrs} placeholder={edit?.placeholder(block)} />
      case 'button':
        return <ButtonBlock key={block.id} block={block} attrs={attrs} />
      case 'spacer':
        return <SpacerBlock key={block.id} block={block} attrs={attrs} />
      case 'divider':
        return <DividerBlock key={block.id} block={block} attrs={attrs} />
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
