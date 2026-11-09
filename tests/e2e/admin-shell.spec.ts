import { expect, test, type Page } from '@playwright/test'
import { signInAs } from './fake-supabase'

/*
 * Layout autenticado do admin (Fase 2) com sessão SIMULADA.
 * Valida a experiência por perfil; a segurança real dos dados é testada na RLS (supabase/tests).
 */

const isDesktop = (page: Page) => (page.viewportSize()?.width ?? 0) >= 1024

async function openNavigation(page: Page) {
  if (!isDesktop(page)) await page.getByRole('button', { name: 'Abrir menu' }).click()
  return page.getByRole('navigation', { name: 'Navegação do painel' })
}

test('administrador vê todos os módulos e o painel sem números fictícios', async ({ page }) => {
  await signInAs(page, 'admin')
  await page.goto('/admin')

  await expect(page.getByRole('heading', { level: 1, name: 'Olá, Marina' })).toBeVisible()
  await expect(page.getByText('Sem dados').first()).toBeAttached()

  const nav = await openNavigation(page)
  for (const label of ['Painel', 'Contatos', 'CRM', 'Relatórios', 'Site', 'Landing pages', 'Formulários', 'Configurações']) {
    await expect(nav.getByRole('link', { name: label })).toBeVisible()
  }
})

test('operador comercial vê só os módulos comerciais e é barrado nas áreas restritas', async ({ page }) => {
  await signInAs(page, 'sales')
  await page.goto('/admin')

  const nav = await openNavigation(page)
  await expect(nav.getByRole('link', { name: 'CRM' })).toBeVisible()
  for (const hidden of ['Relatórios', 'Site', 'Landing pages', 'Formulários', 'Configurações']) {
    await expect(nav.getByRole('link', { name: hidden })).toHaveCount(0)
  }

  await page.goto('/admin/configuracoes')
  await expect(page.getByRole('heading', { name: 'Área restrita ao seu perfil' })).toBeVisible()
})

test('navegar pelo menu abre o módulo e marca o item ativo', async ({ page }) => {
  await signInAs(page, 'manager')
  await page.goto('/admin')

  const nav = await openNavigation(page)
  await nav.getByRole('link', { name: 'Contatos' }).click()
  await expect(page).toHaveURL(/\/admin\/contatos$/)
  await expect(page.getByRole('heading', { level: 1, name: 'Contatos' })).toBeVisible()

  if (isDesktop(page)) {
    await expect(nav.getByRole('link', { name: 'Contatos' })).toHaveAttribute('aria-current', 'page')
  } else {
    // a gaveta fecha ao navegar no celular/tablet
    await expect(page.getByRole('navigation', { name: 'Navegação do painel' })).toHaveCount(0)
  }
})

test('conta autenticada sem perfil de acesso recebe aviso e pode sair', async ({ page }) => {
  await signInAs(page, null)
  await page.goto('/admin')
  await expect(page.getByRole('heading', { name: 'Sua conta ainda não tem acesso' })).toBeVisible()
  await page.getByRole('button', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/admin\/login$/)
})

test('logout pelo menu da conta volta para o login', async ({ page }) => {
  await signInAs(page, 'admin')
  await page.goto('/admin')
  await page.getByRole('button', { name: /Menu da conta/ }).click()
  await expect(page.getByText('Administrador', { exact: true })).toBeVisible()
  await page.getByRole('menuitem', { name: 'Sair' }).click()
  await expect(page).toHaveURL(/\/admin\/login$/)
})

test('sessão ativa no /admin/login vai direto para o painel', async ({ page }) => {
  await signInAs(page, 'admin')
  await page.goto('/admin/login')
  await expect(page).toHaveURL(/\/admin$/)
})

test('layout sem rolagem horizontal e captura para revisão visual', async ({ page }, testInfo) => {
  await signInAs(page, 'admin')
  await page.goto('/admin')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  await page.evaluate(() => document.fonts.ready)

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
  expect(overflow).toBeLessThanOrEqual(0)

  await page.screenshot({ path: testInfo.outputPath(`painel-${testInfo.project.name}.png`), fullPage: true })
})
