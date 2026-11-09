import type { ReactNode } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { Button, Field, fieldDescribedBy, Input, Select, Switch, Textarea } from '@/admin/ui'
import { safeHref } from '@/renderer/safe-href'
import { iconOptions, type FieldDef } from './section-fields'
import { ImageField } from './ImageField'

type Data = Record<string, unknown>

/** Formulário gerado a partir da descrição dos campos (section-fields.ts). */
export function FieldsEditor({
  fields,
  value,
  onChange,
  idPrefix,
}: {
  fields: FieldDef[]
  value: Data
  onChange: (next: Data) => void
  idPrefix: string
}) {
  const set = (key: string, next: unknown) => {
    const copy = { ...value }
    if (next === undefined) delete copy[key]
    else copy[key] = next
    onChange(copy)
  }

  return (
    <div className="grid gap-5">
      {fields.map((field) => (
        <FieldControl
          key={field.key}
          field={field}
          value={value[field.key]}
          section={value}
          onChange={(next) => set(field.key, next)}
          id={`${idPrefix}-${field.key}`}
        />
      ))}
    </div>
  )
}

function textError(value: string, field: { label: string; max: number; optional?: boolean }): string | undefined {
  if (!field.optional && value.trim() === '') return 'Preencha este campo.'
  if (value.length > field.max) return `Use no máximo ${field.max} caracteres (${value.length}).`
  return undefined
}

function hrefError(value: string): string | undefined {
  if (value.trim() === '') return 'Informe o destino do link.'
  if (value.trim() !== '#' && safeHref(value) === '#') return 'Link inválido. Use #secao, /pagina, https://, mailto: ou tel:.'
  return undefined
}

function FieldControl({
  field,
  value,
  section,
  onChange,
  id,
}: {
  field: FieldDef
  value: unknown
  section: Data
  onChange: (next: unknown) => void
  id: string
}) {
  switch (field.kind) {
    case 'text':
    case 'textarea': {
      const current = typeof value === 'string' ? value : ''
      const isHref = field.key === 'href'
      const error =
        (isHref && (current !== '' || !field.optional) ? hrefError(current) : textError(current, field)) ??
        ('check' in field && field.check ? field.check(current, section) : undefined)
      const hint = field.hint ?? (field.optional ? 'Opcional.' : undefined)
      const common = {
        id,
        value: current,
        invalid: Boolean(error),
        'aria-describedby': fieldDescribedBy(id, { error, hint }),
        onChange: (event: { target: { value: string } }) => {
          const next = event.target.value
          onChange(field.optional && next === '' && isHref ? undefined : next)
        },
      }
      return (
        <Field label={field.label} htmlFor={id} error={error} hint={hint} required={!field.optional}>
          {field.kind === 'textarea' ? <Textarea rows={field.rows ?? 3} {...common} /> : <Input {...common} />}
        </Field>
      )
    }

    case 'icon':
    case 'select': {
      const options = field.kind === 'icon' ? iconOptions : field.options
      return (
        <Field label={field.label} htmlFor={id}>
          <Select id={id} value={typeof value === 'string' ? value : ''} options={options} onValueChange={onChange} />
        </Field>
      )
    }

    case 'range': {
      const current = typeof value === 'number' ? value : field.max
      return (
        <Field label={`${field.label}: ${current}${field.unit}`} htmlFor={id}>
          <input
            id={id}
            type="range"
            min={field.min}
            max={field.max}
            step={field.step}
            value={current}
            onChange={(event) => onChange(Number(event.target.value))}
            className="w-full accent-admin-accent"
          />
        </Field>
      )
    }

    case 'image':
      return (
        <ImageField
          id={id}
          label={field.label}
          hint={field.hint}
          value={typeof value === 'string' ? value : ''}
          onChange={onChange}
        />
      )

    case 'link': {
      const link = (value ?? null) as { label: string; href: string } | null
      const enabled = link !== null
      return (
        <fieldset className="grid gap-3 rounded-admin-lg border border-admin-rule p-4">
          <legend className="px-1 text-admin-sm font-medium text-admin-ink">{field.label}</legend>
          {field.optional ? (
            <div className="flex items-center gap-2 text-admin-sm text-admin-ink-2">
              <Switch
                id={`${id}-enabled`}
                checked={enabled}
                onCheckedChange={(checked) => onChange(checked ? { label: 'Saiba mais', href: '#contato' } : undefined)}
              />
              <label htmlFor={`${id}-enabled`}>Exibir este botão</label>
            </div>
          ) : null}
          {enabled ? (
            <FieldsEditor
              idPrefix={id}
              value={link}
              onChange={onChange}
              fields={[
                { kind: 'text', key: 'label', label: 'Texto do botão', max: 60 },
                { kind: 'text', key: 'href', label: 'Destino', max: 300, hint: 'Ex.: #contato, /sobre, https://wa.me/55…' },
              ]}
            />
          ) : null}
        </fieldset>
      )
    }

    case 'strings': {
      const items = Array.isArray(value) ? (value as string[]) : []
      const update = (index: number, next: string) => onChange(items.map((item, i) => (i === index ? next : item)))
      return (
        <ListShell
          label={field.label}
          count={items.length}
          min={field.min ?? 0}
          max={field.max}
          addLabel={`Adicionar ${field.itemLabel.toLowerCase()}`}
          onAdd={() => onChange([...items, ''])}
        >
          {items.map((item, index) => {
            const itemId = `${id}-${index}`
            const error = textError(item, { label: field.itemLabel, max: field.itemMax })
            return (
              <ListItem
                key={index}
                title={`${field.itemLabel} ${index + 1}`}
                index={index}
                count={items.length}
                canRemove={items.length > (field.min ?? 0)}
                onMove={(dir) => onChange(swap(items, index, index + dir))}
                onRemove={() => onChange(items.filter((_, i) => i !== index))}
              >
                <Field label={field.itemLabel} htmlFor={itemId} error={error}>
                  {field.multiline ? (
                    <Textarea id={itemId} rows={3} value={item} invalid={Boolean(error)} onChange={(e) => update(index, e.target.value)} />
                  ) : (
                    <Input id={itemId} value={item} invalid={Boolean(error)} onChange={(e) => update(index, e.target.value)} />
                  )}
                </Field>
              </ListItem>
            )
          })}
        </ListShell>
      )
    }

    case 'list': {
      const items = Array.isArray(value) ? (value as Data[]) : []
      return (
        <ListShell
          label={field.label}
          count={items.length}
          min={field.min ?? 0}
          max={field.max}
          addLabel={`Adicionar ${field.itemLabel.toLowerCase()}`}
          onAdd={() => onChange([...items, field.create()])}
        >
          {items.map((item, index) => (
            <ListItem
              key={index}
              title={`${field.itemLabel} ${index + 1}`}
              index={index}
              count={items.length}
              canRemove={items.length > (field.min ?? 0)}
              onMove={(dir) => onChange(swap(items, index, index + dir))}
              onRemove={() => onChange(items.filter((_, i) => i !== index))}
            >
              <FieldsEditor
                idPrefix={`${id}-${index}`}
                fields={field.fields}
                value={item}
                onChange={(next) => onChange(items.map((current, i) => (i === index ? next : current)))}
              />
            </ListItem>
          ))}
        </ListShell>
      )
    }
  }
}

