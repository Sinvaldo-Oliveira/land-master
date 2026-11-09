/** Monta o `aria-describedby` de um controle dentro de `<Field>` (dica e/ou erro). */
export function fieldDescribedBy(
  id: string,
  { error, hint }: { error?: string | undefined; hint?: string | undefined },
): string | undefined {
  const ids = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean)
  return ids.length > 0 ? ids.join(' ') : undefined
}
