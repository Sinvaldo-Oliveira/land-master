import { expect, test, type Page } from '@playwright/test'
import { fakeLandingBackend, type Row } from './fake-landing-backend'
import { signInAs, type FakeRole } from './fake-supabase'

/*
 * Gerenciamento de landing pages (/admin/paginas) contra um backend FALSO em memória que imita
 * as RPCs da migração 20261111160000_landing_pages_management.sql. O falso repete as regras que
 * a tela precisa respeitar (só admin, endereço único, confirmação para trocar endereço no ar).
 * A segurança real (RLS e permissões) é coberta pelo pgTAP.
 */

async function open(page: Page, seed: Partial<Row>[] = [], role: FakeRole = 'admin') {
  await signInAs(page, role)
  const backend = await fakeLandingBackend(page, role, seed)
  await page.goto('/admin/paginas')
  return backend
}

const stat = (page: Page, label: string) => page.getByRole('region', { name: 'Resumo' }).locator('> div').filter({ hasText: label })
const cards = (page: Page) => page.getByRole('list', { name: 'Landing pages' }).getByRole('listitem')
const card = (page: Page, title: string) => cards(page).filter({ has: page.getByRole('heading', { name: title, exact: true }) })

async function menu(page: Page, title: string, item: string) {
  await page.getByRole('button', { name: `Ações de ${title}`, exact: true }).click()
  await page.getByRole('menuitem', { name: item }).click()
}

async function choose(page: Page, select: string, option: string) {
  await page.getByRole('combobox', { name: select }).click()
  await page.getByRole('option', { name: option, exact: true }).click()
}

