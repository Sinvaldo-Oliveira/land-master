import { expect, test, type Locator, type Page } from '@playwright/test'
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

/** Espera o card parar de rolar: o arraste só começa quando a posição está estável na tela. */
async function settle(locator: Locator) {
  await locator.scrollIntoViewIfNeeded()
  let last = ''
  await expect
    .poll(async () => {
      const box = JSON.stringify(await locator.boundingBox())
      const stable = box === last
      last = box
      return stable
    })
    .toBe(true)
}

/** Abre o menu "Nova seção" e escolhe o tipo. */
async function addSection(page: Page, option: 'Cartão de imagem 3D' | 'Hero interativo (mouse e botão)') {
  await page.getByRole('button', { name: 'Nova seção' }).click()
  await page.getByRole('menuitem', { name: option }).click()
}

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
  await expect(page.getByText(/pouco visível sobre o fundo do site/)).toBeVisible()
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

  await addSection(page, 'Cartão de imagem 3D')
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

/** Gera uma imagem real no próprio navegador (64×48), no formato pedido. */
async function sampleImage(page: Page, type: 'image/png' | 'image/webp'): Promise<Buffer> {
  const base64 = await page.evaluate((mime) => {
    const canvas = document.createElement('canvas')
    canvas.width = 64
    canvas.height = 48
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#2f5bea'
    ctx.fillRect(0, 0, 64, 48)
    return canvas.toDataURL(mime).split(',')[1]!
  }, type)
  return Buffer.from(base64, 'base64')
}

/** Storage e tabela media_assets simulados; grava os envios para conferência. */
async function fakeMediaBackend(page: Page, options: { bucketMissing?: boolean } = {}) {
  const uploads: { path: string; body: string }[] = []
  const registros: Record<string, unknown>[] = []
  await page.route('https://e2etest.supabase.co/storage/v1/object/**', async (route) => {
    if (route.request().method() !== 'POST') return route.fallback()
    if (options.bucketMissing) {
      return route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ statusCode: '404', error: 'Bucket not found', message: 'Bucket not found' }) })
    }
    uploads.push({ path: new URL(route.request().url()).pathname, body: route.request().postData() ?? '' })
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ Key: 'site-media/x' }) })
  })
  await page.route('https://e2etest.supabase.co/rest/v1/media_assets**', async (route) => {
    registros.push(route.request().postDataJSON() as Record<string, unknown>)
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ id: 'm-1' }) })
  })
  return { uploads, registros }
}

test('PNG enviado do dispositivo vira WebP, vai ao Storage e é registrado no banco', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  const media = await fakeMediaBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await addSection(page, 'Cartão de imagem 3D')

  const png = await sampleImage(page, 'image/png')
  await page.getByLabel('Upload da imagem').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: png })

  await expect(page.getByRole('button', { name: 'Remover imagem' })).toBeVisible()
  expect(media.uploads).toHaveLength(1)
  expect(media.uploads[0]!.path).toMatch(/^\/storage\/v1\/object\/site-media\/\d{4}\/\d{2}\/[0-9a-f-]+\.webp$/)
  expect(media.uploads[0]!.body).toContain('Content-Type: image/webp')
  expect(media.registros).toHaveLength(1)
  expect(media.registros[0]).toMatchObject({ bucket: 'site-media', mime: 'image/webp', width: 64, height: 48 })
  expect(Number(media.registros[0]!.size_bytes)).toBeGreaterThan(0)
  await expect(page.getByText('Alterações não salvas')).toBeVisible()
})

test('WebP enviado é aceito e também é gravado como WebP', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  const media = await fakeMediaBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await addSection(page, 'Cartão de imagem 3D')

  const webp = await sampleImage(page, 'image/webp')
  await page.getByLabel('Upload da imagem').setInputFiles({ name: 'foto.webp', mimeType: 'image/webp', buffer: webp })
  await expect(page.getByRole('button', { name: 'Remover imagem' })).toBeVisible()
  expect(media.uploads[0]!.path).toMatch(/\.webp$/)
  expect(media.registros[0]).toMatchObject({ mime: 'image/webp' })
})