function swap<T>(items: T[], from: number, to: number): T[] {
  if (to < 0 || to >= items.length) return items
  const copy = [...items]
  const a = copy[from] as T
  copy[from] = copy[to] as T
  copy[to] = a
  return copy
}

function ListShell({
  label,
  count,
  min,
  max,
  addLabel,
  onAdd,
  children,
}: {
  label: string
  count: number
  min: number
  max: number
  addLabel: string
  onAdd: () => void
  children: ReactNode
}) {
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-2 flex w-full items-center justify-between text-admin-sm font-medium text-admin-ink">
        {label}
        <span className="font-admin-mono text-admin-xs text-admin-ink-3">
          {count}/{max}
          {min > 0 ? ` · mín. ${min}` : ''}
        </span>
      </legend>
      {children}
      <Button variant="secondary" size="sm" onClick={onAdd} disabled={count >= max} className="justify-self-start">
        <Plus aria-hidden="true" />
        {addLabel}
      </Button>
    </fieldset>
  )
}

function ListItem({
  title,
  index,
  count,
  canRemove,
  onMove,
  onRemove,
  children,
}: {
  title: string
  index: number
  count: number
  canRemove: boolean
  onMove: (direction: -1 | 1) => void
  onRemove: () => void
  children: ReactNode
}) {
  return (
    <div className="rounded-admin-lg border border-admin-rule bg-admin-sunken/40 p-3">
      <div className="mb-3 flex items-center justify-between gap-2">
        <span className="text-admin-xs font-medium tracking-wide text-admin-ink-2 uppercase">{title}</span>
        <div className="flex gap-1">
          <Button variant="ghost" size="icon" className="size-7" aria-label={`Subir ${title}`} disabled={index === 0} onClick={() => onMove(-1)}>
            <ArrowUp aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7" aria-label={`Descer ${title}`} disabled={index === count - 1} onClick={() => onMove(1)}>
            <ArrowDown aria-hidden="true" />
          </Button>
          <Button variant="ghost" size="icon" className="size-7 text-admin-danger" aria-label={`Remover ${title}`} disabled={!canRemove} onClick={onRemove}>
            <Trash2 aria-hidden="true" />
          </Button>
        </div>
      </div>
      {children}
    </div>
  )
}
