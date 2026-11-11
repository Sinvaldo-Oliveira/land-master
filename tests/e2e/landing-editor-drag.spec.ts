import { expect, test, type Locator, type Page } from '@playwright/test'
import { fakeLandingBackend, type Row } from './fake-landing-backend'
import { signInAs } from './fake-supabase'

/*
 * Etapa 3 do editor: arrastar e soltar (biblioteca → canvas, camadas, alça do bloco no canvas),
 * atalhos de teclado e desfazer/refazer. Os arrastes usam o MOUSE DE VERDADE do navegador
 * (page.mouse), passando por cima do iframe do canvas.
 */

const colors = {
  background: '#ffffff', foreground: '#0b1324', primary: '#1d4ed8', primaryForeground: '#ffffff', accent: '#0ea5e9',
  accentForeground: '#ffffff', muted: '#f1f5f9', mutedForeground: '#475569', card: '#ffffff', border: '#e2e8f0', ring: '#1d4ed8',
}
const theme = { preset: 'horizonte', colors, darkColors: colors, fonts: { heading: 'sora', body: 'plus-jakarta-sans' }, radius: 'lg', motion: 'subtle' }

const heading = (id: string, text: string) => ({ id, type: 'heading', v: 1, props: { text, level: 'h2' } })
const section = (id: string, children: unknown[]) => ({ id, type: 'section', v: 1, props: { tone: 'light', width: 'normal', align: 'center' }, children })
const page3 = () => ({
  schemaVersion: 2,
  seo: { title: 'Teste', description: '' },
  theme,
  blocks: [section('s1', [heading('a', 'Alfa'), heading('b', 'Beta'), heading('c', 'Gama')]), section('s2', [heading('d', 'Delta')])],
})
const emptyPage = () => ({ schemaVersion: 2, seo: { title: 'Teste', description: '' }, theme, blocks: [] as unknown[] })

async function open(page: Page, document: unknown) {
  await signInAs(page, 'admin')
  const backend = await fakeLandingBackend(page, 'admin', [{ id: 'lp-1', title: 'Teste de arraste', slug: 'teste', draft_document: document }])
  await page.goto('/admin/paginas/lp-1')
  await expect(page.getByRole('heading', { level: 1, name: 'Teste de arraste' })).toBeVisible()
  return backend
}

const canvas = (page: Page) => page.frameLocator('iframe[title="Pré-visualização do site"]')
const texts = (page: Page) => canvas(page).locator('h1, h2, h3, p:not(.sr-only)')
const titles = (page: Page) => canvas(page).locator('h2')
const props = (page: Page) => page.getByRole('complementary', { name: 'Propriedades' })
const layerRow = (page: Page, id: string) => page.locator(`[data-layer-id="${id}"]`)
const undoButton = (page: Page) => page.getByRole('button', { name: 'Desfazer (Ctrl+Z)' })
const redoButton = (page: Page) => page.getByRole('button', { name: 'Refazer (Ctrl+Shift+Z)' })
const savedBlocks = (backend: { rows: Row[] }) =>
  (backend.rows[0]?.draft_document as { blocks: { id: string; type: string; children?: { id: string; type: string }[] }[] }).blocks

/** Arrasta com o mouse real: do centro da origem até uma fração da altura do destino. */
async function dragTo(page: Page, source: Locator, target: Locator, ratio: number, check?: () => Promise<void>) {
  const from = await source.boundingBox()
  const to = await target.boundingBox()
  if (!from || !to) throw new Error('Origem ou destino do arraste fora da tela.')
  const x = to.x + to.width / 2
  const y = to.y + to.height * ratio
  await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
  await page.mouse.down()
  // Passos intermediários: o arraste só começa depois de alguns pixels de movimento.
  await page.mouse.move(from.x + from.width / 2 + 12, from.y + from.height / 2 + 12, { steps: 3 })
  await page.mouse.move(x, y, { steps: 12 })
  await check?.()
  await page.mouse.up()
}