test('arquivo com extensão de imagem mas conteúdo inválido é recusado sem enviar', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  const media = await fakeMediaBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await addSection(page, 'Cartão de imagem 3D')

  await page.getByLabel('Upload da imagem').setInputFiles({
    name: 'falsa.png',
    mimeType: 'image/png',
    buffer: Buffer.from('<script>alert(1)</script>'),
  })
  await expect(page.getByText('O conteúdo do arquivo não é uma imagem desse tipo.')).toBeVisible()
  expect(media.uploads).toHaveLength(0)
})

test('quando o bucket não existe, o erro explica o que fazer', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await fakeMediaBackend(page, { bucketMissing: true })
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await addSection(page, 'Cartão de imagem 3D')

  await page.getByLabel('Upload da imagem').setInputFiles({ name: 'foto.png', mimeType: 'image/png', buffer: await sampleImage(page, 'image/png') })
  await expect(page.getByText(/migração do bucket site-media/)).toBeVisible()
})

test('destaque principal: imagem enviada substitui a ilustração e o tamanho é ajustável', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await fakeMediaBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await page.getByRole('button', { name: /^Destaque principal/ }).click()

  await page.getByLabel(/^Imagem do destaque/).setInputFiles({ name: 'consultorio.png', mimeType: 'image/png', buffer: await sampleImage(page, 'image/png') })
  await expect(page.getByRole('button', { name: 'Remover imagem' })).toBeVisible()
  await expect(preview(page).locator('img').first()).toBeAttached()

  // Reduz de 100% para 60% com o teclado (passo de 5%)
  const size = page.getByRole('slider', { name: /^Tamanho da imagem/ })
  await size.focus()
  for (let i = 0; i < 8; i++) await page.keyboard.press('ArrowLeft')
  await expect(page.getByText('Tamanho da imagem: 60%')).toBeVisible()
  const width = await preview(page).locator('img').first().evaluate((el) => (el.parentElement!.parentElement as HTMLElement).style.width)
  expect(width).toBe('60%')
})


test('cria "Imagem Hiro 02" (hero interativo): botão aparece com a imagem e liga a sobreposição', async ({ page }, testInfo) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  const media = await fakeMediaBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()

  await addSection(page, 'Hero interativo (mouse e botão)')
  await expect(page.getByRole('heading', { level: 2, name: 'Imagem Hiro 02' })).toBeVisible()
  await expect(preview(page).getByRole('heading', { level: 2, name: 'Sua marca' })).toBeVisible()
  // Sem a imagem do botão, não há botão na prévia
  await expect(preview(page).getByRole('button', { name: 'APERTE AQUI' })).toHaveCount(0)

  await page.getByLabel(/^Imagem do botão/).setInputFiles({ name: 'capacete.png', mimeType: 'image/png', buffer: await sampleImage(page, 'image/png') })
  await expect(page.getByRole('button', { name: 'Remover imagem' })).toBeVisible()
  expect(media.registros.at(-1)).toMatchObject({ mime: 'image/webp' })

  const button = preview(page).getByRole('button', { name: 'APERTE AQUI' })
  await expect(button).toHaveAttribute('aria-pressed', 'false')
  await button.click()
  await expect(button).toHaveAttribute('aria-pressed', 'true')

  // Título editável reflete na prévia
  await page.getByLabel(/^Título .grande/).fill('Leila Marques')
  await expect(preview(page).getByRole('heading', { level: 2, name: 'Leila Marques' })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)
  await page.waitForTimeout(2200) // entrada animada (~1,8 s)
  await page.locator('iframe[title="Pré-visualização do site"]').screenshot({ path: testInfo.outputPath('hiro02-computador.png') })
  await page.getByRole('radio', { name: 'Celular' }).click()
  await page.waitForTimeout(800)
  await page.locator('iframe[title="Pré-visualização do site"]').screenshot({ path: testInfo.outputPath('hiro02-celular.png') })
})

test('clipe do hero interativo recusa arquivo que não é vídeo', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  const media = await fakeMediaBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await addSection(page, 'Hero interativo (mouse e botão)')

  await page.getByLabel(/^Clipe que segue o mouse/).setInputFiles({ name: 'clipe.mp4', mimeType: 'video/mp4', buffer: Buffer.from('não sou um vídeo') })
  await expect(page.getByText('O conteúdo do arquivo não é um vídeo desse tipo.')).toBeVisible()
  expect(media.uploads).toHaveLength(0)
})

