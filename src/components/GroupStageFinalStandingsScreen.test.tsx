import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { calculateGroupStandings, USER_GROUP_TEAM_ID } from '../game/groupStage'
import type { GameCampaign, GroupMatch, GroupTeam } from '../types'
import { GroupStageFinalStandingsScreen } from './GroupStageFinalStandingsScreen'

afterEach(cleanup)

const teams: GroupTeam[] = [
  { id: USER_GROUP_TEAM_ID, name: 'Meu Time', isUserTeam: true, strength: 82 },
  { id: 'brasil', name: 'Brasil 2002', isUserTeam: false, strength: 92 },
  { id: 'franca', name: 'Franca 1998', isUserTeam: false, strength: 88 },
  { id: 'alemanha', name: 'Alemanha 2014', isUserTeam: false, strength: 90 },
]

function match(id: string, round: 1 | 2 | 3, home: GroupTeam, away: GroupTeam, homeScore: number, awayScore: number): GroupMatch {
  return {
    id,
    round,
    homeTeamId: home.id,
    awayTeamId: away.id,
    homeTeamName: home.name,
    awayTeamName: away.name,
    homeScore,
    awayScore,
    played: true,
    involvesUserTeam: home.isUserTeam || away.isUserTeam,
  }
}

function campaign(groupMatches: GroupMatch[]): GameCampaign {
  const now = new Date().toISOString()
  return {
    id: 'final-group',
    status: 'active',
    currentStage: 'Classificacao Final do Grupo',
    selectedFormation: 'DIAMOND_3_1',
    selectedStrategy: 'Equilibrado',
    selectedDifficulty: 'NORMAL',
    teamRerollsUsed: 0,
    currentGroupRound: 3,
    groupTeams: teams,
    groupMatches,
    playerIds: [],
    starterIds: [],
    losingStreak: 0,
    matches: [],
    groupPoints: 0,
    createdAt: now,
    updatedAt: now,
  }
}

const qualifiedMatches = [
  match('m1', 1, teams[0], teams[2], 2, 1),
  match('m2', 1, teams[1], teams[3], 3, 0),
  match('m3', 2, teams[0], teams[1], 1, 1),
  match('m4', 2, teams[2], teams[3], 2, 0),
  match('m5', 3, teams[0], teams[3], 1, 1),
  match('m6', 3, teams[1], teams[2], 1, 1),
]

const eliminatedMatches = [
  match('m1', 1, teams[0], teams[2], 0, 2),
  match('m2', 1, teams[1], teams[3], 3, 0),
  match('m3', 2, teams[0], teams[1], 1, 1),
  match('m4', 2, teams[2], teams[3], 1, 0),
  match('m5', 3, teams[0], teams[3], 1, 0),
  match('m6', 3, teams[1], teams[2], 1, 1),
]

describe('GroupStageFinalStandingsScreen', () => {
  it('renderiza os 4 times, badges, destaque do usuario e botao de mata-mata', () => {
    const currentCampaign = campaign(qualifiedMatches)
    const standings = calculateGroupStandings(currentCampaign.groupTeams, currentCampaign.groupMatches)

    render(
      <GroupStageFinalStandingsScreen
        campaign={currentCampaign}
        standings={standings}
        userTeamId={USER_GROUP_TEAM_ID}
        onContinueToKnockout={vi.fn()}
        onFinishCampaign={vi.fn()}
      />
    )

    expect(screen.getByRole('heading', { name: 'Classificacao Final do Grupo' })).toBeInTheDocument()
    expect(screen.getByText('Brasil 2002')).toBeInTheDocument()
    expect(screen.getByText('Meu Time')).toBeInTheDocument()
    expect(screen.getByText('Franca 1998')).toBeInTheDocument()
    expect(screen.getByText('Alemanha 2014')).toBeInTheDocument()
    expect(screen.getAllByText('Classificado')).toHaveLength(2)
    expect(screen.getAllByText('Eliminado')).toHaveLength(2)
    expect(screen.getByText('Seu time')).toBeInTheDocument()
    expect(screen.getByText('Meu Time').closest('tr')).toHaveClass('is-user')
    expect(screen.getByRole('button', { name: 'Avancar para o mata-mata' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Finalizar campanha' })).not.toBeInTheDocument()
    expect(screen.getByText('Rodada 1')).toBeInTheDocument()
    expect(screen.getByText('Meu Time 2 x 1 Franca 1998')).toBeInTheDocument()
  })

  it('mostra botao de finalizar campanha se usuario foi eliminado', () => {
    const currentCampaign = campaign(eliminatedMatches)
    const standings = calculateGroupStandings(currentCampaign.groupTeams, currentCampaign.groupMatches)

    render(
      <GroupStageFinalStandingsScreen
        campaign={currentCampaign}
        standings={standings}
        userTeamId={USER_GROUP_TEAM_ID}
        onContinueToKnockout={vi.fn()}
        onFinishCampaign={vi.fn()}
      />
    )

    expect(screen.getByText('Seu time foi eliminado')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Finalizar campanha' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Avancar para o mata-mata' })).not.toBeInTheDocument()
  })
})
