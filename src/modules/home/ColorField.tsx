import { useState } from 'react'
import { Field, fieldDescribedBy, Input } from '@/admin/ui'

export const HEX = /^#[0-9a-fA-F]{6}$/

export function ColorField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (hex: string) => void }) {
  // Remontado via key quando a cor muda pelo seletor, então o texto sempre parte do valor atual.
  const [text, setText] = useState(value)
  const error = HEX.test(text) ? undefined : 'Use o formato #RRGGBB.'
  return (
    <Field label={label} htmlFor={id} error={error}>
      <div className="flex items-center gap-2">
        <input
          type="color"
          aria-label={`${label} (seletor)`}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-9 w-12 shrink-0 cursor-pointer rounded-admin border border-admin-rule bg-admin-card p-1"
        />
        <Input
          id={id}
          value={text}
          invalid={Boolean(error)}
          aria-describedby={fieldDescribedBy(id, { error })}
          onChange={(e) => {
            setText(e.target.value)
            if (HEX.test(e.target.value)) onChange(e.target.value.toLowerCase())
          }}
          className="font-admin-mono"
        />
      </div>
    </Field>
  )
}