test('seção Sobre: imagem enviada substitui o painel escuro', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  const media = await fakeMediaBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await page.getByRole('button', { name: /^Sobre/ }).click()

  // Antes: painel escuro com a citação
  await expect(preview(page).locator('blockquote')).toHaveCount(1)

  await page.getByLabel(/^Imagem do Sobre/).setInputFiles({ name: 'leila.png', mimeType: 'image/png', buffer: await sampleImage(page, 'image/png') })
  await expect(page.getByRole('button', { name: 'Remover imagem' })).toBeVisible()
  expect(media.registros.at(-1)).toMatchObject({ mime: 'image/webp' })

  // Depois: cartão com a foto, sem o painel
  await expect(preview(page).locator('[data-glare]')).toHaveCount(1)
  await expect(preview(page).locator('blockquote')).toHaveCount(0)
})

test('cabeçalho: logo enviado substitui o nome; sem logo, o nome volta automaticamente', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  const media = await fakeMediaBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await page.getByRole('button', { name: /^Cabeçalho/ }).click()

  const homeLink = preview(page).getByRole('link', { name: 'Sua Empresa — início' })
  await expect(homeLink).toContainText('Sua Empresa')
  await expect(homeLink.locator('img')).toHaveCount(0)

  await page.getByLabel(/^Logo da empresa/).setInputFiles({ name: 'logo.png', mimeType: 'image/png', buffer: await sampleImage(page, 'image/png') })
  await expect(page.getByRole('button', { name: 'Remover imagem' })).toBeVisible()
  expect(media.registros.at(-1)).toMatchObject({ mime: 'image/webp' })
  await expect(homeLink.locator('img')).toHaveCount(1)
  await expect(homeLink).not.toContainText('Sua Empresa')

  // Remover o logo volta para o nome automático
  await page.getByRole('button', { name: 'Remover imagem' }).click()
  await expect(homeLink.locator('img')).toHaveCount(0)
  await expect(homeLink).toContainText('Sua Empresa')
})

