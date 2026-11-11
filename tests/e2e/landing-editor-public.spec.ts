import { expect, test, type Page } from '@playwright/test'

/*
 * Landing publicada (/lp/:slug): contêineres sem conteúdo visível não podem deixar faixa em branco.
 * Reproduz o caso relatado: uma Seção vazia no topo, seguida do vídeo de vendas (VSL).
 * A leitura pública é interceptada (get_public_landing); nada sai da máquina.
 */

const colors = {
  background: '#ffffff', foreground: '#0b1324', primary: '#b91c1c', primaryForeground: '#ffffff', accent: '#0ea5e9',
  accentForeground: '#ffffff', muted: '#f1f5f9', mutedForeground: '#475569', card: '#ffffff', border: '#e2e8f0', ring: '#b91c1c',
}
const theme = { preset: 'horizonte', colors, darkColors: { ...colors, background: '#0b1324', foreground: '#f8fafc' }, fonts: { heading: 'sora', body: 'plus-jakarta-sans' }, radius: 'lg', motion: 'none' }

const emptySection = (id: string, children: unknown[] = []) => ({ id, type: 'section', v: 1, props: { tone: 'light', width: 'normal', align: 'center' }, children })
const vsl = {
  id: 'vsl-1',
  type: 'video-player',
  v: 1,
  props: {
    name: 'PlayVídeo-VSL-01', tone: 'muted', eyebrow: 'Assista antes de decidir', title: 'Veja em poucos minutos como podemos ajudar você',
    subtitle: '', videoUrl: '', externalUrl: '', posterUrl: '', videoLabel: '', captionsUrl: '', format: 'wide',
    cta: { label: 'Quero saber mais', href: '#contato' },
  },
}

async function openPublished(page: Page, blocks: unknown[], viewport = { width: 1440, height: 900 }) {
  await page.setViewportSize(viewport)
  await page.route('https://e2etest.supabase.co/rest/v1/rpc/get_public_landing', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ title: 'Teste', slug: 'teste', document: { schemaVersion: 2, seo: { title: 'Teste', description: 'Teste' }, theme, blocks } }),
    }),
  )
  await page.goto('/lp/teste')
}

test('seção vazia no topo não deixa faixa em branco: o vídeo de vendas começa no topo da página', async ({ page }) => {
  await openPublished(page, [emptySection('vazia'), vsl])
  const firstSection = page.locator('main section').first()
  await expect(firstSection).toContainText('Assista antes de decidir')
  expect((await firstSection.boundingBox())?.y).toBe(0)
  await expect(page.locator('main section')).toHaveCount(1)
})

test('seção só com imagem ainda não enviada também não deixa faixa em branco', async ({ page }) => {
  await openPublished(page, [emptySection('so-imagem', [{ id: 'img', type: 'image', v: 1, props: { url: '', alt: '' } }]), vsl])
  expect((await page.locator('main section').first().boundingBox())?.y).toBe(0)
  await expect(page.locator('main section').first()).toContainText('Assista antes de decidir')
})

test('seção com elementos ocultos no computador some no computador e aparece no celular', async ({ page }) => {
  const onlyMobile = emptySection('so-celular', [{ id: 't', type: 'heading', v: 1, props: { text: 'Só no celular', level: 'h2' }, responsive: { hideOn: ['desktop'] } }])
  await openPublished(page, [onlyMobile, vsl])
  expect((await page.getByRole('heading', { name: 'Veja em poucos minutos como podemos ajudar você' }).boundingBox())?.y).toBeLessThan(200)

  await openPublished(page, [onlyMobile, vsl], { width: 390, height: 844 })
  await expect(page.getByRole('heading', { name: 'Só no celular' })).toBeVisible()
})
