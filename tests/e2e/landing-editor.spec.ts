import { expect, test, type Page } from '@playwright/test'
import { fakeLandingBackend, type Row } from './fake-landing-backend'
import { signInAs } from './fake-supabase'

/*
 * Editor visual de landing pages (/admin/paginas/:id) contra o backend falso em memória.
 * Cobre o critério da Etapa 2: montar uma página com blocos, editar textos, salvar,
 * recarregar e continuar de onde parou.
 */

const theme = {
  preset: 'horizonte',
  colors: {
    background: '#ffffff', foreground: '#0b1324', primary: '#1d4ed8', primaryForeground: '#ffffff', accent: '#0ea5e9',
    accentForeground: '#ffffff', muted: '#f1f5f9', mutedForeground: '#475569', card: '#ffffff', border: '#e2e8f0', ring: '#1d4ed8',
  },
  darkColors: {
    background: '#0b1324', foreground: '#f8fafc', primary: '#60a5fa', primaryForeground: '#0b1324', accent: '#38bdf8',
    accentForeground: '#0b1324', muted: '#111c33', mutedForeground: '#cbd5e1', card: '#111c33', border: '#1e293b', ring: '#60a5fa',
  },
  fonts: { heading: 'sora', body: 'plus-jakarta-sans' },
  radius: 'lg',
  motion: 'subtle',
}

const emptyDoc = () => ({ schemaVersion: 2, seo: { title: 'Black Friday', description: '' }, theme, blocks: [] as unknown[] })

async function open(page: Page, row: Partial<Row> = {}) {
  await signInAs(page, 'admin')
  const backend = await fakeLandingBackend(page, 'admin', [{ id: 'lp-1', title: 'Black Friday', slug: 'black-friday', draft_document: emptyDoc(), ...row }])
  await page.goto('/admin/paginas/lp-1')
  await expect(page.getByRole('heading', { level: 1, name: 'Black Friday' })).toBeVisible()
  return backend
}

const canvas = (page: Page) => page.frameLocator('iframe[title="Pré-visualização do site"]')
const add = (page: Page, label: string) => page.getByRole('button', { name: `Adicionar ${label}`, exact: true }).click()
const props = (page: Page) => page.getByRole('complementary', { name: 'Propriedades' })
const layers = (page: Page) => page.getByRole('navigation', { name: 'Camadas da página' })
const saveButton = (page: Page) => page.getByRole('button', { name: 'Salvar rascunho' })
const savedDoc = (backend: { rows: Row[] }) => backend.rows[0]?.draft_document as { blocks: { type: string; props: Record<string, unknown>; children?: { type: string; props: Record<string, unknown> }[] }[] }