test('lista vazia mostra o estado inicial e os indicadores zerados', async ({ page }) => {
  await open(page)

  await expect(page.getByRole('heading', { level: 1, name: 'Landing pages' })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Nenhuma landing page ainda' })).toBeVisible()
  for (const label of ['Páginas', 'Publicadas', 'Rascunhos', 'Arquivadas']) {
    await expect(stat(page, label).locator('p').nth(1)).toHaveText('0')
  }
})

test('cria uma página do zero: valida os campos, sugere o endereço e grava um documento v2 vazio', async ({ page }) => {
  const backend = await open(page)
  await page.getByRole('link', { name: 'Nova landing page' }).first().click()
  await expect(page).toHaveURL(/\/admin\/paginas\/nova$/)

  // Campos obrigatórios
  await page.getByRole('button', { name: 'Criar página' }).click()
  await expect(page.getByText('Dê um nome para a página.')).toBeVisible()
  expect(backend.calls.some((call) => call.name === 'create_landing_page')).toBe(false)

  // O endereço acompanha o nome…
  await page.getByLabel('Nome da página').fill('Promoção de Verão 2026')
  await expect(page.getByLabel('Endereço')).toHaveValue('promocao-de-verao-2026')
  await expect(page.getByText('Endereço público: /lp/promocao-de-verao-2026')).toBeVisible()

  // …e formato inválido é recusado antes de chegar ao banco.
  await page.getByLabel('Endereço').fill('Promoção Verão')
  await page.getByRole('button', { name: 'Criar página' }).click()
  await expect(page.getByText('Use só letras minúsculas, números e hífen (sem espaços nem acentos).')).toBeVisible()
  expect(backend.calls.some((call) => call.name === 'create_landing_page')).toBe(false)

  // Depois de editado à mão, o endereço não é mais sobrescrito pelo nome.
  await page.getByLabel('Endereço').fill('verao-2026')
  await page.getByLabel('Nome da página').fill('Promoção de Verão')
  await expect(page.getByLabel('Endereço')).toHaveValue('verao-2026')

  await page.getByRole('button', { name: 'Criar página' }).click()
  // A página criada abre direto no editor.
  await expect(page).toHaveURL(/\/admin\/paginas\/page-1$/)
  await expect(page.getByText('Página criada como rascunho.')).toBeVisible()

  await page.goto('/admin/paginas')
  await expect(card(page, 'Promoção de Verão')).toContainText('/lp/verao-2026')
  await expect(card(page, 'Promoção de Verão')).toContainText('Rascunho')
  await expect(stat(page, 'Rascunhos').locator('p').nth(1)).toHaveText('1')

  const created = backend.calls.find((call) => call.name === 'create_landing_page')
  expect(created?.body).toMatchObject({
    p_title: 'Promoção de Verão',
    p_slug: 'verao-2026',
    p_document: { schemaVersion: 2, blocks: [], seo: { title: 'Promoção de Verão', description: '' } },
  })
})

test('endereço repetido é recusado com mensagem clara e a pessoa continua no formulário', async ({ page }) => {
  const backend = await open(page, [{ title: 'Black Friday', slug: 'black-friday' }])
  await page.goto('/admin/paginas/nova')

  await page.getByLabel('Nome da página').fill('Black Friday')
  await page.getByRole('button', { name: 'Criar página' }).click()

  await expect(page.getByRole('alert').filter({ hasText: 'Já existe uma página com o endereço /lp/black-friday. Escolha outro.' }).first()).toBeVisible()
  await expect(page).toHaveURL(/\/admin\/paginas\/nova$/)
  expect(backend.rows).toHaveLength(1)
})

test('renomeia e troca o endereço de um rascunho', async ({ page }) => {
  const backend = await open(page, [{ title: 'Black Friday', slug: 'black-friday' }])

  await menu(page, 'Black Friday', 'Renomear e endereço')
  const dialog = page.getByRole('dialog', { name: 'Renomear página' })
  await dialog.getByLabel('Nome da página').fill('Black Friday 2026')
  await dialog.getByLabel('Endereço').fill('black-friday-2026')
  await expect(dialog.getByText('Esta página está no ar.')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Salvar' }).click()

  await expect(dialog).toBeHidden()
  await expect(card(page, 'Black Friday 2026')).toContainText('/lp/black-friday-2026')
  expect(backend.calls.at(-2)).toMatchObject({ name: 'update_page_meta', body: { p_confirm_slug_change: false } })
})

test('trocar o endereço de uma página no ar exige confirmação explícita', async ({ page }) => {
  const backend = await open(page, [
    { title: 'Aula grátis', slug: 'aula-gratis', status: 'published', published_at: '2026-11-02T00:00:00.000Z' },
  ])
  await expect(card(page, 'Aula grátis')).toContainText('Publicada')

  await menu(page, 'Aula grátis', 'Renomear e endereço')
  const dialog = page.getByRole('dialog', { name: 'Renomear página' })
  await dialog.getByLabel('Endereço').fill('aula-aberta')
  await expect(dialog.getByRole('alert')).toContainText('/lp/aula-gratis deixa de funcionar')
  await dialog.getByRole('button', { name: 'Trocar endereço e salvar' }).click()

  await expect(dialog).toBeHidden()
  await expect(card(page, 'Aula grátis')).toContainText('/lp/aula-aberta')
  expect(backend.calls.find((call) => call.name === 'update_page_meta')?.body).toMatchObject({ p_confirm_slug_change: true })
})

test('duplica uma página: a cópia nasce como rascunho e a original não muda', async ({ page }) => {
  const backend = await open(page, [
    { title: 'Aula grátis', slug: 'aula-gratis', status: 'published', published_at: '2026-11-02T00:00:00.000Z', draft_document: { schemaVersion: 2, blocks: [], marca: 'original' } },
  ])

  await menu(page, 'Aula grátis', 'Duplicar')
  const dialog = page.getByRole('dialog', { name: 'Duplicar página' })
  await expect(dialog.getByLabel('Nome da página')).toHaveValue('Cópia de Aula grátis')
  await expect(dialog.getByLabel('Endereço')).toHaveValue('aula-gratis-copia')
  await dialog.getByRole('button', { name: 'Duplicar' }).click()

  await expect(dialog).toBeHidden()
  await expect(cards(page)).toHaveCount(2)
  await expect(card(page, 'Cópia de Aula grátis')).toContainText('Rascunho')
  await expect(card(page, 'Aula grátis')).toContainText('Publicada')
  expect(backend.rows[1]).toMatchObject({ slug: 'aula-gratis-copia', status: 'draft', draft_document: { marca: 'original' } })
  expect(backend.rows[0]).toMatchObject({ title: 'Aula grátis', slug: 'aula-gratis', status: 'published' })
})

test('arquiva com confirmação, encontra no filtro de arquivadas e restaura como rascunho', async ({ page }) => {
  await open(page, [{ title: 'Black Friday', slug: 'black-friday' }, { title: 'Aula grátis', slug: 'aula-gratis' }])

  await menu(page, 'Black Friday', 'Arquivar')
  const dialog = page.getByRole('dialog', { name: 'Arquivar esta página?' })
  await dialog.getByRole('button', { name: 'Arquivar' }).click()
  await expect(dialog).toBeHidden()

  await expect(cards(page)).toHaveCount(1)
  await expect(card(page, 'Black Friday')).toHaveCount(0)
  await expect(stat(page, 'Arquivadas').locator('p').nth(1)).toHaveText('1')
  await expect(stat(page, 'Páginas').locator('p').nth(1)).toHaveText('1')

  await choose(page, 'Filtrar por situação', 'Arquivadas')
  await expect(card(page, 'Black Friday')).toContainText('Arquivada')

  await menu(page, 'Black Friday', 'Restaurar')
  await expect(page.getByText('Página restaurada como rascunho.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Nenhuma página encontrada' })).toBeVisible()
  await choose(page, 'Filtrar por situação', 'Todas (sem arquivadas)')
  await expect(card(page, 'Black Friday')).toContainText('Rascunho')
})

test('excluir pede confirmação: cancelar mantém a página, confirmar apaga', async ({ page }) => {
  const backend = await open(page, [{ title: 'Black Friday', slug: 'black-friday' }])

  await menu(page, 'Black Friday', 'Excluir')
  const dialog = page.getByRole('dialog', { name: 'Excluir esta página?' })
  await expect(dialog).toContainText('Esta ação não pode ser desfeita.')
  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialog).toBeHidden()
  await expect(card(page, 'Black Friday')).toBeVisible()
  expect(backend.calls.some((call) => call.name === 'delete_page')).toBe(false)

  await menu(page, 'Black Friday', 'Excluir')
  await dialog.getByRole('button', { name: 'Excluir página' }).click()
  await expect(page.getByText('Página excluída.')).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Nenhuma landing page ainda' })).toBeVisible()
  expect(backend.rows).toHaveLength(0)
})

