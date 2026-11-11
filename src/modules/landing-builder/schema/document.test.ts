import { describe, expect, it } from 'vitest'
import { createEmptyLanding, MAX_BLOCKS, migrateDocument, type Block, type LandingDocument } from '@/renderer/document-v2'
import { horizonteTheme, institucionalTemplate } from '@/renderer/templates/institucional'
import { parseLandingDocument, validateLandingDocument } from './document'

const empty = () => createEmptyLanding('Página de teste', horizonteTheme)
const fromTemplate = () => structuredClone(migrateDocument(institucionalTemplate)) as LandingDocument
const messages = (value: unknown) => validateLandingDocument(value).map((issue) => issue.message)

describe('validateLandingDocument', () => {
  it('aceita a página em branco (descrição de SEO pode ficar vazia no rascunho)', () => {
    expect(validateLandingDocument(empty())).toEqual([])
  })

  it('aceita o template institucional migrado para v2', () => {
    expect(validateLandingDocument(fromTemplate())).toEqual([])
  })

  it('migra documento v2 antigo sem identidade, estilo ou responsividade', () => {
    const legacy = { ...empty() } as Omit<LandingDocument, 'identity'> & { identity?: LandingDocument['identity'] }
    delete legacy.identity
    const migrated = migrateDocument(legacy)
    expect(migrated?.identity).toEqual({ name: 'Sua Empresa', logoUrl: '', faviconUrl: '', whatsapp: '' })
    expect(validateLandingDocument(migrated)).toEqual([])
  })

  it('aceita apenas tokens fechados de estilo e overrides responsivos', () => {
    const heading: Block = { id: 'h1', type: 'heading', v: 1, props: { text: 'Título', level: 'h2' } }
    const doc: LandingDocument = {
      ...empty(),
      blocks: [{ id: 's1', type: 'section', v: 1, props: { tone: 'light', width: 'normal', align: 'center' }, children: [heading] }],
    }
    heading.style = { textSize: 'xl', fontWeight: 'bold', textAlign: 'left', paddingY: 24, radius: 'lg', shadow: 'md' }
    heading.responsive = { mobile: { textSize: 'md', textAlign: 'center', paddingY: 8 }, hideOn: ['tablet'] }
    expect(validateLandingDocument(doc)).toEqual([])

    heading.style = { className: 'fixed inset-0' } as never
    expect(messages(doc)).not.toEqual([])
  })

  it('recusa valores CSS livres nos tokens de estilo', () => {
    const heading: Block = { id: 'h1', type: 'heading', v: 1, props: { text: 'Título', level: 'h2' } }
    const doc: LandingDocument = {
      ...empty(),
      blocks: [{ id: 's1', type: 'section', v: 1, props: { tone: 'light', width: 'normal', align: 'center' }, children: [heading] }],
    }
    heading.style = { paddingY: '999px', color: 'red' } as never
    expect(messages(doc)).not.toEqual([])
  })

  it('recusa documento v1, sem título de SEO ou com tema inválido', () => {
    expect(messages(institucionalTemplate)).not.toEqual([])
    expect(messages({ ...empty(), seo: { title: ' ', description: '' } })).toContain('Título da página (SEO): preencha este campo.')
    const badTheme = { ...empty(), theme: { ...horizonteTheme, colors: { ...horizonteTheme.colors, primary: 'red' } } }
    expect(messages(badTheme)).toContain('Use uma cor no formato #RRGGBB.')
  })

  it('aponta o bloco com conteúdo inválido, usando as regras da seção', () => {
    const doc = fromTemplate()
    const faq = doc.blocks.find((b) => b.type === 'faq') as Block
    faq.props = { ...faq.props, title: '' }
    const issues = validateLandingDocument(doc)
    expect(issues.length).toBeGreaterThan(0)
    expect(issues.every((issue) => issue.blockId === faq.id)).toBe(true)
  })

  it('recusa tipo de bloco fora da lista fechada', () => {
    const doc = { ...empty(), blocks: [{ id: 'b1', type: 'html-livre', v: 1, props: { html: '<script>' } }] }
    expect(validateLandingDocument(doc)).toEqual([{ blockId: 'b1', message: 'Tipo de bloco desconhecido: "html-livre".' }])
  })

  it('recusa bloco malformado', () => {
    expect(messages({ ...empty(), blocks: ['texto'] })).toEqual(['Bloco com formato inválido.'])
    expect(messages({ ...empty(), blocks: [{ type: 'faq', v: 1, props: {} }] })).toEqual(['Bloco com formato inválido.'])
  })

  it('recusa filhos em seção completa (bloco-folha)', () => {
    const doc = fromTemplate()
    const [first, second] = doc.blocks as [Block, Block]
    const nested = { ...doc, blocks: [{ ...first, children: [second] }] }
    expect(messages(nested)).toContain('Este tipo de bloco não aceita blocos dentro dele.')
  })

  it('recusa ids repetidos', () => {
    const doc = fromTemplate()
    const first = doc.blocks[0] as Block
    const issues = validateLandingDocument({ ...doc, blocks: [first, first] })
    expect(issues).toContainEqual({ blockId: first.id, message: 'Dois blocos estão com o mesmo identificador.' })
  })

  it('recusa mais blocos que o limite', () => {
    const doc = fromTemplate()
    const faq = doc.blocks.find((b) => b.type === 'faq') as Block
    const many = Array.from({ length: MAX_BLOCKS + 1 }, (_, i) => ({ ...faq, id: `faq-${i}` }))
    expect(messages({ ...doc, blocks: many })).toContain(`A página passou do limite de ${MAX_BLOCKS} blocos.`)
  })

  it('recusa árvore mais funda que o limite', () => {
    const doc = fromTemplate()
    const faq = doc.blocks.find((b) => b.type === 'faq') as Block
    const nest = (depth: number): Block => ({ ...faq, id: `n${depth}`, ...(depth > 1 ? { children: [nest(depth - 1)] } : {}) })
    expect(messages({ ...doc, blocks: [nest(5)] })).toContain('A página passou do limite de 4 níveis de blocos.')
  })
})

