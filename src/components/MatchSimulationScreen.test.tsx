import { fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { opponents } from '../data/opponents'
import { players } from '../data/players'
import { getRequiredSquadByFormation } from '../game/formations'
import { createMatchSimulation } from '../game/simulation'
import { createDefaultLineup } from '../game/squad'
import type { GameCampaign, GamePlayer } from '../types'
import { MatchSimulationScreen } from './MatchSimulationScreen'

function createMatch() {
  const required = getRequiredSquadByFormation('DIAMOND_3_1')
  const squad = (Object.entries(required) as [GamePlayer['position'], number][]).flatMap(([position, count]) => players.filter((player) => player.position === position).slice(0, count))
  const starterIds = createDefaultLineup(squad, 'DIAMOND_3_1')
  const plan = createMatchSimulation('controls-test', 0, squad, starterIds, 'DIAMOND_3_1', 'Equilibrado', 'Fase de grupos')
  const now = new Date().toISOString()
  const campaign: GameCampaign = {
    id: 'controls-test', status: 'active', currentStage: 'Fase de grupos', selectedFormation: 'DIAMOND_3_1', selectedStrategy: 'Equilibrado', selectedDifficulty: 'NORMAL',
    playerIds: squad.map((player) => player.id), starterIds, losingStreak: 0, matches: [], groupPoints: 0, createdAt: now, updatedAt: now,
  }
  return { campaign, plan }
}

describe('MatchSimulationScreen — controles por estado', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('mostra somente as ações válidas antes, durante e depois da partida', () => {
    const { campaign, plan } = createMatch()
    render(<MatchSimulationScreen campaign={campaign} opponent={opponents[0]} plan={plan} onFinished={vi.fn()} onContinue={vi.fn()} />)

    expect(screen.getByRole('button', { name: 'Iniciar partida' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fazer substituição' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Acelerar/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pular para o final' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Iniciar partida' }))
    expect(screen.queryByRole('button', { name: 'Iniciar partida' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Fazer substituição' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Acelerar/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Pular para o final' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Pular para o final' }))
    expect(screen.queryByRole('button', { name: 'Iniciar partida' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Fazer substituição' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Acelerar/ })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Pular para o final' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Jogar próxima partida/ })).toBeInTheDocument()
  })
})
