import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { findPublicEnvSecrets } from './scripts/public-env-guard'

export default defineConfig(({ mode }) => {
  // Bloqueia dev e build se alguma variável pública (VITE_*) contiver um segredo.
  const problems = findPublicEnvSecrets(loadEnv(mode, process.cwd(), 'VITE_'))
  if (problems.length > 0) {
    throw new Error(
      [
        'Segredo encontrado em variável pública do .env — ela seria enviada ao navegador:',
        ...problems.map((p) => `  • ${p}`),
        'Remova o valor do .env (segredos nunca usam o prefixo VITE_) e gere uma nova chave no Supabase.',
      ].join('\n'),
    )
  }

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
    },
    build: {
      target: 'es2022',
      sourcemap: false,
      // Usado por scripts/check-bundle.mjs (que o remove de dist/ depois da checagem).
      manifest: true,
    },
  }
})