test('tira do ar uma página publicada, com confirmação', async ({ page }) => {
  await open(page, [{ title: 'Aula grátis', slug: 'aula-gratis', status: 'published', published_at: '2026-11-02T00:00:00.000Z' }])

  await menu(page, 'Aula grátis', 'Tirar do ar')
  const dialog = page.getByRole('dialog', { name: 'Tirar esta página do ar?' })
  await expect(dialog).toContainText('/lp/aula-gratis deixa de abrir')
  await dialog.getByRole('button', { name: 'Tirar do ar' }).click()

  await expect(card(page, 'Aula grátis')).toContainText('Fora do ar')
  await page.getByRole('button', { name: 'Ações de Aula grátis' }).click()
  await expect(page.getByRole('menuitem', { name: 'Tirar do ar' })).toHaveCount(0)
})

test('busca, ordena e alterna entre cartões e lista', async ({ page }) => {
  await open(page, [
    { title: 'Zeladoria predial', slug: 'zeladoria' },
    { title: 'Promoção de verão', slug: 'promocao-verao' },
    { title: 'Aula grátis', slug: 'aula-gratis' },
  ])

  // Padrão: editadas por último primeiro (a última semeada é a mais recente).
  await expect(cards(page).getByRole('heading')).toHaveText(['Aula grátis', 'Promoção de verão', 'Zeladoria predial'])

  await choose(page, 'Ordenar', 'Nome (A–Z)')
  await expect(cards(page).getByRole('heading')).toHaveText(['Aula grátis', 'Promoção de verão', 'Zeladoria predial'])
  await choose(page, 'Ordenar', 'Criadas por último')
  await expect(cards(page).getByRole('heading').first()).toHaveText('Aula grátis')

  await page.getByRole('searchbox', { name: 'Buscar landing pages' }).fill('promocao')
  await expect(cards(page)).toHaveCount(1)
  await expect(card(page, 'Promoção de verão')).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar landing pages' }).fill('nada-disso')
  await expect(page.getByRole('heading', { name: 'Nenhuma página encontrada' })).toBeVisible()
  await page.getByRole('searchbox', { name: 'Buscar landing pages' }).fill('')

  await page.getByRole('radio', { name: 'Lista' }).click()
  const table = page.getByRole('table', { name: 'Landing pages' })
  await expect(table.getByRole('row')).toHaveCount(4)
  await expect(table.getByRole('rowheader', { name: 'Zeladoria predial' })).toBeVisible()

  // A preferência de exibição continua depois de recarregar.
  await page.reload()
  await expect(page.getByRole('table', { name: 'Landing pages' })).toBeVisible()
})

