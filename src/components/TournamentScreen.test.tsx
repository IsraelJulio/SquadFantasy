import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { opponents } from '../data/opponents'
import { players } from '../data/players'
import { getRequiredSquadByFormation } from '../game/formations'
import { createGroupStage } from '../game/groupStage'
import { createDefaultLineup } from '../game/squad'
import type { Difficulty, GameCampaign, GamePlayer } from '../types'
import { TournamentScreen } from './TournamentScreen'

afterEach(cleanup)

function buildTournament(difficulty: Difficulty) {
  const required = getRequiredSquadByFormation('DIAMOND_3_1')
  const squad = (Object.entries(required) as [GamePlayer['position'], number][])
    .flatMap(([position, count]) => players.filter((player) => player.position === position).slice(0, count))
  const starterIds = createDefaultLineup(squad, 'DIAMOND_3_1')
  const now = new Date().toISOString()
  const campaign: GameCampaign = {
    id: `tournament-${difficulty}`,
    status: 'active',
    currentStage: 'Fase de grupos',
    selectedFormation: 'DIAMOND_3_1',
    selectedStrategy: 'Equilibrado',
    selectedDifficulty: difficulty,
    teamRerollsUsed: 0,
    ...createGroupStage(`tournament-${difficulty}`),
    playerIds: squad.map((player) => player.id),
    starterIds,
    losingStreak: 0,
    matches: [],
    groupPoints: 0,
    createdAt: now,
    updatedAt: now,
  }

  return { campaign, squad }
}

function renderTournament(difficulty: Difficulty) {
  const { campaign, squad } = buildTournament(difficulty)

  render(
    <TournamentScreen
      campaign={campaign}
      opponent={opponents[0]}
      squad={squad}
      bestPlayer={squad[0]}
      onPlay={vi.fn()}
      onSaveLineup={vi.fn()}
      onStrategy={vi.fn()}
    />,
  )
}

describe('TournamentScreen', () => {
  it('mostra dicas de matchup fora do modo Desafio', () => {
    renderTournament('NORMAL')

    expect(screen.getAllByText('Neutro').length).toBeGreaterThan(0)
    expect(screen.queryByText('Indisponivel no Desafio')).not.toBeInTheDocument()
  })

  it('oculta dicas de matchup no modo Desafio', () => {
    renderTournament('CHALLENGE')

    expect(screen.getAllByText('Indisponivel no Desafio')).toHaveLength(5)
    expect(screen.queryByText('Neutro')).not.toBeInTheDocument()
    expect(screen.queryByText(/Favor.vel/)).not.toBeInTheDocument()
    expect(screen.queryByText(/Desfavor.vel/)).not.toBeInTheDocument()
  })
})
