import { describe, expect, it } from 'vitest'
import { institucionalTemplate } from '@/renderer/templates/institucional'
import { validateDocument } from './document-schema'
import {
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

  it('aponta a seção com problema na validação', () => {
    const broken = {
      ...doc,
      sections: doc.sections.map((s) => (s.type === 'hero' ? { ...s, title: '' } : s)),
    }
    const issues = validateDocument(broken)
    expect(issues).toContainEqual({ sectionId: 'hero', message: 'Título: preencha este campo.' })
  })
})
