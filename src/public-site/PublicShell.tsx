import { Outlet } from 'react-router'

/**
 * Casca do site público. Este arquivo e tudo o que ele importa vão no bundle inicial:
 * NUNCA importe nada de src/admin ou src/modules aqui.
 * Na Fase 4 recebe o ThemeProvider (.site-root) e o renderizador de páginas.
 */
export function PublicShell() {
  return (
    <div className="min-h-dvh bg-white text-neutral-900 antialiased [font-family:ui-sans-serif,system-ui,sans-serif]">
      <Outlet />
    </div>
  )
}
