import { useCallback, useState } from 'react'

/** Estado simples persistido no navegador (preferências de interface). Falha silenciosamente sem storage. */
export function usePersistentState<T>(key: string, initial: T): [T, (value: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const raw = window.localStorage.getItem(key)
      return raw === null ? initial : (JSON.parse(raw) as T)
    } catch {
      return initial
    }
  })

  const update = useCallback(
    (next: T) => {
      setValue(next)
      try {
        window.localStorage.setItem(key, JSON.stringify(next))
      } catch {
        // storage indisponível (modo privado, bloqueio): mantém só em memória
      }
    },
    [key],
  )

  return [value, update]
}
