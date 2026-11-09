import { expect, test, type Page } from '@playwright/test'
import { signInAs } from './fake-supabase'

/*
 * Editor do site (/admin/site) contra um backend FALSO em memória que imita as RPCs da
 * migração 20261111120000_site_pages.sql (ensure_home_page, save_page_draft, publish_page,
 * get_public_site). A segurança real (RLS e permissões) é coberta pelo pgTAP.
 */

type Row = Record<string, unknown> & { draft_document: unknown; draft_updated_at: string }

function fakeSiteBackend(page: Page) {
  const state: { row: Row | null; published: unknown; clock: number } = { row: null, published: null, clock: Date.now() }
  const tick = () => new Date(++state.clock).toISOString()
  const json = (body: unknown, status = 200) => ({ status, contentType: 'application/json', body: JSON.stringify(body) })

  return page.route(/https:\/\/e2etest\.supabase\.co\/rest\/v1\/(pages|rpc\/(ensure_home_page|save_page_draft|publish_page|get_public_site))/, async (route) => {
    const request = route.request()
    const path = new URL(request.url()).pathname
    const body = (request.postDataJSON() ?? {}) as Record<string, unknown>

    if (path === '/rest/v1/pages') {
      const wantsObject = (request.headers()['accept'] ?? '').includes('vnd.pgrst.object')
      if (wantsObject) return route.fulfill(state.row ? json(state.row) : json({ code: 'PGRST116', message: '0 rows' }, 406))
      return route.fulfill(json(state.row ? [state.row] : []))
    }
    if (path.endsWith('/ensure_home_page')) {
      state.row ??= {
        id: 'home-1', kind: 'home', title: 'Página inicial', slug: null, status: 'draft',
        draft_document: body.p_document, draft_updated_at: tick(), draft_updated_by: null,
        published_version_id: null, published_at: null, created_by: null, created_at: tick(), updated_at: tick(),
      }
      return route.fulfill(json(state.row))
    }
    if (path.endsWith('/save_page_draft')) {
      if (!state.row) return route.fulfill(json({ code: 'P0002', message: 'Página não encontrada.' }, 400))
      if (body.p_expected_updated_at && body.p_expected_updated_at !== state.row.draft_updated_at) {
        return route.fulfill(json({ code: 'P0001', message: 'O rascunho foi alterado em outra sessão.' }, 400))
      }
      state.row = { ...state.row, draft_document: body.p_document, draft_updated_at: tick() }
      return route.fulfill(json(state.row))
    }
    if (path.endsWith('/publish_page')) {
      if (!state.row) return route.fulfill(json({ code: 'P0002', message: 'Página não encontrada.' }, 400))
      state.published = state.row.draft_document
      state.row = { ...state.row, status: 'published', published_version_id: 'v1', published_at: tick() }
      return route.fulfill(json(state.row))
    }
    if (path.endsWith('/get_public_site')) {
      return route.fulfill(json({ home: state.published }))
    }
    return route.fallback()
  })
}

const preview = (page: Page) => page.frameLocator('iframe[title="Pré-visualização do site"]')

test('admin cria a Home pelo modelo, edita com pré-visualização ao vivo e publica', async ({ page }, testInfo) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await page.goto('/admin/site')

  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await expect(page.getByRole('heading', { name: 'Seções da página' })).toBeVisible()
  await expect(page.getByText('Ainda não publicada')).toBeVisible()
  await expect(preview(page).getByRole('heading', { level: 1 })).toContainText('Soluções sob medida')
  await page.evaluate(() => document.fonts.ready)
  await page.screenshot({ path: testInfo.outputPath('editor-lista.png') })

  // Edita o título do destaque principal
  await page.getByRole('button', { name: /^Destaque principal/ }).click()
  const title = page.getByLabel(/^Título/)
  await title.fill('Contabilidade descomplicada para pequenas empresas')
  // O trecho antigo deixou de existir no título: sem apagá-lo o salvamento é bloqueado (correto).
  await page.getByLabel(/^Trecho do título em destaque/).fill('')
  await expect(preview(page).getByRole('heading', { level: 1 })).toHaveText('Contabilidade descomplicada para pequenas empresas')
  await expect(page.getByText('Alterações não salvas')).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('editor-secao.png') })

  // Oculta as perguntas frequentes
  await page.getByRole('button', { name: 'Todas as seções' }).click()
  await page.getByRole('button', { name: 'Ocultar Perguntas frequentes' }).click()
  await expect(preview(page).getByRole('heading', { name: 'Perguntas que costumamos receber' })).toHaveCount(0)

  // Publica e confere o site público
  await page.getByRole('button', { name: 'Publicar' }).click()
  await expect(page.getByText(/Publicada em/)).toBeVisible()

  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Contabilidade descomplicada para pequenas empresas')
  await expect(page.getByRole('heading', { name: 'Perguntas que costumamos receber' })).toHaveCount(0)
})

test('campos inválidos bloqueiam o salvamento e levam à seção', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()

  await page.getByRole('button', { name: /^Destaque principal/ }).click()
  await page.getByLabel(/^Título/).fill('')
  await page.getByRole('button', { name: 'Salvar rascunho' }).click()

  const alert = page.getByRole('alert').filter({ hasText: 'Corrija estes campos' })
  await expect(alert).toContainText('Título: preencha este campo.')
  await expect(page.getByText('Alterações não salvas')).toBeVisible()
})