test('a lista cabe na tela sem rolagem horizontal, mesmo com nome longo', async ({ page }) => {
  await open(page, [{ title: 'Lançamento-do-curso-completo-de-marketing-digital-para-pequenos-negócios-2026', slug: 'a'.repeat(80) }])
  await expect(cards(page)).toHaveCount(1)
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)
  const box = await cards(page).first().boundingBox()
  const menuBox = await page.getByRole('button', { name: /^Ações de/ }).boundingBox()
  expect(menuBox && box && menuBox.x + menuBox.width <= box.x + box.width).toBe(true)
})

test('banco sem a migração: a tela explica qual script rodar', async ({ page }) => {
  await signInAs(page, 'admin')
  await page.route('https://e2etest.supabase.co/rest/v1/rpc/list_landing_pages', (route) =>
    route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ code: 'PGRST202', message: 'Could not find the function' }) }),
  )
  await page.goto('/admin/paginas')
  await expect(page.getByRole('alert')).toContainText('RODAR_NO_SQL_EDITOR_landing_etapa1.sql')
})

for (const role of ['manager', 'sales'] as const) {
  test(`perfil ${role} não acessa o módulo nem dispara as RPCs`, async ({ page }) => {
    const backend = await open(page, [{ title: 'Black Friday', slug: 'black-friday' }], role)
    await expect(page.getByRole('heading', { name: 'Área restrita ao seu perfil' })).toBeVisible()
    await expect(page.getByText('Black Friday')).toHaveCount(0)

    await page.goto('/admin/paginas/nova')
    await expect(page.getByRole('heading', { name: 'Área restrita ao seu perfil' })).toBeVisible()
    expect(backend.calls).toHaveLength(0)
  })
}

test('se o banco recusar (perfil sem permissão), a tela mostra a recusa em vez de dados', async ({ page }) => {
  // Sessão de admin na interface, mas o banco responde como a RLS responderia a outro perfil.
  await signInAs(page, 'admin')
  await fakeLandingBackend(page, 'sales', [{ title: 'Black Friday', slug: 'black-friday' }])
  await page.goto('/admin/paginas')
  await expect(page.getByRole('alert')).toContainText('Seu perfil não permite esta ação.')
  await expect(page.getByText('Black Friday')).toHaveCount(0)
})
