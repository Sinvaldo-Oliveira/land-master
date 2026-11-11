/**
 * Histórico de desfazer/refazer do editor. Funções PURAS e genéricas: guardam referências dos
 * documentos (que são imutáveis), então cada passo custa só o caminho alterado da árvore.
 */

export const HISTORY_LIMIT = 100

/** Alterações seguidas com a mesma chave, dentro deste intervalo, viram um passo só (ex.: digitação). */
export const COALESCE_MS = 1000

export type History<T> = {
  past: T[]
  present: T
  future: T[]
  /** Chave e hora da última alteração, para agrupar digitação contínua. */
  lastKey: string | null
  lastAt: number
}

export function createHistory<T>(initial: T): History<T> {
  return { past: [], present: initial, future: [], lastKey: null, lastAt: 0 }
}

/**
 * Registra um novo estado. Refazer é descartado (o futuro deixa de existir).
 * Com `key`, alterações consecutivas da mesma origem em menos de COALESCE_MS substituem o estado
 * atual em vez de criar um passo: desfazer volta para antes de a pessoa começar a digitar.
 */
export function pushHistory<T>(history: History<T>, next: T, now: number, key: string | null = null): History<T> {
  if (next === history.present) return history
  const coalesce = key !== null && key === history.lastKey && now - history.lastAt < COALESCE_MS && history.past.length > 0
  if (coalesce) return { ...history, present: next, future: [], lastAt: now }
  return {
    past: [...history.past, history.present].slice(-HISTORY_LIMIT),
    present: next,
    future: [],
    lastKey: key,
    lastAt: now,
  }
}

export function canUndo<T>(history: History<T>): boolean {
  return history.past.length > 0
}

export function canRedo<T>(history: History<T>): boolean {
  return history.future.length > 0
}

export function undo<T>(history: History<T>): History<T> {
  const previous = history.past.at(-1)
  if (previous === undefined) return history
  return {
    past: history.past.slice(0, -1),
    present: previous,
    future: [history.present, ...history.future],
    // Depois de desfazer, a próxima alteração é sempre um passo novo.
    lastKey: null,
    lastAt: 0,
  }
}

export function redo<T>(history: History<T>): History<T> {
  const [next, ...rest] = history.future
  if (next === undefined) return history
  return { past: [...history.past, history.present], present: next, future: rest, lastKey: null, lastAt: 0 }
}
