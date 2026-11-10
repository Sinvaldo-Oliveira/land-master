import { describe, expect, it } from 'vitest'
import { institucionalTemplate } from '@/renderer/templates/institucional'
import { validateDocument } from './document-schema'
import { HIGHLIGHT_ERROR, highlightInTitle, sectionName } from './section-fields'
import {
  addImageSection,
  addInteractiveHeroSection,
  contrastWarnings,
  getBrandName,
  moveSection,
  readableForeground,
  setBrandColor,
  setBrandName,
  toggleHidden,
} from './editor-state'

const doc = institucionalTemplate
const ids = (d: typeof doc) => d.sections.map((s) => s.id)

describe('template Institucional', () => {
  it('passa na validação completa do painel', () => {
    expect(validateDocument(doc)).toEqual([])
  })
})

describe('moveSection', () => {
  it('troca a seção de lugar com a vizinha', () => {
    const moved = moveSection(doc, 'about', -1)
    expect(ids(moved).indexOf('about')).toBe(ids(doc).indexOf('about') - 1)
    expect(doc.sections).not.toBe(moved.sections) // não muta o original
  })

  it('não move cabeçalho/rodapé nem passa por cima deles', () => {
    expect(moveSection(doc, 'header', 1)).toBe(doc)
    expect(moveSection(doc, 'hero', -1)).toBe(doc) // vizinho é o cabeçalho
    expect(moveSection(doc, 'contact', 1)).toBe(doc) // vizinho é o rodapé
  })
})

describe('edição', () => {
  it('oculta e mostra uma seção', () => {
    const hidden = toggleHidden(doc, 'faq')
    expect(hidden.sections.find((s) => s.id === 'faq')?.hidden).toBe(true)
    expect(toggleHidden(hidden, 'faq').sections.find((s) => s.id === 'faq')?.hidden).toBe(false)
  })

  it('troca o nome da empresa no cabeçalho e no rodapé', () => {
    const renamed = setBrandName(doc, 'Clínica Aurora')
    expect(getBrandName(renamed)).toBe('Clínica Aurora')
    const footer = renamed.sections.find((s) => s.type === 'site-footer')
    expect(footer?.type === 'site-footer' && footer.brand.name).toBe('Clínica Aurora')
  })

  it('escolhe automaticamente o texto legível sobre a cor da marca', () => {
    expect(readableForeground('#0b5d1e')).toBe('#ffffff')
    expect(readableForeground('#ffd43b')).toBe('#0b1324')
    const yellow = setBrandColor(doc, 'primary', '#ffd43b')
    expect(yellow.theme.colors.primaryForeground).toBe('#0b1324')
    expect(yellow.theme.colors.ring).toBe('#ffd43b')
  })

  it('avisa quando a cor principal some sobre o fundo branco', () => {
    expect(contrastWarnings(doc)).toEqual([])
    expect(contrastWarnings(setBrandColor(doc, 'primary', '#ffd43b')).length).toBeGreaterThan(0)
  })

  it('trecho em destaque que não está no título bloqueia o salvamento e aponta o campo', () => {
    const wrong = {
      ...doc,
      sections: doc.sections.map((s) =>
        s.type === 'hero' ? { ...s, title: 'Sua melhor versão começa com o', highlight: 'cuidado que você merece.' } : s,
      ),
    }
    expect(validateDocument(wrong)).toContainEqual({
      sectionId: 'hero',
      message: 'Trecho do título em destaque: este trecho não aparece no título.',
    })
    const fixed = {
      ...wrong,
      sections: wrong.sections.map((s) =>
        s.type === 'hero' ? { ...s, title: 'Sua melhor versão começa com o cuidado que você merece.' } : s,
      ),
    }
    expect(validateDocument(fixed)).toEqual([])
  })

  it('campo de destaque acusa o erro enquanto digita', () => {
    const hero = doc.sections.find((s) => s.type === 'hero')!
    expect(highlightInTitle('cuidado que você merece.', { ...hero, title: 'Sua melhor versão começa com o' })).toBe(HIGHLIGHT_ERROR)
    expect(highlightInTitle('', hero)).toBeUndefined()
    expect(highlightInTitle('o seu negócio crescer', hero)).toBeUndefined()
  })

  it('aponta a seção com problema na validação', () => {
    const broken = {
      ...doc,
      sections: doc.sections.map((s) => (s.type === 'hero' ? { ...s, title: '' } : s)),
    }
    const issues = validateDocument(broken)
    expect(issues).toContainEqual({ sectionId: 'hero', message: 'Título: preencha este campo.' })
  })
})

