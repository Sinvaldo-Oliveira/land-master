import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Field } from './Field'
import { fieldDescribedBy } from './field-utils'
import { Input } from './Input'

describe('fieldDescribedBy', () => {
  it('combina dica e erro, ou retorna undefined', () => {
    expect(fieldDescribedBy('email', {})).toBeUndefined()
    expect(fieldDescribedBy('email', { hint: 'x' })).toBe('email-hint')
    expect(fieldDescribedBy('email', { hint: 'x', error: 'y' })).toBe('email-hint email-error')
  })
})

describe('Field', () => {
  it('liga o erro ao controle via aria-describedby e anuncia com role="alert"', () => {
    const error = 'Informe um e-mail válido.'
    const hint = 'Usado para notificações.'
    render(
      <Field label="E-mail" htmlFor="email" error={error} hint={hint} required>
        <Input id="email" invalid aria-describedby={fieldDescribedBy('email', { error, hint })} />
      </Field>,
    )

    const input = screen.getByRole('textbox', { name: /E-mail/ })
    expect(input).toHaveAttribute('aria-invalid', 'true')
    expect(input).toHaveAccessibleDescription(`${hint} ${error}`)

    const alert = screen.getByRole('alert')
    expect(alert).toHaveAttribute('id', 'email-error')
    expect(alert).toHaveTextContent(error)
    expect(screen.getByText('(obrigatório)')).toBeInTheDocument()
  })

  it('sem erro não renderiza alerta', () => {
    render(
      <Field label="Nome" htmlFor="nome">
        <Input id="nome" />
      </Field>,
    )
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
    expect(screen.getByRole('textbox', { name: 'Nome' })).not.toHaveAttribute('aria-invalid')
  })
})
