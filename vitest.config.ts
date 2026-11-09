import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

export default defineConfig((configEnv) =>
  mergeConfig(
    typeof viteConfig === 'function' ? viteConfig(configEnv) : viteConfig,
    defineConfig({
      test: {
        environment: 'jsdom',
        setupFiles: ['./src/test/setup.ts'],
        include: ['src/**/*.test.{ts,tsx}', 'scripts/**/*.test.ts'],
        css: false,
      },
    }),
  ),
)