describe('nova seção de imagem', () => {
  it('cria "Imagem Hiro 01" antes do rodapé, com conteúdo padrão válido', () => {
    const { doc: next, id } = addImageSection(doc)
    const index = next.sections.findIndex((x) => x.id === id)
    expect(next.sections[index + 1]?.type).toBe('site-footer')
    expect(sectionName(next.sections[index]!)).toBe('Imagem Hiro 01')
    expect(validateDocument(next)).toEqual([])
  })

  it('recusa imagem que não seja https e aponta a seção', () => {
    const { doc: next, id } = addImageSection(doc)
    const bad = {
      ...next,
      sections: next.sections.map((x) => (x.id === id && x.type === 'image-card' ? { ...x, imageUrl: 'http://exemplo.com/a.jpg' } : x)),
    }
    expect(validateDocument(bad).some((issue) => issue.sectionId === id)).toBe(true)
  })
})

describe('imagem do destaque: validação', () => {
  const heroWith = (patch: Record<string, unknown>) => ({
    ...doc,
    sections: doc.sections.map((s) => (s.type === 'hero' ? { ...s, ...patch } : s)),
  })

  it('aceita tamanho entre 40% e 100% e rejeita fora disso', () => {
    expect(validateDocument(heroWith({ imageSize: 60 }))).toEqual([])
    expect(validateDocument(heroWith({ imageSize: 30 })).some((i) => i.sectionId === 'hero')).toBe(true)
    expect(validateDocument(heroWith({ imageSize: 120 })).some((i) => i.sectionId === 'hero')).toBe(true)
  })

  it('rejeita endereço de imagem que não seja https', () => {
    expect(validateDocument(heroWith({ imageUrl: 'http://x.com/a.jpg' })).some((i) => i.sectionId === 'hero')).toBe(true)
    expect(validateDocument(heroWith({ imageUrl: '' }))).toEqual([])
  })
})

describe('nova seção: hero interativo', () => {
  it('cria "Imagem Hiro 02" antes do rodapé, com conteúdo padrão válido', () => {
    const { doc: next, id } = addInteractiveHeroSection(doc)
    const index = next.sections.findIndex((x) => x.id === id)
    expect(next.sections[index + 1]?.type).toBe('site-footer')
    expect(sectionName(next.sections[index]!)).toBe('Imagem Hiro 02')
    expect(validateDocument(next)).toEqual([])
  })

  it('rejeita posição fora do quadro', () => {
    const { doc: next, id } = addInteractiveHeroSection(doc)
    const bad = {
      ...next,
      sections: next.sections.map((x) => (x.id === id && x.type === 'interactive-hero' ? { ...x, clipX: 2000 } : x)),
    }
    expect(validateDocument(bad).some((issue) => issue.sectionId === id)).toBe(true)
  })
})

describe('imagem da seção Sobre: validação', () => {
  const aboutWith = (patch: Record<string, unknown>) => ({
    ...doc,
    sections: doc.sections.map((s) => (s.type === 'about' ? { ...s, ...patch } : s)),
  })
  it('aceita foto https com ajuste válido e recusa o resto', () => {
    expect(validateDocument(aboutWith({ imageUrl: 'https://x.supabase.co/a.webp', imageFit: 'contain' }))).toEqual([])
    expect(validateDocument(aboutWith({ imageUrl: 'http://x.com/a.webp' })).some((i) => i.sectionId === 'about')).toBe(true)
    expect(validateDocument(aboutWith({ imageFit: 'esticar' })).some((i) => i.sectionId === 'about')).toBe(true)
  })
})

describe('logo do cabeçalho: validação', () => {
  const headerWith = (patch: Record<string, unknown>) => ({
    ...doc,
    sections: doc.sections.map((s) => (s.type === 'site-header' ? { ...s, ...patch } : s)),
  })
  it('aceita logo https e altura entre 24 e 64 px', () => {
    expect(validateDocument(headerWith({ logoUrl: 'https://x.supabase.co/logo.webp', logoHeight: 48 }))).toEqual([])
    expect(validateDocument(headerWith({ logoUrl: '' }))).toEqual([])
  })
  it('recusa altura fora do limite e endereço sem https', () => {
    expect(validateDocument(headerWith({ logoHeight: 100 })).some((i) => i.sectionId === 'header')).toBe(true)
    expect(validateDocument(headerWith({ logoUrl: 'http://x.com/logo.png' })).some((i) => i.sectionId === 'header')).toBe(true)
  })
})