test('cria "Carrossel de Video 01": navega na prévia e abre o vídeo do YouTube sem cookies', async ({ page }, testInfo) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await fakeMediaBackend(page)
  // Nada sai para o YouTube durante o teste.
  const youtube: string[] = []
  await page.route(/youtube(-nocookie)?\.com/, async (route) => {
    youtube.push(route.request().url())
    await route.fulfill({ status: 200, contentType: 'text/html', body: '<p>player</p>' })
  })
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()

  await page.getByRole('button', { name: 'Nova seção' }).click()
  await page.getByRole('menuitem', { name: 'Carrossel de vídeos' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Carrossel de Video 01' })).toBeVisible()

  const frame = preview(page)
  await expect(frame.getByRole('heading', { level: 2, name: 'Assista e conheça' })).toBeVisible()
  const carousel = frame.getByRole('region', { name: 'Assista e conheça' })
  await expect(carousel.getByRole('heading', { level: 3 })).toHaveText('Título do vídeo 1')
  // Teclado (foco + Enter): a prévia em escala ainda pode estar rolando até a seção nova,
  // e um clique calculado nesse meio-tempo cai fora do botão.
  await frame.getByRole('button', { name: 'Próximo' }).focus()
  await page.keyboard.press('Enter')
  await expect(carousel.getByRole('heading', { level: 3 })).toHaveText('Título do vídeo 2')
  await frame.getByRole('button', { name: 'Anterior' }).focus()
  await page.keyboard.press('Enter')
  await expect(carousel.getByRole('heading', { level: 3 })).toHaveText('Título do vídeo 1')

  // Link inválido é apontado no editor; link do YouTube é aceito
  const link = page.getByLabel(/^Link do YouTube/).first()
  await link.fill('https://vimeo.com/123')
  await expect(page.getByText('Use um link do YouTube (youtube.com/watch?v=… ou youtu.be/…).').first()).toBeVisible()
  await link.fill('https://youtu.be/hEJnMQG9ev8')
  await expect(page.getByText('Use um link do YouTube (youtube.com/watch?v=… ou youtu.be/…).')).toHaveCount(0)

  expect(youtube).toHaveLength(0) // nada carregado antes do clique
  // Ativa pelo teclado (foco + Enter): clique por coordenadas dentro da prévia em escala + 3D é instável no Playwright.
  const activeCard = frame.getByRole('button', { name: 'Assistir: Título do vídeo 1' })
  await activeCard.focus()
  await activeCard.press('Enter')
  const player = frame.locator('dialog[open] iframe')
  await expect(player).toHaveAttribute('src', /^https:\/\/www\.youtube-nocookie\.com\/embed\/hEJnMQG9ev8/)
  await page.evaluate(() => document.fonts.ready)
  await page.locator('iframe[title="Pré-visualização do site"]').screenshot({ path: testInfo.outputPath('carrossel-dialogo.png') })
  await frame.getByRole('button', { name: /Fechar/ }).click()
  await expect(frame.locator('dialog[open]')).toHaveCount(0)
  await page.locator('iframe[title="Pré-visualização do site"]').screenshot({ path: testInfo.outputPath('carrossel.png') })
})

test('rodapé: logo enviado substitui o nome; sem logo, o nome volta automaticamente', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  const media = await fakeMediaBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await page.getByRole('button', { name: /^Rodapé/ }).click()

  const footer = preview(page).locator('footer')
  await expect(footer.locator('img')).toHaveCount(0)
  await expect(footer).toContainText('Sua Empresa')

  await page.getByLabel(/^Logo da empresa \(rodapé\)/).setInputFiles({ name: 'logo-claro.png', mimeType: 'image/png', buffer: await sampleImage(page, 'image/png') })
  await expect(page.getByRole('button', { name: 'Remover imagem' })).toBeVisible()
  expect(media.registros.at(-1)).toMatchObject({ mime: 'image/webp' })
  await expect(footer.locator('img')).toHaveCount(1)
  await expect(footer.locator('img')).toHaveAttribute('alt', 'Sua Empresa')

  await page.getByRole('button', { name: 'Remover imagem' }).click()
  await expect(footer.locator('img')).toHaveCount(0)
  await expect(footer).toContainText('Sua Empresa')
})

test('identidade: cor de fundo global muda o fundo da prévia e ajusta o texto', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await page.getByRole('button', { name: /Identidade e SEO/ }).click()

  const siteVar = (name: string) =>
    page
      .locator('iframe[title="Pré-visualização do site"]')
      .evaluate((el, prop) => (el as HTMLIFrameElement).contentDocument!.querySelector<HTMLElement>('.site-root')!.style.getPropertyValue(prop), name)

  await page.getByRole('textbox', { name: 'Cor de fundo do site (global)', exact: true }).fill('#0e1a12')
  await expect.poll(() => siteVar('--site-background')).toBe('#0e1a12')
  expect(await siteVar('--site-foreground')).toBe('#f1f5ff') // texto claro sobre fundo escuro
  await expect(page.getByText('Alterações não salvas')).toBeVisible()
})

test('fundo da seção: cor sólida, degradê de 3 cores e volta ao tema', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await page.getByRole('button', { name: /^Serviços/ }).click()

  const sectionStyle = (prop: string) =>
    page
      .locator('iframe[title="Pré-visualização do site"]')
      .evaluate(
        (el, name) => {
          const section = (el as HTMLIFrameElement).contentDocument!.querySelector<HTMLElement>('#servicos')!
          return name === 'background' ? section.style.background : section.style.getPropertyValue(name)
        },
        prop,
      )

  const group = page.getByRole('group', { name: 'Cor de fundo da seção' })
  await group.getByText('Cor sólida', { exact: true }).click()
  await group.getByRole('textbox', { name: 'Cor', exact: true }).fill('#0f172a')
  await expect.poll(() => sectionStyle('--site-background')).toBe('#0f172a')
  expect(await sectionStyle('--site-foreground')).toBe('#f1f5ff') // texto claro automático

  await group.getByText('Degradê', { exact: true }).click()
  await group.getByRole('textbox', { name: 'Cor 2', exact: true }).fill('#1e1b4b')
  await group.getByRole('button', { name: 'Adicionar 3ª cor' }).click()
  await group.getByRole('textbox', { name: 'Cor 3', exact: true }).fill('#312e81')
  await group.getByRole('combobox', { name: 'Direção do degradê' }).click()
  await page.getByRole('option', { name: /Diagonal ↘/ }).click()
  await expect.poll(() => sectionStyle('background')).toContain('linear-gradient(135deg')
  expect(await sectionStyle('background')).toMatch(/rgb\(49, 46, 129\)|#312e81/)
  await expect(group.getByRole('status')).toHaveCount(0) // degradê escuro: sem aviso de leitura

  await group.getByText('Tema', { exact: true }).click()
  await expect.poll(() => sectionStyle('background')).toBe('')
  await expect(page.getByText('Alterações não salvas')).toBeVisible()
})