test('arrasta um bloco da biblioteca para o canvas vazio', async ({ page }) => {
  await open(page, emptyPage())
  const frame = page.locator('iframe[title="Pré-visualização do site"]')

  await dragTo(page, page.getByRole('button', { name: 'Adicionar Título', exact: true }), frame, 0.3, async () => {
    await expect(page.locator('[data-drop-indicator="page"]')).toBeVisible()
  })

  await expect(titles(page)).toHaveText(['Escreva o título aqui'])
  await expect(props(page).getByRole('heading', { name: 'Título' })).toBeVisible()
  await expect(page.locator('[data-drop-indicator]')).toHaveCount(0)
})

test('arrasta da biblioteca para uma posição exata no canvas, com o indicador mostrando onde cai', async ({ page }) => {
  await open(page, page3())
  const paragraph = page.getByRole('button', { name: 'Adicionar Parágrafo', exact: true })

  // Metade de cima de "Beta": entra antes dele.
  await dragTo(page, paragraph, canvas(page).getByRole('heading', { name: 'Beta' }), 0.2, async () => {
    await expect(page.locator('[data-drop-indicator="antes"]')).toBeVisible()
  })
  await expect(texts(page)).toHaveText(['Alfa', 'Escreva o texto aqui.', 'Beta', 'Gama', 'Delta'])

  // Metade de baixo de "Gama": entra depois dele.
  await dragTo(page, paragraph, canvas(page).getByRole('heading', { name: 'Gama' }), 0.85, async () => {
    await expect(page.locator('[data-drop-indicator="depois"]')).toBeVisible()
  })
  await expect(texts(page)).toHaveText(['Alfa', 'Escreva o texto aqui.', 'Beta', 'Gama', 'Escreva o texto aqui.', 'Delta'])
})

test('uma seção pronta arrastada sobre um elemento cai ao lado da seção, nunca dentro dela', async ({ page }) => {
  const backend = await open(page, page3())
  await page.getByRole('button', { name: 'Adicionar Perguntas frequentes', exact: true }).scrollIntoViewIfNeeded()

  // Soltando sobre o título "Delta": a referência passa a ser a seção que o contém (metade de baixo = depois dela).
  const delta = canvas(page).getByRole('heading', { name: 'Delta' })
  await dragTo(page, page.getByRole('button', { name: 'Adicionar Perguntas frequentes', exact: true }), delta, 3, async () => {
    await expect(page.locator('[data-drop-indicator="depois"]')).toBeVisible()
  })
  await expect(canvas(page).getByRole('heading', { name: 'Perguntas que costumamos receber' })).toBeVisible()

  await page.getByRole('button', { name: 'Salvar rascunho' }).click()
  await expect(page.getByText('Rascunho salvo.')).toBeVisible()
  const blocks = savedBlocks(backend)
  expect(blocks.map((b) => b.type)).toEqual(['section', 'section', 'faq'])
  expect(blocks.every((b) => (b.children ?? []).every((child) => child.type === 'heading'))).toBe(true)
})

test('move um bloco pelo canvas usando a alça da barra do bloco', async ({ page }) => {
  await open(page, page3())
  await canvas(page).getByRole('heading', { name: 'Gama' }).click()
  const toolbar = page.getByRole('toolbar', { name: 'Bloco selecionado: Título' })
  await expect(toolbar).toBeVisible()

  // Para o começo da mesma seção.
  await dragTo(page, toolbar.getByRole('button', { name: 'Arrastar Título' }), canvas(page).getByRole('heading', { name: 'Alfa' }), 0.15)
  await expect(titles(page)).toHaveText(['Gama', 'Alfa', 'Beta', 'Delta'])

  // Para outra seção, depois de "Delta". O bloco movido continua selecionado.
  await dragTo(page, toolbar.getByRole('button', { name: 'Arrastar Título' }), canvas(page).getByRole('heading', { name: 'Delta' }), 0.9)
  await expect(titles(page)).toHaveText(['Alfa', 'Beta', 'Delta', 'Gama'])
  await expect(canvas(page).locator('[data-selected="true"]')).toHaveText('Gama')

  // A barra do bloco também move, duplica e exclui.
  await toolbar.getByRole('button', { name: 'Mover para cima' }).click()
  await expect(titles(page)).toHaveText(['Alfa', 'Beta', 'Gama', 'Delta'])
})

