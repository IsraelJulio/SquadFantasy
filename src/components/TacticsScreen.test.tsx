import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import { TacticsScreen } from './TacticsScreen'

describe('TacticsScreen', () => {
  it('mantém somente formação, quadra, dificuldade e confirmação', () => {
    const onDifficulty = vi.fn()
    render(
      <TacticsScreen
        formation="DIAMOND_3_1"
        difficulty="NORMAL"
        onFormation={vi.fn()}
        onDifficulty={onDifficulty}
        onConfirm={vi.fn()}
      />,
    )

    expect(screen.getByText('FORMAÇÃO')).toBeInTheDocument()
    expect(screen.getByRole('img', { name: /Pré-visualização do Sistema 3x1/ })).toBeInTheDocument()
    expect(screen.getByText('DIFICULDADE')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Confirmar e começar o draft/ })).toBeInTheDocument()
    expect(screen.queryByText('ESTILO DE JOGO')).not.toBeInTheDocument()
    expect(screen.queryByText('Em quadra')).not.toBeInTheDocument()
    expect(screen.queryByText('ELENCO DO DRAFT')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /Casual/i }))
    expect(onDifficulty).toHaveBeenCalledWith('CASUAL')
  })
})
