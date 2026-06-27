import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { draftTeams } from '../data/draftTeams'
import { DraftScreen } from './DraftScreen'

afterEach(cleanup)

describe('DraftScreen', () => {
  it('mostra três sorteios no Casual e atualiza o contador recebido', () => {
    const onRedraw = vi.fn()
    const { rerender } = render(<DraftScreen selected={[]} team={draftTeams[0]} formation="DIAMOND_3_1" difficulty="CASUAL" teamRerollsUsed={0} hasAlternativeTeam onRedraw={onRedraw} onSelect={vi.fn()} />)

    fireEvent.click(screen.getByRole('button', { name: /Sortear nova equipe \(3 restantes\)/ }))
    expect(onRedraw).toHaveBeenCalledOnce()
    expect(screen.getAllByText(`${draftTeams[0].players[0].overall} OVR`).length).toBeGreaterThan(0)
    expect(screen.queryByText(/Escolha um atleta ou técnico desta equipe/)).not.toBeInTheDocument()
    expect(screen.queryByText('Necessidades do elenco')).not.toBeInTheDocument()
    expect(screen.queryByText(/^Atletas$/)).not.toBeInTheDocument()
    expect(screen.queryByText(/^Total$/)).not.toBeInTheDocument()
    rerender(<DraftScreen selected={[]} team={draftTeams[1]} formation="DIAMOND_3_1" difficulty="CASUAL" teamRerollsUsed={1} hasAlternativeTeam onRedraw={onRedraw} onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Sortear nova equipe \(2 restantes\)/ })).toBeEnabled()
  })

  it('oferece somente um sorteio no Normal', () => {
    const { rerender } = render(<DraftScreen selected={[]} team={draftTeams[0]} formation="DIAMOND_3_1" difficulty="NORMAL" teamRerollsUsed={0} hasAlternativeTeam onRedraw={vi.fn()} onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: /Sortear nova equipe \(1 restante\)/ })).toBeEnabled()
    expect(screen.queryByText(`${draftTeams[0].players[0].overall} OVR`)).not.toBeInTheDocument()

    rerender(<DraftScreen selected={[]} team={draftTeams[1]} formation="DIAMOND_3_1" difficulty="NORMAL" teamRerollsUsed={1} hasAlternativeTeam onRedraw={vi.fn()} onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Sorteios extras esgotados' })).toBeDisabled()
  })

  it('desabilita o sorteio no modo Desafio', () => {
    render(<DraftScreen selected={[]} team={draftTeams[0]} formation="DIAMOND_3_1" difficulty="CHALLENGE" teamRerollsUsed={0} hasAlternativeTeam onRedraw={vi.fn()} onSelect={vi.fn()} />)
    expect(screen.getByRole('button', { name: 'Sorteio extra indisponível no modo Desafio' })).toBeDisabled()
    expect(screen.queryByText(`${draftTeams[0].players[0].overall} OVR`)).not.toBeInTheDocument()
  })
})