test('trecho em destaque precisa existir no título', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()

  await page.getByRole('button', { name: /^Destaque principal/ }).click()
  await page.getByLabel(/^Título/).fill('Sua melhor versão começa com o')
  const highlight = page.getByLabel(/^Trecho do título em destaque/)
  await highlight.fill('cuidado que você merece.')
  await expect(page.getByText(/este trecho não aparece no título/i).first()).toBeVisible()
  await expect(highlight).toHaveAttribute('aria-invalid', 'true')

  await page.getByRole('button', { name: 'Salvar rascunho' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Corrija estes campos' })).toBeVisible()

  // Copiar o trecho para dentro do título resolve
  await page.getByLabel(/^Título/).fill('Sua melhor versão começa com o cuidado que você merece.')
  await expect(page.getByText(/este trecho não aparece no título/i)).toHaveCount(0)
  await expect(page.getByText('Alterações não salvas')).toBeVisible()
  await page.getByRole('button', { name: 'Salvar rascunho' }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Corrija estes campos' })).toHaveCount(0)
  await expect(preview(page).locator('h1 .site-gradient-text')).toHaveText('cuidado que você merece.')
})

test('identidade: nome da empresa e cor da marca mudam a prévia', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()

  await page.getByRole('button', { name: /Identidade e SEO/ }).click()
  await page.getByLabel('Nome da empresa').fill('Clínica Aurora')
  await expect(preview(page).getByRole('link', { name: 'Clínica Aurora — início' })).toBeVisible()

  await page.getByRole('textbox', { name: 'Cor principal (botões e destaques)', exact: true }).fill('#ffd43b')
  await expect(page.getByText(/pouco visível sobre o fundo branco/)).toBeVisible()
})

test('sair com alterações não salvas pede confirmação', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()

  await page.getByRole('button', { name: 'Ocultar Perguntas frequentes' }).click()
  await page.getByRole('navigation', { name: 'Navegação do painel' }).getByRole('link', { name: 'Painel' }).click()
  await expect(page.getByRole('dialog', { name: 'Sair sem salvar?' })).toBeVisible()
  await page.getByRole('button', { name: 'Continuar editando' }).click()
  await expect(page).toHaveURL(/\/admin\/site$/)
})

test('gestor não acessa o editor do site', async ({ page }) => {
  await signInAs(page, 'manager')
  await page.goto('/admin/site')
  await expect(page.getByRole('heading', { name: 'Área restrita ao seu perfil' })).toBeVisible()
})

test('cria a seção "Imagem Hiro 01" pela lista e a mostra na prévia', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()

  await page.getByRole('button', { name: 'Nova seção de imagem' }).click()
  // Ao criar, o painel da nova seção já abre com o nome definido
  await expect(page.getByRole('heading', { level: 2, name: 'Imagem Hiro 01' })).toBeVisible()
  await expect(page.getByLabel(/^Nome no painel/)).toHaveValue('Imagem Hiro 01')
  await expect(preview(page).getByRole('heading', { level: 2, name: 'Título da imagem' })).toBeVisible()

  // Voltando à lista, a seção aparece com o nome escolhido
  await page.getByRole('button', { name: 'Todas as seções' }).click()
  await expect(page.getByRole('button', { name: /^Imagem Hiro 01/ })).toBeVisible()
})

test('faixa de diferenciais na prévia tem 6 colunas no computador', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()

  await page.getByRole('button', { name: /^Destaque principal/ }).click()
  // O modelo traz 3 diferenciais; adiciona mais 3 para ocupar a linha inteira.
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: 'Adicionar diferencial' }).click()

  const columns = await preview(page).locator('ul.grid-cols-3').first().evaluate((ul) => getComputedStyle(ul).gridTemplateColumns.split(' ').length)
  expect(columns).toBe(6)
})

const PNG_HEAD = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d, 0x49, 0x48, 0x44, 0x52])

test('imagem da seção é enviada do dispositivo e a URL pública é salva', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  const uploads: string[] = []
  await page.route('https://e2etest.supabase.co/storage/v1/object/**', async (route) => {
    // Só os envios (POST); a leitura pela URL pública também passa por aqui.
    if (route.request().method() === 'POST') uploads.push(new URL(route.request().url()).pathname)
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: 'site-media/x' }) })
  })
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await page.getByRole('button', { name: 'Nova seção de imagem' }).click()

  await page.getByLabel('Upload da imagem').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: PNG_HEAD })
  await expect(page.getByRole('button', { name: 'Remover imagem' })).toBeVisible()
  expect(uploads).toHaveLength(1)
  expect(uploads[0]).toMatch(/^\/storage\/v1\/object\/site-media\/\d{4}\/\d{2}\/[0-9a-f-]+\.png$/)
  await expect(page.getByText('Alterações não salvas')).toBeVisible()
})

test('arquivo com extensão de imagem mas conteúdo inválido é recusado sem enviar', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  let uploaded = false
  await page.route('https://e2etest.supabase.co/storage/v1/object/**', async (route) => {
    uploaded = true
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' })
  })
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await page.getByRole('button', { name: 'Nova seção de imagem' }).click()

  await page.getByLabel('Upload da imagem').setInputFiles({
    name: 'falsa.png',
    mimeType: 'image/png',
    buffer: Buffer.from('<script>alert(1)</script>'),
  })
  await expect(page.getByText('O conteúdo do arquivo não é uma imagem desse tipo.')).toBeVisible()
  expect(uploaded).toBe(false)
})