test('cor do texto da seção: personalizada aplica na prévia, avisa contraste e volta ao automático', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await page.getByRole('button', { name: /^Destaque principal/ }).click()

  const heroVar = (name: string) =>
    page
      .locator('iframe[title="Pré-visualização do site"]')
      .evaluate((el, prop) => (el as HTMLIFrameElement).contentDocument!.querySelector<HTMLElement>('#inicio')!.style.getPropertyValue(prop), name)

  const group = page.getByRole('group', { name: 'Cor do texto da seção' })
  await group.getByText('Personalizada', { exact: true }).click()
  // Começa pelas cores automáticas atuais
  await expect(group.getByRole('textbox', { name: 'Títulos e texto principal', exact: true })).toHaveValue('#0b1324')

  await group.getByRole('textbox', { name: 'Títulos e texto principal', exact: true }).fill('#7f1d1d')
  await group
    .getByRole('textbox', { name: 'Destaque 1 (botões, ícones, selos e início do trecho em destaque)', exact: true })
    .fill('#166534')
  await expect.poll(() => heroVar('--site-foreground')).toBe('#7f1d1d')
  expect(await heroVar('--site-primary')).toBe('#166534')
  await expect(group.getByRole('status')).toHaveCount(0)

  // Texto quase branco sobre fundo branco: aviso de contraste
  await group.getByRole('textbox', { name: 'Texto secundário (subtítulos e descrições)', exact: true }).fill('#f1f5f9')
  await expect(group.getByRole('status')).toContainText('Texto secundário: pouco contraste com o fundo')

  await group.getByText('Automática', { exact: true }).click()
  await expect.poll(() => heroVar('--site-foreground')).toBe('')
  await expect(page.getByText('Alterações não salvas')).toBeVisible()
})

test('carrossel: formatos 9:16, quadrado e 4:3 mudam a proporção dos cartões na prévia', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await page.getByRole('button', { name: 'Nova seção' }).click()
  await page.getByRole('menuitem', { name: 'Carrossel de vídeos' }).click()

  const ratio = () =>
    page.locator('iframe[title="Pré-visualização do site"]').evaluate((el) => {
      const poster = (el as HTMLIFrameElement).contentDocument!.querySelector<HTMLElement>('.vc-card .vc-poster')!
      // offsetWidth/Height: tamanho do layout, sem a rotação 3D dos cartões laterais.
      return Math.round((poster.offsetWidth / poster.offsetHeight) * 100) / 100
    })

  for (const [option, expected] of [
    [/Vertical 9:16/, 0.56],
    [/Quadrado \(1:1\)/, 1],
    [/Clássico \(horizontal, 4:3\)/, 1.33],
  ] as const) {
    await page.getByRole('combobox', { name: 'Formato dos cartões' }).click()
    await page.getByRole('option', { name: option }).click()
    await expect.poll(ratio).toBeCloseTo(expected, 1)
  }
})

