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
  ],
  webServer: [
    {
      command: `npx vite build && npx vite preview --port ${PUBLIC_PORT} --strictPort`,
      url: `http://localhost:${PUBLIC_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
    {
      command: `npx vite build --mode e2e --outDir dist-e2e && npx vite preview --mode e2e --outDir dist-e2e --port ${SHELL_PORT} --strictPort`,
      url: `http://localhost:${SHELL_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
    },
  ],
})
