import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { StatCard } from './StatCard'

describe('StatCard', () => {
  it('valor null mostra "—" e "Sem dados" (nunca número falso)', () => {
    render(<StatCard label="Receita do mês" value={null} />)
    expect(screen.getByText('—')).toHaveAttribute('aria-hidden', 'true')
    expect(screen.getByText('Sem dados')).toHaveClass('sr-only')
  })

  it('exibe o valor em fonte mono tabular', () => {
    render(<StatCard label="Leads" value="1.204" hint="Últimos 30 dias" />)
    const value = screen.getByText('1.204')
    expect(value).toHaveClass('font-admin-mono', 'text-admin-kpi', 'tabular')
    expect(screen.queryByText('Sem dados')).not.toBeInTheDocument()
    expect(screen.getByText('Últimos 30 dias')).toBeInTheDocument()
  })

  it('com definition mostra o botão "Como é calculado"', () => {
    render(<StatCard label="Conversão" value="12%" definition="Ganhos ÷ oportunidades criadas" />)
    expect(screen.getByRole('button', { name: 'Como é calculado' })).toBeInTheDocument()
  })
})