test('cria "PlayVídeo-VSL-01": link do vídeo, play grande na prévia e proporção vertical', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  // Nenhum vídeo é baixado de fora durante o teste.
  await page.route('https://cdn.exemplo.test/**', (route) => route.abort())
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()

  await page.getByRole('button', { name: 'Nova seção' }).click()
  await page.getByRole('menuitem', { name: 'Vídeo de vendas (VSL)' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'PlayVídeo-VSL-01' })).toBeVisible()

  const frame = preview(page)
  await expect(frame.getByRole('heading', { level: 2, name: 'Veja em poucos minutos como podemos ajudar você' })).toBeVisible()
  await expect(frame.getByText('Vídeo em breve')).toBeVisible()

  const link = page.getByRole('textbox', { name: 'Ou link direto (MP4/WebM ou YouTube)' })
  await link.fill('http://inseguro.com/vsl.mp4')
  await expect(page.getByText('Use um endereço que comece com https:// (sem espaços).')).toBeVisible()
  await link.fill('https://cdn.exemplo.test/vsl.mp4')
  await expect(frame.getByRole('button', { name: 'Assistir: Veja em poucos minutos como podemos ajudar você' })).toBeVisible()
  await expect(frame.locator('video')).toHaveAttribute('src', 'https://cdn.exemplo.test/vsl.mp4')

  // Link do YouTube: a capa abre o player do YouTube (sem cookies), não um <video> quebrado.
  await link.fill('https://www.youtube.com/watch?v=Tu2ttzIcnPQ')
  await frame.getByRole('button', { name: 'Assistir: Veja em poucos minutos como podemos ajudar você' }).click()
  await expect(frame.locator('iframe')).toHaveAttribute('src', /youtube-nocookie\.com\/embed\/Tu2ttzIcnPQ/)
  await expect(frame.locator('video')).toHaveCount(0)
  await link.fill('https://cdn.exemplo.test/vsl.mp4')

  await page.getByRole('combobox', { name: 'Proporção do player' }).click()
  await page.getByRole('option', { name: /Vertical 9:16/ }).click()
  await expect(frame.locator('.vp-frame')).toHaveAttribute('data-format', 'story')
  await expect(page.getByText('Alterações não salvas')).toBeVisible()
})


test('seção carregada sob demanda (VSL) aparece ao rolar até ela no site público', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await page.route('https://cdn.exemplo.test/**', (route) => route.abort())
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await page.getByRole('button', { name: 'Nova seção' }).click()
  await page.getByRole('menuitem', { name: 'Vídeo de vendas (VSL)' }).click()
  await page.getByRole('textbox', { name: 'Ou link direto (MP4/WebM ou YouTube)' }).fill('https://cdn.exemplo.test/vsl.mp4')
  await page.getByRole('button', { name: 'Publicar', exact: true }).click()
  await expect(page.getByText('Publicada em', { exact: false })).toBeVisible()

  await page.goto('/')
  const frame = page.locator('.vp-frame')
  await frame.scrollIntoViewIfNeeded()
  // A animação de entrada dispara ao cruzar a tela: o VSL precisa chegar a opacidade 1.
  await expect.poll(() => frame.evaluate((el) => getComputedStyle(el).opacity)).toBe('1')
  await expect(page.getByRole('button', { name: /^Assistir:/ })).toBeVisible()
})

test('excluir seção pede confirmação: cancelar mantém e excluir remove do rascunho', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await page.getByRole('button', { name: 'Nova seção' }).click()
  await page.getByRole('menuitem', { name: 'Vídeo de vendas (VSL)' }).click()
  // Ao criar, o painel da seção abre: volta para a lista de seções.
  await page.getByRole('button', { name: 'Todas as seções' }).click()

  // Cabeçalho e rodapé são fixos: não têm lixeira
  expect(await page.getByRole('button', { name: 'Excluir Cabeçalho' }).count()).toBe(0)
  expect(await page.getByRole('button', { name: 'Excluir Rodapé' }).count()).toBe(0)

  await page.getByRole('button', { name: 'Excluir PlayVídeo-VSL-01' }).click()
  const dialog = page.getByRole('dialog', { name: 'Excluir esta seção?' })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('"PlayVídeo-VSL-01" sai do rascunho')

  await dialog.getByRole('button', { name: 'Cancelar' }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Excluir PlayVídeo-VSL-01' })).toBeVisible()

  await page.getByRole('button', { name: 'Excluir PlayVídeo-VSL-01' }).click()
  await page.getByRole('dialog', { name: 'Excluir esta seção?' }).getByRole('button', { name: 'Excluir seção' }).click()
  await expect(page.getByRole('button', { name: 'Excluir PlayVídeo-VSL-01' })).toHaveCount(0)
  await expect(preview(page).getByRole('heading', { name: 'Veja em poucos minutos como podemos ajudar você' })).toHaveCount(0)
  await expect(page.getByText('Alterações não salvas')).toBeVisible()
})

