import { describe, expect, it } from 'vitest'
import { institucionalTemplate } from '@/renderer/templates/institucional'
import { isLightSurface, surfaceColors, worstContrast } from '@/renderer/surface'
import { contrastRatio } from '@/renderer/theme'
import type { Section } from '@/renderer/types'
import { validateDocument } from './document-schema'
import { HIGHLIGHT_ERROR, highlightInTitle, sectionName } from './section-fields'
import {
  addImageSection,
  addInteractiveHeroSection,
  addVideoCarouselSection,
  addVideoPlayerSection,
  backgroundWarnings,
  startBackground,
  startText,
  textWarnings,
  contrastWarnings,
  getBrandName,
  mixHex,
  moveSection,
  setBackgroundColor,
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

describe('nova seção: carrossel de vídeos', () => {
  it('cria "Carrossel de Video 01" antes do rodapé, com 3 vídeos e conteúdo padrão válido', () => {
    const { doc: next, id } = addVideoCarouselSection(doc)
    const index = next.sections.findIndex((x) => x.id === id)
    const created = next.sections[index]!
    expect(next.sections[index + 1]?.type).toBe('site-footer')
    expect(sectionName(created)).toBe('Carrossel de Video 01')
    expect(created.type === 'video-carousel' && created.items).toHaveLength(3)
    expect(validateDocument(next)).toEqual([])
  })

  it('aceita link do YouTube e recusa outros links', () => {
    const { doc: next, id } = addVideoCarouselSection(doc)
    const withVideo = (videoUrl: string) => ({
      ...next,
      sections: next.sections.map((x) =>
        x.id === id && x.type === 'video-carousel' ? { ...x, items: x.items.map((it, i) => (i === 0 ? { ...it, videoUrl } : it)) } : x,
      ),
    })
    expect(validateDocument(withVideo('https://youtu.be/hEJnMQG9ev8'))).toEqual([])
    expect(validateDocument(withVideo('https://vimeo.com/123')).some((i) => i.sectionId === id)).toBe(true)
  })
})

describe('logo do rodapé: validação', () => {
  const footerWith = (patch: Record<string, unknown>) => ({
    ...doc,
    sections: doc.sections.map((s) => (s.type === 'site-footer' ? { ...s, ...patch } : s)),
  })
  it('aceita logo https e altura válida; recusa o resto', () => {
    expect(validateDocument(footerWith({ logoUrl: 'https://x.supabase.co/logo.webp', logoHeight: 40 }))).toEqual([])
    expect(validateDocument(footerWith({ logoHeight: 10 })).some((i) => i.sectionId === 'footer')).toBe(true)
    expect(validateDocument(footerWith({ logoUrl: 'http://x.com/logo.png' })).some((i) => i.sectionId === 'footer')).toBe(true)
  })
})

describe('cor de fundo global', () => {
  const samples = ['#ffffff', '#fdf8f3', '#f1e7d8', '#e8f0ff', '#9d1317', '#313f25', '#0e1a12', '#000000', '#7c7c7c', '#808080', '#6b6b6b', '#5a8f5a', '#2f5bea', '#e11d48', '#facc15', '#0891b2']

  it.each(samples)('com fundo %s, textos e cartões mantêm leitura (AA)', (bg) => {
    const c = setBackgroundColor(doc, bg).theme.colors
    expect(c.background).toBe(bg)
    expect(contrastRatio(c.foreground, c.background)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(c.mutedForeground, c.background)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(c.foreground, c.card)).toBeGreaterThanOrEqual(4.5)
    expect(contrastRatio(c.foreground, c.muted)).toBeGreaterThanOrEqual(4.5)
  })

  it('fundo claro usa texto escuro; fundo escuro usa texto claro', () => {
    expect(setBackgroundColor(doc, '#fdf8f3').theme.colors.foreground).toBe('#0b1324')
    expect(setBackgroundColor(doc, '#0e1a12').theme.colors.foreground).toBe('#f1f5ff')
  })

  it('não mexe nas cores das seções escuras nem nas cores da marca', () => {
    const next = setBackgroundColor(doc, '#0e1a12')
    expect(next.theme.darkColors).toEqual(doc.theme.darkColors)
    expect(next.theme.colors.primary).toBe(doc.theme.colors.primary)
    expect(validateDocument(next)).toEqual([])
  })

  it('mixHex mistura as cores', () => {
    expect(mixHex('#000000', '#ffffff', 0.5)).toBe('#808080')
    expect(mixHex('#123456', '#abcdef', 0)).toBe('#123456')
  })
})

describe('cor de fundo global: varredura do espectro', () => {
  it('nenhuma de 4.096 cores de fundo deixa texto, texto secundário, cartão ou seção suave abaixo de 4,5:1', () => {
    const steps = [...Array(16)].map((_, i) => (i * 17).toString(16).padStart(2, '0'))
    const failures: string[] = []
    for (const r of steps)
      for (const g of steps)
        for (const b of steps) {
          const bg = `#${r}${g}${b}`
          const c = setBackgroundColor(doc, bg).theme.colors
          const worst = Math.min(
            contrastRatio(c.foreground, c.background),
            contrastRatio(c.mutedForeground, c.background),
            contrastRatio(c.foreground, c.card),
            contrastRatio(c.foreground, c.muted),
          )
          if (worst < 4.5) failures.push(`${bg}: ${worst.toFixed(2)}`)
        }
    expect(failures).toEqual([])
  })
})

describe('fundo personalizado da seção', () => {
  const theme = doc.theme
  const hex = (n: number) => n.toString(16).padStart(2, '0')

  it('pares de cores: o texto fica legível em toda a seção OU o painel avisa', () => {
    const steps = [0, 0x33, 0x66, 0x99, 0xcc, 0xff]
    const silent: string[] = []
    for (const r of steps) for (const g of steps) for (const b of steps) {
      for (const shift of [0x33, 0x66]) {
        const stops = ['#' + hex(r) + hex(g) + hex(b), '#' + hex((r + shift) % 256) + hex(g) + hex((b + shift) % 256)]
        const colors = surfaceColors(isLightSurface(stops) ? theme.colors : theme.darkColors, stops)
        const readable = worstContrast(colors.foreground, stops) >= 4.5
        const warned = backgroundWarnings(theme, { type: 'features', background: { mode: 'gradient', colors: stops } }).length > 0
        if (!readable && !warned) silent.push(stops.join('→'))
      }
    }
    expect(silent).toEqual([])
  })

  it('degradê do branco ao preto avisa que o texto não fica legível', () => {
    const warnings = backgroundWarnings(theme, { type: 'features', background: { mode: 'gradient', colors: ['#ffffff', '#000000'] } })
    expect(warnings.join(' ')).toMatch(/nenhuma cor de texto/)
  })

  it('degradê suave e claro não gera aviso', () => {
    expect(backgroundWarnings(theme, { type: 'features', background: { mode: 'gradient', colors: ['#ffffff', '#eef2ff', '#fdf2f8'] } })).toEqual([])
  })

  it('hero interativo (texto branco) avisa com fundo claro', () => {
    expect(backgroundWarnings(theme, { type: 'interactive-hero', background: { mode: 'solid', colors: ['#fef3c7'] } })).toHaveLength(1)
    expect(backgroundWarnings(theme, { type: 'interactive-hero', background: { mode: 'solid', colors: ['#0b1324'] } })).toEqual([])
  })

  it('ao trocar para cor sólida ou degradê, parte do fundo atual do tom', () => {
    expect(startBackground(theme, 'light', 'solid')).toEqual({ mode: 'solid', colors: [theme.colors.background] })
    expect(startBackground(theme, 'dark', 'solid').colors[0]).toBe(theme.darkColors.background)
    const g = startBackground(theme, 'muted', 'gradient')
    expect(g.mode).toBe('gradient')
    expect(g.colors[0]).toBe(theme.colors.muted)
    expect(g.colors).toHaveLength(2)
    // De degradê para sólida mantém a primeira cor; de sólida para degradê mantém a cor escolhida.
    expect(startBackground(theme, 'light', 'solid', { mode: 'gradient', colors: ['#123456', '#abcdef', '#fedcba'] })).toEqual({ mode: 'solid', colors: ['#123456'] })
    expect(startBackground(theme, 'light', 'gradient', { mode: 'solid', colors: ['#123456'] }).colors[0]).toBe('#123456')
  })

  it('validação aceita sólida e degradê de 2 a 3 cores e recusa o resto', () => {
    const withBg = (background: unknown) => ({
      ...doc,
      sections: doc.sections.map((s) => (s.type === 'features' ? ({ ...s, background } as unknown as Section) : s)),
    })
    expect(validateDocument(withBg({ mode: 'solid', colors: ['#fdf8f3'] }))).toEqual([])
    expect(validateDocument(withBg({ mode: 'gradient', colors: ['#ffffff', '#fde68a', '#bae6fd'], direction: 'radial' }))).toEqual([])
    expect(validateDocument(withBg({ mode: 'gradient', colors: ['#ffffff'] })).map((i) => i.message)).toContain('Degradê: escolha pelo menos 2 cores.')
    expect(validateDocument(withBg({ mode: 'gradient', colors: ['#ffffff', 'red'] }))).not.toEqual([])
    expect(validateDocument(withBg({ mode: 'gradient', colors: ['#ffffff', '#000000'], direction: 'evil' }))).not.toEqual([])
  })
})

describe('cores de texto da seção', () => {
  const theme = doc.theme

  it('ao escolher "Personalizada" começa pelas cores automáticas atuais', () => {
    expect(startText(theme, { type: 'features', tone: 'light' })).toEqual({
      foreground: theme.colors.foreground,
      muted: theme.colors.mutedForeground,
      primary: theme.colors.primary,
      accent: theme.colors.accent,
    })
    expect(startText(theme, { type: 'steps', tone: 'dark' }).foreground).toBe(theme.darkColors.foreground)
    expect(startText(theme, { type: 'cta' }).foreground).toBe('#ffffff')
    expect(startText(theme, { type: 'interactive-hero' })).toMatchObject({ foreground: '#ffffff', primary: '#3d6bff' })
    // Com fundo personalizado, parte da paleta calculada para ele
    const bg = { mode: 'solid' as const, colors: ['#111827'] }
    expect(startText(theme, { type: 'features', tone: 'light', background: bg }).foreground).toBe('#f1f5ff')
  })

  it('cores automáticas do modelo não geram aviso', () => {
    for (const section of doc.sections) {
      const like = { ...section, text: startText(theme, section) }
      expect(textWarnings(theme, like), section.type).toEqual([])
    }
  })

  it('avisa quando a cor escolhida some no fundo', () => {
    const warnings = textWarnings(theme, {
      type: 'features',
      tone: 'light',
      text: { foreground: '#eeeeee', muted: '#475569', primary: '#2f5bea', accent: '#0891b2' },
    })
    expect(warnings).toHaveLength(1)
    expect(warnings[0]).toMatch(/^Títulos e texto principal: pouco contraste com o fundo \(1,\d:1; o mínimo recomendado é 4,5:1\)\.$/)
  })

  it('com cores de texto escolhidas, o aviso automático do fundo dá lugar ao do texto', () => {
    const background = { mode: 'gradient' as const, colors: ['#ffffff', '#000000'] }
    expect(backgroundWarnings(theme, { type: 'features', background })).not.toEqual([])
    expect(
      backgroundWarnings(theme, { type: 'features', background, text: { foreground: '#ff0000', muted: '#ff0000', primary: '#ff0000', accent: '#ff0000' } }),
    ).toEqual([])
  })

  it('validação aceita as 4 cores e recusa valor inválido', () => {
    const withText = (text: unknown) => ({
      ...doc,
      sections: doc.sections.map((s) => (s.type === 'faq' ? ({ ...s, text } as unknown as Section) : s)),
    })
    expect(validateDocument(withText({ foreground: '#111111', muted: '#222222', primary: '#333333', accent: '#444444' }))).toEqual([])
    expect(validateDocument(withText({ foreground: '#111111', muted: '#222222', primary: '#333333' }))).not.toEqual([])
    expect(validateDocument(withText({ foreground: 'red', muted: '#222222', primary: '#333333', accent: '#444444' }))).not.toEqual([])
  })
})

describe('nova seção de vídeo de vendas', () => {
  it('cria "PlayVídeo-VSL-01" antes do rodapé, com conteúdo padrão válido', () => {
    const { doc: next, id } = addVideoPlayerSection(doc)
    const index = next.sections.findIndex((x) => x.id === id)
    expect(next.sections[index + 1]?.type).toBe('site-footer')
    expect(sectionName(next.sections[index]!)).toBe('PlayVídeo-VSL-01')
    expect(validateDocument(next)).toEqual([])
  })

  it('recusa link de vídeo que não seja https', () => {
    const { doc: next, id } = addVideoPlayerSection(doc)
    const bad = {
      ...next,
      sections: next.sections.map((s) => (s.id === id ? ({ ...s, externalUrl: 'http://inseguro.com/v.mp4' } as Section) : s)),
    }
    expect(validateDocument(bad).map((i) => i.sectionId)).toContain(id)
  })
})
