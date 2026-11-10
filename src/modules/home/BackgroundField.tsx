import { Plus, TriangleAlert, X } from 'lucide-react'
import { Button, Field, Select } from '@/admin/ui'
import { backgroundCss, backgroundStops, isLightSurface, surfaceColors } from '@/renderer/surface'
import type { BackgroundDirection, SectionBackground, SectionTone, SiteTheme } from '@/renderer/types'
import { ColorField } from './ColorField'
import { backgroundWarnings, startBackground } from './editor-state'

type Mode = 'theme' | SectionBackground['mode']

const modes: { value: Mode; label: string }[] = [
  { value: 'theme', label: 'Tema' },
  { value: 'solid', label: 'Cor sólida' },
  { value: 'gradient', label: 'Degradê' },
]

const directions: { value: BackgroundDirection; label: string }[] = [
  { value: 'to-bottom', label: 'De cima para baixo ↓' },
  { value: 'to-right', label: 'Da esquerda para a direita →' },
  { value: 'to-bottom-right', label: 'Diagonal ↘' },
  { value: 'to-top-right', label: 'Diagonal ↗' },
  { value: 'radial', label: 'Circular (do centro para fora)' },
]

/**
 * Fundo da seção: tema (usa o tom claro/suave/escuro), cor sólida ou degradê de 2 a 3 cores.
 * Mostra uma amostra com a cor de texto que o site vai usar e avisa quando a leitura fica ruim.
 */
export function BackgroundField({
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
  value: SectionBackground | undefined
  section: Record<string, unknown>
  theme: SiteTheme | undefined
  onChange: (next: SectionBackground | undefined) => void
}) {
  const mode: Mode = value?.mode ?? 'theme'
  const tone = typeof section.tone === 'string' ? (section.tone as SectionTone) : undefined
  const type = typeof section.type === 'string' ? section.type : ''

  const choose = (next: Mode) => {
    if (next === mode) return
    if (next === 'theme') onChange(undefined)
    else if (theme) onChange(startBackground(theme, tone, next, value))
  }

  const setColor = (index: number, hex: string) => {
    if (!value) return
    onChange({ ...value, colors: value.colors.map((c, i) => (i === index ? hex : c)) })
  }

  const stops = backgroundStops(value)
  const sample =
    stops && value && theme
      ? { css: backgroundCss(value, stops), text: surfaceColors(isLightSurface(stops) ? theme.colors : theme.darkColors, stops) }
      : null
  const warnings = theme && value ? backgroundWarnings(theme, { type, background: value }) : []

  return (
    <fieldset className="grid gap-4 rounded-admin-lg border border-admin-rule p-4" aria-describedby={hint ? `${id}-hint` : undefined}>
      <legend className="px-1 text-admin-sm font-medium text-admin-ink">{label}</legend>

      <div className="grid grid-cols-3 gap-1 rounded-admin bg-admin-sunken p-1">
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

      {value?.mode === 'solid' ? (
        <ColorField key={`${id}-0-${value.colors[0]}`} id={`${id}-c0`} label="Cor" value={value.colors[0] ?? '#ffffff'} onChange={(hex) => setColor(0, hex)} />
      ) : null}

      {value?.mode === 'gradient' ? (
        <>
          {value.colors.map((color, index) => (
            <div key={`${index}-${color}`} className="flex items-end gap-2">
              <div className="min-w-0 flex-1">
                <ColorField id={`${id}-c${index}`} label={`Cor ${index + 1}`} value={color} onChange={(hex) => setColor(index, hex)} />
              </div>
              {index === 2 ? (
                <Button
                  variant="ghost"
                  size="icon"
                  className="mb-0.5 size-9 text-admin-danger"
                  aria-label="Remover cor 3"
                  onClick={() => onChange({ ...value, colors: value.colors.slice(0, 2) })}
                >
                  <X aria-hidden="true" />
                </Button>
              ) : null}
            </div>
          ))}
          {value.colors.length < 3 ? (
            <Button
              variant="secondary"
              size="sm"
              className="justify-self-start"
              onClick={() => onChange({ ...value, colors: [...value.colors, value.colors[value.colors.length - 1] ?? '#ffffff'] })}
            >
              <Plus aria-hidden="true" />
              Adicionar 3ª cor
            </Button>
          ) : null}
          <Field label="Direção do degradê" htmlFor={`${id}-direction`}>
            <Select
              id={`${id}-direction`}
              value={value.direction ?? 'to-bottom'}
              options={directions}
              onValueChange={(direction) => onChange({ ...value, direction: direction as BackgroundDirection })}
            />
          </Field>
        </>
      ) : null}

      {sample ? (
        <div
          data-testid={`${id}-sample`}
          aria-hidden="true"
          style={{ background: sample.css, color: type === 'interactive-hero' ? '#ffffff' : sample.text.foreground }}
          className="flex h-16 items-center justify-between rounded-admin border border-admin-rule px-4"
        >
          <span className="text-base font-semibold">Título de exemplo</span>
          <span style={{ color: type === 'interactive-hero' ? undefined : sample.text.mutedForeground }} className="text-admin-sm">
            texto
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
