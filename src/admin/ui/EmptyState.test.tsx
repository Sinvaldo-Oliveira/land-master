import { render, screen } from '@testing-library/react'
import { Users } from 'lucide-react'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'
import { EmptyState } from './EmptyState'

describe('EmptyState', () => {
  it('renderiza título, descrição e ação', () => {
    const { container } = render(
      <EmptyState
        icon={Users}
        title="Nenhum contato ainda"
        description="Os contatos captados pelos formulários aparecem aqui."
        action={<Button>Adicionar contato</Button>}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Nenhum contato ainda' })).toBeInTheDocument()
    expect(screen.getByText('Os contatos captados pelos formulários aparecem aqui.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Adicionar contato' })).toBeInTheDocument()
    expect(container.querySelector('svg')).toHaveAttribute('aria-hidden', 'true')
  })
})
