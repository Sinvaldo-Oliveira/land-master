import { type ClassValue, clsx } from 'clsx'
import { extendTailwindMerge } from 'tailwind-merge'

// Ensina o tailwind-merge que text-admin-* (tamanhos) não conflita com text-admin-ink (cor).
const twMerge = extendTailwindMerge({
  extend: {
    theme: {
      text: ['admin-xs', 'admin-sm', 'admin-base', 'admin-lg', 'admin-xl', 'admin-2xl', 'admin-kpi'],
    },
  },
})

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
