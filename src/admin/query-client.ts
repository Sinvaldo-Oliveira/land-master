import { QueryClient } from '@tanstack/react-query'

/**
 * Cliente de dados do painel. Fica no pacote do /admin (carregado sob demanda):
 * o site público não usa React Query e não deve baixá-lo.
 * Instância única por aba, para o cache sobreviver à troca de páginas do painel.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
    mutations: { retry: 0 },
  },
})
