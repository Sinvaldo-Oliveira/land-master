import { render, screen, within } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { canInsert, createEmptyLanding, migrateDocument, type Block, type LandingDocument } from './document-v2'
import { LandingRenderer } from './LandingRenderer'
import { horizonteTheme, institucionalTemplate } from './templates/institucional'

const el = (id: string, type: Block['type'], props: Record<string, unknown>, children?: Block[]): Block => ({
  id, type, v: 1, props, ...(children ? { children } : {}),
})
const page = (...blocks: Block[]): LandingDocument => ({ ...createEmptyLanding('Teste', horizonteTheme), blocks })
const section = (...children: Block[]) => el('s1', 'section', { tone: 'light', width: 'normal', align: 'center' }, children)

describe('canInsert', () => {
  it('raiz aceita seções; seção aceita elementos; folhas não aceitam nada', () => {
    expect(canInsert(null, 'hero')).toBe(true)
    expect(canInsert(null, 'section')).toBe(true)
    expect(canInsert(null, 'heading')).toBe(false)
    expect(canInsert('section', 'heading')).toBe(true)
    expect(canInsert('section', 'button')).toBe(true)
    expect(canInsert('section', 'section')).toBe(false)
    expect(canInsert('section', 'faq')).toBe(false)
    expect(canInsert('heading', 'paragraph')).toBe(false)
    expect(canInsert('faq', 'heading')).toBe(false)
  })

  it('colunas e grade aceitam colunas; colunas aceitam elementos', () => {
    expect(canInsert('section', 'columns' as never)).toBe(true)
    expect(canInsert('columns' as never, 'column' as never)).toBe(true)
    expect(canInsert('grid' as never, 'column' as never)).toBe(true)
    expect(canInsert('column' as never, 'heading')).toBe(true)
    expect(canInsert('columns' as never, 'heading')).toBe(false)
  })
})