test('categorias: cria, move seções para dentro, tira delas e exclui sem apagar as seções', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()

  await page.getByRole('button', { name: 'Nova categoria' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nova categoria' })
  const name = dialog.getByRole('textbox', { name: 'Nome da categoria' })
  await name.fill('Menu')
  await dialog.getByRole('button', { name: 'Criar categoria' }).click()

  const group = page.getByRole('region', { name: 'Categoria Menu' })
  await expect(group).toContainText('Nenhuma seção aqui')

  await page.getByRole('button', { name: 'Categoria de Serviços' }).click()
  await page.getByRole('menuitem', { name: 'Menu', exact: true }).click()
  await page.getByRole('button', { name: 'Categoria de Sobre' }).click()
  await page.getByRole('menuitem', { name: 'Menu', exact: true }).click()
  await expect(group.getByRole('button', { name: 'Excluir Serviços' })).toBeVisible()
  await expect(group.getByRole('button', { name: 'Excluir Sobre' })).toBeVisible()

  // Tirar da categoria: a seção sai do bloco e volta para a lista geral
  await page.getByRole('button', { name: 'Categoria de Sobre' }).click()
  await page.getByRole('menuitem', { name: 'Sem categoria', exact: true }).click()
  await expect(group.getByRole('button', { name: 'Excluir Sobre' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Excluir Sobre' })).toBeVisible()

  // Excluir a categoria não apaga as seções
  await page.getByRole('button', { name: 'Excluir categoria Menu' }).click()
  await expect(page.getByRole('region', { name: 'Categoria Menu' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Excluir Serviços' })).toBeVisible()
  await expect(page.getByText('Alterações não salvas')).toBeVisible()
})

/**
 * Simula o arraste nativo: dragstart no card, depois dragover e drop no alvo (com o mesmo DataTransfer).
 * O ponto do mouse no Chromium do Playwright começava no card vizinho, então os eventos são disparados
 * direto nos elementos. A lógica de soltar (id do card, pasta de destino) é a mesma do uso real.
 */
async function dragCard(page: Page, source: Locator, target: Locator) {
  await settle(source)
  const from = await source.elementHandle()
  await page.evaluate((el) => {
    const dt = new DataTransfer()
    ;(window as unknown as { dt: DataTransfer }).dt = dt
    el.dispatchEvent(new DragEvent('dragstart', { bubbles: true, dataTransfer: dt }))
  }, from)
  await expect(target).toBeVisible()
  const to = await target.elementHandle()
  await page.evaluate((el) => {
    const dt = (window as unknown as { dt: DataTransfer }).dt
    el.dispatchEvent(new DragEvent('dragover', { bubbles: true, cancelable: true, dataTransfer: dt }))
    el.dispatchEvent(new DragEvent('drop', { bubbles: true, cancelable: true, dataTransfer: dt }))
  }, to)
}

test('arrastar e soltar: card vai para a pasta da categoria e volta para "sem categoria"', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()

  await page.getByRole('button', { name: 'Nova categoria' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nova categoria' })
  await dialog.getByRole('textbox', { name: 'Nome da categoria' }).fill('Menu')
  await dialog.getByRole('button', { name: 'Criar categoria' }).click()
  await expect(dialog).toBeHidden()

  const group = page.getByRole('region', { name: 'Categoria Menu' })
  await dragCard(page, page.locator('li[draggable="true"]').filter({ hasText: 'Serviços' }), group)
  await expect(group.getByRole('button', { name: 'Excluir Serviços' })).toBeVisible()

  await dragCard(page, group.locator('li[draggable="true"]').filter({ hasText: 'Serviços' }), page.getByText('Solte aqui para tirar da categoria'))
  await expect(group.getByRole('button', { name: 'Excluir Serviços' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Excluir Serviços' })).toBeVisible()
})

test('categorias sobrevivem a salvar o rascunho e recarregar a página', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()
  await page.getByRole('button', { name: 'Nova categoria' }).click()
  const dialog = page.getByRole('dialog', { name: 'Nova categoria' })
  await dialog.getByRole('textbox', { name: 'Nome da categoria' }).fill('Menu')
  await dialog.getByRole('button', { name: 'Criar categoria' }).click()
  await expect(page.getByRole('region', { name: 'Categoria Menu' })).toBeVisible()
  await page.getByRole('button', { name: 'Salvar rascunho' }).click()
  await expect(page.getByText('Alterações não salvas')).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('region', { name: 'Categoria Menu' })).toBeVisible()
})

test('lista de seções: cards cabem na coluna, ícones visíveis e sem rolagem horizontal', async ({ page }) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()

  const card = page.locator('li').filter({ hasText: 'Destaque principal' }).first()
  const icon = page.getByRole('button', { name: 'Excluir Destaque principal' })
  await expect(icon).toBeVisible()
  const cardBox = await card.boundingBox()
  const iconBox = await icon.boundingBox()
  if (!cardBox || !iconBox) throw new Error('card ou ícone sem posição')
  // O ícone de excluir (o mais à direita) precisa estar dentro do card.
  expect(iconBox.x + iconBox.width).toBeLessThanOrEqual(cardBox.x + cardBox.width + 1)

  // A coluna da lista não tem rolagem horizontal.
  const overflowX = await card.evaluate((el) => {
    let node: HTMLElement | null = el.parentElement
    while (node && getComputedStyle(node).overflowY !== 'auto') node = node.parentElement
    return node ? node.scrollWidth - node.clientWidth : 0
  })
  expect(overflowX).toBeLessThanOrEqual(1)
})

test('Hero Interativo 02: cria pela lista de seções, desenha partículas e edita textos e botão', async ({ page }, testInfo) => {
  await signInAs(page, 'admin')
  await fakeSiteBackend(page)
  await page.goto('/admin/site')
  await page.getByRole('button', { name: 'Criar a partir do modelo Institucional' }).click()

  await page.getByRole('button', { name: 'Nova seção' }).click()
  await page.getByRole('menuitem', { name: 'Hero Interativo 02 (partículas)' }).click()
  await expect(page.getByRole('heading', { level: 2, name: 'Hero Interativo 02' })).toBeVisible()

  const frame = preview(page)
  const stage = frame.locator('section.ph-stage')
  await stage.scrollIntoViewIfNeeded()
  await expect(frame.getByRole('heading', { level: 2, name: 'Sua marca' })).toBeVisible()
  await expect(frame.getByRole('link', { name: /Quero saber mais/ })).toHaveAttribute('href', '#contato')

  // O canvas cobre a seção e tem partículas desenhadas (pixels não transparentes).
  const canvas = stage.locator('canvas')
  await expect.poll(() => canvas.evaluate((el: HTMLCanvasElement) => el.width)).toBeGreaterThan(0)
  await expect
    .poll(() =>
      canvas.evaluate((el: HTMLCanvasElement) => {
        const data = el.getContext('2d')?.getImageData(0, 0, el.width, el.height).data ?? []
        let painted = 0
        for (let i = 3; i < data.length; i += 4) if ((data[i] ?? 0) > 0) painted++
        return painted
      }),
    )
    .toBeGreaterThan(100)

  // Textos, botão e densidade editáveis com reflexo na prévia.
  await page.getByLabel(/^Título .grande/).fill('Leila Marques')
  await expect(frame.getByRole('heading', { level: 2, name: 'Leila Marques' })).toBeVisible()
  await page.getByRole('textbox', { name: 'Texto do botão' }).fill('Agendar consulta')
  await expect(frame.getByRole('link', { name: /Agendar consulta/ })).toBeVisible()
  await page.getByRole('combobox', { name: 'Quantidade de partículas' }).click()
  await page.getByRole('option', { name: 'Muita' }).click()
  await expect(page.getByText('Alterações não salvas')).toBeVisible()

  await page.waitForTimeout(1800) // entrada em sequência (~1,5 s)
  await page.locator('iframe[title="Pré-visualização do site"]').screenshot({ path: testInfo.outputPath('hero-interativo-02.png') })
})
