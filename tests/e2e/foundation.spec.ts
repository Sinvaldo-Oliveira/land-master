import { expect, test } from '@playwright/test'

/*
 * Testes da fundação (Fase 2) sem Supabase configurado.
 * Os fluxos com login real entram quando houver um projeto Supabase de desenvolvimento (decisão D2).
 */

test.describe('site público', () => {
  test('mostra o estado honesto de configuração e não carrega código do admin', async ({ page }) => {
    const adminChunks: string[] = []
    page.on('request', (req) => {
      if (/\/assets\/(AdminRoot|ProtectedLayout|ui|LoginPage)-/.test(req.url())) adminChunks.push(req.url())
    })

    await page.goto('/')
    await expect(page.getByRole('heading', { level: 1, name: 'Site em configuração' })).toBeVisible()
    await expect(page).toHaveTitle('Site em configuração')
    expect(adminChunks, 'o visitante não deve baixar chunks do admin').toEqual([])
  })

  test('rota pública inexistente mostra 404 com o layout do site', async ({ page }) => {
    await page.goto('/pagina-que-nao-existe')
    await expect(page.getByRole('heading', { level: 1, name: 'Página não encontrada' })).toBeVisible()
    await expect(page.getByRole('link', { name: 'Ir para o início' })).toHaveAttribute('href', '/')
  })
})

test.describe('área administrativa', () => {
  test('/admin sem sessão redireciona para o login', async ({ page }) => {
    await page.goto('/admin')
    await expect(page).toHaveURL(/\/admin\/login$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible()
  })

  test('rota interna profunda também exige login', async ({ page }) => {
    await page.goto('/admin/crm/qualquer-coisa')
    await expect(page).toHaveURL(/\/admin\/login$/)
  })

  test('login avisa que o Supabase não está configurado e bloqueia o envio', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByRole('status').filter({ hasText: /indisponível|não configurado/i })).toBeVisible()
    await expect(page.getByLabel(/E-mail/)).toBeVisible()
    await expect(page.getByLabel(/Senha/)).toBeVisible()
    await expect(page.getByRole('button', { name: 'Entrar' })).toBeDisabled()
  })

  test('navega do login para a recuperação de senha e volta', async ({ page }) => {
    await page.goto('/admin/login')
    await page.getByRole('link', { name: 'Esqueci minha senha' }).click()
    await expect(page).toHaveURL(/\/admin\/recuperar-senha$/)
    await expect(page.getByRole('heading', { level: 1, name: 'Recuperar senha' })).toBeVisible()
    await page.getByRole('link', { name: 'Voltar para o login' }).click()
    await expect(page).toHaveURL(/\/admin\/login$/)
  })

  test('link de redefinição sem sessão válida é tratado', async ({ page }) => {
    await page.goto('/admin/redefinir-senha')
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  })

  test('tela de login não tem rolagem horizontal', async ({ page }) => {
    await page.goto('/admin/login')
    await expect(page.getByRole('heading', { level: 1, name: 'Entrar' })).toBeVisible()
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
    expect(overflow).toBeLessThanOrEqual(0)
  })
})