test('reordena pelas camadas arrastando, inclusive para outra seção', async ({ page }) => {
  const backend = await open(page, page3())
  await page.getByRole('tab', { name: 'Camadas' }).click()

  // "Gama" para antes de "Alfa".
  await dragTo(page, layerRow(page, 'c'), layerRow(page, 'a'), 0.2, async () => {
    await expect(layerRow(page, 'a')).toHaveAttribute('data-drop', 'before')
  })
  await expect(titles(page)).toHaveText(['Gama', 'Alfa', 'Beta', 'Delta'])

  // "Alfa" para dentro da segunda seção (soltando sobre a linha da seção).
  await dragTo(page, layerRow(page, 'a'), layerRow(page, 's2'), 0.5, async () => {
    await expect(layerRow(page, 's2')).toHaveAttribute('data-drop', 'inside')
  })
  await expect(titles(page)).toHaveText(['Gama', 'Beta', 'Delta', 'Alfa'])

  // A segunda seção inteira para antes da primeira.
  await dragTo(page, layerRow(page, 's2'), layerRow(page, 's1'), 0.2)
  await expect(titles(page)).toHaveText(['Delta', 'Alfa', 'Gama', 'Beta'])

  await page.getByRole('button', { name: 'Salvar rascunho' }).click()
  await expect(page.getByText('Rascunho salvo.')).toBeVisible()
  expect(savedBlocks(backend).map((b) => `${b.id}[${(b.children ?? []).map((c) => c.id).join(' ')}]`)).toEqual(['s2[d a]', 's1[c b]'])
})

test('estrutura inválida é impossível: não há indicador e soltar não muda nada', async ({ page }) => {
  await open(page, page3())
  await page.getByRole('tab', { name: 'Camadas' }).click()

  // Seção sobre um elemento de OUTRA seção vira "ao lado da seção" (válido); seção sobre elemento dela mesma: nada.
  await dragTo(page, layerRow(page, 's1'), layerRow(page, 'b'), 0.5, async () => {
    await expect(page.locator('[data-drop]')).toHaveCount(0)
  })
  await expect(titles(page)).toHaveText(['Alfa', 'Beta', 'Gama', 'Delta'])

  // Soltar o bloco sobre ele mesmo, ou fora de qualquer destino, não cria passo no histórico.
  await dragTo(page, layerRow(page, 'b'), layerRow(page, 'b'), 0.9)
  await dragTo(page, layerRow(page, 'b'), page.getByRole('heading', { level: 1 }), 0.5)
  await expect(titles(page)).toHaveText(['Alfa', 'Beta', 'Gama', 'Delta'])
  await expect(undoButton(page)).toBeDisabled()
  await expect(page.getByText('Tudo salvo')).toBeVisible()
})

test('um clique simples na biblioteca e nas camadas continua funcionando (não vira arraste)', async ({ page }) => {
  await open(page, page3())
  await page.getByRole('button', { name: 'Adicionar Divisor', exact: true }).click()
  await expect(canvas(page).locator('hr')).toHaveCount(1)

  await page.getByRole('tab', { name: 'Camadas' }).click()
  await layerRow(page, 'b').click()
  await expect(props(page).getByLabel('Texto')).toHaveValue('Beta')
})

