import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Button } from './Button'

describe('Button', () => {
  it('usa type="button" por padrão', () => {
    render(<Button>Salvar</Button>)
    expect(screen.getByRole('button', { name: 'Salvar' })).toHaveAttribute('type', 'button')
  })

  it('loading desabilita, marca aria-busy e mantém o rótulo', async () => {
    const onClick = vi.fn()
    render(
      <Button loading onClick={onClick}>
        Salvar contato
      </Button>,
    )
    const button = screen.getByRole('button', { name: 'Salvar contato' })
    expect(button).toBeDisabled()
    expect(button).toHaveAttribute('aria-busy', 'true')
    expect(button.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
    await userEvent.click(button)
    expect(onClick).not.toHaveBeenCalled()
  })

  it('asChild renderiza o filho (link) com as classes do botão', () => {
    render(
      <Button asChild variant="secondary" className="extra">
        <a href="/contatos">Ver contatos</a>
      </Button>,
    )
    const link = screen.getByRole('link', { name: 'Ver contatos' })
    expect(link.tagName).toBe('A')
    expect(link).toHaveAttribute('href', '/contatos')
    expect(link).not.toHaveAttribute('type')
    expect(link).toHaveClass('extra')
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
