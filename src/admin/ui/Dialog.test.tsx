import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { Button } from './Button'
import { Dialog, DialogClose, DialogContent, DialogFooter, DialogTrigger } from './Dialog'

function Example({ description }: { description?: string }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Excluir contato</Button>
      </DialogTrigger>
      <DialogContent title="Excluir contato?" {...(description ? { description } : {})}>
        <p>Corpo do diálogo</p>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="secondary">Cancelar</Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

describe('Dialog', () => {
  it('abre pelo gatilho, tem nome acessível = título e fecha com "Fechar"', async () => {
    const user = userEvent.setup()
    render(<Example description="Esta ação não pode ser desfeita." />)

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Excluir contato' }))

    const dialog = screen.getByRole('dialog', { name: 'Excluir contato?' })
    expect(dialog).toHaveAccessibleDescription('Esta ação não pode ser desfeita.')

    await user.click(screen.getByRole('button', { name: 'Fechar' }))
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('fecha com Esc e sem descrição não referencia descrição', async () => {
    const user = userEvent.setup()
    render(<Example />)
    await user.click(screen.getByRole('button', { name: 'Excluir contato' }))

    const dialog = screen.getByRole('dialog', { name: 'Excluir contato?' })
    expect(dialog).not.toHaveAttribute('aria-describedby')

    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })
})
