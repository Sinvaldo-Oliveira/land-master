import { TriangleAlert } from 'lucide-react'
import { onColor, validText } from '@/renderer/surface'
import type { SectionBackground, SectionText, SiteTheme } from '@/renderer/types'
import { ColorField } from './ColorField'
import { sectionSurface, startText, textWarnings } from './editor-state'

type Mode = 'auto' | 'custom'

const modes: { value: Mode; label: string }[] = [
  { value: 'auto', label: 'Automática' },
  { value: 'custom', label: 'Personalizada' },
]

const colorFields: { key: keyof SectionText; label: string }[] = [
  { key: 'foreground', label: 'Títulos e texto principal' },
  { key: 'muted', label: 'Texto secundário (subtítulos e descrições)' },
  { key: 'primary', label: 'Destaque 1 (botões, ícones, selos e início do trecho em destaque)' },
  { key: 'accent', label: 'Destaque 2 (fim do trecho em destaque e detalhes)' },
]

/**
 * Cores de texto da seção: automáticas (acompanham o fundo) ou escolhidas uma a uma.
 * A amostra usa o fundo real da seção; os avisos medem o contraste no pior ponto do fundo.
 */
export function TextColorsField({
  id,
  label,
  hint,
  value,
  section,
  theme,
  onChange,
}: {
  id: string
  label: string
  hint?: string | undefined
  value: SectionText | undefined
  section: Record<string, unknown>
  theme: SiteTheme | undefined
  onChange: (next: SectionText | undefined) => void
}) {
  const text = validText(value)
  const mode: Mode = text ? 'custom' : 'auto'
  const like = {
    type: typeof section.type === 'string' ? section.type : '',
    tone: section.tone,
    background: section.background as SectionBackground | undefined,
    text: text ?? undefined,
  }

  const choose = (next: Mode) => {
    if (next === mode) return
    if (next === 'auto') onChange(undefined)
    else if (theme) onChange(startText(theme, like))
  }

  const surface = theme ? sectionSurface(theme, like) : null
  const shown = text ?? (surface ? { foreground: surface.colors.foreground, muted: surface.colors.mutedForeground, primary: surface.colors.primary, accent: surface.colors.accent } : null)
  const warnings = theme ? textWarnings(theme, like) : []

  return (
    <fieldset className="grid gap-4 rounded-admin-lg border border-admin-rule p-4" aria-describedby={hint ? `${id}-hint` : undefined}>
      <legend className="px-1 text-admin-sm font-medium text-admin-ink">{label}</legend>

      <div className="grid grid-cols-2 gap-1 rounded-admin bg-admin-sunken p-1">
        {modes.map((option) => (
          <label
            key={option.value}
            className="relative flex min-h-9 cursor-pointer items-center justify-center rounded-admin px-2 text-center text-admin-sm font-medium text-admin-ink-2 transition-colors has-checked:bg-admin-card has-checked:text-admin-ink has-checked:shadow-sm has-focus-visible:ring-2 has-focus-visible:ring-admin-accent"
          >
            <input
              type="radio"
              name={`${id}-mode`}
              value={option.value}
              checked={mode === option.value}
              onChange={() => choose(option.value)}
              className="sr-only"
            />
            {option.label}
          </label>
        ))}
      </div>

      {hint ? (
        <p id={`${id}-hint`} className="text-admin-xs text-admin-ink-3">
          {hint}
        </p>
      ) : null}

      {text
        ? colorFields.map((field) => (
            <ColorField
              key={`${field.key}-${text[field.key]}`}
              id={`${id}-${field.key}`}
              label={field.label}
              value={text[field.key]}
              onChange={(hex) => onChange({ ...text, [field.key]: hex })}
            />
          ))
        : null}

      {surface && shown ? (
        <div
          data-testid={`${id}-sample`}
          aria-hidden="true"
          style={{ background: surface.css }}
          className="grid gap-1.5 rounded-admin border border-admin-rule px-4 py-3"
        >
          <span className="text-base font-semibold" style={{ color: shown.foreground }}>
            Título com{' '}
            <span
              style={{
                background: `linear-gradient(100deg, ${shown.primary} 10%, ${shown.accent} 90%)`,
                WebkitBackgroundClip: 'text',
                backgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}
            >
              trecho em destaque
            </span>
          </span>
          <span className="text-admin-sm" style={{ color: shown.muted }}>
            Subtítulo e descrições da seção
          </span>
          <span
            className="mt-1 inline-flex w-fit rounded-full px-3 py-1 text-admin-xs font-semibold"
            style={{ background: shown.primary, color: onColor(shown.primary) }}
          >
            Botão
          </span>
        </div>
      ) : null}

      {warnings.map((warning) => (
        <p key={warning} role="status" className="flex gap-2 text-admin-sm text-admin-warning">
          <TriangleAlert aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {warning}
        </p>
      ))}
    </fieldset>
  )
}