test('monta uma página com 5 blocos, edita os textos, salva, recarrega e continua de onde parou', async ({ page }) => {
  const backend = await open(page)

  await expect(canvas(page).getByText('Página em branco.')).toBeVisible()
  await expect(saveButton(page)).toBeDisabled()
  await expect(page.getByText('Tudo salvo')).toBeVisible()

  // 1. Título: sem seção na página, o editor cria uma para recebê-lo.
  await add(page, 'Título')
  await expect(canvas(page).getByRole('heading', { name: 'Escreva o título aqui' })).toBeVisible()
  await expect(page.getByText('Alterações não salvas')).toBeVisible()
  await props(page).getByLabel('Texto').fill('Black Friday: 50% de desconto')
  await expect(canvas(page).getByRole('heading', { level: 2, name: 'Black Friday: 50% de desconto' })).toBeVisible()
  await props(page).getByRole('combobox', { name: 'Tamanho' }).click()
  await page.getByRole('option', { name: 'Principal (H1)' }).click()
  await expect(canvas(page).getByRole('heading', { level: 1, name: 'Black Friday: 50% de desconto' })).toBeVisible()

  // 2. Parágrafo: entra logo depois do bloco selecionado, na mesma seção.
  await add(page, 'Parágrafo')
  await props(page).getByLabel('Texto').fill('Só neste fim de semana.')
  await expect(canvas(page).getByText('Só neste fim de semana.')).toBeVisible()

  // 3. Botão
  await add(page, 'Botão')
  await props(page).getByLabel('Texto do botão').fill('Garantir desconto')
  await props(page).getByLabel('Destino').fill('https://exemplo.test/comprar')
  await expect(canvas(page).getByRole('link', { name: /Garantir desconto/ })).toHaveAttribute('href', 'https://exemplo.test/comprar')

  // 4. Divisor e 5. seção pronta de perguntas frequentes
  await add(page, 'Divisor')
  await add(page, 'Perguntas frequentes')
  await props(page).getByRole('textbox', { name: /^Título/ }).fill('Dúvidas sobre a promoção')
  await expect(canvas(page).getByRole('heading', { name: 'Dúvidas sobre a promoção' })).toBeVisible()

  // Camadas mostram a estrutura.
  await page.getByRole('tab', { name: 'Camadas' }).click()
  await expect(layers(page).getByRole('listitem')).toHaveCount(6) // seção + 4 elementos + FAQ
  await expect(layers(page)).toContainText('4 elementos')

  await saveButton(page).click()
  await expect(page.getByText('Rascunho salvo.')).toBeVisible()
  await expect(page.getByText('Tudo salvo')).toBeVisible()
  await expect(saveButton(page)).toBeDisabled()

  const doc = savedDoc(backend)
  expect(doc.blocks.map((b) => b.type)).toEqual(['section', 'faq'])
  expect(doc.blocks[0]?.children?.map((b) => b.type)).toEqual(['heading', 'paragraph', 'button', 'divider'])
  expect(doc.blocks[0]?.children?.[0]?.props).toEqual({ text: 'Black Friday: 50% de desconto', level: 'h1' })

  // Recarrega: o conteúdo salvo volta e dá para continuar.
  await page.reload()
  await expect(canvas(page).getByRole('heading', { level: 1, name: 'Black Friday: 50% de desconto' })).toBeVisible()
  await expect(canvas(page).getByRole('heading', { name: 'Dúvidas sobre a promoção' })).toBeVisible()
  await canvas(page).getByText('Só neste fim de semana.').click()
  await props(page).getByLabel('Texto').fill('Só até domingo.')
  await saveButton(page).click()
  await expect(page.getByText('Rascunho salvo.')).toBeVisible()
  expect(savedDoc(backend).blocks[0]?.children?.[1]?.props).toMatchObject({ text: 'Só até domingo.' })
})

test('clicar no canvas seleciona o bloco mais interno e não segue os links da página', async ({ page }) => {
  await open(page)
  await add(page, 'Botão')
  await props(page).getByLabel('Destino').fill('https://exemplo.test/sair')
  await add(page, 'Título')

  // Clicar no botão da página seleciona o bloco (e a navegação é bloqueada).
  await canvas(page).getByRole('link', { name: /Quero saber mais/ }).click()
  await expect(page).toHaveURL(/\/admin\/paginas\/lp-1$/)
  await expect(props(page).getByRole('heading', { name: 'Botão' })).toBeVisible()
  await expect(canvas(page).locator('[data-selected="true"]')).toHaveCount(1)

  await canvas(page).getByRole('heading', { name: 'Escreva o título aqui' }).click()
  await expect(props(page).getByRole('heading', { name: 'Título' })).toBeVisible()

  // Pelas camadas: seleciona a seção e volta para a página.
  await page.getByRole('tab', { name: 'Camadas' }).click()
  await layers(page).getByRole('button', { name: /Seção/ }).click()
  await expect(props(page).getByRole('heading', { name: 'Seção' })).toBeVisible()
  await expect(canvas(page).locator('[data-selected="true"]')).toHaveAttribute('data-block-id', /^section-/)
  await layers(page).getByRole('button', { name: 'Página' }).click()
  await expect(props(page).getByLabel('Título da página (SEO)')).toHaveValue('Black Friday')
  await expect(canvas(page).locator('[data-selected="true"]')).toHaveCount(0)
})

