import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { PenaltyShootoutState } from '../types'
import { PenaltyShootoutPanel } from './PenaltyShootoutPanel'

const notStartedShootout: PenaltyShootoutState = {
  status: 'not_started',
  currentRound: 1,
  currentTeam: 'user',
  userPenaltyScore: 0,
  opponentPenaltyScore: 0,
  shots: [],
}

const inProgressShootout: PenaltyShootoutState = {
  status: 'in_progress',
  currentRound: 1,
  currentTeam: 'opponent',
  userPenaltyScore: 1,
  opponentPenaltyScore: 0,
  shots: [{
    id: 'shot-1',
    round: 1,
    team: 'user',
    takerId: 'player-1',
    takerName: 'Craque Teste',
    goalkeeperName: 'Goleiro Teste',
    result: 'goal',
    userPenaltyScore: 1,
    opponentPenaltyScore: 0,
    description: 'Craque Teste desloca o goleiro e marca!',
  }],
}

describe('PenaltyShootoutPanel', () => {
  afterEach(cleanup)

  it('mostra somente o inicio antes da disputa', () => {
    const onStart = vi.fn()
    render(<PenaltyShootoutPanel opponentName="Brasil 1996" shootout={notStartedShootout} onStart={onStart} />)

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar disputa' }))

    expect(onStart).toHaveBeenCalledTimes(1)
    expect(screen.queryByText('Tempo normal')).not.toBeInTheDocument()
    expect(screen.queryByText('Pênaltis')).not.toBeInTheDocument()
    expect(screen.queryByText(/RODADA/i)).not.toBeInTheDocument()
    expect(screen.queryByText('COBRADOR')).not.toBeInTheDocument()
    expect(screen.queryByText('GOLEIRO')).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Cobrar pênalti/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Pular disputa/i })).not.toBeInTheDocument()
  })

  it('mostra o cobrador no resultado da disputa', () => {
    render(<PenaltyShootoutPanel opponentName="Brasil 1996" shootout={inProgressShootout} onStart={vi.fn()} />)

    expect(screen.queryByRole('button', { name: 'Iniciar disputa' })).not.toBeInTheDocument()
    expect(screen.getByText('Craque Teste: cobrança convertida.')).toBeInTheDocument()
    expect(screen.queryByText('Esquadrão Imortal: cobrança convertida.')).not.toBeInTheDocument()
    expect(screen.queryByText('Goleiro Teste')).not.toBeInTheDocument()
    expect(screen.queryByText(/Rodada/i)).not.toBeInTheDocument()
  })
})