describe('LandingRenderer', () => {
  it('desenha os elementos de uma seção na ordem do documento', () => {
    const { container } = render(
      <LandingRenderer
        preview
        document={page(
          section(
            el('t', 'heading', { text: 'Oferta de verão', level: 'h1' }),
            el('p', 'paragraph', { text: 'Linha 1\nLinha 2', size: 'lg' }),
            el('b', 'button', { link: { label: 'Quero', href: 'https://exemplo.test/comprar' }, variant: 'primary' }),
            el('d', 'divider', {}),
            el('e', 'spacer', { size: 'lg' }),
          ),
        )}
      />,
    )
    expect(screen.getByRole('heading', { level: 1, name: 'Oferta de verão' })).toBeInTheDocument()
    expect(screen.getByText(/Linha 1/)).toHaveClass('whitespace-pre-line')
    expect(screen.getByRole('link', { name: /Quero/ })).toHaveAttribute('href', 'https://exemplo.test/comprar')
    expect(container.querySelector('hr')).not.toBeNull()
    expect(container.querySelector('section')).not.toBeNull()
  })

  it('nível de título fora da lista vira h2 (nunca uma tag vinda do documento)', () => {
    const { container } = render(<LandingRenderer preview document={page(section(el('t', 'heading', { text: 'X', level: 'script' })))} />)
    expect(container.querySelector('script')).toBeNull()
    expect(screen.getByRole('heading', { level: 2, name: 'X' })).toBeInTheDocument()
  })

  it('link perigoso do botão é neutralizado', () => {
    render(<LandingRenderer preview document={page(section(el('b', 'button', { link: { label: 'Clique', href: 'javascript:alert(1)' }, variant: 'primary' })))} />)
    expect(screen.getByRole('link', { name: 'Clique' })).toHaveAttribute('href', '#')
  })

  it('imagem só com endereço https; sem endereço, o site não desenha nada', () => {
    const { container } = render(
      <LandingRenderer
        preview
        document={page(
          section(
            el('ok', 'image', { url: 'https://exemplo.test/foto.webp', alt: 'Fachada' }),
            el('http', 'image', { url: 'http://exemplo.test/foto.webp', alt: 'Insegura' }),
            el('js', 'image', { url: 'javascript:alert(1)', alt: 'Script' }),
            el('vazia', 'image', { url: '', alt: '' }),
          ),
        )}
      />,
    )
    expect(container.querySelectorAll('img')).toHaveLength(1)
    expect(screen.getByRole('img', { name: 'Fachada' })).toHaveAttribute('src', 'https://exemplo.test/foto.webp')
  })

  it('texto com marcação é mostrado como texto, não como HTML', () => {
    const { container } = render(<LandingRenderer preview document={page(section(el('p', 'paragraph', { text: '<img src=x onerror=alert(1)>', size: 'md' })))} />)
    expect(container.querySelector('img')).toBeNull()
    expect(screen.getByText('<img src=x onerror=alert(1)>')).toBeInTheDocument()
  })

  it('aplica estilo e responsividade somente por variáveis internas validadas', () => {
    const heading = el('t', 'heading', { text: 'Com estilo', level: 'h2' })
    heading.style = { color: '#112233', paddingY: 24, textAlign: 'right' }
    heading.responsive = { mobile: { paddingY: 8, textAlign: 'center' }, hideOn: ['tablet'] }
    render(<LandingRenderer preview document={page(section(heading))} />)
    const node = screen.getByRole('heading', { name: 'Com estilo' })
    expect(node).toHaveClass('lb-styled')
    expect(node).toHaveClass('lb-color', 'lb-padding-y', 'lb-text-align', 'lb-mobile-padding-y', 'lb-mobile-text-align')
    expect(node).not.toHaveClass('lb-font-weight', 'lb-background')
    expect(node.getAttribute('style')).toContain('--lb-color: #112233')
    expect(node.getAttribute('style')).toContain('--lb-mobile-padding-y: 8')
    expect(node).toHaveAttribute('data-hide-on', 'tablet')
  })

  it('desenha os blocos de estrutura, mídia e conversão da Etapa 4', () => {
    const columns = el('cols', 'columns' as never, { proportions: '1-1', stackOnMobile: 'stack' }, [
      el('col1', 'column' as never, {}, [el('badge', 'badge' as never, { text: 'Novo', tone: 'primary' })]),
      el('col2', 'column' as never, {}, [el('benefits', 'benefit-list' as never, { items: ['Entrega rápida', 'Suporte humano'] })]),
    ])
    const grid = el('grid', 'grid' as never, { columns: 2 }, [el('col3', 'column' as never, {}, [el('list', 'list' as never, { items: ['Um', 'Dois'], ordered: 'numbers' })])])
    render(<LandingRenderer preview document={page(section(columns, grid, el('wa', 'whatsapp-button' as never, { label: 'Conversar', phone: '5511999999999', message: 'Olá' })))} />)
    expect(screen.getByText('Novo')).toBeInTheDocument()
    expect(screen.getByText('Entrega rápida')).toBeInTheDocument()
    expect(screen.getByText('Um').closest('ol')).not.toBeNull()
    expect(screen.getByRole('link', { name: /Conversar/ })).toHaveAttribute('href', 'https://wa.me/5511999999999?text=Ol%C3%A1')
  })

  it('ignora bloco desconhecido, elemento solto na raiz e seção dentro de seção, sem quebrar a página', () => {
    const { container } = render(
      <LandingRenderer
        preview
        document={page(
          el('x', 'carrossel-3d' as never, {}),
          el('solto', 'heading', { text: 'Solto na raiz', level: 'h2' }),
          section(el('dentro', 'section', { tone: 'light', width: 'normal', align: 'center' }, [el('t2', 'heading', { text: 'Aninhado', level: 'h2' })]), el('t', 'heading', { text: 'Válido', level: 'h2' })),
        )}
      />,
    )
    expect(screen.queryByText('Solto na raiz')).toBeNull()
    expect(screen.queryByText('Aninhado')).toBeNull()
    expect(screen.getByRole('heading', { name: 'Válido' })).toBeInTheDocument()
    expect(container.querySelectorAll('section')).toHaveLength(1)
  })

  it('desenha as seções completas da Home migradas para v2', () => {
    const doc = migrateDocument(institucionalTemplate) as LandingDocument
    render(<LandingRenderer preview document={doc} />)
    const hero = institucionalTemplate.sections.find((s) => s.type === 'hero')
    expect(hero?.type === 'hero' && screen.getByRole('heading', { level: 1 })).toBeTruthy()
    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
  })

  it('seção completa oculta não aparece no site, mas aparece no editor', () => {
    const doc = migrateDocument(institucionalTemplate) as LandingDocument
    const hidden: LandingDocument = { ...doc, blocks: doc.blocks.map((b) => (b.type === 'faq' ? { ...b, props: { ...b.props, hidden: true } } : b)) }
    const faqId = hidden.blocks.find((b) => b.type === 'faq')?.id as string

    const site = render(<LandingRenderer preview document={hidden} />)
    const sectionsOnSite = site.container.querySelectorAll('section').length
    site.unmount()

    const editor = render(<LandingRenderer preview document={hidden} edit={{ attrs: (b) => ({ 'data-block-id': b.id }), placeholder: () => null }} />)
    expect(editor.container.querySelector(`[data-block-id="${faqId}"]`)).not.toBeNull()
    expect(editor.container.querySelectorAll('section').length).toBe(sectionsOnSite + 1)
  })

  it('modo de edição: marca cada bloco, mostra os avisos de vazio e entrega o clique ao editor', () => {
    const onClick = vi.fn()
    const { container } = render(
      <LandingRenderer
        preview
        document={page(section(el('t', 'heading', { text: 'Título', level: 'h2' }), el('img', 'image', { url: '', alt: '' })), el('s2', 'section', { tone: 'muted', width: 'narrow', align: 'left' }, []))}
        edit={{
          attrs: (block) => ({ 'data-block-id': block.id, onClick: () => onClick(block.id) }),
          placeholder: (block) => <span>vazio:{block.type}</span>,
        }}
      />,
    )
    expect([...container.querySelectorAll('[data-block-id]')].map((node) => node.getAttribute('data-block-id'))).toEqual(['s1', 't', 'img', 's2'])
    expect(screen.getByText('vazio:image')).toBeInTheDocument()
    expect(within(container.querySelector('[data-block-id="s2"]') as HTMLElement).getByText('vazio:section')).toBeInTheDocument()

    screen.getByRole('heading', { name: 'Título' }).click()
    expect(onClick).toHaveBeenCalledWith('t')
  })

  it('sem o modo de edição não há marcação de bloco no HTML', () => {
    const { container } = render(<LandingRenderer preview document={page(section(el('t', 'heading', { text: 'Título', level: 'h2' })))} />)
    expect(container.querySelector('[data-block-id]')).toBeNull()
  })
})