describe('blocos primitivos', () => {
  const section = (...children: unknown[]) => ({ id: 's1', type: 'section', v: 1, props: { tone: 'light', width: 'normal', align: 'center' }, children })
  const el = (type: string, props: Record<string, unknown>, id = type) => ({ id, type, v: 1, props })
  const withBlocks = (...blocks: unknown[]) => ({ ...empty(), blocks })

  it('aceita uma seção com todos os elementos', () => {
    const doc = withBlocks(
      section(
        el('heading', { text: 'Título', level: 'h1' }),
        el('paragraph', { text: 'Texto', size: 'md' }),
        el('image', { url: 'https://exemplo.test/a.webp', alt: 'Foto' }),
        el('image', { url: '', alt: '' }, 'image-vazia'),
        el('button', { link: { label: 'Comprar', href: '#oferta' }, variant: 'secondary' }),
        el('spacer', { size: 'xl' }),
        el('divider', {}),
      ),
    )
    expect(validateLandingDocument(doc)).toEqual([])
  })

  it('aceita fundo e cores de texto personalizados na seção', () => {
    const custom = {
      id: 's1', type: 'section', v: 1,
      props: {
        tone: 'dark', width: 'wide', align: 'left', anchor: 'oferta',
        background: { mode: 'gradient', colors: ['#112233', '#445566'], direction: 'to-right' },
        text: { foreground: '#ffffff', muted: '#cccccc', primary: '#ffcc00', accent: '#00ccff' },
      },
    }
    expect(validateLandingDocument(withBlocks(custom))).toEqual([])
  })

  it.each([
    ['título vazio', el('heading', { text: '  ', level: 'h2' }), 'Título: preencha o texto.'],
    ['nível de título fora da lista', el('heading', { text: 'X', level: 'h7' }), null],
    ['parágrafo vazio', el('paragraph', { text: '', size: 'md' }), 'Parágrafo: preencha o texto.'],
    ['imagem http', el('image', { url: 'http://exemplo.test/a.png', alt: '' }), 'Imagem: use um endereço que comece com https://.'],
    ['imagem javascript:', el('image', { url: 'javascript:alert(1)', alt: '' }), 'Imagem: use um endereço que comece com https://.'],
    ['botão sem texto', el('button', { link: { label: '', href: '#' }, variant: 'primary' }), 'Botão: preencha o texto.'],
    ['botão com link perigoso', el('button', { link: { label: 'Ir', href: 'javascript:alert(1)' }, variant: 'primary' }), 'Link inválido. Use #secao, /pagina, https://, mailto: ou tel:.'],
    ['espaçador com tamanho livre', el('spacer', { size: '300px' }), null],
    ['chave desconhecida (classe CSS vinda do documento)', el('heading', { text: 'X', level: 'h2', className: 'fixed inset-0' }), null],
    ['HTML livre no divisor', el('divider', { html: '<script>' }), null],
  ])('recusa %s', (_label, block, expected) => {
    const issues = validateLandingDocument(withBlocks(section(block)))
    expect(issues.length).toBeGreaterThan(0)
    expect(issues.every((issue) => issue.blockId === block.id)).toBe(true)
    if (expected) expect(issues.map((issue) => issue.message)).toContain(expected)
  })

  it('recusa âncora e cor inválidas na seção', () => {
    const bad = { id: 's1', type: 'section', v: 1, props: { tone: 'light', width: 'normal', align: 'center', anchor: 'Com Espaço', background: { mode: 'solid', colors: ['red'] } } }
    const found = messages(withBlocks(bad))
    expect(found).toContain('Âncora: use letras minúsculas, números e hífen.')
    expect(found).toContain('Use uma cor no formato #RRGGBB.')
  })

  it('recusa elemento solto na raiz e seção dentro de seção', () => {
    expect(messages(withBlocks(el('heading', { text: 'X', level: 'h2' })))).toEqual(['Este bloco precisa ficar dentro de uma seção.'])
    const nested = section({ id: 's2', type: 'section', v: 1, props: { tone: 'light', width: 'normal', align: 'center' } })
    expect(messages(withBlocks(nested))).toEqual(['Este bloco não pode ficar dentro do bloco atual.'])
  })

  it('recusa seção completa dentro de uma seção contêiner', () => {
    const faq = fromTemplate().blocks.find((b) => b.type === 'faq') as Block
    expect(messages(withBlocks(section(faq)))).toContain('Este bloco não pode ficar dentro do bloco atual.')
  })
})

describe('parseLandingDocument', () => {
  it('migra um documento v1 e o valida', () => {
    const result = parseLandingDocument(institucionalTemplate)
    expect(result.document?.schemaVersion).toBe(2)
    expect(result.issues).toEqual([])
  })

  it('não abre versão desconhecida', () => {
    const result = parseLandingDocument({ schemaVersion: 9 })
    expect(result.document).toBeNull()
    expect(result.issues).toHaveLength(1)
  })
})
