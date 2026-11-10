import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { RouterProvider } from 'react-router/dom'
import '@/styles/index.css'
import { router } from './router'

// O QueryClientProvider fica em src/admin/AdminRoot.tsx: só o painel usa React Query,
// e assim ele não entra no pacote inicial do site público.

const root = document.getElementById('root')
if (!root) throw new Error('Elemento #root não encontrado.')

createRoot(root).render(
  <StrictMode>
    <RouterProvider router={router} />
  </StrictMode>,
)