describe('LandingRenderer: contêineres sem conteúdo visível (faixa em branco no site)', () => {
  const sectionWith = (id: string, children: Block[], props: Record<string, unknown> = {}) =>
    el(id, 'section', { tone: 'light', width: 'normal', align: 'center', ...props }, children)
  const heading = (id: string, text: string, responsive?: Block['responsive']) => ({
    ...el(id, 'heading', { text, level: 'h2' }),
    ...(responsive ? { responsive } : {}),
  })

  it('seção vazia no topo não deixa espaço em branco antes da próxima seção', () => {
    const { container } = render(
      <LandingRenderer preview document={page(sectionWith('vazia', []), sectionWith('cheia', [heading('t', 'Conteúdo')]))} />,
    )
    expect(container.querySelectorAll('section')).toHaveLength(1)
    expect(container.querySelector('main')?.firstElementChild?.textContent).toBe('Conteúdo')
  })

  it('seção só com imagem ou vídeo ainda não enviados também não aparece', () => {
    const { container } = render(
      <LandingRenderer
        preview
        document={page(
          sectionWith('s-img', [el('img', 'image', { url: '', alt: '' })]),
          sectionWith('s-vid', [el('vid', 'video', { url: '', poster: '', captions: '', label: '' })]),
        )}
      />,
    )
    expect(container.querySelectorAll('section')).toHaveLength(0)
  })

  it('colunas sem nada visível não aparecem, e a seção que só tinha elas também não', () => {
    const columns = el('cols', 'columns', { proportions: '1-1', stackOnMobile: 'stack' }, [el('c1', 'column', {}, []), el('c2', 'column', {}, [])])
    const { container } = render(<LandingRenderer preview document={page(sectionWith('s', [columns]))} />)
    expect(container.querySelector('main')?.childElementCount).toBe(0)
  })

  it('seção cujos elementos estão todos ocultos no computador também se oculta no computador', () => {
    const { container } = render(
      <LandingRenderer
        preview
        document={page(
          sectionWith('so-mobile', [heading('a', 'Só no celular', { hideOn: ['desktop', 'tablet'] }), heading('b', 'Também', { hideOn: ['desktop'] })]),
          sectionWith('misturada', [heading('c', 'Some no PC', { hideOn: ['desktop'] }), heading('d', 'Sempre aparece')]),
        )}
      />,
    )
    const [first, second] = [...container.querySelectorAll('main > *')]
    // Oculta onde TODOS os filhos estão ocultos (computador), visível no tablet porque "Também" aparece lá.
    expect(first?.getAttribute('data-hide-on')).toBe('desktop')
    // Um filho sempre visível: a seção não herda ocultação nenhuma.
    expect(second?.hasAttribute('data-hide-on')).toBe(false)
  })

  it('no editor a seção vazia continua desenhada, com o aviso, para poder ser selecionada', () => {
    const { container } = render(
      <LandingRenderer
        preview
        document={page(sectionWith('vazia', []))}
        edit={{ attrs: (b) => ({ 'data-block-id': b.id }), placeholder: () => <span>aviso de vazio</span> }}
      />,
    )
    expect(container.querySelector('[data-block-id="vazia"]')).not.toBeNull()
    expect(screen.getByText('aviso de vazio')).toBeInTheDocument()
  })
})