test('move, duplica, insere acima e exclui (com desfazer)', async ({ page }) => {
  const backend = await open(page)
  await add(page, 'Título')
  await props(page).getByLabel('Texto').fill('Primeiro')
  await add(page, 'Parágrafo')
  await props(page).getByLabel('Texto').fill('Segundo')

  const order = () => canvas(page).locator('[data-block-id]:not([data-block-id^="section-"])')

  // Sobe o parágrafo para antes do título.
  await expect(props(page).getByRole('button', { name: 'Mover para baixo' })).toBeDisabled()
  await props(page).getByRole('button', { name: 'Mover para cima' }).click()
  await expect(order()).toHaveText(['Segundo', 'Primeiro'])
  await expect(props(page).getByRole('button', { name: 'Mover para cima' })).toBeDisabled()

  // Duplica: a cópia entra logo depois e fica selecionada.
  await props(page).getByRole('button', { name: 'Duplicar' }).click()
  await expect(order()).toHaveText(['Segundo', 'Segundo', 'Primeiro'])
  await props(page).getByLabel('Texto').fill('Cópia')
  await expect(order()).toHaveText(['Segundo', 'Cópia', 'Primeiro'])

  // Inserir acima do bloco selecionado.
  await props(page).getByRole('button', { name: 'Inserir bloco acima' }).click()
  await expect(page.getByRole('status').filter({ hasText: 'Escolha o bloco para inserir acima de “Parágrafo”.' })).toBeVisible()
  await add(page, 'Título')
  await expect(order()).toHaveText(['Segundo', 'Escreva o título aqui', 'Cópia', 'Primeiro'])

  // Excluir é imediato e pode ser desfeito pelo aviso.
  await props(page).getByRole('button', { name: 'Excluir' }).click()
  await expect(order()).toHaveText(['Segundo', 'Cópia', 'Primeiro'])
  await page.getByRole('button', { name: 'Desfazer', exact: true }).click()
  await expect(order()).toHaveText(['Segundo', 'Escreva o título aqui', 'Cópia', 'Primeiro'])
  await canvas(page).getByRole('heading', { name: 'Escreva o título aqui' }).click()
  await props(page).getByRole('button', { name: 'Excluir' }).click()
  await expect(order()).toHaveText(['Segundo', 'Cópia', 'Primeiro'])

  await saveButton(page).click()
  await expect(page.getByText('Rascunho salvo.')).toBeVisible()
  expect(savedDoc(backend).blocks[0]?.children?.map((b) => b.props.text)).toEqual(['Segundo', 'Cópia', 'Primeiro'])
})

test('conteúdo inválido não é salvo: a lista de problemas leva até o bloco', async ({ page }) => {
  const backend = await open(page)
  await add(page, 'Título')
  await add(page, 'Parágrafo')
  await page.getByRole('tab', { name: 'Camadas' }).click()
  await layers(page).getByRole('button', { name: /Título/ }).click()
  await props(page).getByLabel('Texto').fill('')
  await layers(page).getByRole('button', { name: 'Página' }).click()

  await saveButton(page).click()
  const alert = page.getByRole('alert').filter({ hasText: 'Corrija antes de salvar:' })
  await expect(alert).toContainText('Título: preencha o texto.')
  expect(backend.calls.some((call) => call.name === 'save_page_draft')).toBe(false)
  await expect(layers(page).getByText('Há campos a corrigir')).toHaveCount(1)

  await alert.getByRole('button', { name: /Título: preencha o texto/ }).click()
  await props(page).getByLabel('Texto').fill('Agora sim')
  await expect(alert).toHaveCount(0)
  await saveButton(page).click()
  await expect(page.getByText('Rascunho salvo.')).toBeVisible()
})

test('rascunho alterado em outra sessão não é sobrescrito', async ({ page }) => {
  const backend = await open(page)
  await add(page, 'Título')
  // Outra sessão salva enquanto esta edita.
  backend.rows[0]!.draft_updated_at = '2030-01-01T00:00:00.000Z'

  await saveButton(page).click()
  await expect(page.getByText('O rascunho foi alterado em outra sessão.')).toBeVisible()
  await expect(page.getByText('Alterações não salvas')).toBeVisible()
  expect((backend.rows[0]?.draft_document as { blocks: unknown[] }).blocks).toHaveLength(0)
})