test('desfaz e refaz pelos botões; a digitação contínua volta de uma vez', async ({ page }) => {
  await open(page, page3())
  await expect(undoButton(page)).toBeDisabled()
  await expect(redoButton(page)).toBeDisabled()

  await canvas(page).getByRole('heading', { name: 'Alfa' }).click()
  await props(page).getByLabel('Texto').press('Control+End')
  await props(page).getByLabel('Texto').pressSequentially(' e Ômega', { delay: 20 })
  await expect(titles(page).first()).toHaveText('Alfa e Ômega')
  await expect(page.getByText('Alterações não salvas')).toBeVisible()

  await props(page).getByRole('button', { name: 'Mover para baixo' }).click()
  await expect(titles(page)).toHaveText(['Beta', 'Alfa e Ômega', 'Gama', 'Delta'])

  // Desfaz o movimento, depois a digitação inteira (um passo só).
  await undoButton(page).click()
  await expect(titles(page)).toHaveText(['Alfa e Ômega', 'Beta', 'Gama', 'Delta'])
  await undoButton(page).click()
  await expect(titles(page)).toHaveText(['Alfa', 'Beta', 'Gama', 'Delta'])
  await expect(undoButton(page)).toBeDisabled()
  // De volta ao que está salvo: nada a salvar.
  await expect(page.getByText('Tudo salvo')).toBeVisible()

  await redoButton(page).click()
  await redoButton(page).click()
  await expect(titles(page)).toHaveText(['Beta', 'Alfa e Ômega', 'Gama', 'Delta'])
  await expect(redoButton(page)).toBeDisabled()

  // Uma alteração nova descarta o refazer.
  await undoButton(page).click()
  await props(page).getByRole('button', { name: 'Duplicar' }).click()
  await expect(redoButton(page)).toBeDisabled()
})

test('atalhos de teclado funcionam com o foco dentro do canvas', async ({ page }) => {
  await open(page, page3())
  // Clicar no canvas leva o foco para dentro do iframe.
  await canvas(page).getByRole('heading', { name: 'Beta' }).click()

  await page.keyboard.press('Alt+ArrowUp')
  await expect(titles(page)).toHaveText(['Beta', 'Alfa', 'Gama', 'Delta'])
  await page.keyboard.press('Alt+ArrowDown')
  await page.keyboard.press('Alt+ArrowDown')
  await expect(titles(page)).toHaveText(['Alfa', 'Gama', 'Beta', 'Delta'])

  await page.keyboard.press('Control+d')
  await expect(titles(page)).toHaveText(['Alfa', 'Gama', 'Beta', 'Beta', 'Delta'])

  await page.keyboard.press('Delete')
  await expect(titles(page)).toHaveText(['Alfa', 'Gama', 'Beta', 'Delta'])

  await page.keyboard.press('Control+z')
  await expect(titles(page)).toHaveText(['Alfa', 'Gama', 'Beta', 'Beta', 'Delta'])
  await page.keyboard.press('Control+z')
  await page.keyboard.press('Control+z')
  await page.keyboard.press('Control+z')
  await page.keyboard.press('Control+z')
  await expect(titles(page)).toHaveText(['Alfa', 'Beta', 'Gama', 'Delta'])
  await page.keyboard.press('Control+Shift+z')
  await expect(titles(page)).toHaveText(['Beta', 'Alfa', 'Gama', 'Delta'])
  await page.keyboard.press('Control+y')
  await expect(titles(page)).toHaveText(['Alfa', 'Beta', 'Gama', 'Delta'])
})

test('dentro de um campo de texto, as teclas são do campo (apagar letra não exclui o bloco)', async ({ page }) => {
  await open(page, page3())
  await canvas(page).getByRole('heading', { name: 'Beta' }).click()
  const field = props(page).getByLabel('Texto')
  await field.click()
  await field.press('End')
  await field.press('Backspace')
  await field.press('Delete')
  await expect(field).toHaveValue('Bet')
  await expect(titles(page)).toHaveText(['Alfa', 'Bet', 'Gama', 'Delta'])

  // Escape (fora do campo) tira a seleção.
  await page.getByRole('heading', { level: 1 }).click()
  await page.keyboard.press('Escape')
  await expect(props(page).getByRole('heading', { name: 'Página' })).toBeVisible()
  // Sem bloco selecionado, Delete não faz nada.
  await page.keyboard.press('Delete')
  await expect(titles(page)).toHaveCount(4)
})

test('Ctrl+S salva, inclusive com o foco no canvas', async ({ page }) => {
  const backend = await open(page, page3())
  await canvas(page).getByRole('heading', { name: 'Gama' }).click()
  await page.keyboard.press('Alt+ArrowUp')
  await page.keyboard.press('Control+s')
  await expect(page.getByText('Rascunho salvo.')).toBeVisible()
  expect(savedBlocks(backend)[0]?.children?.map((c) => c.id)).toEqual(['a', 'c', 'b'])
})
