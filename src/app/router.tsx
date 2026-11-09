import type { ComponentType } from 'react'
import { createBrowserRouter, type RouteObject } from 'react-router'
import { NotFoundPage } from '@/public-site/NotFoundPage'
import { PublicShell } from '@/public-site/PublicShell'
import { SiteSetupPage } from '@/public-site/SiteSetupPage'

/** Carrega um módulo com export default sob demanda (um chunk por página). */
function page(loader: () => Promise<{ default: ComponentType }>): RouteObject['lazy'] {
  return async () => ({ Component: (await loader()).default })
}

export const routes: RouteObject[] = [
  // ---------------------------------------------------------------------------
  // Área pública — bundle inicial. Home e /:slug chegam nas Fases 4 e 5.
  // ---------------------------------------------------------------------------
  {
    element: <PublicShell />,
    children: [
      { index: true, element: <SiteSetupPage /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },

  // ---------------------------------------------------------------------------
  // Área administrativa — tudo carregado sob demanda (nada disso vai para o visitante).
  // ---------------------------------------------------------------------------
  {
    path: '/admin',
    lazy: page(() => import('@/admin/AdminRoot')),
    children: [
      { path: 'login', lazy: page(() => import('@/admin/auth/pages/LoginPage')) },
      { path: 'recuperar-senha', lazy: page(() => import('@/admin/auth/pages/ForgotPasswordPage')) },
      { path: 'redefinir-senha', lazy: page(() => import('@/admin/auth/pages/ResetPasswordPage')) },
      {
        lazy: page(() => import('@/admin/layouts/ProtectedLayout')),
        children: [
          { index: true, lazy: page(() => import('@/modules/dashboard/DashboardPage')) },
          {
            path: 'contatos',
            children: [
              { index: true, lazy: page(() => import('@/modules/contacts/ContactsPage')) },
              { path: ':id', lazy: page(() => import('@/modules/contacts/ContactDetailPage')) },
            ],
          },
          { path: 'crm/*', lazy: page(() => import('@/modules/crm/CrmPage')) },
          { path: 'relatorios/*', lazy: page(() => import('@/modules/reports/ReportsPage')) },
          { path: 'site/*', lazy: page(() => import('@/modules/home/HomeEditorPage')) },
          { path: 'paginas/*', lazy: page(() => import('@/modules/landing-builder/LandingPagesPage')) },
          { path: 'formularios/*', lazy: page(() => import('@/modules/forms/FormsPage')) },
          { path: 'configuracoes/*', lazy: page(() => import('@/modules/settings/SettingsPage')) },
          { path: '*', lazy: page(() => import('@/admin/layouts/AdminNotFoundPage')) },
        ],
      },
    ],
  },
]

export const router = createBrowserRouter(routes)