test('alterna Computador, Tablet e Celular com a largura real do dispositivo', async ({ page }) => {
  await open(page)
  await add(page, 'Título')
  const width = () => canvas(page).locator('html').evaluate((html) => html.clientWidth)

  // A moldura do canvas tem 1 px de borda de cada lado: 1280, 820 e 390 viram 1278, 818 e 388.
  expect(await width()).toBe(1278)
  await page.getByRole('radio', { name: 'Tablet' }).click()
  await expect.poll(width).toBe(818)
  await page.getByRole('radio', { name: 'Celular' }).click()
  await expect.poll(width).toBe(388)
  // O conteúdo não estoura a largura do celular.
  const overflow = await canvas(page).locator('html').evaluate((html) => html.scrollWidth - html.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
})

test('sair com alterações não salvas pede confirmação', async ({ page }) => {
  await open(page)
  await add(page, 'Título')
  await page.getByRole('link', { name: 'Voltar para as landing pages' }).click()
  const dialog = page.getByRole('dialog', { name: 'Sair sem salvar?' })
  await dialog.getByRole('button', { name: 'Continuar editando' }).click()
  await expect(page).toHaveURL(/\/admin\/paginas\/lp-1$/)

  await page.getByRole('link', { name: 'Voltar para as landing pages' }).click()
  await dialog.getByRole('button', { name: 'Sair e descartar' }).click()
  await expect(page).toHaveURL(/\/admin\/paginas$/)
})

test('abre uma página antiga (v1) migrando para o formato novo, sem perder as seções', async ({ page }) => {
  const v1 = {
    schemaVersion: 1,
    seo: { title: 'Antiga', description: 'Página no formato antigo' },
    theme,
    sections: [
      { id: 'faq-1', type: 'faq', tone: 'light', title: 'Perguntas da página antiga', items: [{ question: 'Funciona?', answer: 'Sim.' }] },
    ],
  }
  await open(page, { draft_document: v1 })
  await expect(canvas(page).getByRole('heading', { name: 'Perguntas da página antiga' })).toBeVisible()
  await expect(page.getByText('Tudo salvo')).toBeVisible()
})

test('página inexistente e documento irreconhecível mostram um aviso, não uma tela quebrada', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeLandingBackend(page, 'admin', [{ id: 'lp-9', title: 'Estranha', slug: 'estranha', draft_document: { schemaVersion: 99 } }])

  await page.goto('/admin/paginas/nao-existe')
  await expect(page.getByRole('heading', { name: 'Página não encontrada' })).toBeVisible()

  await page.goto('/admin/paginas/lp-9')
  await expect(page.getByRole('heading', { name: 'Não foi possível abrir esta página' })).toBeVisible()
})

test('da lista, o botão Editar abre o editor', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeLandingBackend(page, 'admin', [{ id: 'lp-1', title: 'Black Friday', slug: 'black-friday', draft_document: emptyDoc() }])
  await page.goto('/admin/paginas')
  await page.getByRole('link', { name: 'Editar' }).click()
  await expect(page).toHaveURL(/\/admin\/paginas\/lp-1$/)
  await expect(page.getByRole('region', { name: 'Canvas' })).toBeVisible()
})

for (const role of ['manager', 'sales'] as const) {
  test(`perfil ${role} não abre o editor`, async ({ page }) => {
    await signInAs(page, role)
    const backend = await fakeLandingBackend(page, role, [{ id: 'lp-1', title: 'Black Friday', slug: 'black-friday', draft_document: emptyDoc() }])
    await page.goto('/admin/paginas/lp-1')
    await expect(page.getByRole('heading', { name: 'Área restrita ao seu perfil' })).toBeVisible()
    expect(backend.calls).toHaveLength(0)
  })
}
