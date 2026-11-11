import { defineConfig, devices } from '@playwright/test'

const PUBLIC_PORT = 4173
const SHELL_PORT = 4174

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']],
  use: { trace: 'retain-on-failure' },
  projects: [
    // Build de produção sem Supabase configurado (o que vai para a Hostinger antes do .env).
    {
      name: 'desktop',
      testMatch: 'foundation.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: `http://localhost:${PUBLIC_PORT}` },
    },
    {
      name: 'mobile',
      testMatch: 'foundation.spec.ts',
      use: { ...devices['Pixel 7'], baseURL: `http://localhost:${PUBLIC_PORT}` },
    },
    // Build com Supabase FICTÍCIO (.env.e2e): sessão e perfil simulados por interceptação de rede.
    {
      name: 'shell-desktop',
      testMatch: 'admin-shell.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: `http://localhost:${SHELL_PORT}` },
    },
    {
      name: 'shell-tablet',
      testMatch: 'admin-shell.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 768, height: 1024 }, baseURL: `http://localhost:${SHELL_PORT}` },
    },
    {
      name: 'shell-mobile',
      testMatch: 'admin-shell.spec.ts',
      use: { ...devices['Pixel 7'], baseURL: `http://localhost:${SHELL_PORT}` },
    },
    // Editor do site com backend falso em memória (mesmo build do Supabase fictício).
    {
      name: 'site-editor',
      testMatch: 'site-editor.spec.ts',
      use: { ...devices['Desktop Chrome'], viewport: { width: 1440, height: 900 }, baseURL: `http://localhost:${SHELL_PORT}` },
    },
  ],
  // Os builds de teste NÃO dependem do .env de quem está desenvolvendo: as variáveis do processo
  // têm prioridade sobre os arquivos .env no Vite. "<...>" é tratado como ausente por src/lib/env.ts
  // (no Windows uma variável vazia é removida em vez de sobrescrever o .env).
  webServer: [
    {
      // Pasta própria: este build usa placeholders e NUNCA pode sobrescrever o dist de produção.
      command: `npx vite build --outDir dist-public-test && npx vite preview --outDir dist-public-test --port ${PUBLIC_PORT} --strictPort`,
      url: `http://localhost:${PUBLIC_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_SUPABASE_URL: '<nao-configurado>',
        VITE_SUPABASE_PUBLISHABLE_KEY: '<nao-configurado>',
        VITE_APP_NAME: 'Painel de Vendas',
      },
    },
    {
      command: `npx vite build --mode e2e --outDir dist-e2e && npx vite preview --mode e2e --outDir dist-e2e --port ${SHELL_PORT} --strictPort`,
      url: `http://localhost:${SHELL_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        VITE_SUPABASE_URL: 'https://e2etest.supabase.co',
        VITE_SUPABASE_PUBLISHABLE_KEY: 'e2e-chave-publica-ficticia',
        VITE_APP_NAME: 'Painel de Vendas',
      },
    },
  ],
})
